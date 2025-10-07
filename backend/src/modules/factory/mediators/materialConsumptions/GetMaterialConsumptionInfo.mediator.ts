import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

export interface MaterialConsumptionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  work_order_id?: string;
  production_line_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface MaterialConsumptionStats {
  total_consumptions: number;
  total_materials_consumed: number;
  total_wastage: number;
  average_wastage_percentage: number;
  total_consumption_value: number;
}

export class GetMaterialConsumptionInfoMediator {
  static async getConsumptions(
    params: MaterialConsumptionQueryParams,
    userId: number
  ): Promise<{
    consumptions: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const action = 'Get Material Consumptions';

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        work_order_id,
        production_line_id,
        sort_by = 'consumption_date',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(wmc.material_name ILIKE $${paramIndex} OR wo.work_order_number ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (work_order_id) {
        whereConditions.push(`wmc.work_order_id = $${paramIndex}`);
        queryParams.push(work_order_id);
        paramIndex++;
      }

      if (production_line_id) {
        whereConditions.push(`wmc.production_line_id = $${paramIndex}`);
        queryParams.push(production_line_id);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT wmc.id) as count
        FROM work_order_material_consumptions wmc
        JOIN work_orders wo ON wmc.work_order_id = wo.id
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get consumptions with details
      const consumptionsQuery = `
        SELECT 
          wmc.*,
          wo.work_order_number,
          u.full_name as consumed_by_name
        FROM work_order_material_consumptions wmc
        JOIN work_orders wo ON wmc.work_order_id = wo.id
        LEFT JOIN users u ON wmc.consumed_by = u.id
        WHERE ${whereClause}
        ORDER BY wmc.${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const consumptionsResult = await pool.query(consumptionsQuery, queryParams);

      MyLogger.success(action, { total, page, limit });

      return {
        consumptions: consumptionsResult.rows,
        total,
        page,
        limit
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async getConsumptionById(
    consumptionId: string,
    userId: number
  ): Promise<any> {
    const action = 'Get Material Consumption By ID';

    try {
      MyLogger.info(action, { consumptionId, userId });

      const query = `
        SELECT 
          wmc.*,
          wo.work_order_number,
          u.full_name as consumed_by_name,
          p.sku as material_sku,
          p.unit_of_measure
        FROM work_order_material_consumptions wmc
        JOIN work_orders wo ON wmc.work_order_id = wo.id
        JOIN products p ON wmc.material_id = p.id
        LEFT JOIN users u ON wmc.consumed_by = u.id
        WHERE wmc.id = $1
      `;

      const result = await pool.query(query, [consumptionId]);

      if (result.rows.length === 0) {
        throw createError('Material consumption not found', 404);
      }

      MyLogger.success(action, { consumptionId });

      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async getConsumptionStats(userId: number): Promise<MaterialConsumptionStats> {
    const action = 'Get Material Consumption Stats';

    try {
      MyLogger.info(action, { userId });

      const query = `
        SELECT 
          COUNT(*) as total_consumptions,
          COUNT(DISTINCT material_id) as total_materials_consumed,
          COALESCE(SUM(wastage_quantity), 0) as total_wastage,
          CASE 
            WHEN SUM(consumed_quantity) > 0 
            THEN (SUM(wastage_quantity) / SUM(consumed_quantity) * 100)
            ELSE 0 
          END as average_wastage_percentage,
          COALESCE(SUM(consumed_quantity * (SELECT cost_price FROM products WHERE id = material_id LIMIT 1)), 0) as total_consumption_value
        FROM work_order_material_consumptions
      `;

      const result = await pool.query(query);
      const stats = result.rows[0];

      MyLogger.success(action, stats);

      return {
        total_consumptions: parseInt(stats.total_consumptions) || 0,
        total_materials_consumed: parseInt(stats.total_materials_consumed) || 0,
        total_wastage: parseFloat(stats.total_wastage) || 0,
        average_wastage_percentage: parseFloat(stats.average_wastage_percentage) || 0,
        total_consumption_value: parseFloat(stats.total_consumption_value) || 0
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

