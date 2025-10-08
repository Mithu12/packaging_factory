import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';

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
        'SELECT id, name, sku, current_stock, reserved_stock FROM products WHERE id = $1',
        [data.material_id]
      );

      if (materialResult.rows.length === 0) {
        throw createError('Material not found', 404);
      }

      const material = materialResult.rows[0];

      // 3. Check if there's enough reserved stock
      if (parseFloat(material.reserved_stock || 0) < data.consumed_quantity) {
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

      // 7. Update product stock (reduce both current_stock and reserved_stock)
      await client.query(
        `UPDATE products
         SET current_stock = current_stock - $1,
             reserved_stock = COALESCE(reserved_stock, 0) - $1
         WHERE id = $2`,
        [data.consumed_quantity, data.material_id]
      );

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

      // Emit event for accounts integration
      try {
        eventBus.emit(EVENT_NAMES.MATERIAL_CONSUMED, {
          consumptionData: {
            consumptionId: consumption.id,
            workOrderId: data.work_order_id,
            materialId: data.material_id,
            materialName: material.name,
            quantity: data.consumed_quantity,
            cost: parseFloat(material.current_stock) * data.consumed_quantity, // Basic cost calculation
            productionLineId: data.production_line_id,
            consumptionDate: new Date().toISOString()
          },
          userId
        });
      } catch (eventError: any) {
        MyLogger.error(`${action}.eventEmit`, eventError, {
          consumptionId: consumption.id,
          message: 'Failed to emit MATERIAL_CONSUMED event, but consumption recording succeeded'
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
      for (const consumptionData of consumptions) {
        // Get material info
        const materialResult = await client.query(
          'SELECT id, name, sku, current_stock, reserved_stock FROM products WHERE id = $1',
          [consumptionData.material_id]
        );

        if (materialResult.rows.length === 0) {
          throw createError(`Material with ID ${consumptionData.material_id} not found`, 404);
        }

        const material = materialResult.rows[0];

        // Check if there's enough reserved stock
        if (parseFloat(material.reserved_stock || 0) < consumptionData.consumed_quantity) {
          throw createError(
            `Insufficient reserved stock for ${material.name}. Reserved: ${material.reserved_stock}, Requested: ${consumptionData.consumed_quantity}`,
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
            consumptionData.material_id,
            material.name,
            consumptionData.consumed_quantity,
            context.production_line_id || null,
            productionLineName,
            context.operator_id || null,
            operatorName,
            userId,
            consumptionData.wastage_quantity || 0,
            consumptionData.wastage_reason || null,
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
          [consumptionData.consumed_quantity, context.work_order_id, consumptionData.material_id]
        );

        // Update product stock (reduce both current_stock and reserved_stock)
        await client.query(
          `UPDATE products
           SET current_stock = current_stock - $1,
               reserved_stock = COALESCE(reserved_stock, 0) - $1
           WHERE id = $2`,
          [consumptionData.consumed_quantity, consumptionData.material_id]
        );

        // Update allocation status to consumed
        await client.query(
          `UPDATE work_order_material_allocations
           SET status = 'consumed'
           WHERE work_order_requirement_id IN (
             SELECT id FROM work_order_material_requirements
             WHERE work_order_id = $1 AND material_id = $2
           )`,
          [context.work_order_id, consumptionData.material_id]
        );

        // If wastage > 0, create wastage record (pending approval)
        if (consumptionData.wastage_quantity && consumptionData.wastage_quantity > 0) {
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
              consumptionData.material_id,
              material.name,
              consumptionData.wastage_quantity,
              consumptionData.wastage_reason || 'Unknown',
              parseFloat(material.current_stock) * consumptionData.wastage_quantity, // Calculate cost
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

        // Emit event for each consumption
        try {
          eventBus.emit(EVENT_NAMES.MATERIAL_CONSUMED, {
            consumptionId: consumption.id,
            workOrderId: context.work_order_id,
            materialId: consumptionData.material_id,
            materialName: material.name,
            quantity: consumptionData.consumed_quantity,
            cost: parseFloat(material.current_stock) * consumptionData.consumed_quantity,
            productionLineId: context.production_line_id,
            consumptionDate: new Date().toISOString(),
            userId
          });
        } catch (eventError: any) {
          MyLogger.error(`${action}.eventEmit`, eventError, {
            consumptionId: consumption.id,
            message: 'Failed to emit MATERIAL_CONSUMED event, but consumption recording succeeded'
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

