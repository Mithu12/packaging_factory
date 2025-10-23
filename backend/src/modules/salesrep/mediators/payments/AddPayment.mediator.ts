import {
  SalesRepPayment,
  CreatePaymentRequest,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class AddPaymentMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Create new payment
  async createPayment(data: CreatePaymentRequest, salesRepId?: number): Promise<SalesRepPayment> {
    let action = 'Create Payment';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { paymentData: data, salesRepId });

      // Validate invoice exists
      const invoiceQuery = `
        SELECT i.id, i.total_amount, i.paid_amount, i.balance_amount, i.status,
               o.order_number, o.customer_id, c.name as customer_name
        FROM sales_rep_invoices i
        JOIN sales_rep_orders o ON i.order_id = o.id
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        WHERE i.id = $1
      `;
      const invoiceResult = await client.query(invoiceQuery, [data.invoice_id]);

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoiceResult.rows[0];

      // Validate payment amount doesn't exceed balance
      if (data.amount > invoice.balance_amount) {
        throw new Error(`Payment amount (${data.amount}) cannot exceed outstanding balance (${invoice.balance_amount})`);
      }

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber(client);

      // Insert payment
      const insertPaymentQuery = `
        INSERT INTO sales_rep_payments (
          invoice_id,
          payment_number,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          sales_rep_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          invoice_id,
          payment_number,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          sales_rep_id,
          created_at,
          updated_at
      `;

      const paymentResult = await client.query(insertPaymentQuery, [
        data.invoice_id,
        paymentNumber,
        new Date(),
        data.amount,
        data.payment_method,
        data.reference_number || null,
        data.notes || null,
        salesRepId || null
      ]);

      const payment = paymentResult.rows[0];

      // Update invoice amounts
      const newPaidAmount = invoice.paid_amount + data.amount;
      const newBalanceAmount = invoice.balance_amount - data.amount;
      const newStatus = newBalanceAmount <= 0 ? 'paid' : invoice.status;

      await client.query(
        'UPDATE sales_rep_invoices SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [newPaidAmount, newBalanceAmount, newStatus, data.invoice_id]
      );

      await client.query('COMMIT');
      MyLogger.success(action, {
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        invoiceId: data.invoice_id,
        customerName: invoice.customer_name,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        newBalance: newBalanceAmount,
        salesRepId: payment.sales_rep_id
      });

      // Return the complete payment with invoice and customer data
      return await this.getCompletePayment(client, payment.id);
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { paymentData: data, salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate unique payment number
  private async generatePaymentNumber(client: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const countQuery = `
      SELECT COUNT(*) as count
      FROM sales_rep_payments
      WHERE payment_date::date = $1
    `;

    const countResult = await client.query(countQuery, [today]);
    const count = parseInt(countResult.rows[0].count);

    return `PAY-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Get complete payment with invoice and customer data (helper method)
  private async getCompletePayment(client: any, paymentId: number): Promise<SalesRepPayment> {
    const paymentQuery = `
      SELECT
        p.id,
        p.invoice_id,
        p.payment_number,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.notes,
        p.sales_rep_id,
        p.created_at,
        p.updated_at,
        i.invoice_number,
        i.order_id,
        o.order_number,
        o.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.postal_code as customer_postal_code
      FROM sales_rep_payments p
      JOIN sales_rep_invoices i ON p.invoice_id = i.id
      JOIN sales_rep_orders o ON i.order_id = o.id
      LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
      WHERE p.id = $1
    `;

    const paymentResult = await client.query(paymentQuery, [paymentId]);
    const paymentRow = paymentResult.rows[0];

    return {
      ...paymentRow,
      invoice: {
        id: paymentRow.invoice_id,
        order_id: paymentRow.order_id,
        invoice_number: paymentRow.invoice_number,
        invoice_date: new Date(),
        due_date: new Date(),
        status: 'sent',
        total_amount: 0,
        paid_amount: 0,
        balance_amount: 0,
        sales_rep_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        order: {
          id: paymentRow.order_id,
          order_number: paymentRow.order_number,
          customer_id: paymentRow.customer_id,
          customer: paymentRow.customer_id ? {
            id: paymentRow.customer_id,
            name: paymentRow.customer_name,
            email: paymentRow.customer_email,
            phone: paymentRow.customer_phone,
            address: paymentRow.customer_address,
            city: paymentRow.customer_city,
            state: paymentRow.customer_state,
            postal_code: paymentRow.customer_postal_code,
            credit_limit: 0,
            current_balance: 0,
            sales_rep_id: null,
            created_at: new Date(),
            updated_at: new Date()
          } : undefined
        }
      }
    };
  }
}

export default new AddPaymentMediator();
