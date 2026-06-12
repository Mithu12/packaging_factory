import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { creditLocationStock, debitLocationStock, resolvePrimaryDcId } from '@/utils/stockLocations';

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
  recovered_value: number;
}

export interface CreateWastageRequest {
  material_id: string;
  quantity: number;
  wastage_reason: string;
  work_order_id?: string;
  batch_number?: string;
  notes?: string;
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
        LEFT JOIN work_orders wo ON mw.work_order_id = wo.id
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
        LEFT JOIN work_orders wo ON mw.work_order_id = wo.id
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
        LEFT JOIN work_orders wo ON mw.work_order_id = wo.id
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

  static async createWastage(
    data: CreateWastageRequest,
    userId: number
  ): Promise<any> {
    const action = 'Create Wastage';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { materialId: data.material_id, quantity: data.quantity, userId });

      const materialResult = await client.query(
        'SELECT id, name, cost_price FROM products WHERE id = $1',
        [data.material_id]
      );

      if (materialResult.rows.length === 0) {
        throw createError('Material not found', 404);
      }

      const material = materialResult.rows[0];

      if (data.work_order_id) {
        const workOrderResult = await client.query(
          'SELECT id FROM work_orders WHERE id = $1',
          [data.work_order_id]
        );
        if (workOrderResult.rows.length === 0) {
          throw createError('Work order not found', 404);
        }
      }

      // Standalone wastage is always counted in physical units and comes from
      // free stock (no allocation backs it, unlike consumption-recorded
      // wastage which draws from the work order's reservation). Stock leaves
      // at recording time; rejection credits it back.
      const dcId = await resolvePrimaryDcId(client);
      await debitLocationStock(client, Number(data.material_id), dcId, data.quantity, material.name);

      const unitCost = parseFloat(material.cost_price) || 0;
      const insertResult = await client.query(
        `INSERT INTO material_wastage (
          work_order_id,
          material_id,
          material_name,
          quantity,
          wastage_reason,
          cost,
          status,
          recorded_by,
          batch_number,
          notes,
          stock_deducted
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, true)
        RETURNING *`,
        [
          data.work_order_id || null,
          data.material_id,
          material.name,
          data.quantity,
          data.wastage_reason,
          unitCost * data.quantity,
          userId,
          data.batch_number || null,
          data.notes || null
        ]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { wastageId: insertResult.rows[0].id });

      return insertResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
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

      // Fetch factory information for accounts integration
      let factoryInfo: { factory_id: number; factory_name: string; factory_cost_center_id: number | null } | null = null;
      try {
        const factoryResult = await pool.query(
          `SELECT f.id as factory_id, f.name as factory_name, f.cost_center_id as factory_cost_center_id
           FROM work_orders wo
           LEFT JOIN factory_customer_orders co ON wo.customer_order_id = co.id
           LEFT JOIN factories f ON co.factory_id = f.id
           WHERE wo.id = $1`,
          [wastage.work_order_id]
        );
        if (factoryResult.rows.length > 0 && factoryResult.rows[0].factory_id) {
          factoryInfo = factoryResult.rows[0];
        }
      } catch (factoryError: any) {
        MyLogger.warn(`${action}.fetchFactory`, {
          error: factoryError.message,
          workOrderId: wastage.work_order_id
        });
      }

      // Emit event for accounts integration
      try {
        const wastageData = {
          wastageId,
          workOrderId: wastage.work_order_id,
          materialId: wastage.material_id,
          materialName: wastage.material_name,
          quantity: wastage.quantity,
          cost: wastage.cost,
          reason: wastage.wastage_reason,
          approvedDate: new Date().toISOString(),
          factoryId: factoryInfo?.factory_id,
          factoryName: factoryInfo?.factory_name,
          factoryCostCenterId: factoryInfo?.factory_cost_center_id,
          notes
        };

        eventBus.emit(EVENT_NAMES.MATERIAL_WASTAGE_APPROVED, {
          wastageData,
          userId
        });

        // Central Bridge: Call accounts module directly via InterModuleConnector
        MyLogger.info(`${action}.bridge`, { wastageId });
        await interModuleConnector.accModule.addWastageVoucher(wastageData, userId);
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

      // Rejecting a wastage claim restores the stock that recording deducted —
      // pending wastage never touched the GL, so this keeps stock and books
      // consistent. Records from before stock_deducted existed never deducted
      // stock, so there is nothing to restore for them.
      if (wastage.stock_deducted) {
        const dcId = await resolvePrimaryDcId(client);
        await creditLocationStock(client, Number(wastage.material_id), dcId, parseFloat(wastage.quantity));
      }

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

      // Month-over-month change in wasted quantity (positive = more wastage)
      const trendQuery = `
        SELECT
          COALESCE(SUM(quantity) FILTER (
            WHERE recorded_date >= date_trunc('month', CURRENT_TIMESTAMP)
          ), 0) as current_month,
          COALESCE(SUM(quantity) FILTER (
            WHERE recorded_date >= date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1 month'
              AND recorded_date < date_trunc('month', CURRENT_TIMESTAMP)
          ), 0) as previous_month
        FROM material_wastage
        WHERE status != 'rejected'
      `;
      const trendResult = await pool.query(trendQuery);
      const currentMonth = parseFloat(trendResult.rows[0].current_month) || 0;
      const previousMonth = parseFloat(trendResult.rows[0].previous_month) || 0;
      const monthlyTrend = previousMonth > 0
        ? Math.round(((currentMonth - previousMonth) / previousMonth) * 1000) / 10
        : currentMonth > 0 ? 100 : 0;

      const recoveredResult = await pool.query(
        'SELECT COALESCE(SUM(total_amount), 0) as recovered_value FROM factory_wastage_sales'
      );

      MyLogger.success(action, stats);

      return {
        total_wastage: parseFloat(stats.total_wastage) || 0,
        pending_approvals: parseInt(stats.pending_approvals) || 0,
        total_cost: parseFloat(stats.total_cost) || 0,
        average_wastage: parseFloat(stats.average_wastage) || 0,
        top_reason: topReason,
        monthly_trend: monthlyTrend,
        recovered_value: parseFloat(recoveredResult.rows[0].recovered_value) || 0
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

