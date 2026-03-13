import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

export interface CreateMaterialAllocationRequest {
  work_order_requirement_id: string;
  inventory_item_id: number;
  allocated_quantity: number;
  allocated_from_location: string;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
}

export interface MaterialAllocation {
  id: string;
  work_order_requirement_id: string;
  inventory_item_id: number;
  allocated_quantity: number;
  allocated_from_location: string;
  allocated_date: string;
  allocated_by: number;
  status: string;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export class AddMaterialAllocationMediator {
  static async createAllocation(
    data: CreateMaterialAllocationRequest,
    userId: number
  ): Promise<MaterialAllocation> {
    const action = 'Create Material Allocation';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, {
        requirementId: data.work_order_requirement_id,
        quantity: data.allocated_quantity,
        userId
      });

      // 1. Verify work order requirement exists and is pending/short
      const requirementResult = await client.query(
        `SELECT wmr.*, wo.status as work_order_status
         FROM work_order_material_requirements wmr
         JOIN work_orders wo ON wmr.work_order_id = wo.id
         WHERE wmr.id = $1`,
        [data.work_order_requirement_id]
      );

      if (requirementResult.rows.length === 0) {
        throw createError('Material requirement not found', 404);
      }

      const requirement = requirementResult.rows[0];

      if (!['pending', 'short', 'allocated'].includes(requirement.status)) {
        throw createError(
          `Cannot allocate materials for requirement with status: ${requirement.status}`,
          400
        );
      }

      // Check for over-allocation
      const requiredQuantity = parseFloat(requirement.required_quantity);
      const alreadyAllocated = parseFloat(requirement.allocated_quantity) || 0;
      const remainingToAllocate = requiredQuantity - alreadyAllocated;

      if (data.allocated_quantity > remainingToAllocate) {
        throw createError(
          `Cannot allocate more than required. Required: ${requiredQuantity}, Already allocated: ${alreadyAllocated}, Requested: ${data.allocated_quantity}`,
          400
        );
      }

      // 2. Check inventory availability
      const inventoryResult = await client.query(
        'SELECT id, current_stock, reserved_stock FROM products WHERE id = $1',
        [data.inventory_item_id]
      );

      if (inventoryResult.rows.length === 0) {
        throw createError('Inventory item not found', 404);
      }

      const inventory = inventoryResult.rows[0];
      const availableStock = parseFloat(inventory.current_stock) - parseFloat(inventory.reserved_stock || 0);

      if (availableStock < data.allocated_quantity) {
        throw createError(
          `Insufficient inventory. Available: ${availableStock}, Requested: ${data.allocated_quantity}`,
          400
        );
      }

      // 3. Create allocation record
      const allocationResult = await client.query(
        `INSERT INTO work_order_material_allocations (
          work_order_requirement_id,
          inventory_item_id,
          allocated_quantity,
          allocated_from_location,
          allocated_date,
          allocated_by,
          status,
          expiry_date,
          batch_number,
          notes
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, 'allocated', $6, $7, $8)
        RETURNING *`,
        [
          data.work_order_requirement_id,
          data.inventory_item_id,
          data.allocated_quantity,
          data.allocated_from_location,
          userId,
          data.expiry_date || null,
          data.batch_number || null,
          data.notes || null
        ]
      );

      const allocation = allocationResult.rows[0];

      // 4. Update work order material requirement allocated quantity
      await client.query(
        `UPDATE work_order_material_requirements
         SET allocated_quantity = allocated_quantity + $1,
             status = CASE
               WHEN (allocated_quantity + $1) >= required_quantity THEN 'allocated'::text
               ELSE status
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [data.allocated_quantity, data.work_order_requirement_id]
      );

      // 5. Update product reserved stock
      await client.query(
        `UPDATE products
         SET reserved_stock = COALESCE(reserved_stock, 0) + $1
         WHERE id = $2`,
        [data.allocated_quantity, data.inventory_item_id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        allocationId: allocation.id,
        quantity: data.allocated_quantity,
        requirementId: data.work_order_requirement_id
      });

      return allocation;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

