import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';

export interface WastageQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  work_order_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface WastageStats {
  total_wastage: number;
  pending_approvals: number;
  total_cost: number;
  average_wastage: number;
  top_reason: string;
  monthly_trend: number;
}

export class MaterialWastageMediator {
  static async getWastageRecords(
    params: WastageQueryParams,
    userId: number
  ): Promise<{
    wastage_records: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const action = 'Get Wastage Records';

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        status,
        work_order_id,
        sort_by = 'recorded_date',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(mw.material_name ILIKE $${paramIndex} OR wo.work_order_number ILIKE $${paramIndex} OR mw.wastage_reason ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status && status !== '') {
        whereConditions.push(`mw.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (work_order_id) {
        whereConditions.push(`mw.work_order_id = $${paramIndex}`);
        queryParams.push(work_order_id);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT mw.id) as count
        FROM material_wastage mw
        JOIN work_orders wo ON mw.work_order_id = wo.id
        WHERE ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get wastage records with details
      const wastageQuery = `
        SELECT 
          mw.*,
          wo.work_order_number,
          p.sku as material_sku,
          u1.full_name as recorded_by_name,
          u2.full_name as approved_by_name
        FROM material_wastage mw
        JOIN work_orders wo ON mw.work_order_id = wo.id
        JOIN products p ON mw.material_id = p.id
        LEFT JOIN users u1 ON mw.recorded_by = u1.id
        LEFT JOIN users u2 ON mw.approved_by = u2.id
        WHERE ${whereClause}
        ORDER BY mw.${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const wastageResult = await pool.query(wastageQuery, queryParams);

      MyLogger.success(action, { total, page, limit });

      return {
        wastage_records: wastageResult.rows,
        total,
        page,
        limit
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async getWastageById(
    wastageId: string,
    userId: number
  ): Promise<any> {
    const action = 'Get Wastage By ID';

    try {
      MyLogger.info(action, { wastageId, userId });

      const query = `
        SELECT 
          mw.*,
          wo.work_order_number,
          p.sku as material_sku,
          p.unit_of_measure,
          u1.full_name as recorded_by_name,
          u2.full_name as approved_by_name
        FROM material_wastage mw
        JOIN work_orders wo ON mw.work_order_id = wo.id
        JOIN products p ON mw.material_id = p.id
        LEFT JOIN users u1 ON mw.recorded_by = u1.id
        LEFT JOIN users u2 ON mw.approved_by = u2.id
        WHERE mw.id = $1
      `;

      const result = await pool.query(query, [wastageId]);

      if (result.rows.length === 0) {
        throw createError('Wastage record not found', 404);
      }

      MyLogger.success(action, { wastageId });

      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  static async approveWastage(
    wastageId: string,
    userId: number,
    notes?: string
  ): Promise<any> {
    const action = 'Approve Wastage';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { wastageId, userId });

      // Get wastage record
      const wastageResult = await client.query(
        'SELECT * FROM material_wastage WHERE id = $1',
        [wastageId]
      );

      if (wastageResult.rows.length === 0) {
        throw createError('Wastage record not found', 404);
      }

      const wastage = wastageResult.rows[0];

      if (wastage.status !== 'pending') {
        throw createError(`Cannot approve wastage with status: ${wastage.status}`, 400);
      }

      // Update wastage status
      await client.query(
        `UPDATE material_wastage
         SET status = 'approved',
             approved_by = $1,
             approved_date = CURRENT_TIMESTAMP,
             notes = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE notes END
         WHERE id = $3`,
        [userId, notes, wastageId]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { wastageId });

      // Emit event for accounts integration
      try {
        eventBus.emit(EVENT_NAMES.MATERIAL_WASTAGE_APPROVED, {
          wastageData: {
            wastageId,
            workOrderId: wastage.work_order_id,
            materialId: wastage.material_id,
            materialName: wastage.material_name,
            quantity: wastage.quantity,
            cost: wastage.cost,
            reason: wastage.wastage_reason,
            approvedDate: new Date().toISOString(),
            notes
          },
          userId
        });
      } catch (eventError: any) {
        MyLogger.error(`${action}.eventEmit`, eventError, {
          wastageId,
          message: 'Failed to emit MATERIAL_WASTAGE_APPROVED event, but approval succeeded'
        });
      }

      return { success: true, message: 'Wastage approved successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async rejectWastage(
    wastageId: string,
    userId: number,
    notes?: string
  ): Promise<any> {
    const action = 'Reject Wastage';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { wastageId, userId });

      // Get wastage record
      const wastageResult = await client.query(
        'SELECT * FROM material_wastage WHERE id = $1',
        [wastageId]
      );

      if (wastageResult.rows.length === 0) {
        throw createError('Wastage record not found', 404);
      }

      const wastage = wastageResult.rows[0];

      if (wastage.status !== 'pending') {
        throw createError(`Cannot reject wastage with status: ${wastage.status}`, 400);
      }

      // Update wastage status
      await client.query(
        `UPDATE material_wastage
         SET status = 'rejected',
             approved_by = $1,
             approved_date = CURRENT_TIMESTAMP,
             notes = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE notes END
         WHERE id = $3`,
        [userId, notes, wastageId]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { wastageId });

      return { success: true, message: 'Wastage rejected successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getWastageStats(userId: number): Promise<WastageStats> {
    const action = 'Get Wastage Stats';

    try {
      MyLogger.info(action, { userId });

      const query = `
        SELECT 
          COALESCE(SUM(quantity), 0) as total_wastage,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_approvals,
          COALESCE(SUM(cost), 0) as total_cost,
          CASE 
            WHEN COUNT(*) > 0 
            THEN AVG(quantity)
            ELSE 0 
          END as average_wastage
        FROM material_wastage
      `;

      const result = await pool.query(query);
      const stats = result.rows[0];

      // Get top reason
      const reasonQuery = `
        SELECT wastage_reason, COUNT(*) as count
        FROM material_wastage
        WHERE wastage_reason IS NOT NULL
        GROUP BY wastage_reason
        ORDER BY count DESC
        LIMIT 1
      `;

      const reasonResult = await pool.query(reasonQuery);
      const topReason = reasonResult.rows.length > 0 ? reasonResult.rows[0].wastage_reason : 'N/A';

      MyLogger.success(action, stats);

      return {
        total_wastage: parseFloat(stats.total_wastage) || 0,
        pending_approvals: parseInt(stats.pending_approvals) || 0,
        total_cost: parseFloat(stats.total_cost) || 0,
        average_wastage: parseFloat(stats.average_wastage) || 0,
        top_reason: topReason,
        monthly_trend: -5 // TODO: Calculate actual trend from historical data
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

