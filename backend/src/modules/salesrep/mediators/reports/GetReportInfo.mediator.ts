import {
  SalesRepReport,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class GetReportInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Get reports with optional filters
  async getReports(reportType?: string, dateFrom?: string, dateTo?: string): Promise<SalesRepReport[]> {
    let action = 'Get Reports';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { reportType, dateFrom, dateTo });

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (reportType) {
        conditions.push(`report_type = $${paramIndex}`);
        values.push(reportType);
        paramIndex++;
      }

      if (dateFrom) {
        conditions.push(`date_range_from >= $${paramIndex}`);
        values.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        conditions.push(`date_range_to <= $${paramIndex}`);
        values.push(dateTo);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const reportsQuery = `
        SELECT
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
        FROM sales_rep_reports
        ${whereClause}
        ORDER BY generated_at DESC
      `;

      const reportsResult = await client.query(reportsQuery, values);

      MyLogger.success(action, {
        reportType,
        dateFrom,
        dateTo,
        returnedCount: reportsResult.rows.length
      });

      return reportsResult.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { reportType, dateFrom, dateTo });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single report by ID
  async getReport(id: number): Promise<SalesRepReport | null> {
    let action = 'Get Report By ID';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { reportId: id });

      const reportQuery = `
        SELECT
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
        FROM sales_rep_reports
        WHERE id = $1
      `;

      const result = await client.query(reportQuery, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { reportId: id, found: false });
        return null;
      }

      const report = result.rows[0];

      MyLogger.success(action, {
        reportId: id,
        reportType: report.report_type,
        title: report.title,
        found: true
      });

      return report;
    } catch (error: any) {
      MyLogger.error(action, error, { reportId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get report statistics
  async getReportStats(): Promise<any> {
    let action = 'Get Report Statistics';
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT
          COUNT(*) as total_reports,
          COUNT(*) FILTER (WHERE report_type = 'sales_summary') as sales_summary_reports,
          COUNT(*) FILTER (WHERE report_type = 'customer_performance') as customer_performance_reports,
          COUNT(*) FILTER (WHERE report_type = 'order_analysis') as order_analysis_reports,
          COUNT(*) FILTER (WHERE report_type = 'payment_collection') as payment_collection_reports,
          COUNT(*) FILTER (WHERE generated_at >= CURRENT_DATE - INTERVAL '30 days') as recent_reports
        FROM sales_rep_reports
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      MyLogger.success(action, {
        totalReports: parseInt(stats.total_reports),
        salesSummaryReports: parseInt(stats.sales_summary_reports),
        customerPerformanceReports: parseInt(stats.customer_performance_reports),
        orderAnalysisReports: parseInt(stats.order_analysis_reports),
        paymentCollectionReports: parseInt(stats.payment_collection_reports),
        recentReports: parseInt(stats.recent_reports)
      });

      return {
        totalReports: parseInt(stats.total_reports),
        salesSummaryReports: parseInt(stats.sales_summary_reports),
        customerPerformanceReports: parseInt(stats.customer_performance_reports),
        orderAnalysisReports: parseInt(stats.order_analysis_reports),
        paymentCollectionReports: parseInt(stats.payment_collection_reports),
        recentReports: parseInt(stats.recent_reports)
      };
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetReportInfoMediator();
