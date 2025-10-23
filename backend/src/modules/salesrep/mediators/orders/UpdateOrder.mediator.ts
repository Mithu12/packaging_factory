import {
  SalesRepOrder,
  UpdateOrderRequest,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class UpdateOrderMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Update order
  async updateOrder(id: number, data: UpdateOrderRequest): Promise<SalesRepOrder | null> {
    let action = 'Update Order';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { orderId: id, updateData: data });

      // Check if order exists
      const existingOrder = await this.getOrder(id);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      // Calculate new totals
      let totalAmount = existingOrder.total_amount;
      let discountAmount = data.discount_amount !== undefined ? data.discount_amount : existingOrder.discount_amount;
      let taxAmount = data.tax_amount !== undefined ? data.tax_amount : existingOrder.tax_amount;

      // If items are updated, recalculate total
      if (data.items) {
        totalAmount = data.items.reduce((sum, item) => {
          return sum + (item.quantity * item.unit_price);
        }, 0);
      }

      const finalAmount = totalAmount - discountAmount + taxAmount;

      // Update order
      const updateQuery = `
        UPDATE sales_rep_orders SET
          customer_id = $1,
          total_amount = $2,
          discount_amount = $3,
          tax_amount = $4,
          final_amount = $5,
          notes = $6,
          status = COALESCE($7, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING
          id,
          customer_id,
          order_number,
          order_date,
          status,
          total_amount,
          discount_amount,
          tax_amount,
          final_amount,
          sales_rep_id,
          notes,
          created_at,
          updated_at
      `;

      const result = await client.query(updateQuery, [
        data.customer_id,
        totalAmount,
        discountAmount,
        taxAmount,
        finalAmount,
        data.notes || existingOrder.notes,
        data.status,
        id
      ]);

      const order = result.rows[0];

      // Update order items if provided
      if (data.items) {
        await this.updateOrderItems(client, id, data.items);
      }

      await client.query('COMMIT');
      MyLogger.success(action, {
        orderId: id,
        orderNumber: order.order_number,
        status: order.status,
        updatedFields: Object.keys(data),
        finalAmount: order.final_amount
      });

      // Return the complete order with customer and items
      return await this.getCompleteOrder(client, id);
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { orderId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update order status
  async updateOrderStatus(id: number, status: string, notes?: string): Promise<SalesRepOrder | null> {
    let action = 'Update Order Status';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { orderId: id, status, notes });

      // Check if order exists
      const existingOrder = await this.getOrder(id);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      // Update order status and notes
      const updateQuery = `
        UPDATE sales_rep_orders SET
          status = $1,
          notes = COALESCE($2, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING
          id,
          customer_id,
          order_number,
          order_date,
          status,
          total_amount,
          discount_amount,
          tax_amount,
          final_amount,
          sales_rep_id,
          notes,
          created_at,
          updated_at
      `;

      const result = await client.query(updateQuery, [status, notes, id]);
      const order = result.rows[0];

      await client.query('COMMIT');
      MyLogger.success(action, {
        orderId: id,
        orderNumber: order.order_number,
        oldStatus: existingOrder.status,
        newStatus: status,
        updated: true
      });

      // Return the complete order with customer and items
      return await this.getCompleteOrder(client, id);
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { orderId: id, status, notes });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get order by ID (helper method)
  private async getOrder(id: number): Promise<any | null> {
    const orderQuery = `
      SELECT
        o.id,
        o.customer_id,
        o.order_number,
        o.order_date,
        o.status,
        o.total_amount,
        o.discount_amount,
        o.tax_amount,
        o.final_amount,
        o.sales_rep_id,
        o.notes,
        o.created_at,
        o.updated_at
      FROM sales_rep_orders o
      WHERE o.id = $1
    `;

    const result = await pool.query(orderQuery, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Update order items
  private async updateOrderItems(client: any, orderId: number, items: any[]): Promise<void> {
    // Delete existing items
    const deleteQuery = 'DELETE FROM sales_rep_order_items WHERE order_id = $1';
    await client.query(deleteQuery, [orderId]);

    // Insert new items
    const insertItemQuery = `
      INSERT INTO sales_rep_order_items (
        order_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        discount,
        total_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (const item of items) {
      const totalPrice = (item.quantity * item.unit_price) - item.discount;

      await client.query(insertItemQuery, [
        orderId,
        item.product_id || null,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.discount || 0,
        totalPrice
      ]);
    }
  }

  // Get complete order with customer and items (helper method)
  private async getCompleteOrder(client: any, orderId: number): Promise<SalesRepOrder> {
    const orderQuery = `
      SELECT
        o.id,
        o.customer_id,
        o.order_number,
        o.order_date,
        o.status,
        o.total_amount,
        o.discount_amount,
        o.tax_amount,
        o.final_amount,
        o.sales_rep_id,
        o.notes,
        o.created_at,
        o.updated_at,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.postal_code as customer_postal_code
      FROM sales_rep_orders o
      LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `;

    const orderResult = await client.query(orderQuery, [orderId]);
    const orderRow = orderResult.rows[0];

    // Get order items
    const itemsQuery = `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.unit_price,
        oi.discount,
        oi.total_price,
        oi.created_at,
        oi.updated_at
      FROM sales_rep_order_items oi
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `;

    const itemsResult = await client.query(itemsQuery, [orderId]);

    return {
      ...orderRow,
      customer: orderRow.customer_id ? {
        id: orderRow.customer_id,
        name: orderRow.customer_name,
        email: orderRow.customer_email,
        phone: orderRow.customer_phone,
        address: orderRow.customer_address,
        city: orderRow.customer_city,
        state: orderRow.customer_state,
        postal_code: orderRow.customer_postal_code,
        credit_limit: 0,
        current_balance: 0,
        sales_rep_id: null,
        created_at: new Date(),
        updated_at: new Date()
      } : undefined,
      items: itemsResult.rows
    };
  }
}

export default new UpdateOrderMediator();
