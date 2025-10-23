import {
  SalesRepPayment,
  PaymentFilters,
  PaginationParams,
  PaginatedResponse,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class GetPaymentInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Get paginated list of payments with filters
  async getPayments(filters?: PaymentFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepPayment>> {
    let action = 'Get Payments';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters, pagination });

      const {
        page = 1,
        limit = 10,
        customer_id,
        payment_method,
        date_from,
        date_to,
        min_amount,
        max_amount,
      } = filters || {};

      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (customer_id) {
        conditions.push(`o.customer_id = $${paramIndex}`);
        values.push(customer_id);
        paramIndex++;
      }

      if (payment_method) {
        conditions.push(`p.payment_method = $${paramIndex}`);
        values.push(payment_method);
        paramIndex++;
      }

      if (date_from) {
        conditions.push(`p.payment_date >= $${paramIndex}`);
        values.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        conditions.push(`p.payment_date <= $${paramIndex}`);
        values.push(date_to);
        paramIndex++;
      }

      if (min_amount !== undefined) {
        conditions.push(`p.amount >= $${paramIndex}`);
        values.push(min_amount);
        paramIndex++;
      }

      if (max_amount !== undefined) {
        conditions.push(`p.amount <= $${paramIndex}`);
        values.push(max_amount);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_payments p
        JOIN sales_rep_invoices i ON p.invoice_id = i.id
        JOIN sales_rep_orders o ON i.order_id = o.id
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get payments with related data
      const paymentsQuery = `
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
          o.order_number,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
        FROM sales_rep_payments p
        JOIN sales_rep_invoices i ON p.invoice_id = i.id
        JOIN sales_rep_orders o ON i.order_id = o.id
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const paymentsResult = await client.query(paymentsQuery, values);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: paymentsResult.rows.length,
        filters: Object.keys(filters || {}).length
      });

      return {
        data: paymentsResult.rows,
        page,
        limit,
        total,
        totalPages
      };
    } catch (error: any) {
      MyLogger.error(action, error, { filters, pagination });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single payment by ID
  async getPayment(id: number): Promise<SalesRepPayment | null> {
    let action = 'Get Payment By ID';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { paymentId: id });

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

      const result = await client.query(paymentQuery, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { paymentId: id, found: false });
        return null;
      }

      const paymentRow = result.rows[0];

      const payment: SalesRepPayment = {
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

      MyLogger.success(action, {
        paymentId: id,
        paymentNumber: payment.payment_number,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        found: true
      });

      return payment;
    } catch (error: any) {
      MyLogger.error(action, error, { paymentId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get payment statistics
  async getPaymentStats(): Promise<any> {
    let action = 'Get Payment Statistics';
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT
          COUNT(*) as total_payments,
          COUNT(*) FILTER (WHERE payment_method = 'cash') as cash_payments,
          COUNT(*) FILTER (WHERE payment_method = 'bank_transfer') as bank_transfer_payments,
          COUNT(*) FILTER (WHERE payment_method = 'cheque') as cheque_payments,
          COUNT(*) FILTER (WHERE payment_method = 'credit_card') as credit_card_payments,
          COALESCE(SUM(amount), 0) as total_payment_amount,
          COALESCE(AVG(amount), 0) as average_payment_amount
        FROM sales_rep_payments
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      MyLogger.success(action, {
        totalPayments: parseInt(stats.total_payments),
        cashPayments: parseInt(stats.cash_payments),
        bankTransferPayments: parseInt(stats.bank_transfer_payments),
        chequePayments: parseInt(stats.cheque_payments),
        creditCardPayments: parseInt(stats.credit_card_payments),
        totalPaymentAmount: parseFloat(stats.total_payment_amount),
        averagePaymentAmount: parseFloat(stats.average_payment_amount)
      });

      return {
        totalPayments: parseInt(stats.total_payments),
        cashPayments: parseInt(stats.cash_payments),
        bankTransferPayments: parseInt(stats.bank_transfer_payments),
        chequePayments: parseInt(stats.cheque_payments),
        creditCardPayments: parseInt(stats.credit_card_payments),
        totalPaymentAmount: parseFloat(stats.total_payment_amount),
        averagePaymentAmount: parseFloat(stats.average_payment_amount)
      };
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetPaymentInfoMediator();
