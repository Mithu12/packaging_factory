import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

export interface CreateMaterialConsumptionRequest {
  work_order_id: string;
  material_id: string;
  consumed_quantity: number;
  production_line_id?: string;
  wastage_quantity?: number;
  wastage_reason?: string;
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

      return consumption;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

