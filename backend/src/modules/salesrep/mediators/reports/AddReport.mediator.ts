import {
  SalesRepReport,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class AddReportMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Generate report based on type and date range
  async generateReport(reportType: string, dateFrom: string, dateTo: string, generatedBy?: number): Promise<SalesRepReport> {
    let action = 'Generate Report';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { reportType, dateFrom, dateTo, generatedBy });

      // Generate report data based on type
      let reportData: any = {};

      switch (reportType) {
        case 'sales_summary':
          reportData = await this.generateSalesSummaryReport(client, dateFrom, dateTo);
          break;
        case 'customer_performance':
          reportData = await this.generateCustomerPerformanceReport(client, dateFrom, dateTo);
          break;
        case 'order_analysis':
          reportData = await this.generateOrderAnalysisReport(client, dateFrom, dateTo);
          break;
        case 'payment_collection':
          reportData = await this.generatePaymentCollectionReport(client, dateFrom, dateTo);
          break;
        default:
          throw new Error('Invalid report type');
      }

      const title = `${reportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report`;

      // Insert report
      const insertReportQuery = `
        INSERT INTO sales_rep_reports (
          report_type,
          title,
          date_range_from,
          date_range_to,
          data,
          generated_by,
          generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          report_type,
          title,
          date_range_from,
          date_range_to,
          data,
          generated_by,
          generated_at,
          created_at,
          updated_at
      `;

      const reportResult = await client.query(insertReportQuery, [
        reportType,
        title,
        new Date(dateFrom),
        new Date(dateTo),
        reportData,
        generatedBy || null,
        new Date()
      ]);

      const report = reportResult.rows[0];

      await client.query('COMMIT');
      MyLogger.success(action, {
        reportId: report.id,
        reportType: report.report_type,
        title: report.title,
        dateFrom: report.date_range_from,
        dateTo: report.date_range_to,
        generatedBy: report.generated_by,
        dataPoints: Object.keys(reportData).length
      });

      return report;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { reportType, dateFrom, dateTo, generatedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate sales summary report
  private async generateSalesSummaryReport(client: any, dateFrom: string, dateTo: string): Promise<any> {
    const ordersQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(final_amount), 0) as total_sales,
        COALESCE(AVG(final_amount), 0) as average_order_value,
        status,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
      FROM sales_rep_orders
      WHERE order_date BETWEEN $1 AND $2
      GROUP BY status
    `;

    const ordersResult = await client.query(ordersQuery, [dateFrom, dateTo]);

    const summary = ordersResult.rows;
    const totalOrders = summary.reduce((sum, row) => sum + parseInt(row.total_orders), 0);
    const totalSales = summary.reduce((sum, row) => sum + parseFloat(row.total_sales), 0);

    return {
      summary,
      date_range: { from: dateFrom, to: dateTo },
      totals: {
        total_orders: totalOrders,
        total_sales: totalSales,
        delivered_orders: summary.find(s => s.status === 'delivered')?.delivered_orders || 0,
        cancelled_orders: summary.find(s => s.status === 'cancelled')?.cancelled_orders || 0
      }
    };
  }

  // Generate customer performance report
  private async generateCustomerPerformanceReport(client: any, dateFrom: string, dateTo: string): Promise<any> {
    const customersQuery = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.city,
        c.state,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.final_amount), 0) as total_revenue,
        COALESCE(AVG(o.final_amount), 0) as average_order_value,
        MAX(o.order_date) as last_order_date
      FROM sales_rep_customers c
      LEFT JOIN sales_rep_orders o ON c.id = o.customer_id
        AND o.order_date BETWEEN $1 AND $2
        AND o.status != 'cancelled'
      GROUP BY c.id, c.name, c.email, c.phone, c.city, c.state
      ORDER BY total_revenue DESC
    `;

    const customersResult = await client.query(customersQuery, [dateFrom, dateTo]);

    return {
      customers: customersResult.rows,
      date_range: { from: dateFrom, to: dateTo },
      summary: {
        total_customers: customersResult.rows.length,
        active_customers: customersResult.rows.filter(c => parseInt(c.total_orders) > 0).length,
        top_customer: customersResult.rows[0] || null
      }
    };
  }

  // Generate order analysis report
  private async generateOrderAnalysisReport(client: any, dateFrom: string, dateTo: string): Promise<any> {
    const ordersQuery = `
      SELECT
        o.id,
        o.order_number,
        o.order_date,
        o.status,
        o.total_amount,
        o.discount_amount,
        o.tax_amount,
        o.final_amount,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        COUNT(oi.id) as item_count,
        COALESCE(SUM(oi.quantity), 0) as total_quantity
      FROM sales_rep_orders o
      LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
      LEFT JOIN sales_rep_order_items oi ON o.id = oi.order_id
      WHERE o.order_date BETWEEN $1 AND $2
      GROUP BY o.id, o.order_number, o.order_date, o.status, o.total_amount,
               o.discount_amount, o.tax_amount, o.final_amount,
               c.name, c.email, c.phone
      ORDER BY o.order_date DESC
    `;

    const ordersResult = await client.query(ordersQuery, [dateFrom, dateTo]);

    return {
      orders: ordersResult.rows,
      date_range: { from: dateFrom, to: dateTo },
      summary: {
        total_orders: ordersResult.rows.length,
        total_revenue: ordersResult.rows.reduce((sum, order) => sum + parseFloat(order.final_amount), 0),
        average_order_value: ordersResult.rows.length > 0
          ? ordersResult.rows.reduce((sum, order) => sum + parseFloat(order.final_amount), 0) / ordersResult.rows.length
          : 0
      }
    };
  }

  // Generate payment collection report
  private async generatePaymentCollectionReport(client: any, dateFrom: string, dateTo: string): Promise<any> {
    const paymentsQuery = `
      SELECT
        p.id,
        p.payment_number,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.notes,
        i.invoice_number,
        o.order_number,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone
      FROM sales_rep_payments p
      JOIN sales_rep_invoices i ON p.invoice_id = i.id
      JOIN sales_rep_orders o ON i.order_id = o.id
      LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
      WHERE p.payment_date BETWEEN $1 AND $2
      ORDER BY p.payment_date DESC
    `;

    const paymentsResult = await client.query(paymentsQuery, [dateFrom, dateTo]);

    const totalAmount = paymentsResult.rows.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    return {
      payments: paymentsResult.rows,
      date_range: { from: dateFrom, to: dateTo },
      summary: {
        total_payments: paymentsResult.rows.length,
        total_amount: totalAmount,
        average_payment: paymentsResult.rows.length > 0 ? totalAmount / paymentsResult.rows.length : 0,
        payment_methods: this.groupByPaymentMethod(paymentsResult.rows)
      }
    };
  }

  // Helper method to group payments by method
  private groupByPaymentMethod(payments: any[]): any {
    const methods: { [key: string]: { count: number, total: number } } = {};

    payments.forEach(payment => {
      if (!methods[payment.payment_method]) {
        methods[payment.payment_method] = { count: 0, total: 0 };
      }
      methods[payment.payment_method].count++;
      methods[payment.payment_method].total += parseFloat(payment.amount);
    });

    return methods;
  }
}

export default new AddReportMediator();
