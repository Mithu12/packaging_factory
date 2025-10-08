import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

export interface ProductionRunQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  work_order_id?: string;
  production_line_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ProductionRunStats {
  total_runs: number;
  active_runs: number;
  completed_runs: number;
  total_produced: number;
  average_efficiency: number;
  average_quality: number;
  total_downtime_hours: number;
}

export class GetProductionRunInfoMediator {
  static async getProductionRuns(
    params: ProductionRunQueryParams,
    userId: number
  ): Promise<{
    production_runs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const action = 'Get Production Runs';

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        status,
        work_order_id,
        production_line_id,
        sort_by = 'actual_start_time',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(pr.run_number ILIKE $${paramIndex} OR wo.work_order_number ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status && status !== '') {
        whereConditions.push(`pr.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (work_order_id) {
        whereConditions.push(`pr.work_order_id = $${paramIndex}`);
        queryParams.push(work_order_id);
        paramIndex++;
      }

      if (production_line_id) {
        whereConditions.push(`pr.production_line_id = $${paramIndex}`);
        queryParams.push(production_line_id);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT pr.id) as count
        FROM production_runs pr
        JOIN work_orders wo ON pr.work_order_id = wo.id
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get production runs with details
      const runsQuery = `
        SELECT 
          pr.*,
          wo.work_order_number,
          pl.name as production_line_name,
          u.full_name as operator_name
        FROM production_runs pr
        JOIN work_orders wo ON pr.work_order_id = wo.id
        LEFT JOIN production_lines pl ON pr.production_line_id = pl.id
        LEFT JOIN operators o ON pr.operator_id = o.id
        join users u on pr.operator_id = u.id
        WHERE ${whereClause}
        ORDER BY pr.${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const runsResult = await pool.query(runsQuery, queryParams);

      MyLogger.success(action, { total, page, limit });

      return {
        production_runs: runsResult.rows,
        total,
        page,
        limit
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async getProductionRunById(
    runId: string,
    userId: number
  ): Promise<any> {
    const action = 'Get Production Run By ID';

    try {
      MyLogger.info(action, { runId, userId });

      const query = `
        SELECT 
          pr.*,
          wo.work_order_number,
          wo.product_name,
          pl.name as production_line_name,
          o.name as operator_name,
          u1.full_name as started_by_name,
          u2.full_name as completed_by_name
        FROM production_runs pr
        JOIN work_orders wo ON pr.work_order_id = wo.id
        LEFT JOIN production_lines pl ON pr.production_line_id = pl.id
        LEFT JOIN operators o ON pr.operator_id = o.id
        LEFT JOIN users u1 ON pr.started_by = u1.id
        LEFT JOIN users u2 ON pr.completed_by = u2.id
        WHERE pr.id = $1
      `;

      const result = await pool.query(query, [runId]);

      if (result.rows.length === 0) {
        throw createError('Production run not found', 404);
      }

      // Get events
      const eventsResult = await pool.query(
        `SELECT * FROM production_run_events 
         WHERE production_run_id = $1 
         ORDER BY event_timestamp DESC`,
        [runId]
      );

      // Get downtime
      const downtimeResult = await pool.query(
        `SELECT * FROM production_downtime 
         WHERE production_run_id = $1 
         ORDER BY start_time DESC`,
        [runId]
      );

      const productionRun = {
        ...result.rows[0],
        events: eventsResult.rows,
        downtime: downtimeResult.rows
      };

      MyLogger.success(action, { runId });

      return productionRun;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async getProductionRunStats(userId: number): Promise<ProductionRunStats> {
    const action = 'Get Production Run Stats';

    try {
      MyLogger.info(action, { userId });

      const query = `
        SELECT 
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE status = 'in_progress') as active_runs,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_runs,
          COALESCE(SUM(produced_quantity), 0) as total_produced,
          COALESCE(AVG(efficiency_percentage), 0) as average_efficiency,
          COALESCE(AVG(quality_percentage), 0) as average_quality,
          COALESCE(SUM(total_downtime_minutes) / 60.0, 0) as total_downtime_hours
        FROM production_runs
      `;

      const result = await pool.query(query);
      const stats = result.rows[0];

      MyLogger.success(action, stats);

      return {
        total_runs: parseInt(stats.total_runs) || 0,
        active_runs: parseInt(stats.active_runs) || 0,
        completed_runs: parseInt(stats.completed_runs) || 0,
        total_produced: parseFloat(stats.total_produced) || 0,
        average_efficiency: parseFloat(stats.average_efficiency) || 0,
        average_quality: parseFloat(stats.average_quality) || 0,
        total_downtime_hours: parseFloat(stats.total_downtime_hours) || 0
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

