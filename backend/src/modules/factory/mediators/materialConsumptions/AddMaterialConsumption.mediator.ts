import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { ReusableStockService } from '@/modules/inventory/services/ReusableStockService';
import { debitLocationStock } from '@/utils/stockLocations';
import type { PoolClient } from 'pg';

async function resolvePrimaryDistributionCenterId(client: PoolClient): Promise<number> {
  const res = await client.query(
    "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1"
  );
  if (res.rows.length === 0) {
    throw createError('No primary distribution center configured', 500);
  }
  return res.rows[0].id;
}

interface ReusableConsumptionOutcome {
  unitsDepleted: number;
  effectiveCostQuantity: number;
}

/**
 * Apply a work-order-driven consumption for a reusable material:
 *  - Validates reserved_uses covers the requested uses.
 *  - Consumes uses via ReusableStockService (decrements active unit; depletes
 *    physical units as they hit zero remaining).
 *  - Decrements product_locations.reserved_uses.
 *  - Decrements products.current_stock by the depleted physical units only.
 *  - Writes a product_use_consumptions audit row.
 * Returns the physical units depleted (for cost rollup) and the cost-bearing
 * quantity to pass to the voucher (units, not uses).
 */
async function applyReusableConsumption(
  client: PoolClient,
  params: {
    productId: number;
    materialName: string;
    usesRequested: number;
    workOrderConsumptionId: number;
    userId: number;
    reason?: string | null;
  }
): Promise<ReusableConsumptionOutcome> {
  const dcId = await resolvePrimaryDistributionCenterId(client);

  const locRes = await client.query(
    `SELECT reserved_uses FROM product_locations
     WHERE product_id = $1 AND distribution_center_id = $2`,
    [params.productId, dcId]
  );
  const reservedUses = locRes.rows.length === 0 ? 0 : parseFloat(locRes.rows[0].reserved_uses || 0);
  if (reservedUses < params.usesRequested) {
    throw createError(
      `Insufficient reserved uses for ${params.materialName}. Reserved: ${reservedUses}, Requested: ${params.usesRequested}`,
      400
    );
  }

  const { unitsDepleted } = await ReusableStockService.consumeUses(
    params.productId,
    dcId,
    params.usesRequested,
    client
  );

  // Release the reservation tied to this consumption regardless of how many
  // physical units were depleted — the uses are now consumed.
  await ReusableStockService.releaseReservedUses(params.productId, dcId, params.usesRequested, client);

  // products.current_stock is derived from product_locations by trigger (V163);
  // ReusableStockService.consumeUses already moved the location stock above.

  await ReusableStockService.logConsumption(
    {
      productId: params.productId,
      distributionCenterId: dcId,
      usesConsumed: params.usesRequested,
      unitsDepleted,
      source: 'work_order_consumption',
      sourceReferenceId: params.workOrderConsumptionId,
      reason: params.reason ?? null,
      createdBy: params.userId,
    },
    client
  );

  return { unitsDepleted, effectiveCostQuantity: unitsDepleted };
}

export interface CreateMaterialConsumptionRequest {
  work_order_id: string;
  material_id: string;
  consumed_quantity: number;
  production_line_id?: string;
  wastage_quantity?: number;
  wastage_reason?: string;
  notes?: string;
}

export interface BulkConsumptionRequest {
  material_id: string;
  consumed_quantity: number;
  wastage_quantity?: number;
  wastage_reason?: string;
}

export interface BulkConsumptionContext {
  work_order_id: string;
  production_line_id?: string;
  operator_id?: string;
  batch_number?: string;
  notes?: string;
}

export interface MaterialConsumption {
  id: string;
  work_order_id: string;
  material_id: string;
  material_name: string;
  consumed_quantity: number;
  consumption_date: string;
  production_line_id?: string;
  production_line_name?: string;
  consumed_by: number;
  wastage_quantity: number;
  wastage_reason?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export class AddMaterialConsumptionMediator {
  static async recordConsumption(
    data: CreateMaterialConsumptionRequest,
    userId: number
  ): Promise<MaterialConsumption> {
    const action = 'Record Material Consumption';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, {
        workOrderId: data.work_order_id,
        materialId: data.material_id,
        quantity: data.consumed_quantity,
        userId
      });

      // 1. Verify work order exists and is in_progress
      const workOrderResult = await client.query(
        'SELECT * FROM work_orders WHERE id = $1',
        [data.work_order_id]
      );

      if (workOrderResult.rows.length === 0) {
        throw createError('Work order not found', 404);
      }

      const workOrder = workOrderResult.rows[0];

      if (workOrder.status !== 'in_progress') {
        throw createError(
          `Cannot record consumption for work order with status: ${workOrder.status}`,
          400
        );
      }

      // 2. Get material info
      const materialResult = await client.query(
        'SELECT id, name, sku, current_stock, reserved_stock, uses_per_unit FROM products WHERE id = $1',
        [data.material_id]
      );

      if (materialResult.rows.length === 0) {
        throw createError('Material not found', 404);
      }

      const material = materialResult.rows[0];
      const isReusable = ReusableStockService.isReusable(material);

      // 3. Check if there's enough reserved stock (for non-reusable items; reusable
      // items are checked against reserved_uses inside applyReusableConsumption).
      if (!isReusable && parseFloat(material.reserved_stock || 0) < data.consumed_quantity) {
        throw createError(
          `Insufficient reserved stock. Reserved: ${material.reserved_stock}, Requested: ${data.consumed_quantity}`,
          400
        );
      }

      // 4. Get production line name if provided
      let productionLineName = null;
      if (data.production_line_id) {
        const lineResult = await client.query(
          'SELECT name FROM production_lines WHERE id = $1',
          [data.production_line_id]
        );
        if (lineResult.rows.length > 0) {
          productionLineName = lineResult.rows[0].name;
        }
      }

      // 5. Create consumption record
      const consumptionResult = await client.query(
        `INSERT INTO work_order_material_consumptions (
          work_order_id,
          material_id,
          material_name,
          consumed_quantity,
          consumption_date,
          production_line_id,
          production_line_name,
          consumed_by,
          wastage_quantity,
          wastage_reason,
          notes
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          data.work_order_id,
          data.material_id,
          material.name,
          data.consumed_quantity,
          data.production_line_id || null,
          productionLineName,
          userId,
          data.wastage_quantity || 0,
          data.wastage_reason || null,
          data.notes || null
        ]
      );

      const consumption = consumptionResult.rows[0];

      // 6. Update material requirement consumed quantity
      await client.query(
        `UPDATE work_order_material_requirements
         SET consumed_quantity = consumed_quantity + $1,
             status = CASE
               WHEN (consumed_quantity + $1) >= required_quantity THEN 'fulfilled'::text
               ELSE status
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE work_order_id = $2 AND material_id = $3`,
        [data.consumed_quantity, data.work_order_id, data.material_id]
      );

      // 7. Update product stock. For reusable items, consume uses (only depletes
      // physical units when the active unit's remaining uses hit zero) and
      // release reserved_uses. For normal items, decrement both current_stock
      // and reserved_stock as before.
      let unitsDepleted = data.consumed_quantity;
      let costBearingQuantity = data.consumed_quantity;
      if (isReusable) {
        const outcome = await applyReusableConsumption(client, {
          productId: parseInt(data.material_id, 10),
          materialName: material.name,
          usesRequested: data.consumed_quantity,
          workOrderConsumptionId: consumption.id,
          userId,
          reason: data.notes ?? null,
        });
        unitsDepleted = outcome.unitsDepleted;
        costBearingQuantity = outcome.effectiveCostQuantity;
      } else {
        // Physical stock moves through the material's DC (primary, where raw
        // materials are received/allocated); products.current_stock follows via
        // trigger. reserved_stock (global reservation) is decremented directly.
        const materialDc = await resolvePrimaryDistributionCenterId(client);
        await debitLocationStock(client, parseInt(data.material_id, 10), materialDc, data.consumed_quantity, material.name);
        await client.query(
          `UPDATE products
           SET reserved_stock = COALESCE(reserved_stock, 0) - $1
           WHERE id = $2`,
          [data.consumed_quantity, data.material_id]
        );
      }

      // 8. Update allocation status to consumed
      await client.query(
        `UPDATE work_order_material_allocations
         SET status = 'consumed'
         WHERE work_order_requirement_id IN (
           SELECT id FROM work_order_material_requirements
           WHERE work_order_id = $1 AND material_id = $2
         )`,
        [data.work_order_id, data.material_id]
      );

      // 9. If wastage > 0, create wastage record (pending approval)
      if (data.wastage_quantity && data.wastage_quantity > 0) {
        await client.query(
          `INSERT INTO material_wastage (
            work_order_id,
            material_id,
            material_name,
            quantity,
            wastage_reason,
            cost,
            status,
            recorded_by,
            notes
          ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)`,
          [
            data.work_order_id,
            data.material_id,
            material.name,
            data.wastage_quantity,
            data.wastage_reason || 'Unknown',
            parseFloat(material.current_stock) * data.wastage_quantity, // Calculate cost
            userId,
            data.notes
          ]
        );
      }

      await client.query('COMMIT');

      MyLogger.success(action, {
        consumptionId: consumption.id,
        quantity: data.consumed_quantity,
        workOrderId: data.work_order_id
      });

      // Fetch factory information for accounts integration
      let factoryInfo: { factory_id: number; factory_name: string; factory_cost_center_id: number | null } | null = null;
      try {
        const factoryResult = await pool.query(
          `SELECT f.id as factory_id, f.name as factory_name, f.cost_center_id as factory_cost_center_id
           FROM work_orders wo
           LEFT JOIN factory_customer_orders co ON wo.customer_order_id = co.id
           LEFT JOIN factories f ON co.factory_id = f.id
           WHERE wo.id = $1`,
          [data.work_order_id]
        );
        if (factoryResult.rows.length > 0 && factoryResult.rows[0].factory_id) {
          factoryInfo = factoryResult.rows[0];
        }
      } catch (factoryError: any) {
        MyLogger.warn(`${action}.fetchFactory`, {
          error: factoryError.message,
          workOrderId: data.work_order_id
        });
      }

      // Emit event for accounts integration. For reusable items, the voucher
      // reflects physically depleted units only — partial-use cost amortization
      // is out of scope for v1.
      if (costBearingQuantity > 0) {
        try {
          const consumptionData = {
            consumptionId: consumption.id,
            workOrderId: data.work_order_id,
            materialId: data.material_id,
            materialName: material.name,
            quantity: costBearingQuantity,
            cost: parseFloat(material.current_stock) * costBearingQuantity,
            productionLineId: data.production_line_id,
            costCenterId: productionLineName ? undefined : factoryInfo?.factory_cost_center_id,
            factoryId: factoryInfo?.factory_id,
            factoryName: factoryInfo?.factory_name,
            factoryCostCenterId: factoryInfo?.factory_cost_center_id,
            consumptionDate: new Date().toISOString()
          };

          eventBus.emit(EVENT_NAMES.MATERIAL_CONSUMED, {
            consumptionData,
            userId
          });

          MyLogger.info(`${action}.bridge`, { consumptionId: consumption.id });
          await interModuleConnector.accModule.addMaterialConsumptionVoucher(consumptionData, userId);
        } catch (eventError: any) {
          MyLogger.error(`${action}.eventEmit`, eventError, {
            consumptionId: consumption.id,
            message: 'Failed to emit MATERIAL_CONSUMED event, but consumption recording succeeded'
          });
        }
      } else {
        MyLogger.info(`${action}.bridge.skipped`, {
          consumptionId: consumption.id,
          reason: 'reusable material: no physical units depleted by this consumption',
          unitsDepleted,
        });
      }

      return consumption;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async recordBulkConsumptions(
    consumptions: BulkConsumptionRequest[],
    context: BulkConsumptionContext,
    userId: number
  ): Promise<MaterialConsumption[]> {
    const action = 'Record Bulk Material Consumptions';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, {
        workOrderId: context.work_order_id,
        materialCount: consumptions.length,
        userId
      });

      // 1. Verify work order exists and is in_progress
      const workOrderResult = await client.query(
        'SELECT * FROM work_orders WHERE id = $1',
        [context.work_order_id]
      );

      if (workOrderResult.rows.length === 0) {
        throw createError('Work order not found', 404);
      }

      const workOrder = workOrderResult.rows[0];

      if (workOrder.status !== 'in_progress') {
        throw createError(
          `Cannot record consumption for work order with status: ${workOrder.status}`,
          400
        );
      }

      // 2. Get production line name if provided
      let productionLineName = null;
      if (context.production_line_id) {
        const lineResult = await client.query(
          'SELECT name FROM production_lines WHERE id = $1',
          [context.production_line_id]
        );
        if (lineResult.rows.length > 0) {
          productionLineName = lineResult.rows[0].name;
        }
      }

      // 3. Get operator name if provided
      let operatorName = null;
      if (context.operator_id) {
        const operatorResult = await client.query(
          `SELECT u.full_name as user_name
           FROM operators o
           JOIN users u ON o.user_id = u.id
           WHERE o.id = $1`,
          [context.operator_id]
        );
        if (operatorResult.rows.length > 0) {
          operatorName = operatorResult.rows[0].user_name;
        }
      }

      const results: MaterialConsumption[] = [];

      // 4. Process each consumption
      for (const item of consumptions) {
        // Get material info
        const materialResult = await client.query(
          'SELECT id, name, sku, current_stock, reserved_stock, uses_per_unit FROM products WHERE id = $1',
          [item.material_id]
        );

        if (materialResult.rows.length === 0) {
          throw createError(`Material with ID ${item.material_id} not found`, 404);
        }

        const material = materialResult.rows[0];
        const isReusable = ReusableStockService.isReusable(material);

        // Check if there's enough reserved stock (non-reusable only; reusable
        // items are validated inside applyReusableConsumption against reserved_uses).
        if (!isReusable && parseFloat(material.reserved_stock || 0) < item.consumed_quantity) {
          throw createError(
            `Insufficient reserved stock for ${material.name}. Reserved: ${material.reserved_stock}, Requested: ${item.consumed_quantity}`,
            400
          );
        }

        // Create consumption record
        const consumptionResult = await client.query(
          `INSERT INTO work_order_material_consumptions (
            work_order_id,
            material_id,
            material_name,
            consumed_quantity,
            consumption_date,
            production_line_id,
            production_line_name,
            operator_id,
            operator_name,
            consumed_by,
            wastage_quantity,
            wastage_reason,
            batch_number,
            notes
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            context.work_order_id,
            item.material_id,
            material.name,
            item.consumed_quantity,
            context.production_line_id || null,
            productionLineName,
            context.operator_id || null,
            operatorName,
            userId,
            item.wastage_quantity || 0,
            item.wastage_reason || null,
            context.batch_number || null,
            context.notes || null
          ]
        );

        const consumption = consumptionResult.rows[0];

        // Update material requirement consumed quantity
        await client.query(
          `UPDATE work_order_material_requirements
           SET consumed_quantity = consumed_quantity + $1,
               status = CASE
                 WHEN (consumed_quantity + $1) >= required_quantity THEN 'fulfilled'::text
                 ELSE status
               END,
               updated_at = CURRENT_TIMESTAMP
           WHERE work_order_id = $2 AND material_id = $3`,
          [item.consumed_quantity, context.work_order_id, item.material_id]
        );

        // Update product stock — reusable items consume uses; normal items
        // decrement both current_stock and reserved_stock.
        let bulkCostBearingQuantity = item.consumed_quantity;
        if (isReusable) {
          const outcome = await applyReusableConsumption(client, {
            productId: parseInt(item.material_id, 10),
            materialName: material.name,
            usesRequested: item.consumed_quantity,
            workOrderConsumptionId: consumption.id,
            userId,
            reason: context.notes ?? null,
          });
          bulkCostBearingQuantity = outcome.effectiveCostQuantity;
        } else {
          const materialDc = await resolvePrimaryDistributionCenterId(client);
          await debitLocationStock(client, parseInt(item.material_id, 10), materialDc, item.consumed_quantity, material.name);
          await client.query(
            `UPDATE products
             SET reserved_stock = COALESCE(reserved_stock, 0) - $1
             WHERE id = $2`,
            [item.consumed_quantity, item.material_id]
          );
        }

        // Update allocation status to consumed
        await client.query(
          `UPDATE work_order_material_allocations
           SET status = 'consumed'
           WHERE work_order_requirement_id IN (
             SELECT id FROM work_order_material_requirements
             WHERE work_order_id = $1 AND material_id = $2
           )`,
          [context.work_order_id, item.material_id]
        );

        // If wastage > 0, create wastage record (pending approval)
        if (item.wastage_quantity && item.wastage_quantity > 0) {
          await client.query(
            `INSERT INTO material_wastage (
              work_order_id,
              material_id,
              material_name,
              quantity,
              wastage_reason,
              cost,
              status,
              recorded_by,
              notes
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)`,
            [
              context.work_order_id,
              item.material_id,
              material.name,
              item.wastage_quantity,
              item.wastage_reason || 'Unknown',
              parseFloat(material.current_stock) * item.wastage_quantity, // Calculate cost
              userId,
              context.notes
            ]
          );
        }

        // Add to results
        results.push({
          id: consumption.id.toString(),
          work_order_id: consumption.work_order_id.toString(),
          material_id: consumption.material_id.toString(),
          material_name: consumption.material_name,
          consumed_quantity: consumption.consumed_quantity,
          consumption_date: consumption.consumption_date.toISOString(),
          production_line_id: consumption.production_line_id?.toString(),
          production_line_name: consumption.production_line_name,
          consumed_by: consumption.consumed_by,
          wastage_quantity: consumption.wastage_quantity,
          wastage_reason: consumption.wastage_reason,
          notes: consumption.notes,
          created_at: consumption.created_at.toISOString(),
          updated_at: consumption.updated_at?.toISOString(),
        });

        // Emit event for each consumption. Skip when no physical movement
        // happened (reusable item with no unit depleted).
        if (bulkCostBearingQuantity > 0) {
          try {
            const consumptionData = {
              consumptionId: consumption.id,
              workOrderId: context.work_order_id,
              materialId: item.material_id,
              materialName: material.name,
              quantity: bulkCostBearingQuantity,
              cost: parseFloat(material.current_stock) * bulkCostBearingQuantity,
              productionLineId: context.production_line_id,
              consumptionDate: new Date().toISOString(),
              userId
            };

            eventBus.emit(EVENT_NAMES.MATERIAL_CONSUMED, consumptionData);

            MyLogger.info(`${action}.bridge`, { consumptionId: consumption.id });
            await interModuleConnector.accModule.addMaterialConsumptionVoucher(consumptionData, userId);
          } catch (eventError: any) {
            MyLogger.error(`${action}.eventEmit`, eventError, {
              consumptionId: consumption.id,
              message: 'Failed to emit MATERIAL_CONSUMED event, but consumption recording succeeded'
            });
          }
        } else {
          MyLogger.info(`${action}.bridge.skipped`, {
            consumptionId: consumption.id,
            reason: 'reusable material: no physical units depleted by this consumption',
          });
        }
      }

      await client.query('COMMIT');

      MyLogger.success(action, {
        workOrderId: context.work_order_id,
        consumptionsCreated: results.length,
        totalQuantity: consumptions.reduce((sum, c) => sum + c.consumed_quantity, 0)
      });

      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

