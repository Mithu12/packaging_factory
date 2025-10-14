import pool from "@/database/connection";
import { UpdateCustomerOrderRequest, FactoryCustomerOrder, ApproveOrderRequest, UpdateOrderStatusRequest, FactoryCustomerOrderStatus, CreateWorkOrderRequest } from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";
import { AddWorkOrderMediator } from "../workOrders/AddWorkOrder.mediator";
import { eventBus, EVENT_NAMES } from "@/utils/eventBus";
import { recalcFactoryCustomerFinancials } from "../../utils/customerFinancials";

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
  return result.rows[0].role_id === 1;
}

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

function ensureFutureIsoDate(dateValue?: string | null): string {
  const fallback = new Date(Date.now() + ONE_HOUR_IN_MS);

  if (!dateValue) {
    return fallback.toISOString();
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
    return fallback.toISOString();
  }

  return parsedDate.toISOString();
}

async function autoCreateDraftWorkOrders(order: FactoryCustomerOrder, userId: string): Promise<void> {
  const action = "UpdateCustomerOrderInfoMediator.autoCreateDraftWorkOrders";

  if (!order.line_items || order.line_items.length === 0) {
    MyLogger.info(action, {
      orderId: order.id,
      message: "No line items found; skipping work order generation",
    });
    return;
  }

  const existingWorkOrders = await pool.query(
    "SELECT id FROM work_orders WHERE customer_order_id = $1 LIMIT 1",
    [order.id]
  );

  if (existingWorkOrders.rows.length > 0) {
    MyLogger.info(action, {
      orderId: order.id,
      message: "Work orders already exist for this customer order; skipping auto-generation",
    });
    return;
  }

  const generatedWorkOrderIds: string[] = [];

  try {
    for (const lineItem of order.line_items) {
      const productId = lineItem.product_id?.toString();
      const quantity = Number(lineItem.quantity);

      if (!productId) {
        MyLogger.warn(action, {
          orderId: order.id,
          lineItemId: lineItem.id,
          message: "Line item missing product reference; skipping work order generation for this item",
        });
        continue;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        MyLogger.warn(action, {
          orderId: order.id,
          lineItemId: lineItem.id,
          productId,
          quantity,
          message: "Invalid quantity detected; skipping work order generation for this item",
        });
        continue;
      }

      const deadlineSource = lineItem.delivery_date || order.required_date;
      const workOrderPayload: CreateWorkOrderRequest = {
        customer_order_id: order.id,
        product_id: productId,
        quantity,
        deadline: ensureFutureIsoDate(deadlineSource),
        priority: order.priority || "medium",
        estimated_hours: Math.max(1, Math.round(quantity)),
        notes: `Auto-generated from customer order ${order.order_number} (line: ${lineItem.product_name}).`,
        specifications: lineItem.specifications || undefined,
      };

      const createdWorkOrder = await AddWorkOrderMediator.createWorkOrder(workOrderPayload, userId);
      generatedWorkOrderIds.push(createdWorkOrder.id);

      MyLogger.info(action, {
        orderId: order.id,
        lineItemId: lineItem.id,
        workOrderId: createdWorkOrder.id,
        workOrderNumber: createdWorkOrder.work_order_number,
      });
    }
  } catch (error) {
    MyLogger.error(action, error, {
      orderId: order.id,
      generatedCount: generatedWorkOrderIds.length,
    });

    // Attempt to clean up any partially created work orders to keep state consistent
    for (const workOrderId of generatedWorkOrderIds) {
      try {
        await pool.query("DELETE FROM work_orders WHERE id = $1", [workOrderId]);
        MyLogger.warn(action, {
          orderId: order.id,
          workOrderId,
          message: "Rolled back auto-generated work order after failure",
        });
      } catch (cleanupError: any) {
        MyLogger.error(`${action}.cleanup`, cleanupError, {
          orderId: order.id,
          workOrderId,
        });
      }
    }

    throw error;
  }
}

export class UpdateCustomerOrderInfoMediator {
  static async updateCustomerOrder(
    orderId: string,
    updateData: UpdateCustomerOrderRequest,
    userId: string
  ): Promise<FactoryCustomerOrder> {
    const action = "UpdateCustomerOrderInfoMediator.updateCustomerOrder";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      MyLogger.info(action, { orderId, userId, updateFields: Object.keys(updateData) });

      // Get user's accessible factories for filtering
      const currentUserId = parseInt(userId);
      let userFactories: string[] = [];
      if (currentUserId) {
        const isAdmin = await isUserAdmin(currentUserId);
        if (!isAdmin) {
          const factories = await getUserFactories(currentUserId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      // Check if order exists and get current data, with factory access control
      let existingOrderQuery = "SELECT * FROM factory_customer_orders WHERE id = $1";
      let queryParams: any[] = [orderId];

      if (currentUserId && userFactories.length > 0) {
        const factoryIds = userFactories.map((_, index) => `$${queryParams.length + index + 1}`);
        existingOrderQuery += ` AND factory_id IN (${factoryIds.join(', ')})`;
        queryParams.push(...userFactories);
      }

      const existingOrderResult = await client.query(existingOrderQuery, queryParams);

      if (existingOrderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${orderId} not found or access denied`);
      }

      const existingOrder = existingOrderResult.rows[0];

      // Check if order can be updated (not in certain statuses)
      if (['completed', 'shipped'].includes(existingOrder.status)) {
        throw new Error(`Cannot update order in ${existingOrder.status} status`);
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.required_date) {
        updateFields.push(`required_date = $${paramIndex}`);
        updateValues.push(new Date(updateData.required_date));
        paramIndex++;
      }

      if (updateData.factory_id) {
        updateFields.push(`factory_id = $${paramIndex}`);
        updateValues.push(updateData.factory_id);
        paramIndex++;
      }

      if (updateData.priority) {
        updateFields.push(`priority = $${paramIndex}`);
        updateValues.push(updateData.priority);
        paramIndex++;
      }

      if (updateData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(updateData.notes && updateData.notes.trim() !== '' ? updateData.notes : null);
        paramIndex++;
      }

      if (updateData.terms !== undefined) {
        updateFields.push(`terms = $${paramIndex}`);
        updateValues.push(updateData.terms && updateData.terms.trim() !== '' ? updateData.terms : null);
        paramIndex++;
      }

      if (updateData.payment_terms) {
        updateFields.push(`payment_terms = $${paramIndex}`);
        updateValues.push(updateData.payment_terms);
        paramIndex++;
      }

      if (updateData.shipping_address) {
        updateFields.push(`shipping_address = $${paramIndex}`);
        updateValues.push(JSON.stringify(updateData.shipping_address));
        paramIndex++;
      }

      if (updateData.billing_address) {
        updateFields.push(`billing_address = $${paramIndex}`);
        updateValues.push(JSON.stringify(updateData.billing_address));
        paramIndex++;
      }

      // Always update the updated_by and updated_at fields
      updateFields.push(`updated_by = $${paramIndex}`, `updated_at = $${paramIndex + 1}`);
      updateValues.push(userId, new Date());
      paramIndex += 2;

      // Handle line items update if provided
      let newTotalValue = existingOrder.total_value;
      if (updateData.line_items) {
        // Delete existing line items
        await client.query('DELETE FROM factory_customer_order_line_items WHERE order_id = $1', [orderId]);

        // Insert new line items and calculate new total
        newTotalValue = 0;
        for (const item of updateData.line_items) {
          
          // Get product details
          const productQuery = "SELECT name, sku, unit_of_measure, status FROM products WHERE id = $1";
          const productResult = await client.query(productQuery, [item.product_id]);
          
          if (productResult.rows.length === 0) {
            throw new Error(`Product with ID ${item.product_id} not found`);
          }

          if (productResult.rows[0].status !== 'active') {
            throw new Error(`Product ${productResult.rows[0].name} is not active`);
          }

          const product = productResult.rows[0];
          const discountAmount = item.discount_percentage 
            ? (item.unit_price * item.quantity * item.discount_percentage) / 100 
            : 0;
          const lineTotal = (item.unit_price * item.quantity) - discountAmount;
          newTotalValue += lineTotal;

          const lineItemQuery = `
            INSERT INTO factory_customer_order_line_items (
              order_id, product_id, product_name, product_sku, description,
              quantity, unit_price, discount_percentage, discount_amount, line_total,
              unit_of_measure, specifications, delivery_date, is_optional, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            )
          `;

          const lineItemValues = [
            orderId,
            item.product_id,
            product.name,
            product.sku,
            item.specifications && item.specifications.trim() !== '' ? item.specifications : null,
            item.quantity,
            item.unit_price,
            item.discount_percentage && item.discount_percentage > 0 ? item.discount_percentage : null,
            discountAmount,
            lineTotal,
            product.unit_of_measure,
            item.specifications && item.specifications.trim() !== '' ? item.specifications : null,
            item.delivery_date ? new Date(item.delivery_date) : null,
            item.is_optional || false,
            new Date()
          ];

          await client.query(lineItemQuery, lineItemValues);
        }

        // Update total value
        updateFields.push(`total_value = $${paramIndex}`);
        updateValues.push(newTotalValue);
        paramIndex++;
      }

      // Execute update query
      if (updateFields.length > 2) { // More than just updated_by and updated_at
        updateValues.push(orderId); // Add orderId for WHERE clause
        const updateQuery = `
          UPDATE factory_customer_orders 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, updateValues);

        await recalcFactoryCustomerFinancials(client, existingOrder.factory_customer_id);

        await client.query('COMMIT');

        // Get updated order with line items
        const { GetCustomerOrderInfoMediator } = await import('./GetCustomerOrderInfo.mediator');
        const updatedOrder = await GetCustomerOrderInfoMediator.getCustomerOrderById(orderId);

        MyLogger.success(action, { 
          orderId, 
          updatedFields: updateFields.length - 2, // Exclude updated_by and updated_at
          newTotalValue: updatedOrder?.total_value 
        });

        return updatedOrder!;
      } else {
        await client.query('ROLLBACK');
        throw new Error('No fields to update');
      }

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async approveOrder(
    approvalData: ApproveOrderRequest,
    userId: string
  ): Promise<FactoryCustomerOrder> {
    const action = "UpdateCustomerOrderInfoMediator.approveOrder";
    const client = await pool.connect();
    let transactionActive = false;

    try {
      await client.query('BEGIN');
      transactionActive = true;

      MyLogger.info(action, {
        orderId: approvalData.order_id,
        approved: approvalData.approved,
        userId
      });

      // Get user's accessible factories for filtering
      const currentUserId = parseInt(userId);
      let userFactories: string[] = [];
      if (currentUserId) {
        const isAdmin = await isUserAdmin(currentUserId);
        if (!isAdmin) {
          const factories = await getUserFactories(currentUserId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      // Check if order exists and is in correct status, with factory access control
      let orderQuery = "SELECT * FROM factory_customer_orders WHERE id = $1";
      let queryParams: any[] = [approvalData.order_id];

      if (currentUserId && userFactories.length > 0) {
        const factoryIds = userFactories.map((_, index) => `$${queryParams.length + index + 1}`);
        orderQuery += ` AND factory_id IN (${factoryIds.join(', ')})`;
        queryParams.push(...userFactories);
      }

      const orderResult = await client.query(orderQuery, queryParams);

      if (orderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${approvalData.order_id} not found or access denied`);
      }

      const order = orderResult.rows[0];
      const previousStatus = order.status;
      const previousNotes = order.notes;
      
      if (!['pending', 'quoted'].includes(order.status)) {
        throw new Error(`Order cannot be approved from ${order.status} status`);
      }

      const newStatus = approvalData.approved ? 'approved' : 'rejected';
      const updateQuery = `
        UPDATE factory_customer_orders 
        SET 
          status = $1,
          approved_by = $2,
          approved_at = $3,
          updated_by = $2,
          updated_at = $3,
          notes = $4
        WHERE id = $5
        RETURNING *
      `;

      const updateValues = [
        newStatus,
        userId,
        new Date(),
        approvalData.notes && approvalData.notes.trim() !== '' ? approvalData.notes : null,
        approvalData.order_id
      ];

      await client.query(updateQuery, updateValues);

      await recalcFactoryCustomerFinancials(client, order.factory_customer_id);

      await client.query('COMMIT');
      transactionActive = false;

      // Get updated order
      const { GetCustomerOrderInfoMediator } = await import('./GetCustomerOrderInfo.mediator');
      const updatedOrder = await GetCustomerOrderInfoMediator.getCustomerOrderById(approvalData.order_id.toString());

      if (approvalData.approved && updatedOrder) {
        try {
          await autoCreateDraftWorkOrders(updatedOrder, userId);
        } catch (autoCreationError: any) {
          MyLogger.error(`${action}.autoCreate`, autoCreationError, {
            orderId: approvalData.order_id,
            message: "Auto-generation of work orders failed; reverting customer order status",
          });

          await pool.query(
            `
              UPDATE factory_customer_orders
              SET
                status = $1,
                approved_by = NULL,
                approved_at = NULL,
                notes = $2,
                updated_by = $3,
                updated_at = $4
              WHERE id = $5
            `,
            [
              previousStatus,
              previousNotes || null,
              userId,
              new Date(),
              approvalData.order_id,
            ]
          );

          throw autoCreationError;
        }
      }

      MyLogger.success(action, { 
        orderId: approvalData.order_id, 
        newStatus,
        approved: approvalData.approved 
      });

      // Emit event for accounts integration (if order was approved)
      if (approvalData.approved && updatedOrder) {
        try {
          MyLogger.info(`${action}.eventData`, {
            factoryId: updatedOrder.factory_id,
            factoryName: updatedOrder.factory_name,
            factoryCostCenterId: updatedOrder.factory_cost_center_id,
            factoryCostCenterName: updatedOrder.factory_cost_center_name
          });
          
          eventBus.emit(EVENT_NAMES.FACTORY_ORDER_APPROVED, {
            orderData: {
              orderId: updatedOrder.id,
              orderNumber: updatedOrder.order_number,
              customerId: updatedOrder.factory_customer_id,
              customerName: updatedOrder.factory_customer_name,
              customerEmail: updatedOrder.factory_customer_email,
              totalValue: updatedOrder.total_value,
              currency: updatedOrder.currency || 'BDT',
              orderDate: updatedOrder.order_date || new Date().toISOString(),
              factoryId: updatedOrder.factory_id,
              factoryName: updatedOrder.factory_name,
              factoryCostCenterId: updatedOrder.factory_cost_center_id,
              lineItems: updatedOrder.line_items,
              notes: approvalData.notes
            },
            userId: parseInt(userId)
          });
        } catch (eventError: any) {
          // Log error but don't fail the operation
          MyLogger.error(`${action}.eventEmit`, eventError, {
            orderId: approvalData.order_id,
            message: 'Failed to emit FACTORY_ORDER_APPROVED event, but order approval succeeded'
          });
        }
      }

      return updatedOrder!;

    } catch (error: any) {
      if (transactionActive) {
        await client.query('ROLLBACK');
      }
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateOrderStatus(
    statusData: UpdateOrderStatusRequest,
    userId: string
  ): Promise<FactoryCustomerOrder> {
    const action = "UpdateCustomerOrderInfoMediator.updateOrderStatus";
    const client = await pool.connect();
    let transactionActive = false;

    try {
      await client.query('BEGIN');
      transactionActive = true;

      MyLogger.info(action, {
        orderId: statusData.order_id,
        newStatus: statusData.status,
        userId
      });

      // Get user's accessible factories for filtering
      const currentUserId = parseInt(userId);
      let userFactories: string[] = [];
      if (currentUserId) {
        const isAdmin = await isUserAdmin(currentUserId);
        if (!isAdmin) {
          const factories = await getUserFactories(currentUserId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      // Check if order exists, with factory access control
      let orderQuery = "SELECT * FROM factory_customer_orders WHERE id = $1";
      let queryParams: any[] = [statusData.order_id];

      if (currentUserId && userFactories.length > 0) {
        const factoryIds = userFactories.map((_, index) => `$${queryParams.length + index + 1}`);
        orderQuery += ` AND factory_id IN (${factoryIds.join(', ')})`;
        queryParams.push(...userFactories);
      }

      const orderResult = await client.query(orderQuery, queryParams);

      if (orderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${statusData.order_id} not found or access denied`);
      }

      const order = orderResult.rows[0];

      // Validate status transition
      const validTransitions: { [key: string]: string[] } = {
        'draft': ['pending', 'cancelled'],
        'pending': ['quoted', 'approved', 'rejected'],
        'quoted': ['approved', 'rejected', 'pending'],
        'approved': ['in_production', 'rejected'],
        'rejected': ['pending', 'quoted'],
        'in_production': ['completed'],
        'completed': ['shipped'],
        'shipped': [] // Final status
      };

      if (!validTransitions[order.status]?.includes(statusData.status)) {
        throw new Error(`Invalid status transition from ${order.status} to ${statusData.status}`);
      }

      const updateQuery = `
        UPDATE factory_customer_orders 
        SET 
          status = $1,
          notes = $2,
          updated_by = $3,
          updated_at = $4
        WHERE id = $5
        RETURNING *
      `;

      const updateValues = [
        statusData.status,
        statusData.notes && statusData.notes.trim() !== '' ? statusData.notes : null,
        userId,
        new Date(),
        statusData.order_id
      ];

      await client.query(updateQuery, updateValues);

      await recalcFactoryCustomerFinancials(client, order.factory_customer_id);

      await client.query('COMMIT');
      transactionActive = false;

      // Get updated order
      const { GetCustomerOrderInfoMediator } = await import('./GetCustomerOrderInfo.mediator');
      const updatedOrder = await GetCustomerOrderInfoMediator.getCustomerOrderById(statusData.order_id.toString());

      MyLogger.success(action, { 
        orderId: statusData.order_id, 
        oldStatus: order.status,
        newStatus: statusData.status 
      });

      return updatedOrder!;

    } catch (error: any) {
      if (transactionActive) {
        await client.query('ROLLBACK');
      }
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async bulkUpdateOrderStatus(
    orderIds: string[],
    status: string,
    userId: string,
    notes?: string
  ): Promise<{ updated: number; errors: string[] }> {
    const action = "UpdateCustomerOrderInfoMediator.bulkUpdateOrderStatus";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      MyLogger.info(action, { 
        orderCount: orderIds.length, 
        newStatus: status, 
        userId 
      });

      let updated = 0;
      const errors: string[] = [];

      for (const orderId of orderIds) {
        try {
          await this.updateOrderStatus({ order_id: Number(orderId), status: status as FactoryCustomerOrderStatus, notes }, userId);
          updated++;
        } catch (error: any) {
          errors.push(`Order ${orderId}: ${error.message}`);
        }
      }

      await client.query('COMMIT');

      MyLogger.success(action, { 
        totalOrders: orderIds.length,
        updated, 
        errors: errors.length 
      });

      return { updated, errors };

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default UpdateCustomerOrderInfoMediator;
