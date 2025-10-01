import pool from "@/database/connection";
import { UpdateCustomerOrderRequest, FactoryCustomerOrder, ApproveOrderRequest, UpdateOrderStatusRequest, FactoryCustomerOrderStatus } from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";

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

      // Check if order exists and get current data
      const existingOrderQuery = "SELECT * FROM factory_customer_orders WHERE id = $1";
      const existingOrderResult = await client.query(existingOrderQuery, [orderId]);
      
      if (existingOrderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${orderId} not found`);
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

      if (updateData.priority) {
        updateFields.push(`priority = $${paramIndex}`);
        updateValues.push(updateData.priority);
        paramIndex++;
      }

      if (updateData.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(updateData.notes || null);
        paramIndex++;
      }

      if (updateData.terms !== undefined) {
        updateFields.push(`terms = $${paramIndex}`);
        updateValues.push(updateData.terms || null);
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
            item.specifications || null,
            item.quantity,
            item.unit_price,
            item.discount_percentage || null,
            discountAmount,
            lineTotal,
            product.unit_of_measure,
            item.specifications || null,
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

    try {
      MyLogger.info(action, { 
        orderId: approvalData.order_id, 
        approved: approvalData.approved, 
        userId 
      });

      // Check if order exists and is in correct status
      const orderQuery = "SELECT * FROM factory_customer_orders WHERE id = $1";
      const orderResult = await client.query(orderQuery, [approvalData.order_id]);
      
      if (orderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${approvalData.order_id} not found`);
      }

      const order = orderResult.rows[0];
      
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
          notes = CASE 
            WHEN $4 IS NOT NULL THEN COALESCE(notes, '') || CASE WHEN notes IS NOT NULL THEN E'\n' ELSE '' END || $4
            ELSE notes 
          END,
          updated_by = $2,
          updated_at = $3
        WHERE id = $5
        RETURNING *
      `;

      const updateValues = [
        newStatus,
        userId,
        new Date(),
        approvalData.notes || null,
        approvalData.order_id
      ];

      await client.query(updateQuery, updateValues);

      // Get updated order
      const { GetCustomerOrderInfoMediator } = await import('./GetCustomerOrderInfo.mediator');
      const updatedOrder = await GetCustomerOrderInfoMediator.getCustomerOrderById(approvalData.order_id);

      MyLogger.success(action, { 
        orderId: approvalData.order_id, 
        newStatus,
        approved: approvalData.approved 
      });

      return updatedOrder!;

    } catch (error: any) {
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

    try {
      MyLogger.info(action, { 
        orderId: statusData.order_id, 
        newStatus: statusData.status, 
        userId 
      });

      // Check if order exists
      const orderQuery = "SELECT * FROM factory_customer_orders WHERE id = $1";
      const orderResult = await client.query(orderQuery, [statusData.order_id]);
      
      if (orderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${statusData.order_id} not found`);
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
          notes = CASE 
            WHEN $2 IS NOT NULL THEN COALESCE(notes, '') || CASE WHEN notes IS NOT NULL THEN E'\n' ELSE '' END || $2
            ELSE notes 
          END,
          updated_by = $3,
          updated_at = $4
        WHERE id = $5
        RETURNING *
      `;

      const updateValues = [
        statusData.status,
        statusData.notes || null,
        userId,
        new Date(),
        statusData.order_id
      ];

      await client.query(updateQuery, updateValues);

      // Get updated order
      const { GetCustomerOrderInfoMediator } = await import('./GetCustomerOrderInfo.mediator');
      const updatedOrder = await GetCustomerOrderInfoMediator.getCustomerOrderById(statusData.order_id);

      MyLogger.success(action, { 
        orderId: statusData.order_id, 
        oldStatus: order.status,
        newStatus: statusData.status 
      });

      return updatedOrder!;

    } catch (error: any) {
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
          await this.updateOrderStatus({ order_id: orderId, status: status as FactoryCustomerOrderStatus, notes }, userId);
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
