import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class DeleteOrderMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Delete order
  async deleteOrder(id: number): Promise<void> {
    let action = 'Delete Order';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { orderId: id });

      // Check if order exists
      const existingOrder = await this.getOrder(id);
      if (!existingOrder) {
        throw new Error('Order not found');
      }

      // Check if order can be deleted (not shipped or delivered)
      if (['shipped', 'delivered'].includes(existingOrder.status)) {
        throw new Error('Cannot delete order that has been shipped or delivered');
      }

      // Check if order has invoices or payments
      const invoiceCount = await this.getInvoiceCount(client, id);
      if (invoiceCount > 0) {
        throw new Error('Cannot delete order with existing invoices');
      }

      const paymentCount = await this.getPaymentCount(client, id);
      if (paymentCount > 0) {
        throw new Error('Cannot delete order with existing payments');
      }

      // Delete order items first (due to foreign key constraint)
      const deleteItemsQuery = 'DELETE FROM sales_rep_order_items WHERE order_id = $1';
      await client.query(deleteItemsQuery, [id]);

      // Delete order
      const deleteQuery = 'DELETE FROM sales_rep_orders WHERE id = $1';
      await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      MyLogger.success(action, {
        orderId: id,
        orderNumber: existingOrder.order_number,
        status: existingOrder.status,
        deleted: true
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { orderId: id });
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
        o.order_number,
        o.status,
        o.final_amount,
        o.created_at
      FROM sales_rep_orders o
      WHERE o.id = $1
    `;

    const result = await pool.query(orderQuery, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get invoice count for order (helper method)
  private async getInvoiceCount(client: any, orderId: number): Promise<number> {
    const countQuery = `
      SELECT COUNT(*) as count
      FROM sales_rep_invoices i
      JOIN sales_rep_orders o ON i.order_id = o.id
      WHERE o.id = $1
    `;

    const result = await client.query(countQuery, [orderId]);
    return parseInt(result.rows[0].count);
  }

  // Get payment count for order (helper method)
  private async getPaymentCount(client: any, orderId: number): Promise<number> {
    const countQuery = `
      SELECT COUNT(*) as count
      FROM sales_rep_payments p
      JOIN sales_rep_invoices i ON p.invoice_id = i.id
      JOIN sales_rep_orders o ON i.order_id = o.id
      WHERE o.id = $1
    `;

    const result = await client.query(countQuery, [orderId]);
    return parseInt(result.rows[0].count);
  }
}

export default new DeleteOrderMediator();
