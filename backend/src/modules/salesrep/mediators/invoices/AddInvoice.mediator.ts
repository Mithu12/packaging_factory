import {
  SalesRepInvoice,
  CreateInvoiceRequest,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class AddInvoiceMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Create new invoice
  async createInvoice(data: CreateInvoiceRequest, salesRepId?: number): Promise<SalesRepInvoice> {
    let action = 'Create Invoice';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { invoiceData: data, salesRepId });

      // Validate order exists
      const orderQuery = `
        SELECT o.id, o.final_amount, o.status, c.name as customer_name
        FROM sales_rep_orders o
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `;
      const orderResult = await client.query(orderQuery, [data.order_id]);

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }

      const order = orderResult.rows[0];

      // Check if invoice already exists for this order
      const existingInvoiceQuery = 'SELECT id FROM sales_rep_invoices WHERE order_id = $1';
      const existingInvoiceResult = await client.query(existingInvoiceQuery, [data.order_id]);

      if (existingInvoiceResult.rows.length > 0) {
        throw new Error('Invoice already exists for this order');
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(client);

      // Calculate due date (30 days from invoice date)
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Insert invoice
      const insertInvoiceQuery = `
        INSERT INTO sales_rep_invoices (
          order_id,
          invoice_number,
          invoice_date,
          due_date,
          status,
          total_amount,
          paid_amount,
          balance_amount,
          sales_rep_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id,
          order_id,
          invoice_number,
          invoice_date,
          due_date,
          status,
          total_amount,
          paid_amount,
          balance_amount,
          sales_rep_id,
          created_at,
          updated_at
      `;

      const invoiceResult = await client.query(insertInvoiceQuery, [
        data.order_id,
        invoiceNumber,
        invoiceDate,
        dueDate,
        'draft',
        order.final_amount,
        0,
        order.final_amount,
        salesRepId || null
      ]);

      const invoice = invoiceResult.rows[0];

      // Update order status to invoiced
      await client.query(
        'UPDATE sales_rep_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['processing', data.order_id]
      );

      await client.query('COMMIT');
      MyLogger.success(action, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        orderId: data.order_id,
        customerName: order.customer_name,
        totalAmount: invoice.total_amount,
        salesRepId: invoice.sales_rep_id
      });

      // Return the complete invoice with order and customer data
      return await this.getCompleteInvoice(client, invoice.id);
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { invoiceData: data, salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Send invoice (update status to sent)
  async sendInvoice(id: number): Promise<SalesRepInvoice | null> {
    let action = 'Send Invoice';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { invoiceId: id });

      // Check if invoice exists
      const existingInvoice = await this.getInvoice(id);
      if (!existingInvoice) {
        throw new Error('Invoice not found');
      }

      // Update invoice status to sent
      const updateQuery = `
        UPDATE sales_rep_invoices SET
          status = 'sent',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          order_id,
          invoice_number,
          invoice_date,
          due_date,
          status,
          total_amount,
          paid_amount,
          balance_amount,
          sales_rep_id,
          created_at,
          updated_at
      `;

      const result = await client.query(updateQuery, [id]);
      const invoice = result.rows[0];

      await client.query('COMMIT');
      MyLogger.success(action, {
        invoiceId: id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        sent: true
      });

      // Return the complete invoice with order and customer data
      return await this.getCompleteInvoice(client, id);
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { invoiceId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate unique invoice number
  private async generateInvoiceNumber(client: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const countQuery = `
      SELECT COUNT(*) as count
      FROM sales_rep_invoices
      WHERE invoice_date::date = $1
    `;

    const countResult = await client.query(countQuery, [today]);
    const count = parseInt(countResult.rows[0].count);

    return `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Get invoice by ID (helper method)
  private async getInvoice(id: number): Promise<any | null> {
    const invoiceQuery = `
      SELECT
        i.id,
        i.order_id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.status,
        i.total_amount,
        i.paid_amount,
        i.balance_amount,
        i.sales_rep_id,
        i.created_at,
        i.updated_at
      FROM sales_rep_invoices i
      WHERE i.id = $1
    `;

    const result = await pool.query(invoiceQuery, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get complete invoice with order and customer data (helper method)
  private async getCompleteInvoice(client: any, invoiceId: number): Promise<SalesRepInvoice> {
    const invoiceQuery = `
      SELECT
        i.id,
        i.order_id,
        i.invoice_number,
        i.invoice_date,
        i.due_date,
        i.status,
        i.total_amount,
        i.paid_amount,
        i.balance_amount,
        i.sales_rep_id,
        i.created_at,
        i.updated_at,
        o.order_number,
        o.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.postal_code as customer_postal_code
      FROM sales_rep_invoices i
      JOIN sales_rep_orders o ON i.order_id = o.id
      LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
      WHERE i.id = $1
    `;

    const invoiceResult = await client.query(invoiceQuery, [invoiceId]);
    const invoiceRow = invoiceResult.rows[0];

    return {
      ...invoiceRow,
      order: {
        id: invoiceRow.order_id,
        order_number: invoiceRow.order_number,
        customer_id: invoiceRow.customer_id,
        customer: invoiceRow.customer_id ? {
          id: invoiceRow.customer_id,
          name: invoiceRow.customer_name,
          email: invoiceRow.customer_email,
          phone: invoiceRow.customer_phone,
          address: invoiceRow.customer_address,
          city: invoiceRow.customer_city,
          state: invoiceRow.customer_state,
          postal_code: invoiceRow.customer_postal_code,
          credit_limit: 0,
          current_balance: 0,
          sales_rep_id: null,
          created_at: new Date(),
          updated_at: new Date()
        } : undefined
      }
    };
  }
}

export default new AddInvoiceMediator();
