import pool from "@/database/connection";
import { UserRoleIds } from "@/types";
import {
  WorkOrder,
  UpdateWorkOrderRequest,
  WorkOrderStatus,
  WorkOrderPriority
} from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';

// Helper function to get user's accessible factories
async function getUserFactories(userId: number): Promise<{factory_id: string, factory_name: string, factory_code: string, role: string, is_primary: boolean}[]> {
  const query = 'SELECT * FROM get_user_factories($1)';
  const result = await pool.query(query, [userId]);
  return result.rows;
}

// Helper function to check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const query = 'SELECT role_id FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  if (result.rows.length === 0) return false;

  // Assuming role_id 1 is admin based on common patterns
  // You might need to adjust this based on your actual role structure
  return result.rows[0].role_id === UserRoleIds.ADMIN;
}

function calculateProductionLineLoad(estimatedHours: number): number {
  if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
    return 0;
  }
  return Math.min((estimatedHours / 8) * 10, 100);
}

// Status-based reservation behavior:
// - draft: No reservation
// - planned: Soft reservation (optional pre-reservation for planning)
// - released: Hard reservation (materials locked for production)
// - in_progress: Hard reservation maintained
// - completed: Release reservations
// - on_hold: Maintain existing reservations
// - cancelled: Release reservations

const SOFT_RESERVING_STATUSES = new Set(['planned']);
const HARD_RESERVING_STATUSES = new Set(['released', 'in_progress']);
const RESERVING_STATUSES = new Set(['planned', 'released', 'in_progress', 'on_hold']);
const RELEASING_STATUSES = new Set(['completed', 'cancelled']);
const MAINTAIN_STATUSES = new Set(['on_hold']);

// Helper function to handle stock reservation updates
let cachedReservedStockSupport: boolean | null = null;

async function hasReservedStockColumn(): Promise<boolean> {
  if (cachedReservedStockSupport !== null) {
    return cachedReservedStockSupport;
  }

  try {
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
          AND column_name = 'reserved_stock'
      ) AS exists
    `;
    const result = await pool.query(checkQuery);
    cachedReservedStockSupport = Boolean(result.rows?.[0]?.exists);
  } catch (error: any) {
    cachedReservedStockSupport = false;
    MyLogger.warn("UpdateWorkOrderMediator.hasReservedStockColumn", {
      message: "Failed to inspect products.reserved_stock column; assuming absent",
      error: error?.message || error,
    });
  }

  return cachedReservedStockSupport;
}

async function allocateMaterialsForWorkOrder(
  client: any,
  workOrderId: string,
  productId: string,
  quantity: number,
  userId: string
) {
  // Get material requirements for this work order
  const requirementsQuery = `
    SELECT wmr.*, p.current_stock, p.reserved_stock
    FROM work_order_material_requirements wmr
    JOIN products p ON wmr.material_id = p.id
    WHERE wmr.work_order_id = $1 AND wmr.status IN ('pending', 'short')
  `;
  const requirementsResult = await client.query(requirementsQuery, [workOrderId]);

  for (const requirement of requirementsResult.rows) {
    const requiredQuantity = parseFloat(requirement.required_quantity);
    const currentStock = parseFloat(requirement.current_stock) || 0;
    const reservedStock = parseFloat(requirement.reserved_stock) || 0;
    const availableStock = currentStock - reservedStock;

    if (availableStock >= requiredQuantity) {
      // Create allocation record
      await client.query(`
        INSERT INTO work_order_material_allocations (
          work_order_requirement_id,
          inventory_item_id,
          allocated_quantity,
          allocated_from_location,
          allocated_by,
          status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        requirement.id,
        requirement.material_id,
        requiredQuantity,
        'Main Warehouse',
        userId,
        'allocated',
        `Auto-allocated when work order ${workOrderId} was released`
      ]);

      // Update requirement status to allocated
      await client.query(`
        UPDATE work_order_material_requirements
        SET allocated_quantity = allocated_quantity + $1,
            status = CASE
              WHEN (allocated_quantity + $1) >= required_quantity THEN 'allocated'::text
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [requiredQuantity, requirement.id]);

      // Reserve the stock
      await client.query(`
        UPDATE products
        SET reserved_stock = reserved_stock + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [requiredQuantity, requirement.material_id]);

      MyLogger.info("Material allocated for work order", {
        workOrderId,
        materialId: requirement.material_id,
        quantity: requiredQuantity
      });
    } else if (availableStock > 0) {
      // Partial allocation
      await client.query(`
        INSERT INTO work_order_material_allocations (
          work_order_requirement_id,
          inventory_item_id,
          allocated_quantity,
          allocated_from_location,
          allocated_by,
          status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        requirement.id,
        requirement.material_id,
        availableStock,
        'Main Warehouse',
        userId,
        'allocated',
        `Partial allocation when work order ${workOrderId} was released`
      ]);

      // Update requirement status to short (partial allocation)
      await client.query(`
        UPDATE work_order_material_requirements
        SET allocated_quantity = allocated_quantity + $1,
            status = 'short'::text,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [availableStock, requirement.id]);

      // Reserve the available stock
      await client.query(`
        UPDATE products
        SET reserved_stock = reserved_stock + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [availableStock, requirement.material_id]);

      MyLogger.info("Partial material allocation for work order", {
        workOrderId,
        materialId: requirement.material_id,
        allocated: availableStock,
        required: requiredQuantity
      });
    }
  }
}

async function handleStockReservationUpdate(
  client: any,
  workOrderId: string,
  updateData: any,
  currentWorkOrder: any
) {
  const supportsReservedStock = await hasReservedStockColumn();
  if (!supportsReservedStock) {
    return;
  }

  const currentQuantity = parseFloat(currentWorkOrder.quantity) || 0;
  const currentProductId = currentWorkOrder.product_id;
  const newQuantity = updateData.quantity ? parseFloat(updateData.quantity) : currentQuantity;
  const newProductId = updateData.product_id || currentProductId;
  const isCurrentlyHardReserved = HARD_RESERVING_STATUSES.has(currentWorkOrder.status);

  if (!(isCurrentlyHardReserved && (newQuantity !== currentQuantity || newProductId !== currentProductId))) {
    return;
  }

  if (newProductId && currentProductId && newProductId === currentProductId) {
    const delta = newQuantity - currentQuantity;
    if (delta === 0) {
      return;
    }

    if (delta > 0) {
      const availabilityResult = await client.query(
        `SELECT current_stock, reserved_stock FROM products WHERE id = $1`,
        [currentProductId]
      );

      if (availabilityResult.rows.length > 0) {
        const currentStock = parseFloat(availabilityResult.rows[0].current_stock) || 0;
        const reservedStock = parseFloat(availabilityResult.rows[0].reserved_stock) || 0;
        const availableStock = currentStock - reservedStock;

        if (availableStock < delta) {
          throw new Error(`Insufficient available stock for product ${currentProductId}. Available: ${availableStock}, required: ${delta}`);
        }
      }
    }

    await client.query(
      `UPDATE products
       SET reserved_stock = GREATEST(reserved_stock + $1, 0), updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [delta, currentProductId]
    );
    return;
  }

  // Product switched while reserved
  if (newProductId && newQuantity > 0) {
    const availabilityResult = await client.query(
      `SELECT current_stock, reserved_stock FROM products WHERE id = $1`,
      [newProductId]
    );

    if (availabilityResult.rows.length > 0) {
      const currentStock = parseFloat(availabilityResult.rows[0].current_stock) || 0;
      const reservedStock = parseFloat(availabilityResult.rows[0].reserved_stock) || 0;
      const availableStock = currentStock - reservedStock;

      if (availableStock < newQuantity) {
        throw new Error(`Insufficient available stock for product ${newProductId}. Available: ${availableStock}, required: ${newQuantity}`);
      }
    }
  }

  if (currentProductId && currentQuantity > 0) {
    await client.query(
      `UPDATE products
       SET reserved_stock = GREATEST(reserved_stock - $1, 0), updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [currentQuantity, currentProductId]
    );
  }

  if (newProductId && newQuantity > 0) {
    await client.query(
      `UPDATE products
       SET reserved_stock = reserved_stock + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newQuantity, newProductId]
    );
  }
}

export class UpdateWorkOrderMediator {
  static async updateWorkOrder(
    workOrderId: string,
    updateData: UpdateWorkOrderRequest,
    userId: string
  ): Promise<WorkOrder> {
    const action = "UpdateWorkOrderMediator.updateWorkOrder";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { workOrderId, updateData, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(parseInt(userId));
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Check if work order exists and user has access
      const existingWorkOrderQuery = `
        SELECT wo.*, pl.name as production_line_name
        FROM work_orders wo
        LEFT JOIN production_lines pl ON wo.production_line_id = pl.id
        WHERE wo.id = $1
      `;
      const existingResult = await client.query(existingWorkOrderQuery, [workOrderId]);

      if (existingResult.rows.length === 0) {
        throw new Error('Work order not found');
      }

      const existingWorkOrder = existingResult.rows[0];

      // Validate factory access for non-admin users
      if (userFactories.length > 0) {
        // Check if user has access to the factory this work order belongs to
        // We need to check the factory_id field which should be added to work_orders table
        // For now, we'll assume work orders inherit factory access from the user
        // This should be implemented based on your factory access control logic
      }

      // Handle stock reservation updates FIRST - this can fail and should rollback everything
      await handleStockReservationUpdate(client, workOrderId, updateData, existingWorkOrder);

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.quantity !== undefined) {
        updateFields.push(`quantity = $${paramIndex}`);
        updateValues.push(updateData.quantity);
        paramIndex++;
      }

      if (updateData.deadline !== undefined) {
        updateFields.push(`deadline = $${paramIndex}`);
        updateValues.push(updateData.deadline);
        paramIndex++;
      }

      if (updateData.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex}`);
        updateValues.push(updateData.priority);
        paramIndex++;
      }

      if (updateData.estimated_hours !== undefined) {
        updateFields.push(`estimated_hours = $${paramIndex}`);
        updateValues.push(updateData.estimated_hours);
        paramIndex++;
      }

      if (updateData.production_line_id !== undefined) {
        updateFields.push(`production_line_id = $${paramIndex}`);
        updateValues.push(updateData.production_line_id);

        // Update production line name
        if (updateData.production_line_id) {
          const productionLineQuery = 'SELECT name FROM production_lines WHERE id = $1';
          const productionLineResult = await client.query(productionLineQuery, [updateData.production_line_id]);
          if (productionLineResult.rows.length > 0) {
            updateFields.push(`production_line_name = $${paramIndex + 1}`);
            updateValues.push(productionLineResult.rows[0].name);
            paramIndex++;
          }
        } else {
          updateFields.push(`production_line_name = $${paramIndex}`);
          updateValues.push(null);
        }
        paramIndex++;
      }

      if (updateData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(updateData.notes && updateData.notes.trim() !== '' ? updateData.notes : null);
        paramIndex++;
      }

      if (updateData.specifications !== undefined) {
        updateFields.push(`specifications = $${paramIndex}`);
        updateValues.push(updateData.specifications && updateData.specifications.trim() !== '' ? updateData.specifications : null);
        paramIndex++;
      }

      if (updateData.progress !== undefined) {
        updateFields.push(`progress = $${paramIndex}`);
        updateValues.push(Math.max(0, Math.min(100, updateData.progress)));
        paramIndex++;
      }

      if (updateData.actual_hours !== undefined) {
        updateFields.push(`actual_hours = $${paramIndex}`);
        updateValues.push(updateData.actual_hours);
        paramIndex++;
      }

      if (updateData.assigned_operators !== undefined) {
        updateFields.push(`assigned_operator_ids = $${paramIndex}`);
        updateValues.push(JSON.stringify(updateData.assigned_operators));
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(userId);
      paramIndex++;

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE work_orders
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(workOrderId);
      const updateResult = await client.query(updateQuery, updateValues);

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update work order');
      }

      const updatedWorkOrder = updateResult.rows[0];
      const previousLineId = existingWorkOrder.production_line_id ? existingWorkOrder.production_line_id.toString() : null;
      const newLineId = updatedWorkOrder.production_line_id ? updatedWorkOrder.production_line_id.toString() : null;
      const previousLoad = calculateProductionLineLoad(parseFloat(existingWorkOrder.estimated_hours) || 0);
      const newLoad = calculateProductionLineLoad(parseFloat(updatedWorkOrder.estimated_hours) || 0);
      const lineChanged = previousLineId !== newLineId;
      const loadChanged = previousLoad !== newLoad;

      if (previousLineId && (lineChanged || loadChanged)) {
        await client.query(`
          UPDATE production_lines
          SET
            current_load = GREATEST(current_load - $1, 0),
            status = CASE
              WHEN GREATEST(current_load - $1, 0) <= 0 THEN 'available'
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [previousLoad, previousLineId]);
      }

      if (newLineId && (lineChanged || loadChanged)) {
        await client.query(`
          UPDATE production_lines
          SET
            current_load = LEAST(current_load + $1, 100),
            status = CASE
              WHEN status = 'available' THEN 'busy'
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [newLoad, newLineId]);
      }

      // Handle operator assignments if they were updated
      if (updateData.assigned_operators !== undefined) {
        // Remove existing assignments
        await client.query('DELETE FROM work_order_assignments WHERE work_order_id = $1', [workOrderId]);

        // Create new assignments
        if (updateData.assigned_operators && updateData.assigned_operators.length > 0) {
          const assignmentQuery = `
            INSERT INTO work_order_assignments (
              work_order_id,
              production_line_id,
              operator_id,
              assigned_at,
              assigned_by,
              notes
            ) VALUES ${updateData.assigned_operators.map((_, index) =>
              `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`
            ).join(', ')}
          `;

          const assignmentValues = [];
          for (const operatorId of updateData.assigned_operators) {
            assignmentValues.push(
              workOrderId,
              updateData.production_line_id || null,
              operatorId,
              new Date(),
              userId,
              'Updated assignment'
            );
          }

          await client.query(assignmentQuery, assignmentValues);

          // Update operator availability status
          await client.query(`
            UPDATE operators
            SET availability_status = 'busy', current_work_order_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($2::integer[])
          `, [workOrderId, updateData.assigned_operators]);
        }
      }

      await client.query('COMMIT');

      const workOrder: WorkOrder = {
        id: updatedWorkOrder.id,
        work_order_number: updatedWorkOrder.work_order_number,
        customer_order_id: updatedWorkOrder.customer_order_id,
        product_id: updatedWorkOrder.product_id,
        product_name: updatedWorkOrder.product_name,
        product_sku: updatedWorkOrder.product_sku,
        quantity: parseFloat(updatedWorkOrder.quantity),
        unit_of_measure: updatedWorkOrder.unit_of_measure,
        deadline: updatedWorkOrder.deadline,
        status: updatedWorkOrder.status,
        priority: updatedWorkOrder.priority,
        progress: parseFloat(updatedWorkOrder.progress),
        estimated_hours: parseFloat(updatedWorkOrder.estimated_hours),
        actual_hours: parseFloat(updatedWorkOrder.actual_hours),
        production_line_id: updatedWorkOrder.production_line_id,
        production_line_name: updatedWorkOrder.production_line_name,
        assigned_operator_ids: updatedWorkOrder.assigned_operator_ids || [],
        created_by: updatedWorkOrder.created_by,
        created_at: updatedWorkOrder.created_at,
        updated_by: updatedWorkOrder.updated_by,
        updated_at: updatedWorkOrder.updated_at,
        started_at: updatedWorkOrder.started_at,
        completed_at: updatedWorkOrder.completed_at,
        notes: updatedWorkOrder.notes,
        specifications: updatedWorkOrder.specifications
      };

      MyLogger.success(action, {
        workOrderId: workOrder.id,
        updatedFields: Object.keys(updateData)
      });

      return workOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateWorkOrderStatus(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    userId: string,
    notes?: string
  ): Promise<WorkOrder> {
    const action = "UpdateWorkOrderMediator.updateWorkOrderStatus";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { workOrderId, newStatus, userId, notes });

      // Get current work order
      const currentQuery = 'SELECT * FROM work_orders WHERE id = $1';
      const currentResult = await client.query(currentQuery, [workOrderId]);

      if (currentResult.rows.length === 0) {
        throw new Error('Work order not found');
      }

      const currentWorkOrder = currentResult.rows[0];

      // Validate status transition
      const validTransitions: { [key: string]: string[] } = {
        'draft': ['planned', 'cancelled'],
        'planned': ['released', 'cancelled', 'on_hold'],
        'released': ['in_progress', 'cancelled', 'on_hold'],
        'in_progress': ['completed', 'on_hold', 'cancelled'],
        'completed': [], // Final status
        'on_hold': ['planned', 'released', 'in_progress', 'cancelled'],
        'cancelled': [] // Final status
      };

      // Additional validation: Check if work order has production run before completion
      if (newStatus === 'completed') {
        // Check if work order has any production runs
        const productionRunCheck = await client.query(
          'SELECT id FROM production_runs WHERE work_order_id = $1 LIMIT 1',
          [workOrderId]
        );

        if (productionRunCheck.rows.length === 0) {
          MyLogger.warn("Work order completed without production run", {
            workOrderId,
            productId: currentWorkOrder.product_id,
            quantity: currentWorkOrder.quantity,
            message: "Work order completed without formal production tracking"
          });

          // Check if materials were consumed
          const consumptionCheck = await client.query(
            'SELECT SUM(consumed_quantity) as total_consumed FROM work_order_material_consumptions WHERE work_order_id = $1',
            [workOrderId]
          );

          const totalConsumed = parseFloat(consumptionCheck.rows[0]?.total_consumed || '0');

          if (totalConsumed === 0) {
            // No production run and no consumption recorded - auto-consume based on BOM
            MyLogger.info("Auto-consuming materials based on BOM for completed work order", {
              workOrderId,
              productId: currentWorkOrder.product_id,
              quantity: currentWorkOrder.quantity
            });

            await UpdateWorkOrderMediator.autoConsumeMaterialsFromBOM(client, workOrderId, currentWorkOrder, userId);
          }
        }
      }

      if (!validTransitions[currentWorkOrder.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentWorkOrder.status} to ${newStatus}`);
      }

      const supportsReservedStock = await hasReservedStockColumn();
      const currentQuantity = parseFloat(currentWorkOrder.quantity) || 0;
      const previousProductId = currentWorkOrder.product_id;
      const hasInventoryTarget = supportsReservedStock && previousProductId && currentQuantity > 0;

      // Determine reservation behavior based on status transition
      const enteringHardReservation =
        hasInventoryTarget &&
        HARD_RESERVING_STATUSES.has(newStatus) &&
        !HARD_RESERVING_STATUSES.has(currentWorkOrder.status) &&
        !RESERVING_STATUSES.has(currentWorkOrder.status);

      const enteringSoftReservation =
        hasInventoryTarget &&
        SOFT_RESERVING_STATUSES.has(newStatus) &&
        !RESERVING_STATUSES.has(currentWorkOrder.status);

      const leavingReservedState =
        hasInventoryTarget &&
        RESERVING_STATUSES.has(currentWorkOrder.status) &&
        !RESERVING_STATUSES.has(newStatus) &&
        !MAINTAIN_STATUSES.has(newStatus);

      // Check availability for hard reservations only
      if (enteringHardReservation) {
        const availabilityResult = await client.query(
          `SELECT current_stock, reserved_stock FROM products WHERE id = $1`,
          [previousProductId]
        );

        if (availabilityResult.rows.length > 0) {
          const currentStock = parseFloat(availabilityResult.rows[0].current_stock) || 0;
          const reservedStock = parseFloat(availabilityResult.rows[0].reserved_stock) || 0;
          const availableStock = currentStock - reservedStock;

          if (availableStock < currentQuantity) {
            throw new Error(`Insufficient available stock for product ${previousProductId}. Available: ${availableStock}, required: ${currentQuantity}`);
          }
        }
      }

      // Update work order status and handle side effects
      const updateFields: string[] = ['status = $1'];
      const updateValues: any[] = [newStatus];
      let paramIndex = 2;

      // Update timestamps based on status
      if (newStatus === 'in_progress' && !currentWorkOrder.started_at) {
        updateFields.push(`started_at = $${paramIndex}`);
        updateValues.push(new Date());
        paramIndex++;
      }

      if (newStatus === 'completed' && !currentWorkOrder.completed_at) {
        updateFields.push(`completed_at = $${paramIndex}`);
        updateValues.push(new Date());
        paramIndex++;

        // Set progress to 100% when work order is completed
        updateFields.push(`progress = $${paramIndex}`);
        updateValues.push(100);
        paramIndex++;
      }

      // Update notes if provided
      if (notes && notes.trim() !== '') {
        updateFields.push(`notes = CASE
          WHEN notes IS NOT NULL THEN notes || E'\n' || $${paramIndex}
          ELSE $${paramIndex}
        END`);
        updateValues.push(notes);
        paramIndex++;
      }

      // Add updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(userId);
      paramIndex++;

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE work_orders
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(workOrderId);
      const updateResult = await client.query(updateQuery, updateValues);

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update work order status');
      }

      const updatedWorkOrder = updateResult.rows[0];

      const productId = updatedWorkOrder.product_id;
      const quantity = parseFloat(updatedWorkOrder.quantity) || 0;

      if (supportsReservedStock && productId && quantity > 0) {
        // Handle hard reservations (actual stock reservation)
        if (enteringHardReservation) {
          await client.query(
            `UPDATE products
             SET reserved_stock = reserved_stock + $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [quantity, productId]
          );
          MyLogger.info("Hard reservation created for work order", {
            workOrderId,
            productId,
            quantity,
            newStatus
          });
        }

        // Handle soft reservations (just planning, no actual stock reservation)
        if (enteringSoftReservation) {
          MyLogger.info("Soft reservation created for work order", {
            workOrderId,
            productId,
            quantity,
            newStatus
          });
          // Soft reservations don't actually reserve stock, just indicate intent
        }

        // Handle material allocation when work order is released
        if (newStatus === 'released') {
          await allocateMaterialsForWorkOrder(client, workOrderId, productId, quantity, userId);

          // Update factory customer order status to 'in_production' when work order is released
          if (currentWorkOrder.customer_order_id) {
            await client.query(`
              UPDATE factory_customer_orders
              SET status = 'in_production',
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $1 AND status = 'approved'
            `, [currentWorkOrder.customer_order_id]);

            MyLogger.info(`${action}: Factory customer order status updated to in_production`, {
              workOrderId,
              factoryCustomerOrderId: currentWorkOrder.customer_order_id,
              message: "Factory customer order moved to in_production status when work order was released"
            });
          }
        }

        // Release reservations when leaving reserved state
        if (leavingReservedState) {
          await client.query(
            `UPDATE products
             SET reserved_stock = GREATEST(reserved_stock - $1, 0), updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [quantity, productId]
          );
          MyLogger.info("Reservation released for work order", {
            workOrderId,
            productId,
            quantity,
            newStatus
          });
        }

        if (RELEASING_STATUSES.has(newStatus)) {
          MyLogger.info("Stock released for completed/cancelled work order", {
            workOrderId,
            productId,
            quantity,
            newStatus
          });

          // If work order is being cancelled and was previously released, check if factory customer order should be reset
          if (newStatus === 'cancelled' && currentWorkOrder.customer_order_id) {
            // This logic is already handled in the cancellation section below
            // No need to duplicate it here
          }
        }

        // Handle factory customer order status updates when work order status changes
        if (currentWorkOrder.customer_order_id && ['planned', 'draft'].includes(newStatus) && ['released', 'in_progress'].includes(currentWorkOrder.status)) {
          // Work order moved from released/in_progress back to planned/draft
          // Check if factory customer order should be reset to approved
          const activeWorkOrdersQuery = `
            SELECT COUNT(*) as active_count
            FROM work_orders
            WHERE customer_order_id = $1 AND status IN ('released', 'in_progress')
          `;

          const activeResult = await client.query(activeWorkOrdersQuery, [currentWorkOrder.customer_order_id]);

          if (activeResult.rows.length > 0 && parseInt(activeResult.rows[0].active_count) === 0) {
            // No active (released/in_progress) work orders - check if order should go back to approved
            const orderQuery = `
              SELECT status FROM factory_customer_orders WHERE id = $1
            `;

            const orderResult = await client.query(orderQuery, [currentWorkOrder.customer_order_id]);

            if (orderResult.rows.length > 0 && orderResult.rows[0].status === 'in_production') {
              // Set back to approved if it was in production
              await client.query(`
                UPDATE factory_customer_orders
                SET status = 'approved',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
              `, [currentWorkOrder.customer_order_id]);

              MyLogger.info(`${action}: Factory customer order status reset to approved`, {
                workOrderId,
                factoryCustomerOrderId: currentWorkOrder.customer_order_id,
                reason: "Work order moved from released/in_progress back to planned/draft, no active work orders remaining"
              });
            }
          }
        }
      }

      // Handle operator status updates when work order status changes
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        // Free up operators
        await client.query(`
          UPDATE operators
          SET availability_status = 'available', current_work_order_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE current_work_order_id = $1
        `, [workOrderId]);
      }

      if (newStatus === 'in_progress' && currentWorkOrder.status !== 'in_progress') {
        // Mark operators as busy
        const operatorIds = updatedWorkOrder.assigned_operator_ids || [];
        if (operatorIds.length > 0) {
          await client.query(`
            UPDATE operators
            SET availability_status = 'busy', updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($1::integer[])
          `, [operatorIds]);
        }
      }

      const productionLineId = updatedWorkOrder.production_line_id;
      if (productionLineId) {
        const lineLoad = calculateProductionLineLoad(parseFloat(updatedWorkOrder.estimated_hours) || 0);

        if (newStatus === 'completed' || newStatus === 'cancelled') {
          await client.query(`
            UPDATE production_lines
            SET
              current_load = GREATEST(current_load - $1, 0),
              status = CASE
                WHEN GREATEST(current_load - $1, 0) <= 0 THEN 'available'
                ELSE status
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [lineLoad, productionLineId]);
        } else if (['planned', 'released', 'in_progress'].includes(newStatus)) {
          await client.query(`
            UPDATE production_lines
            SET
              status = CASE
                WHEN status = 'available' THEN 'busy'
                ELSE status
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [productionLineId]);
        } else if (newStatus === 'on_hold') {
          await client.query(`
            UPDATE production_lines
            SET status = 'maintenance', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [productionLineId]);
        }
      }

      const workOrder: WorkOrder = {
        id: updatedWorkOrder.id,
        work_order_number: updatedWorkOrder.work_order_number,
        customer_order_id: updatedWorkOrder.customer_order_id,
        product_id: updatedWorkOrder.product_id,
        product_name: updatedWorkOrder.product_name,
        product_sku: updatedWorkOrder.product_sku,
        quantity: parseFloat(updatedWorkOrder.quantity),
        unit_of_measure: updatedWorkOrder.unit_of_measure,
        deadline: updatedWorkOrder.deadline,
        status: updatedWorkOrder.status,
        priority: updatedWorkOrder.priority,
        progress: parseFloat(updatedWorkOrder.progress),
        estimated_hours: parseFloat(updatedWorkOrder.estimated_hours),
        actual_hours: parseFloat(updatedWorkOrder.actual_hours),
        production_line_id: updatedWorkOrder.production_line_id,
        production_line_name: updatedWorkOrder.production_line_name,
        assigned_operator_ids: updatedWorkOrder.assigned_operator_ids || [],
        created_by: updatedWorkOrder.created_by,
        created_at: updatedWorkOrder.created_at,
        updated_by: updatedWorkOrder.updated_by,
        updated_at: updatedWorkOrder.updated_at,
        started_at: updatedWorkOrder.started_at,
        completed_at: updatedWorkOrder.completed_at,
        notes: updatedWorkOrder.notes,
        specifications: updatedWorkOrder.specifications
      };

      MyLogger.success(action, {
        workOrderId: workOrder.id,
        oldStatus: currentWorkOrder.status,
        newStatus: newStatus
      });

      // Handle material shortages and factory customer order status based on work order status change
      if (newStatus === 'completed') {
        // Resolve any open material shortages for this work order
        await client.query(`
          UPDATE material_shortages
          SET status = 'resolved',
              resolved_date = CURRENT_TIMESTAMP,
              notes = CONCAT(COALESCE(notes, ''), E'\nResolved: work order completed - materials assumed available')
          WHERE work_order_id = $1 AND status = 'open'
        `, [workOrderId]);

        MyLogger.info(`${action}: Material shortages resolved for completed work order`, {
          workOrderId,
          message: "Material shortages automatically resolved upon work order completion"
        });

        // Update linked factory customer order status if applicable
        if (currentWorkOrder.customer_order_id) {
          // Check if all work orders for this factory customer order are completed
          const workOrderCheckQuery = `
            SELECT
              COUNT(*) as total_work_orders,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_work_orders,
              COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) as active_work_orders
            FROM work_orders
            WHERE customer_order_id = $1
          `;

          const workOrderResult = await client.query(workOrderCheckQuery, [currentWorkOrder.customer_order_id]);

          if (workOrderResult.rows.length > 0) {
            const stats = workOrderResult.rows[0];
            const totalWorkOrders = parseInt(stats.total_work_orders) || 0;
            const completedWorkOrders = parseInt(stats.completed_work_orders) || 0;
            const activeWorkOrders = parseInt(stats.active_work_orders) || 0;

            // Mark as completed only if all work orders are completed
            if (totalWorkOrders > 0 && completedWorkOrders == totalWorkOrders && activeWorkOrders == 0) {
              await client.query(`
                UPDATE factory_customer_orders
                SET status = 'completed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND status != 'completed'
              `, [currentWorkOrder.customer_order_id]);

              MyLogger.info(`${action}: Factory customer order marked as completed`, {
                workOrderId,
                factoryCustomerOrderId: currentWorkOrder.customer_order_id,
                totalWorkOrders,
                completedWorkOrders,
                activeWorkOrders
              });
            }
          }
        }
      } else if (newStatus === 'cancelled') {
        // Cancel any open material shortages for cancelled work orders
        await client.query(`
          UPDATE material_shortages
          SET status = 'cancelled',
              resolved_date = CURRENT_TIMESTAMP,
              notes = CONCAT(COALESCE(notes, ''), E'\nCancelled: work order cancelled - shortages no longer needed')
          WHERE work_order_id = $1 AND status = 'open'
        `, [workOrderId]);

        MyLogger.info(`${action}: Material shortages cancelled for cancelled work order`, {
          workOrderId,
          message: "Material shortages automatically cancelled upon work order cancellation"
        });

        // Update factory customer order status if work order is cancelled
        if (currentWorkOrder.customer_order_id) {
          const workOrderCheckQuery = `
            SELECT
              COUNT(*) as total_work_orders,
              COUNT(*) FILTER (WHERE status = 'completed') as completed_work_orders,
              COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) as active_work_orders
            FROM work_orders
            WHERE customer_order_id = $1
          `;

          const workOrderResult = await client.query(workOrderCheckQuery, [currentWorkOrder.customer_order_id]);

          if (workOrderResult.rows.length > 0) {
            const stats = workOrderResult.rows[0];
            const totalWorkOrders = parseInt(stats.total_work_orders) || 0;
            const completedWorkOrders = parseInt(stats.completed_work_orders) || 0;
            const activeWorkOrders = parseInt(stats.active_work_orders) || 0;

            // Check current factory customer order status
            const orderQuery = `
              SELECT status FROM factory_customer_orders WHERE id = $1
            `;
            const orderResult = await client.query(orderQuery, [currentWorkOrder.customer_order_id]);

            if (orderResult.rows.length > 0) {
              const currentOrderStatus = orderResult.rows[0].status;

              if (activeWorkOrders === 0 && currentOrderStatus === 'in_production') {
                // No active work orders and order is in production - set back to approved
                await client.query(`
                  UPDATE factory_customer_orders
                  SET status = 'approved',
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = $1
                `, [currentWorkOrder.customer_order_id]);

                MyLogger.info(`${action}: Factory customer order status reset to approved`, {
                  workOrderId,
                  factoryCustomerOrderId: currentWorkOrder.customer_order_id,
                  totalWorkOrders,
                  completedWorkOrders,
                  activeWorkOrders,
                  reason: "Last work order cancelled, no active work orders remaining"
                });
              }
            }
          }
        }
      }

      // Emit event for accounts integration when work order is completed
      if (newStatus === 'completed') {
        try {
          eventBus.emit(EVENT_NAMES.WORK_ORDER_COMPLETED, {
            workOrderData: {
              workOrderId: workOrder.id,
              workOrderNumber: workOrder.work_order_number,
              productId: workOrder.product_id,
              productName: workOrder.product_name,
              productSku: workOrder.product_sku,
              quantity: workOrder.quantity,
              unitOfMeasure: workOrder.unit_of_measure,
              totalMaterialCost: updatedWorkOrder.total_material_cost || 0,
              totalLaborCost: updatedWorkOrder.total_labor_cost || 0,
              totalOverheadCost: updatedWorkOrder.total_overhead_cost || 0,
              totalWipCost: updatedWorkOrder.total_wip_cost || 0,
              completedDate: new Date().toISOString(),
              customerOrderId: workOrder.customer_order_id
            },
            userId: parseInt(userId)
          });
        } catch (eventError: any) {
          MyLogger.error(`${action}.eventEmit`, eventError, {
            workOrderId: workOrder.id,
            message: 'Failed to emit WORK_ORDER_COMPLETED event, but status update succeeded'
          });
        }
      }

      await client.query('COMMIT');
      return workOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteWorkOrder(
    workOrderId: string,
    userId: string,
    force: boolean = false
  ): Promise<{ deleted: boolean }> {
    const action = "UpdateWorkOrderMediator.deleteWorkOrder";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { workOrderId, userId, force });

      // Get work order details
      const workOrderQuery = 'SELECT * FROM work_orders WHERE id = $1';
      const workOrderResult = await client.query(workOrderQuery, [workOrderId]);

      if (workOrderResult.rows.length === 0) {
        throw new Error('Work order not found');
      }

      const workOrder = workOrderResult.rows[0];
      const supportsReservedStock = await hasReservedStockColumn();

      // Check if work order can be deleted
      if (!force && !['draft', 'planned'].includes(workOrder.status)) {
        throw new Error(`Cannot delete work order in ${workOrder.status} status. Only draft and planned work orders can be deleted.`);
      }

      // Free up operators if work order is being deleted
      if (workOrder.assigned_operator_ids && workOrder.assigned_operator_ids.length > 0) {
        await client.query(`
          UPDATE operators
          SET availability_status = 'available', current_work_order_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE current_work_order_id = $1
        `, [workOrderId]);
      }

      // Update production line load if assigned
      if (workOrder.production_line_id) {
        // Calculate load to remove (simplified calculation)
        const loadToRemove = Math.min((workOrder.estimated_hours / 8) * 10, 100);

        await client.query(`
          UPDATE production_lines
          SET current_load = GREATEST(current_load - $1, 0), updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [loadToRemove, workOrder.production_line_id]);
      }

      // Release reserved stock before deleting (only for hard reservations)
      if (
        supportsReservedStock &&
        HARD_RESERVING_STATUSES.has(workOrder.status) &&
        workOrder.quantity &&
        workOrder.quantity > 0 &&
        workOrder.product_id
      ) {
        await client.query(`
          UPDATE products
          SET reserved_stock = GREATEST(reserved_stock - $1, 0), updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [workOrder.quantity, workOrder.product_id]);

        MyLogger.info("Stock released for deleted work order", {
          workOrderId,
          productId: workOrder.product_id,
          quantity: workOrder.quantity
        });
      }

      // Delete work order assignments first
      await client.query('DELETE FROM work_order_assignments WHERE work_order_id = $1', [workOrderId]);

      // Delete work order
      const deleteResult = await client.query('DELETE FROM work_orders WHERE id = $1', [workOrderId]);

      const deleted = (deleteResult.rowCount || 0) > 0;

      MyLogger.success(action, {
        workOrderId,
        deleted,
        workOrderNumber: workOrder.work_order_number
      });

      await client.query('COMMIT');
      return { deleted };

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async planWorkOrder(
    workOrderId: string,
    planningData: {
      production_line_id?: number;
      assigned_operators?: number[];
      notes?: string;
    },
    userId: string
  ): Promise<WorkOrder> {
    const action = "UpdateWorkOrderMediator.planWorkOrder";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { workOrderId, planningData, userId });

      // Get user's accessible factories
      const userFactories = await getUserFactories(parseInt(userId));
      const userFactoryIds = userFactories.map(f => f.factory_id);

      // Check if work order exists and user has access
      const existingWorkOrderQuery = `
        SELECT wo.*, pl.name as production_line_name
        FROM work_orders wo
        LEFT JOIN production_lines pl ON wo.production_line_id = pl.id
        WHERE wo.id = $1
      `;
      const existingResult = await client.query(existingWorkOrderQuery, [workOrderId]);

      if (existingResult.rows.length === 0) {
        throw new Error('Work order not found');
      }

      const existingWorkOrder = existingResult.rows[0];

      // Validate factory access for non-admin users
      if (userFactories.length > 0) {
        // Check if user has access to the factory this work order belongs to
        // We need to check the factory_id field which should be added to work_orders table
        // For now, we'll assume work orders inherit factory access from the user
        // This should be implemented based on your factory access control logic
      }

      // Handle stock reservation updates FIRST - this can fail and should rollback everything
      await handleStockReservationUpdate(client, workOrderId, {
        production_line_id: planningData.production_line_id,
        assigned_operators: planningData.assigned_operators,
        quantity: existingWorkOrder.quantity,
        product_id: existingWorkOrder.product_id
      }, existingWorkOrder);

      // Build update query for assignments
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (planningData.production_line_id !== undefined) {
        updateFields.push(`production_line_id = $${paramIndex}`);
        updateValues.push(planningData.production_line_id);

        // Update production line name
        if (planningData.production_line_id) {
          const productionLineQuery = 'SELECT name FROM production_lines WHERE id = $1';
          const productionLineResult = await client.query(productionLineQuery, [planningData.production_line_id]);
          if (productionLineResult.rows.length > 0) {
            updateFields.push(`production_line_name = $${paramIndex + 1}`);
            updateValues.push(productionLineResult.rows[0].name);
            paramIndex++;
          }
        } else {
          updateFields.push(`production_line_name = $${paramIndex}`);
          updateValues.push(null);
        }
        paramIndex++;
      }

      if (planningData.assigned_operators !== undefined) {
        updateFields.push(`assigned_operator_ids = $${paramIndex}`);
        updateValues.push(JSON.stringify(planningData.assigned_operators));
        paramIndex++;
      }

      // Change status to planned
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push('planned');
      paramIndex++;

      // Set started_at timestamp since we're moving to planned status
      if (!existingWorkOrder.started_at) {
        updateFields.push(`started_at = $${paramIndex}`);
        updateValues.push(new Date());
        paramIndex++;
      }

      // Update notes
      if (planningData.notes) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(planningData.notes);
        paramIndex++;
      }

      // Add updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(userId);
      paramIndex++;

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE work_orders
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(workOrderId);
      const updateResult = await client.query(updateQuery, updateValues);

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update work order');
      }

      const updatedWorkOrder = updateResult.rows[0];

      // Update production line load
      if (planningData.production_line_id) {
        const newLoad = calculateProductionLineLoad(parseFloat(updatedWorkOrder.estimated_hours) || 0);

        await client.query(`
          UPDATE production_lines
          SET
            current_load = LEAST(current_load + $1, 100),
            status = CASE
              WHEN status = 'available' THEN 'busy'
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [newLoad, planningData.production_line_id]);
      }

      // Handle operator assignments
      if (planningData.assigned_operators && planningData.assigned_operators.length > 0) {
        // Remove existing assignments
        await client.query('DELETE FROM work_order_assignments WHERE work_order_id = $1', [workOrderId]);

        // Create new assignments
        const assignmentQuery = `
          INSERT INTO work_order_assignments (
            work_order_id,
            production_line_id,
            operator_id,
            assigned_at,
            assigned_by,
            notes
          ) VALUES ${planningData.assigned_operators.map((_, index) =>
            `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`
          ).join(', ')}
        `;

        const assignmentValues = [];
        for (const operatorId of planningData.assigned_operators) {
          assignmentValues.push(
            workOrderId,
            planningData.production_line_id || null,
            operatorId,
            new Date(),
            userId,
            'Planned assignment'
          );
        }

        await client.query(assignmentQuery, assignmentValues);

        // Update operator availability status
        await client.query(`
          UPDATE operators
          SET availability_status = 'busy', current_work_order_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($2::integer[])
        `, [workOrderId, planningData.assigned_operators]);
      }

      await client.query('COMMIT');

      const workOrder: WorkOrder = {
        id: updatedWorkOrder.id,
        work_order_number: updatedWorkOrder.work_order_number,
        customer_order_id: updatedWorkOrder.customer_order_id,
        product_id: updatedWorkOrder.product_id,
        product_name: updatedWorkOrder.product_name,
        product_sku: updatedWorkOrder.product_sku,
        quantity: parseFloat(updatedWorkOrder.quantity),
        unit_of_measure: updatedWorkOrder.unit_of_measure,
        deadline: updatedWorkOrder.deadline,
        status: updatedWorkOrder.status,
        priority: updatedWorkOrder.priority,
        progress: parseFloat(updatedWorkOrder.progress),
        estimated_hours: parseFloat(updatedWorkOrder.estimated_hours),
        actual_hours: parseFloat(updatedWorkOrder.actual_hours),
        production_line_id: updatedWorkOrder.production_line_id,
        production_line_name: updatedWorkOrder.production_line_name,
        assigned_operator_ids: updatedWorkOrder.assigned_operator_ids || [],
        created_by: updatedWorkOrder.created_by,
        created_at: updatedWorkOrder.created_at,
        updated_by: updatedWorkOrder.updated_by,
        updated_at: updatedWorkOrder.updated_at,
        started_at: updatedWorkOrder.started_at,
        completed_at: updatedWorkOrder.completed_at,
        notes: updatedWorkOrder.notes,
        specifications: updatedWorkOrder.specifications
      };

      MyLogger.success(action, {
        workOrderId: workOrder.id,
        status: workOrder.status,
        operatorsAssigned: planningData.assigned_operators?.length || 0
      });

      return workOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Complete work order with manual material consumption
   * Allows recording actual material consumption when completing without production run
   */
  static async completeWithMaterialConsumption(
    workOrderId: string,
    materialConsumptions: Array<{
      material_id: string;
      material_name: string;
      consumed_quantity: number;
      wastage_quantity?: number;
      wastage_reason?: string;
      batch_number?: string;
    }>,
    userId: string,
    notes?: string
  ): Promise<WorkOrder> {
    const action = "UpdateWorkOrderMediator.completeWithMaterialConsumption";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get work order
      const workOrderResult = await client.query(
        'SELECT * FROM work_orders WHERE id = $1',
        [workOrderId]
      );

      if (workOrderResult.rows.length === 0) {
        throw new Error('Work order not found');
      }

      const workOrder = workOrderResult.rows[0];

      // Validate work order can be completed
      if (workOrder.status !== 'in_progress') {
        throw new Error(`Cannot complete work order in ${workOrder.status} status`);
      }

      // Record material consumptions if provided
      if (materialConsumptions && materialConsumptions.length > 0) {
        for (const consumption of materialConsumptions) {
          // Record consumption
          await client.query(
            `INSERT INTO work_order_material_consumptions (
              work_order_id,
              material_id,
              material_name,
              consumed_quantity,
              wastage_quantity,
              wastage_reason,
              batch_number,
              consumption_date,
              consumed_by,
              notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9)`,
            [
              workOrderId,
              consumption.material_id,
              consumption.material_name,
              consumption.consumed_quantity,
              consumption.wastage_quantity || 0,
              consumption.wastage_reason || null,
              consumption.batch_number || null,
              userId,
              'Manual consumption during work order completion'
            ]
          );

          // Update inventory
          const totalConsumed = consumption.consumed_quantity + (consumption.wastage_quantity || 0);
          await client.query(
            `UPDATE products 
             SET 
               current_stock = GREATEST(current_stock - $1, 0),
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [totalConsumed, consumption.material_id]
          );

          // Update requirement
          await client.query(
            `UPDATE work_order_material_requirements
             SET 
               consumed_quantity = consumed_quantity + $1,
               status = CASE 
                 WHEN consumed_quantity + $1 >= required_quantity THEN 'fulfilled'
                 ELSE 'short'
               END,
               updated_at = CURRENT_TIMESTAMP
             WHERE work_order_id = $2 AND material_id = $3`,
            [consumption.consumed_quantity, workOrderId, consumption.material_id]
          );

          MyLogger.info(`${action}: Material consumed`, {
            workOrderId,
            materialId: consumption.material_id,
            consumedQuantity: consumption.consumed_quantity
          });
        }
      }

      // Now complete the work order (within the same transaction)
      // Build query dynamically based on whether notes exists
      let updateQuery: string;
      let queryParams: any[];

      if (notes && notes.trim() !== '') {
        // Append to existing notes
        updateQuery = `
          UPDATE work_orders
          SET
            status = $1,
            progress = $2,
            completed_at = CURRENT_TIMESTAMP,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP,
            notes = CASE
              WHEN notes IS NOT NULL THEN notes || E'\n' || $4
              ELSE $4
            END
          WHERE id = $5
          RETURNING *
        `;
        queryParams = ['completed', 100, userId, notes, workOrderId];
      } else {
        // Just set status and completion fields, keep existing notes
        updateQuery = `
          UPDATE work_orders
          SET
            status = $1,
            progress = $2,
            completed_at = CURRENT_TIMESTAMP,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *
        `;
        queryParams = ['completed', 100, userId, workOrderId];
      }

      const updateResult = await client.query(updateQuery, queryParams);

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update work order status');
      }

      const updatedWorkOrder = updateResult.rows[0];

      // Release reserved stock
      if (workOrder.product_id && workOrder.quantity) {
        const supportsReservedStock = await hasReservedStockColumn();
        if (supportsReservedStock) {
          await client.query(
            `UPDATE products 
             SET 
               reserved_stock = GREATEST(reserved_stock - $1, 0),
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [workOrder.quantity, workOrder.product_id]
          );
        }
      }

      // Free up operators
      await client.query(`
        UPDATE operators
        SET availability_status = 'available', current_work_order_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE current_work_order_id = $1
      `, [workOrderId]);

      // Update production line load
      if (workOrder.production_line_id) {
        const lineLoad = calculateProductionLineLoad(parseFloat(workOrder.estimated_hours) || 0);
        await client.query(`
          UPDATE production_lines
          SET
            current_load = GREATEST(current_load - $1, 0),
            status = CASE
              WHEN GREATEST(current_load - $1, 0) <= 0 THEN 'available'
              ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [lineLoad, workOrder.production_line_id]);
      }

      // Handle material shortages and factory customer order status based on work order completion
      if (updatedWorkOrder.customer_order_id) {
        // Check if all work orders for this factory customer order are completed
        const workOrderCheckQuery = `
          SELECT
            COUNT(*) as total_work_orders,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_work_orders,
            COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) as active_work_orders
          FROM work_orders
          WHERE customer_order_id = $1
        `;

        const workOrderResult = await client.query(workOrderCheckQuery, [updatedWorkOrder.customer_order_id]);

        if (workOrderResult.rows.length > 0) {
          const stats = workOrderResult.rows[0];
          const totalWorkOrders = parseInt(stats.total_work_orders) || 0;
          const completedWorkOrders = parseInt(stats.completed_work_orders) || 0;
          const activeWorkOrders = parseInt(stats.active_work_orders) || 0;

          // Mark as completed only if all work orders are completed
          if (totalWorkOrders > 0 && completedWorkOrders === totalWorkOrders && activeWorkOrders === 0) {
            await client.query(`
              UPDATE factory_customer_orders
              SET status = 'completed',
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $1 AND status != 'completed'
            `, [updatedWorkOrder.customer_order_id]);

            MyLogger.info(`${action}: Factory customer order marked as completed`, {
              workOrderId: updatedWorkOrder.id,
              factoryCustomerOrderId: updatedWorkOrder.customer_order_id,
              totalWorkOrders,
              completedWorkOrders,
              activeWorkOrders
            });
          }
        }
      }

      await client.query('COMMIT');

      // Fetch factory information for accounts integration
      let factoryInfo: { factory_id: number; factory_name: string; factory_cost_center_id: number | null } | null = null;
      if (updatedWorkOrder.customer_order_id) {
        try {
          const factoryResult = await pool.query(
            `SELECT f.id as factory_id, f.name as factory_name, f.cost_center_id as factory_cost_center_id
             FROM factory_customer_orders co
             JOIN factories f ON co.factory_id = f.id
             WHERE co.id = $1`,
            [updatedWorkOrder.customer_order_id]
          );
          if (factoryResult.rows.length > 0) {
            factoryInfo = factoryResult.rows[0];
          }
        } catch (factoryError: any) {
          MyLogger.warn(`${action}.fetchFactory`, {
            error: factoryError.message,
            workOrderId: updatedWorkOrder.id
          });
        }
      }

      // Emit event for accounts integration
      try {
        eventBus.emit(EVENT_NAMES.WORK_ORDER_COMPLETED, {
          workOrderData: {
            workOrderId: updatedWorkOrder.id,
            workOrderNumber: updatedWorkOrder.work_order_number,
            productId: updatedWorkOrder.product_id,
            productName: updatedWorkOrder.product_name,
            productSku: updatedWorkOrder.product_sku,
            quantity: updatedWorkOrder.quantity,
            unitOfMeasure: updatedWorkOrder.unit_of_measure,
            totalMaterialCost: updatedWorkOrder.total_material_cost || 0,
            totalLaborCost: updatedWorkOrder.total_labor_cost || 0,
            totalOverheadCost: updatedWorkOrder.total_overhead_cost || 0,
            totalWipCost: updatedWorkOrder.total_wip_cost || 0,
            completedDate: new Date().toISOString(),
            customerOrderId: updatedWorkOrder.customer_order_id,
            factoryId: factoryInfo?.factory_id,
            factoryName: factoryInfo?.factory_name,
            factoryCostCenterId: factoryInfo?.factory_cost_center_id
          },
          userId: parseInt(userId)
        });
      } catch (eventError: any) {
        MyLogger.error(`${action}.eventEmit`, eventError, {
          workOrderId: updatedWorkOrder.id,
          message: 'Failed to emit WORK_ORDER_COMPLETED event, but completion succeeded'
        });
      }

      MyLogger.success(action, {
        workOrderId,
        materialsConsumed: materialConsumptions.length
      });

      // Return work order in expected format
      const completedWorkOrder: WorkOrder = {
        id: updatedWorkOrder.id,
        work_order_number: updatedWorkOrder.work_order_number,
        customer_order_id: updatedWorkOrder.customer_order_id,
        product_id: updatedWorkOrder.product_id,
        product_name: updatedWorkOrder.product_name,
        product_sku: updatedWorkOrder.product_sku,
        quantity: parseFloat(updatedWorkOrder.quantity),
        unit_of_measure: updatedWorkOrder.unit_of_measure,
        deadline: updatedWorkOrder.deadline,
        status: updatedWorkOrder.status,
        priority: updatedWorkOrder.priority,
        progress: parseFloat(updatedWorkOrder.progress),
        estimated_hours: parseFloat(updatedWorkOrder.estimated_hours),
        actual_hours: parseFloat(updatedWorkOrder.actual_hours),
        production_line_id: updatedWorkOrder.production_line_id,
        production_line_name: updatedWorkOrder.production_line_name,
        assigned_operator_ids: updatedWorkOrder.assigned_operator_ids || [],
        created_by: updatedWorkOrder.created_by,
        created_at: updatedWorkOrder.created_at,
        updated_by: updatedWorkOrder.updated_by,
        updated_at: updatedWorkOrder.updated_at,
        started_at: updatedWorkOrder.started_at,
        completed_at: updatedWorkOrder.completed_at,
        notes: updatedWorkOrder.notes,
        specifications: updatedWorkOrder.specifications
      };

      return completedWorkOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Auto-consume materials from BOM when work order is completed without production run
   * This ensures inventory is properly adjusted based on planned requirements
   */
  private static async autoConsumeMaterialsFromBOM(
    client: any,
    workOrderId: string,
    workOrder: any,
    userId: string
  ): Promise<void> {
    const action = "UpdateWorkOrderMediator.autoConsumeMaterialsFromBOM";

    try {
      // Get material requirements for this work order
      const requirementsResult = await client.query(
        `SELECT * FROM work_order_material_requirements WHERE work_order_id = $1`,
        [workOrderId]
      );

      if (requirementsResult.rows.length === 0) {
        MyLogger.info(`${action}: No material requirements found for work order`, {
          workOrderId
        });
        return;
      }

      const requirements = requirementsResult.rows;
      const workOrderQuantity = parseFloat(workOrder.quantity) || 1;

      // Get user name for logging
      const userResult = await client.query(
        'SELECT full_name as name FROM users WHERE id = $1',
        [userId]
      );
      const userName = userResult.rows[0]?.name || userId;

      for (const requirement of requirements) {
        const materialId = requirement.material_id;
        const requiredQuantity = parseFloat(requirement.required_quantity) || 0;
        
        if (requiredQuantity <= 0) continue;

        // Calculate actual consumption based on work order quantity
        const consumedQuantity = requiredQuantity;

        // Record consumption
        await client.query(
          `INSERT INTO work_order_material_consumptions (
            work_order_id,
            material_id,
            material_name,
            consumed_quantity,
            consumption_date,
            consumed_by,
            notes
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)`,
          [
            workOrderId,
            materialId,
            requirement.material_name,
            consumedQuantity,
            userId,
            'Auto-consumed based on BOM when work order completed without production run'
          ]
        );

        // Update inventory - reduce available quantity
        await client.query(
          `UPDATE products 
           SET 
             current_stock = GREATEST(current_stock - $1, 0),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [consumedQuantity, materialId]
        );

        // Update requirement status
        await client.query(
          `UPDATE work_order_material_requirements
           SET 
             consumed_quantity = $1,
             status = 'consumed',
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [consumedQuantity, requirement.id]
        );

        MyLogger.info(`${action}: Material auto-consumed`, {
          workOrderId,
          materialId,
          materialName: requirement.material_name,
          consumedQuantity,
          requiredQuantity
        });
      }

      MyLogger.success(`${action}: Successfully auto-consumed ${requirements.length} materials`, {
        workOrderId,
        userId,
        userName
      });

    } catch (error) {
      MyLogger.error(`${action}: Error auto-consuming materials`, error, {
        workOrderId,
        userId
      });
      throw error;
    }
  }
}
