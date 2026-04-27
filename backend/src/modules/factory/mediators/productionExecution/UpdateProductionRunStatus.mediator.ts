import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { UpdateWorkOrderMediator } from '../workOrders/UpdateWorkOrder.mediator';
import { creditWorkOrderProductStock } from '../workOrders/creditWorkOrderStock';

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

      // Synchronize parent Work Order status
      await client.query(
        `UPDATE work_orders
         SET status = 'in_progress',
             started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $1
         WHERE id = $2 AND status != 'in_progress'`,
        [userId, run.work_order_id]
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

  static async resumeProductionRun(runId: string, userId: number): Promise<any> {
    const action = 'Resume Production Run';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { runId, userId });

      const runResult = await client.query(
        'SELECT * FROM production_runs WHERE id = $1',
        [runId]
      );

      if (runResult.rows.length === 0) {
        throw createError('Production run not found', 404);
      }

      const run = runResult.rows[0];

      if (run.status !== 'completed') {
        throw createError(
          `Cannot resume production run with status: ${run.status}. Only completed runs can be resumed.`,
          400
        );
      }

      const producedQty = parseFloat(run.produced_quantity || '0');
      const targetQty = parseFloat(run.target_quantity || '0');

      if (producedQty >= targetQty) {
        throw createError(
          'Cannot resume: production run has already met or exceeded its target quantity.',
          400
        );
      }

      await client.query(
        `UPDATE production_runs
         SET status = 'in_progress',
             actual_end_time = NULL,
             completed_by = NULL
         WHERE id = $1`,
        [runId]
      );

      await client.query(
        `INSERT INTO production_run_events (
          production_run_id,
          event_type,
          event_status,
          performed_by
        ) VALUES ($1, $2, $3, $4)`,
        [runId, 'resume', 'success', userId]
      );

      await client.query(
        `UPDATE work_orders
         SET status = 'in_progress',
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $1
         WHERE id = $2`,
        [userId, run.work_order_id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { runId });

      return { success: true, message: 'Production run resumed successfully' };
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

      // Calculate metrics: for resumed runs (existing produced_quantity > 0), treat submitted values as increments
      const existingProduced = parseFloat(run.produced_quantity || '0');
      const existingGood = parseFloat(run.good_quantity || '0');
      const existingRejected = parseFloat(run.rejected_quantity || '0');
      const producedQty =
        existingProduced > 0
          ? existingProduced + (data.produced_quantity ?? 0)
          : (data.produced_quantity ?? run.produced_quantity);
      const goodQty =
        existingProduced > 0
          ? existingGood + (data.good_quantity ?? 0)
          : (data.good_quantity ?? run.good_quantity);
      const rejectedQty =
        existingProduced > 0
          ? existingRejected + (data.rejected_quantity ?? 0)
          : (data.rejected_quantity ?? run.rejected_quantity);
      
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

      // Synchronize parent Work Order status if target is met
      const woStatsResult = await client.query(
        `SELECT 
           quantity as target_quantity,
           estimated_hours,
           (SELECT COALESCE(SUM(produced_quantity), 0) FROM production_runs WHERE work_order_id = wo.id AND status = 'completed') as total_produced
         FROM work_orders wo
         WHERE id = $1`,
        [run.work_order_id]
      );

      if (woStatsResult.rows.length > 0) {
        const woStats = woStatsResult.rows[0];
        const totalProduced = parseFloat(woStats.total_produced);
        const targetQuantity = parseFloat(woStats.target_quantity);

        if (totalProduced >= targetQuantity) {
          // All production runs for this work order are done and target met
          await client.query(
            `UPDATE work_orders
             SET status = 'completed',
                 completed_at = CURRENT_TIMESTAMP,
                 progress = 100,
                 updated_at = CURRENT_TIMESTAMP,
                 updated_by = $1
             WHERE id = $2`,
            [userId, run.work_order_id]
          );

          // Credit the produced FG/RRM into stock (uses good_quantity from runs).
          await creditWorkOrderProductStock(client, run.work_order_id);

          // Free up production line load specifically for this work order completion
          if (run.production_line_id) {
            const estHours = parseFloat(woStats.estimated_hours || '0');
            const loadToRemove = Math.min((estHours / 8) * 10, 100);
            await client.query(
              `UPDATE production_lines 
               SET current_load = GREATEST(current_load - $1, 0),
                   status = CASE WHEN GREATEST(current_load - $1, 0) <= 0 THEN 'available' ELSE status END,
                   updated_at = CURRENT_TIMESTAMP 
               WHERE id = $2`,
              [loadToRemove, run.production_line_id]
            );
          }

          // Release assigned operators
          await client.query(
            `UPDATE operators SET availability_status = 'available', current_work_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE current_work_order_id = $1`,
            [run.work_order_id]
          );

          MyLogger.info(`${action}: Parent work order marked as completed`, {
            workOrderId: run.work_order_id,
            totalProduced,
            targetQuantity
          });

          // Sync parent factory customer order if applicable
          const coResult = await client.query(
            'SELECT customer_order_id FROM work_orders WHERE id = $1',
            [run.work_order_id]
          );
          if (coResult.rows.length > 0 && coResult.rows[0].customer_order_id) {
            await UpdateWorkOrderMediator.syncCustomerOrderStatus(client, coResult.rows[0].customer_order_id, userId);
          }
        } else {
          // Update progress percentage
          const progress = Math.min(100, (totalProduced / targetQuantity) * 100);
          await client.query(
            `UPDATE work_orders
             SET progress = $1,
                 updated_at = CURRENT_TIMESTAMP,
                 updated_by = $2
             WHERE id = $3`,
            [progress, userId, run.work_order_id]
          );
        }
      }

      // Free up production line if no other active runs
      if (run.production_line_id) {
        const activeRunsResult = await client.query(
          "SELECT COUNT(*) FROM production_runs WHERE production_line_id = $1 AND status IN ('in_progress', 'scheduled') AND id != $2",
          [run.production_line_id, runId]
        );
        if (parseInt(activeRunsResult.rows[0].count) === 0) {
          await client.query(
            "UPDATE production_lines SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'busy'",
            [run.production_line_id]
          );
          MyLogger.info(`${action}: Production line marked available`, {
            productionLineId: run.production_line_id
          });
        }
      }

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

      // Fetch factory information for accounts integration (production line or work order)
      let factoryInfo: { factory_id: number; factory_name: string; factory_cost_center_id: number | null; line_cost_center_id: number | null } | null = null;
      try {
        const factoryResult = await client.query(
          `SELECT 
             f.id as factory_id, 
             f.name as factory_name, 
             f.cost_center_id as factory_cost_center_id,
             pl.cost_center_id as line_cost_center_id
           FROM production_runs pr
           LEFT JOIN production_lines pl ON pr.production_line_id = pl.id
           LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
           LEFT JOIN factory_customer_orders co ON wo.customer_order_id = co.id
           LEFT JOIN factories f ON co.factory_id = f.id
           WHERE pr.id = $1`,
          [runId]
        );
        if (factoryResult.rows.length > 0 && factoryResult.rows[0].factory_id) {
          factoryInfo = factoryResult.rows[0];
        }
      } catch (factoryError: any) {
        MyLogger.warn(`${action}.fetchFactory`, {
          error: factoryError.message,
          runId
        });
      }

      // Emit event for accounts integration (skip if re-completing a resumed run to avoid double-counting)
      const hasExistingVouchers = run.labor_voucher_id != null || run.overhead_voucher_id != null;
      try {
        if (!hasExistingVouchers) {
          const productionRunData = {
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
            completedDate: new Date().toISOString(),
            costCenterId: factoryInfo?.line_cost_center_id, // Prefer production line cost center
            factoryId: factoryInfo?.factory_id,
            factoryName: factoryInfo?.factory_name,
            factoryCostCenterId: factoryInfo?.factory_cost_center_id
          };

          eventBus.emit(EVENT_NAMES.PRODUCTION_RUN_COMPLETED, {
            productionRunData,
            userId
          });

          // Central Bridge: Call accounts module directly via InterModuleConnector
          MyLogger.info(`${action}.bridge`, { runId });
          await interModuleConnector.accModule.addProductionRunVouchers(productionRunData, userId);
        } else {
          MyLogger.info(`${action}.skipVouchers`, {
            runId,
            message: 'Skipping voucher creation for re-completed run (resumed from completed)'
          });
        }
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

