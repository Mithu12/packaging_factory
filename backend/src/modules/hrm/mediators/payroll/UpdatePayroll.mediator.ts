import { PayrollRun } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class UpdatePayrollMediator {
  private auditService: AuditService;
  private eventBus: any;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = eventBus;
  }

  /**
   * Approve payroll run
   */
  static async approvePayrollRun(runId: number, approvedBy?: number): Promise<PayrollRun> {
    const action = "UpdatePayrollMediator.approvePayrollRun";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { runId, approvedBy });

      // Get current payroll run
      const runQuery = 'SELECT * FROM payroll_runs WHERE id = $1';
      const runResult = await client.query(runQuery, [runId]);

      if (runResult.rows.length === 0) {
        throw new Error('Payroll run not found');
      }

      const run = runResult.rows[0];

      // Check if run is in correct status for approval
      if (run.status !== 'calculated') {
        throw new Error('Payroll run must be calculated before approval');
      }

      // Update payroll run status
      const updateQuery = `
        UPDATE payroll_runs
        SET status = $1, approved_by = $2, approved_at = $3, updated_at = $4
        WHERE id = $5
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        'approved',
        approvedBy,
        new Date(),
        new Date(),
        runId
      ]);

      const updatedRun = updateResult.rows[0];

      // Create audit log
      if (approvedBy) {
        await this.auditService.createAuditLog({
          table_name: 'payroll_runs',
          record_id: runId,
          action: 'UPDATE',
          old_values: { status: run.status },
          new_values: { status: 'approved', approved_by: approvedBy },
          user_id: approvedBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('payroll.approved', {
        runId,
        periodId: run.period_id,
        approvedBy
      });

      MyLogger.success(action, {
        runId,
        periodId: run.period_id,
        approvedBy
      });

      return updatedRun;
    } catch (error) {
      MyLogger.error(action, error, { runId, approvedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Approve all payroll runs for a period
   */
  static async approvePayrollPeriod(periodId: number, approvedBy?: number): Promise<number> {
    const action = "UpdatePayrollMediator.approvePayrollPeriod";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { periodId, approvedBy });

      // Get all calculated runs for the period
      const runsQuery = `
        SELECT id FROM payroll_runs
        WHERE period_id = $1 AND status = 'calculated'
      `;

      const runsResult = await client.query(runsQuery, [periodId]);
      const runIds = runsResult.rows.map((row: any) => row.id);

      if (runIds.length === 0) {
        MyLogger.warn(action, { periodId, message: 'No calculated runs found for approval' });
        return 0;
      }

      // Approve all runs
      let approvedCount = 0;
      for (const runId of runIds) {
        try {
          await this.approvePayrollRun(runId, approvedBy);
          approvedCount++;
        } catch (error) {
          MyLogger.error(`Failed to approve run ${runId}`, error);
          // Continue with other runs
        }
      }

      // Update period status
      await client.query(
        'UPDATE payroll_periods SET status = $1, updated_at = $2 WHERE id = $3',
        ['approved', new Date(), periodId]
      );

      // Create audit log for period approval
      if (approvedBy) {
        await this.auditService.createAuditLog({
          table_name: 'payroll_periods',
          record_id: periodId,
          action: 'UPDATE',
          old_values: { status: 'calculated' },
          new_values: { status: 'approved' },
          user_id: approvedBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('payroll.period.approved', {
        periodId,
        approvedRuns: approvedCount,
        totalRuns: runIds.length,
        approvedBy
      });

      MyLogger.success(action, {
        periodId,
        approvedCount,
        totalRuns: runIds.length,
        approvedBy
      });

      return approvedCount;
    } catch (error) {
      MyLogger.error(action, error, { periodId, approvedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark payroll as paid
   */
  static async markPayrollAsPaid(runId: number, paidBy?: number): Promise<PayrollRun> {
    const action = "UpdatePayrollMediator.markPayrollAsPaid";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { runId, paidBy });

      // Get current payroll run
      const runQuery = 'SELECT * FROM payroll_runs WHERE id = $1';
      const runResult = await client.query(runQuery, [runId]);

      if (runResult.rows.length === 0) {
        throw new Error('Payroll run not found');
      }

      const run = runResult.rows[0];

      // Check if run is approved
      if (run.status !== 'approved') {
        throw new Error('Payroll run must be approved before marking as paid');
      }

      // Update payroll run status
      const updateQuery = `
        UPDATE payroll_runs
        SET status = $1, paid_at = $2, updated_at = $3
        WHERE id = $4
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        'paid',
        new Date(),
        new Date(),
        runId
      ]);

      const updatedRun = updateResult.rows[0];

      // Create audit log
      if (paidBy) {
        await this.auditService.createAuditLog({
          table_name: 'payroll_runs',
          record_id: runId,
          action: 'UPDATE',
          old_values: { status: run.status },
          new_values: { status: 'paid', paid_at: new Date() },
          user_id: paidBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('payroll.paid', {
        runId,
        periodId: run.period_id,
        employeeId: run.employee_id,
        amount: run.payroll_data?.netPay,
        paidBy
      });

      MyLogger.success(action, {
        runId,
        periodId: run.period_id,
        amount: run.payroll_data?.netPay,
        paidBy
      });

      return updatedRun;
    } catch (error) {
      MyLogger.error(action, error, { runId, paidBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel payroll run
   */
  static async cancelPayrollRun(runId: number, cancelledBy?: number, reason?: string): Promise<PayrollRun> {
    const action = "UpdatePayrollMediator.cancelPayrollRun";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { runId, cancelledBy, reason });

      // Get current payroll run
      const runQuery = 'SELECT * FROM payroll_runs WHERE id = $1';
      const runResult = await client.query(runQuery, [runId]);

      if (runResult.rows.length === 0) {
        throw new Error('Payroll run not found');
      }

      const run = runResult.rows[0];

      // Check if run can be cancelled (not already paid)
      if (run.status === 'paid') {
        throw new Error('Cannot cancel a paid payroll run');
      }

      // Update payroll run status
      const updateQuery = `
        UPDATE payroll_runs
        SET status = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        'cancelled',
        new Date(),
        runId
      ]);

      const updatedRun = updateResult.rows[0];

      // Create audit log
      if (cancelledBy) {
        await this.auditService.createAuditLog({
          table_name: 'payroll_runs',
          record_id: runId,
          action: 'UPDATE',
          old_values: { status: run.status },
          new_values: { status: 'cancelled', cancellation_reason: reason },
          user_id: cancelledBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('payroll.cancelled', {
        runId,
        periodId: run.period_id,
        reason,
        cancelledBy
      });

      MyLogger.success(action, {
        runId,
        periodId: run.period_id,
        reason,
        cancelledBy
      });

      return updatedRun;
    } catch (error) {
      MyLogger.error(action, error, { runId, cancelledBy, reason });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update payroll period status
   */
  static async updatePayrollPeriodStatus(periodId: number, status: string, updatedBy?: number): Promise<void> {
    const action = "UpdatePayrollMediator.updatePayrollPeriodStatus";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { periodId, status, updatedBy });

      const validStatuses = ['draft', 'open', 'calculated', 'approved', 'closed', 'cancelled'];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      // Get current period
      const periodQuery = 'SELECT * FROM payroll_periods WHERE id = $1';
      const periodResult = await client.query(periodQuery, [periodId]);

      if (periodResult.rows.length === 0) {
        throw new Error('Payroll period not found');
      }

      const period = periodResult.rows[0];

      // Update period status
      await client.query(
        'UPDATE payroll_periods SET status = $1, updated_at = $2 WHERE id = $3',
        [status, new Date(), periodId]
      );

      // Create audit log
      if (updatedBy) {
        await this.auditService.createAuditLog({
          table_name: 'payroll_periods',
          record_id: periodId,
          action: 'UPDATE',
          old_values: { status: period.status },
          new_values: { status },
          user_id: updatedBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('payroll.period.status.updated', {
        periodId,
        oldStatus: period.status,
        newStatus: status,
        updatedBy
      });

      MyLogger.success(action, {
        periodId,
        oldStatus: period.status,
        newStatus: status,
        updatedBy
      });

    } catch (error) {
      MyLogger.error(action, error, { periodId, status, updatedBy });
      throw error;
    } finally {
      client.release();
    }
  }
}
