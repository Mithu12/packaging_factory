import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

export interface MaterialAllocationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  work_order_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface MaterialAllocationStats {
  total_allocations: number;
  active_allocations: number;
  consumed_allocations: number;
  returned_allocations: number;
  total_value: number;
  average_allocation_time: number;
  on_time_allocation: number;
  allocation_efficiency: number;
}

export class GetMaterialAllocationInfoMediator {
  static async getAllocations(
    params: MaterialAllocationQueryParams,
    userId: number
  ): Promise<{
    allocations: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const action = 'Get Material Allocations';

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        status,
        work_order_id,
        sort_by = 'allocated_date',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR wma.batch_number ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`wma.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (work_order_id) {
        whereConditions.push(`wmr.work_order_id = $${paramIndex}`);
        queryParams.push(work_order_id);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT wma.id) as count
        FROM work_order_material_allocations wma
        JOIN work_order_material_requirements wmr ON wma.work_order_requirement_id = wmr.id
        JOIN products p ON wma.inventory_item_id = p.id
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get allocations with details
      const allocationsQuery = `
        SELECT 
          wma.*,
          p.name as material_name,
          p.sku as material_sku,
          p.unit_of_measure,
          wmr.work_order_id,
          wo.work_order_number,
          u.full_name as allocated_by_name
        FROM work_order_material_allocations wma
        JOIN work_order_material_requirements wmr ON wma.work_order_requirement_id = wmr.id
        JOIN products p ON wma.inventory_item_id = p.id
        JOIN work_orders wo ON wmr.work_order_id = wo.id
        LEFT JOIN users u ON wma.allocated_by = u.id
        WHERE ${whereClause}
        ORDER BY wma.${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const allocationsResult = await pool.query(allocationsQuery, queryParams);

      MyLogger.success(action, { total, page, limit });

      return {
        allocations: allocationsResult.rows,
        total,
        page,
        limit
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async getAllocationById(
    allocationId: string,
    userId: number
  ): Promise<any> {
    const action = 'Get Material Allocation By ID';

    try {
      MyLogger.info(action, { allocationId, userId });

      const query = `
        SELECT 
          wma.*,
          p.name as material_name,
          p.sku as material_sku,
          p.unit_of_measure,
          wmr.work_order_id,
          wmr.material_name as requirement_material_name,
          wmr.required_quantity,
          wmr.allocated_quantity as total_allocated_quantity,
          wo.work_order_number,
          u.full_name as allocated_by_name
        FROM work_order_material_allocations wma
        JOIN work_order_material_requirements wmr ON wma.work_order_requirement_id = wmr.id
        JOIN products p ON wma.inventory_item_id = p.id
        JOIN work_orders wo ON wmr.work_order_id = wo.id
        LEFT JOIN users u ON wma.allocated_by = u.id
        WHERE wma.id = $1
      `;

      const result = await pool.query(query, [allocationId]);

      if (result.rows.length === 0) {
        throw createError('Material allocation not found', 404);
      }

      MyLogger.success(action, { allocationId });

      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async getAllocationStats(userId: number): Promise<MaterialAllocationStats> {
    const action = 'Get Material Allocation Stats';

    try {
      MyLogger.info(action, { userId });

      const query = `
        SELECT 
          COUNT(*) as total_allocations,
          COUNT(*) FILTER (WHERE status = 'allocated') as active_allocations,
          COUNT(*) FILTER (WHERE status = 'consumed') as consumed_allocations,
          COUNT(*) FILTER (WHERE status = 'returned') as returned_allocations,
          COALESCE(SUM(allocated_quantity * (SELECT cost_price FROM products WHERE id = inventory_item_id)), 0) as total_value
        FROM work_order_material_allocations
      `;

      const result = await pool.query(query);
      const stats = result.rows[0];

      MyLogger.success(action, stats);

      return {
        total_allocations: parseInt(stats.total_allocations) || 0,
        active_allocations: parseInt(stats.active_allocations) || 0,
        consumed_allocations: parseInt(stats.consumed_allocations) || 0,
        returned_allocations: parseInt(stats.returned_allocations) || 0,
        total_value: parseFloat(stats.total_value) || 0,
        average_allocation_time: 2.5, // TODO: Calculate from timestamps
        on_time_allocation: 92, // TODO: Calculate from requirements
        allocation_efficiency: 88 // TODO: Calculate from consumption data
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

