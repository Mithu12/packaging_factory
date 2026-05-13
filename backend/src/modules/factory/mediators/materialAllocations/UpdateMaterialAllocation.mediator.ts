import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { ReusableStockService } from '@/modules/inventory/services/ReusableStockService';
import type { PoolClient } from 'pg';

async function fetchPrimaryDcId(client: PoolClient): Promise<number> {
  const res = await client.query(
    "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1"
  );
  if (res.rows.length === 0) {
    throw createError('No primary distribution center configured', 500);
  }
  return res.rows[0].id;
}

async function isProductReusable(client: PoolClient, productId: number): Promise<boolean> {
  const res = await client.query('SELECT uses_per_unit FROM products WHERE id = $1', [productId]);
  return res.rows.length > 0 && ReusableStockService.isReusable(res.rows[0]);
}

export interface UpdateMaterialAllocationRequest {
  allocated_quantity?: number;
  allocated_from_location?: string;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
  status?: string;
}

export class UpdateMaterialAllocationMediator {
  static async updateAllocation(
    allocationId: string,
    data: UpdateMaterialAllocationRequest,
    userId: number
  ): Promise<any> {
    const action = 'Update Material Allocation';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { allocationId, data, userId });

      // Get current allocation
      const currentResult = await client.query(
        'SELECT * FROM work_order_material_allocations WHERE id = $1',
        [allocationId]
      );

      if (currentResult.rows.length === 0) {
        throw createError('Material allocation not found', 404);
      }

      const current = currentResult.rows[0];

      if (current.status === 'consumed') {
        throw createError('Cannot update consumed allocation', 400);
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.allocated_quantity !== undefined && data.allocated_quantity !== current.allocated_quantity) {
        const quantityDiff = data.allocated_quantity - parseFloat(current.allocated_quantity);

        // Update reservation. Reusable items adjust reserved_uses on the
        // location; normal items bump products.reserved_stock.
        if (await isProductReusable(client, current.inventory_item_id)) {
          const dcId = await fetchPrimaryDcId(client);
          if (quantityDiff > 0) {
            await ReusableStockService.reserveUses(
              current.inventory_item_id,
              dcId,
              quantityDiff,
              client
            );
          } else if (quantityDiff < 0) {
            await ReusableStockService.releaseReservedUses(
              current.inventory_item_id,
              dcId,
              -quantityDiff,
              client
            );
          }
        } else {
          await client.query(
            `UPDATE products
             SET reserved_stock = COALESCE(reserved_stock, 0) + $1
             WHERE id = $2`,
            [quantityDiff, current.inventory_item_id]
          );
        }

        // Update requirement allocated quantity
        await client.query(
          `UPDATE work_order_material_requirements
           SET allocated_quantity = allocated_quantity + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [quantityDiff, current.work_order_requirement_id]
        );

        updates.push(`allocated_quantity = $${paramIndex}`);
        values.push(data.allocated_quantity);
        paramIndex++;
      }

      if (data.allocated_from_location !== undefined) {
        updates.push(`allocated_from_location = $${paramIndex}`);
        values.push(data.allocated_from_location);
        paramIndex++;
      }

      if (data.expiry_date !== undefined) {
        updates.push(`expiry_date = $${paramIndex}`);
        values.push(data.expiry_date);
        paramIndex++;
      }

      if (data.batch_number !== undefined) {
        updates.push(`batch_number = $${paramIndex}`);
        values.push(data.batch_number);
        paramIndex++;
      }

      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`);
        values.push(data.notes);
        paramIndex++;
      }

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }

      if (updates.length === 0) {
        await client.query('COMMIT');
        return current;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      updates.push(`updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      values.push(allocationId);

      const updateQuery = `
        UPDATE work_order_material_allocations
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      await client.query('COMMIT');

      MyLogger.success(action, { allocationId });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async returnAllocation(
    allocationId: string,
    userId: number,
    notes?: string
  ): Promise<any> {
    const action = 'Return Material Allocation';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { allocationId, userId });

      // Get allocation
      const allocationResult = await client.query(
        'SELECT * FROM work_order_material_allocations WHERE id = $1',
        [allocationId]
      );

      if (allocationResult.rows.length === 0) {
        throw createError('Material allocation not found', 404);
      }

      const allocation = allocationResult.rows[0];

      if (allocation.status === 'consumed') {
        throw createError('Cannot return consumed allocation', 400);
      }

      if (allocation.status === 'returned') {
        throw createError('Allocation already returned', 400);
      }

      // Update allocation status
      await client.query(
        `UPDATE work_order_material_allocations
         SET status = 'returned',
             notes = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE notes END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [notes, allocationId]
      );

      // Reduce requirement allocated quantity
      await client.query(
        `UPDATE work_order_material_requirements
         SET allocated_quantity = allocated_quantity - $1,
             status = CASE
               WHEN (allocated_quantity - $1) < required_quantity THEN 'short'::text
               ELSE status
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [allocation.allocated_quantity, allocation.work_order_requirement_id]
      );

      // Release reservation. Reusable items release reserved_uses at the
      // location; normal items decrement products.reserved_stock.
      if (await isProductReusable(client, allocation.inventory_item_id)) {
        const dcId = await fetchPrimaryDcId(client);
        await ReusableStockService.releaseReservedUses(
          allocation.inventory_item_id,
          dcId,
          parseFloat(allocation.allocated_quantity),
          client
        );
      } else {
        await client.query(
          `UPDATE products
           SET reserved_stock = COALESCE(reserved_stock, 0) - $1
           WHERE id = $2`,
          [allocation.allocated_quantity, allocation.inventory_item_id]
        );
      }

      await client.query('COMMIT');

      MyLogger.success(action, { allocationId });

      return { success: true, message: 'Allocation returned successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

