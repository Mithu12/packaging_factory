import {
  SalesRepInvoice,
  InvoiceFilters,
  PaginationParams,
  PaginatedResponse,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class GetInvoiceInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Get paginated list of invoices with filters
  async getInvoices(filters?: InvoiceFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepInvoice>> {
    let action = 'Get Invoices';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters, pagination });

      const {
        page = 1,
        limit = 10,
        customer_id,
        status,
        date_from,
        date_to,
        min_amount,
        max_amount,
        overdue_only,
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

      if (status) {
        conditions.push(`i.status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (date_from) {
        conditions.push(`i.invoice_date >= $${paramIndex}`);
        values.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        conditions.push(`i.invoice_date <= $${paramIndex}`);
        values.push(date_to);
        paramIndex++;
      }

      if (min_amount !== undefined) {
        conditions.push(`i.total_amount >= $${paramIndex}`);
        values.push(min_amount);
        paramIndex++;
      }

      if (max_amount !== undefined) {
        conditions.push(`i.total_amount <= $${paramIndex}`);
        values.push(max_amount);
        paramIndex++;
      }

      if (overdue_only) {
        conditions.push(`i.due_date < CURRENT_DATE AND i.status != $${paramIndex}`);
        values.push('paid');
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_invoices i
        JOIN sales_rep_orders o ON i.order_id = o.id
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get invoices with related data
      const invoicesQuery = `
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
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
        FROM sales_rep_invoices i
        JOIN sales_rep_orders o ON i.order_id = o.id
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const invoicesResult = await client.query(invoicesQuery, values);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: invoicesResult.rows.length,
        filters: Object.keys(filters || {}).length
      });

      return {
        data: invoicesResult.rows,
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

  // Get single invoice by ID
  async getInvoice(id: number): Promise<SalesRepInvoice | null> {
    let action = 'Get Invoice By ID';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { invoiceId: id });

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

      const result = await client.query(invoiceQuery, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { invoiceId: id, found: false });
        return null;
      }

      const invoiceRow = result.rows[0];

      const invoice: SalesRepInvoice = {
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

      MyLogger.success(action, {
        invoiceId: id,
        invoiceNumber: invoice.invoice_number,
        status: invoice.status,
        balance: invoice.balance_amount,
        found: true
      });

      return invoice;
    } catch (error: any) {
      MyLogger.error(action, error, { invoiceId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get invoice statistics
  async getInvoiceStats(): Promise<any> {
    let action = 'Get Invoice Statistics';
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT
          COUNT(*) as total_invoices,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_invoices,
          COUNT(*) FILTER (WHERE status = 'sent') as sent_invoices,
          COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
          COUNT(*) FILTER (WHERE status = 'overdue') as overdue_invoices,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_invoices,
          COALESCE(SUM(total_amount), 0) as total_invoice_value,
          COALESCE(SUM(balance_amount), 0) as total_outstanding,
          COALESCE(AVG(balance_amount), 0) as average_outstanding
        FROM sales_rep_invoices
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      MyLogger.success(action, {
        totalInvoices: parseInt(stats.total_invoices),
        draftInvoices: parseInt(stats.draft_invoices),
        sentInvoices: parseInt(stats.sent_invoices),
        paidInvoices: parseInt(stats.paid_invoices),
        overdueInvoices: parseInt(stats.overdue_invoices),
        cancelledInvoices: parseInt(stats.cancelled_invoices),
        totalInvoiceValue: parseFloat(stats.total_invoice_value),
        totalOutstanding: parseFloat(stats.total_outstanding),
        averageOutstanding: parseFloat(stats.average_outstanding)
      });

      return {
        totalInvoices: parseInt(stats.total_invoices),
        draftInvoices: parseInt(stats.draft_invoices),
        sentInvoices: parseInt(stats.sent_invoices),
        paidInvoices: parseInt(stats.paid_invoices),
        overdueInvoices: parseInt(stats.overdue_invoices),
        cancelledInvoices: parseInt(stats.cancelled_invoices),
        totalInvoiceValue: parseFloat(stats.total_invoice_value),
        totalOutstanding: parseFloat(stats.total_outstanding),
        averageOutstanding: parseFloat(stats.average_outstanding)
      };
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetInvoiceInfoMediator();
