import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

export interface CreateProductionRunRequest {
  work_order_id: string;
  production_line_id?: string;
  operator_id?: string;
  scheduled_start_time?: string;
  target_quantity: number;
  planned_cycle_time_seconds?: number;
  notes?: string;
}

export class AddProductionRunMediator {
  static async execute(
    data: CreateProductionRunRequest,
    userId: number
  ): Promise<any> {
    const action = 'Create Production Run';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { data, userId });

      // Validate work order exists and is in released status
      const workOrderResult = await client.query(
        'SELECT * FROM work_orders WHERE id = $1',
        [data.work_order_id]
      );

      if (workOrderResult.rows.length === 0) {
        throw createError('Work order not found', 404);
      }

      const workOrder = workOrderResult.rows[0];

      // Only allow production runs from released work orders
      if (workOrder.status !== 'released' && workOrder.status !== 'in_progress') {
        throw createError(
          `Cannot create production run for work order in ${workOrder.status} status. Only released or in-progress work orders can be used for production runs.`,
          400
        );
      }

      // Check for over-production
      const runStatsResult = await client.query(
        `SELECT COALESCE(SUM(target_quantity), 0) as total_scheduled
         FROM production_runs
         WHERE work_order_id = $1 AND status != 'cancelled'`,
        [data.work_order_id]
      );
      
      const totalScheduled = parseFloat(runStatsResult.rows[0].total_scheduled);
      const remainingToSchedule = parseFloat(workOrder.quantity) - totalScheduled;

      if (data.target_quantity > remainingToSchedule + 0.001) { // Allow small float margin
        throw createError(
          `Target quantity (${data.target_quantity}) exceeds remaining work order quantity (${remainingToSchedule.toFixed(2)}).`,
          400
        );
      }

      // Generate run number
      const runNumberResult = await client.query(
        `SELECT CONCAT('PR-', LPAD(nextval('production_run_sequence')::TEXT, 6, '0')) as run_number`
      );
      const runNumber = runNumberResult.rows[0].run_number;

      // Insert production run
      const insertResult = await client.query(
        `INSERT INTO production_runs (
          run_number,
          work_order_id,
          production_line_id,
          operator_id,
          scheduled_start_time,
          target_quantity,
          planned_cycle_time_seconds,
          notes,
          started_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          runNumber,
          data.work_order_id,
          data.production_line_id || null,
          data.operator_id || null,
          data.scheduled_start_time || null,
          data.target_quantity,
          data.planned_cycle_time_seconds || null,
          data.notes || null,
          userId
        ]
      );

      const productionRun = insertResult.rows[0];

      // Log event
      await client.query(
        `INSERT INTO production_run_events (
          production_run_id,
          event_type,
          event_status,
          notes,
          performed_by
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          productionRun.id,
          'start',
          'success',
          'Production run created',
          userId
        ]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { productionRunId: productionRun.id });

      return productionRun;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

