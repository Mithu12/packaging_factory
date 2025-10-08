import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';

export interface UpdateProductionRunStatusRequest {
  status: 'in_progress' | 'paused' | 'completed' | 'cancelled';
  produced_quantity?: number;
  good_quantity?: number;
  rejected_quantity?: number;
  notes?: string;
}

export interface RecordDowntimeRequest {
  production_run_id: string;
  downtime_reason: string;
  downtime_category: string;
  start_time: string;
  end_time?: string;
  is_planned?: boolean;
  cost_impact?: number;
  notes?: string;
}

export class UpdateProductionRunStatusMediator {
  static async startProductionRun(
    runId: string,
    userId: number
  ): Promise<any> {
    const action = 'Start Production Run';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { runId, userId });

      // Get production run
      const runResult = await client.query(
        'SELECT * FROM production_runs WHERE id = $1',
        [runId]
      );

      if (runResult.rows.length === 0) {
        throw createError('Production run not found', 404);
      }

      const run = runResult.rows[0];

      if (run.status !== 'scheduled' && run.status !== 'paused') {
        throw createError(`Cannot start production run with status: ${run.status}`, 400);
      }

      // Update status
      await client.query(
        `UPDATE production_runs
         SET status = 'in_progress',
             actual_start_time = COALESCE(actual_start_time, CURRENT_TIMESTAMP)
         WHERE id = $1`,
        [runId]
      );

      // Log event
      await client.query(
        `INSERT INTO production_run_events (
          production_run_id,
          event_type,
          event_status,
          performed_by
        ) VALUES ($1, $2, $3, $4)`,
        [runId, run.status === 'paused' ? 'resume' : 'start', 'success', userId]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { runId });

      return { success: true, message: 'Production run started successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async pauseProductionRun(
    runId: string,
    userId: number,
    notes?: string
  ): Promise<any> {
    const action = 'Pause Production Run';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { runId, userId });

      // Get production run
      const runResult = await client.query(
        'SELECT * FROM production_runs WHERE id = $1',
        [runId]
      );

      if (runResult.rows.length === 0) {
        throw createError('Production run not found', 404);
      }

      const run = runResult.rows[0];

      if (run.status !== 'in_progress') {
        throw createError('Can only pause in-progress production runs', 400);
      }

      // Update status
      await client.query(
        `UPDATE production_runs
         SET status = 'paused'
         WHERE id = $1`,
        [runId]
      );

      // Log event
      await client.query(
        `INSERT INTO production_run_events (
          production_run_id,
          event_type,
          event_status,
          notes,
          performed_by
        ) VALUES ($1, $2, $3, $4, $5)`,
        [runId, 'pause', 'success', notes, userId]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { runId });

      return { success: true, message: 'Production run paused successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async completeProductionRun(
    runId: string,
    data: UpdateProductionRunStatusRequest,
    userId: number
  ): Promise<any> {
    const action = 'Complete Production Run';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { runId, userId, data });

      // Get production run
      const runResult = await client.query(
        'SELECT * FROM production_runs WHERE id = $1',
        [runId]
      );

      if (runResult.rows.length === 0) {
        throw createError('Production run not found', 404);
      }

      const run = runResult.rows[0];

      if (run.status === 'completed') {
        throw createError('Production run already completed', 400);
      }

      // Calculate metrics
      const producedQty = data.produced_quantity || run.produced_quantity;
      const goodQty = data.good_quantity || run.good_quantity;
      const rejectedQty = data.rejected_quantity || run.rejected_quantity;
      
      const qualityPercentage = producedQty > 0 ? (goodQty / producedQty) * 100 : 0;
      const efficiencyPercentage = run.target_quantity > 0 ? (producedQty / run.target_quantity) * 100 : 0;

      // Update status
      await client.query(
        `UPDATE production_runs
         SET status = 'completed',
             actual_end_time = CURRENT_TIMESTAMP,
             produced_quantity = $1,
             good_quantity = $2,
             rejected_quantity = $3,
             quality_percentage = $4,
             efficiency_percentage = $5,
             completed_by = $6
         WHERE id = $7`,
        [
          producedQty,
          goodQty,
          rejectedQty,
          qualityPercentage,
          efficiencyPercentage,
          userId,
          runId
        ]
      );

      // Log event
      await client.query(
        `INSERT INTO production_run_events (
          production_run_id,
          event_type,
          event_status,
          quantity_at_event,
          notes,
          performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [runId, 'complete', 'success', producedQty, data.notes, userId]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { runId });

      // Calculate labor and overhead costs for accounts integration
      // TODO: Replace with actual cost calculation from labor tracking system
      const runtimeMinutes = run.total_runtime_minutes || 0;
      const laborHours = runtimeMinutes / 60;
      const laborRatePerHour = 15; // TODO: Get from production line/operator rate
      const laborCost = laborHours * laborRatePerHour;
      
      const overheadRatePerHour = 10; // TODO: Get from cost center/factory overhead rate
      const overheadCost = laborHours * overheadRatePerHour;

      // Emit event for accounts integration
      try {
        eventBus.emit(EVENT_NAMES.PRODUCTION_RUN_COMPLETED, {
          productionRunData: {
            runId,
            runNumber: run.run_number,
            workOrderId: run.work_order_id,
            productionLineId: run.production_line_id,
            targetQuantity: run.target_quantity,
            producedQuantity: producedQty,
            goodQuantity: goodQty,
            rejectedQuantity: rejectedQty,
            runtimeMinutes,
            laborCost,
            overheadCost,
            completedDate: new Date().toISOString()
          },
          userId
        });
      } catch (eventError: any) {
        MyLogger.error(`${action}.eventEmit`, eventError, {
          runId,
          message: 'Failed to emit PRODUCTION_RUN_COMPLETED event, but completion succeeded'
        });
      }

      return { success: true, message: 'Production run completed successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async recordDowntime(
    data: RecordDowntimeRequest,
    userId: number
  ): Promise<any> {
    const action = 'Record Downtime';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { data, userId });

      // Insert downtime record
      const result = await client.query(
        `INSERT INTO production_downtime (
          production_run_id,
          downtime_reason,
          downtime_category,
          start_time,
          end_time,
          is_planned,
          cost_impact,
          notes,
          recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.production_run_id,
          data.downtime_reason,
          data.downtime_category,
          data.start_time,
          data.end_time || null,
          data.is_planned || false,
          data.cost_impact || 0,
          data.notes || null,
          userId
        ]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { downtimeId: result.rows[0].id });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

