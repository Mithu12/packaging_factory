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
  const isCurrentlyReserved = RESERVING_STATUSES.has(currentWorkOrder.status);

  if (!(isCurrentlyReserved && (newQuantity !== currentQuantity || newProductId !== currentProductId))) {
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

      // Handle stock reservation updates
      await handleStockReservationUpdate(client, workOrderId, updateData, existingWorkOrder);

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

      if (!validTransitions[currentWorkOrder.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentWorkOrder.status} to ${newStatus}`);
      }

      const supportsReservedStock = await hasReservedStockColumn();
      const currentQuantity = parseFloat(currentWorkOrder.quantity) || 0;
      const previousProductId = currentWorkOrder.product_id;
      const hasInventoryTarget = supportsReservedStock && previousProductId && currentQuantity > 0;
      const enteringReservedState =
        hasInventoryTarget &&
        RESERVING_STATUSES.has(newStatus) &&
        !RESERVING_STATUSES.has(currentWorkOrder.status);
      const leavingReservedState =
        hasInventoryTarget &&
        RESERVING_STATUSES.has(currentWorkOrder.status) &&
        !RESERVING_STATUSES.has(newStatus) &&
        !MAINTAIN_STATUSES.has(newStatus);

      if (enteringReservedState) {
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
        if (enteringReservedState) {
          await client.query(
            `UPDATE products
             SET reserved_stock = reserved_stock + $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [quantity, productId]
          );
        }

        if (leavingReservedState) {
          await client.query(
            `UPDATE products
             SET reserved_stock = GREATEST(reserved_stock - $1, 0), updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [quantity, productId]
          );
        }

        if (RELEASING_STATUSES.has(newStatus)) {
          MyLogger.info("Stock released for completed/cancelled work order", {
            workOrderId,
            productId,
            quantity,
            newStatus
          });
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

      return workOrder;

    } catch (error) {
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

      // Release reserved stock before deleting
      if (
        supportsReservedStock &&
        RESERVING_STATUSES.has(workOrder.status) &&
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

      return { deleted };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
