import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  MaterialCostAnalysis,
  CostVariance,
  CostTrend,
  CostCenter,
  CostAnalysisQueryParams,
  CostVarianceQueryParams,
  CostTrendQueryParams,
  CostCenterQueryParams
} from '@/types/bom';

export class CostAnalysisMediator {
  // Get material cost analyses with filtering and pagination
  static async getMaterialCostAnalyses(
    params: CostAnalysisQueryParams,
    userId: number
  ): Promise<{
    analyses: MaterialCostAnalysis[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const action = 'GetMaterialCostAnalyses';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        work_order_id,
        product_id,
        start_date,
        end_date,
        sort_by = 'total_cost',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(`(
          wo.work_order_number ILIKE $${paramIndex} OR
          wo.product_name ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (work_order_id) {
        whereConditions.push(`wo.id = $${paramIndex}`);
        queryParams.push(work_order_id);
        paramIndex++;
      }

      if (product_id) {
        whereConditions.push(`wo.product_id = $${paramIndex}`);
        queryParams.push(product_id);
        paramIndex++;
      }

      if (start_date) {
        whereConditions.push(`wo.created_at >= $${paramIndex}`);
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereConditions.push(`wo.created_at <= $${paramIndex}`);
        queryParams.push(end_date);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT wo.id) as total
        FROM work_orders wo
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get analyses with material breakdown
      const analysesQuery = `
        SELECT
          wo.id as work_order_id,
          wo.work_order_number,
          wo.product_name,
          wo.quantity,
          wo.total_material_cost as material_cost,
          wo.total_labor_cost as labor_cost,
          wo.total_overhead_cost as overhead_cost,
          (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) as total_cost,
          CASE
            WHEN wo.quantity > 0 THEN (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) / wo.quantity
            ELSE 0
          END as cost_per_unit,
          -- Calculate planned vs actual variance (simplified - using estimated vs actual)
          (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) - (wo.quantity * 10) as cost_variance, -- Simplified planned cost calculation
          CASE
            WHEN (wo.quantity * 10) > 0 THEN
              ((wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) - (wo.quantity * 10)) / (wo.quantity * 10) * 100
            ELSE 0
          END as cost_variance_percentage
        FROM work_orders wo
        ${whereClause}
        ORDER BY ${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const analysesResult = await client.query(analysesQuery, queryParams);

      // Get material breakdown for each work order
      const analyses: MaterialCostAnalysis[] = [];

      for (const row of analysesResult.rows) {
        // Get material breakdown
        const breakdownQuery = `
          SELECT
            wmc.material_id,
            p.name as material_name,
            p.cost_price as unit_cost,
            wmc.consumed_quantity as quantity_used,
            (wmc.consumed_quantity * p.cost_price) as total_cost,
            CASE
              WHEN (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) > 0
              THEN ((wmc.consumed_quantity * p.cost_price) / (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost)) * 100
              ELSE 0
            END as cost_percentage,
            wmc.wastage_quantity,
            (wmc.wastage_quantity * p.cost_price) as wastage_cost
          FROM work_order_material_consumptions wmc
          JOIN products p ON wmc.material_id = p.id
          JOIN work_orders wo ON wmc.work_order_id = wo.id
          WHERE wo.id = $1
          ORDER BY total_cost DESC
        `;

        const breakdownResult = await client.query(breakdownQuery, [row.work_order_id]);

        const materialBreakdown = breakdownResult.rows.map(b => ({
          material_id: b.material_id,
          material_name: b.material_name,
          unit_cost: parseFloat(b.unit_cost),
          total_cost: parseFloat(b.total_cost),
          quantity_used: parseFloat(b.quantity_used),
          cost_percentage: parseFloat(b.cost_percentage),
          wastage_quantity: parseFloat(b.wastage_quantity),
          wastage_cost: parseFloat(b.wastage_cost)
        }));

        analyses.push({
          work_order_id: row.work_order_id,
          work_order_number: row.work_order_number,
          product_name: row.product_name,
          quantity: parseFloat(row.quantity),
          material_cost: parseFloat(row.material_cost),
          labor_cost: parseFloat(row.labor_cost),
          overhead_cost: parseFloat(row.overhead_cost),
          total_cost: parseFloat(row.total_cost),
          cost_per_unit: parseFloat(row.cost_per_unit),
          material_breakdown: materialBreakdown,
          cost_variance: parseFloat(row.cost_variance),
          cost_variance_percentage: parseFloat(row.cost_variance_percentage)
        });
      }

      MyLogger.success(action, { count: analyses.length, total, page, totalPages });

      return {
        analyses,
        total,
        page,
        limit,
        total_pages: totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get cost variances
  static async getCostVariances(
    params: CostVarianceQueryParams,
    userId: number
  ): Promise<{
    variances: CostVariance[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const action = 'GetCostVariances';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        status,
        min_variance,
        max_variance,
        start_date,
        end_date,
        sort_by = 'variance',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(`(
          wo.work_order_number ILIKE $${paramIndex} OR
          wo.product_name ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`CASE
          WHEN (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) < (wo.quantity * 10) THEN 'favorable'
          WHEN (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) > (wo.quantity * 10) THEN 'unfavorable'
          ELSE 'on_target'
        END = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (min_variance !== undefined) {
        whereConditions.push(`(wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) - (wo.quantity * 10) >= $${paramIndex}`);
        queryParams.push(min_variance);
        paramIndex++;
      }

      if (max_variance !== undefined) {
        whereConditions.push(`(wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) - (wo.quantity * 10) <= $${paramIndex}`);
        queryParams.push(max_variance);
        paramIndex++;
      }

      if (start_date) {
        whereConditions.push(`wo.created_at >= $${paramIndex}`);
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereConditions.push(`wo.created_at <= $${paramIndex}`);
        queryParams.push(end_date);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM work_orders wo
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get variances
      const variancesQuery = `
        SELECT
          wo.id as work_order_id,
          wo.work_order_number,
          wo.product_name,
          (wo.quantity * 10) as planned_cost, -- Simplified planned cost
          (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) as actual_cost,
          (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) - (wo.quantity * 10) as variance,
          CASE
            WHEN (wo.quantity * 10) > 0 THEN
              ((wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) - (wo.quantity * 10)) / (wo.quantity * 10) * 100
            ELSE 0
          END as variance_percentage,
          CASE
            WHEN (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) < (wo.quantity * 10) THEN 'favorable'
            WHEN (wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) > (wo.quantity * 10) THEN 'unfavorable'
            ELSE 'on_target'
          END as status
        FROM work_orders wo
        ${whereClause}
        ORDER BY ${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const variancesResult = await client.query(variancesQuery, queryParams);

      const variances: CostVariance[] = variancesResult.rows.map(row => ({
        work_order_id: row.work_order_id,
        work_order_number: row.work_order_number,
        product_name: row.product_name,
        planned_cost: parseFloat(row.planned_cost),
        actual_cost: parseFloat(row.actual_cost),
        variance: parseFloat(row.variance),
        variance_percentage: parseFloat(row.variance_percentage),
        status: row.status
      }));

      MyLogger.success(action, { count: variances.length, total, page, totalPages });

      return {
        variances,
        total,
        page,
        limit,
        total_pages: totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get cost trends over time
  static async getCostTrends(
    params: CostTrendQueryParams,
    userId: number
  ): Promise<CostTrend[]> {
    const action = 'GetCostTrends';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      const {
        period_type = 'month',
        start_date,
        end_date
      } = params;

      // Build date range based on period type
      let dateFormat: string;
      let groupByClause: string;

      switch (period_type) {
        case 'month':
          dateFormat = 'YYYY-MM';
          groupByClause = "TO_CHAR(wo.created_at, 'YYYY-MM')";
          break;
        case 'quarter':
          dateFormat = 'YYYY-Q';
          groupByClause = "TO_CHAR(wo.created_at, 'YYYY-\"Q\"Q')";
          break;
        case 'year':
          dateFormat = 'YYYY';
          groupByClause = "TO_CHAR(wo.created_at, 'YYYY')";
          break;
        default:
          dateFormat = 'YYYY-MM';
          groupByClause = "TO_CHAR(wo.created_at, 'YYYY-MM')";
      }

      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (start_date) {
        whereConditions.push(`wo.created_at >= $${paramIndex}`);
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        whereConditions.push(`wo.created_at <= $${paramIndex}`);
        queryParams.push(end_date);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const trendsQuery = `
        SELECT
          ${groupByClause} as period,
          COALESCE(SUM(wo.total_material_cost), 0) as material_cost,
          COALESCE(SUM(wo.total_labor_cost), 0) as labor_cost,
          COALESCE(SUM(wo.total_overhead_cost), 0) as overhead_cost,
          COALESCE(SUM(wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost), 0) as total_cost,
          CASE
            WHEN SUM(wo.quantity) > 0 THEN
              SUM(wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) / SUM(wo.quantity)
            ELSE 0
          END as cost_per_unit
        FROM work_orders wo
        ${whereClause}
        GROUP BY ${groupByClause}
        ORDER BY period
      `;

      const trendsResult = await client.query(trendsQuery, queryParams);

      const trends: CostTrend[] = trendsResult.rows.map(row => ({
        period: row.period,
        material_cost: parseFloat(row.material_cost),
        labor_cost: parseFloat(row.labor_cost),
        overhead_cost: parseFloat(row.overhead_cost),
        total_cost: parseFloat(row.total_cost),
        cost_per_unit: parseFloat(row.cost_per_unit)
      }));

      MyLogger.success(action, { count: trends.length });

      return trends;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get cost centers analysis
  static async getCostCenters(
    params: CostCenterQueryParams,
    userId: number
  ): Promise<{
    cost_centers: CostCenter[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const action = 'GetCostCenters';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      // For now, we'll simulate cost centers using production lines
      // In a real implementation, you'd have a dedicated cost_centers table

      const {
        page = 1,
        limit = 20,
        search,
        sort_by = 'total_cost',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;

      // Get production lines as cost centers
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`pl.name ILIKE $${paramIndex}`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM production_lines pl
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Get cost center data (aggregated from work orders)
      const costCentersQuery = `
        SELECT
          pl.id,
          pl.name,
          COALESCE(SUM(wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost), 0) as total_cost,
          COALESCE(SUM(wo.total_material_cost), 0) as material_cost,
          COALESCE(SUM(wo.total_labor_cost), 0) as labor_cost,
          COALESCE(SUM(wo.total_overhead_cost), 0) as overhead_cost,
          -- Calculate efficiency (simplified - based on completion rate)
          CASE
            WHEN COUNT(wo.id) > 0 THEN
              (COUNT(CASE WHEN wo.status = 'completed' THEN 1 END)::float / COUNT(wo.id)::float) * 100
            ELSE 0
          END as efficiency,
          -- Calculate variance (simplified)
          COALESCE(SUM(wo.total_material_cost + wo.total_labor_cost + wo.total_overhead_cost) - (SUM(wo.quantity) * 10), 0) as variance
        FROM production_lines pl
        LEFT JOIN work_orders wo ON pl.id = wo.production_line_id
        ${whereClause}
        GROUP BY pl.id, pl.name
        ORDER BY ${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const costCentersResult = await client.query(costCentersQuery, queryParams);

      const cost_centers: CostCenter[] = costCentersResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        total_cost: parseFloat(row.total_cost),
        material_cost: parseFloat(row.material_cost),
        labor_cost: parseFloat(row.labor_cost),
        overhead_cost: parseFloat(row.overhead_cost),
        efficiency: parseFloat(row.efficiency),
        variance: parseFloat(row.variance)
      }));

      MyLogger.success(action, { count: cost_centers.length, total, page, totalPages });

      return {
        cost_centers,
        total,
        page,
        limit,
        total_pages: totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
