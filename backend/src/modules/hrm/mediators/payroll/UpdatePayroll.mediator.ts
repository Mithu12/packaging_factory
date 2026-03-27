import { PayrollRun } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';

export interface RecordPayrollPaymentsInput {
  employee_ids: number[];
  payment_method: string;
  payment_date: string;
  bank_account_number?: string;
  bank_name?: string;
  check_number?: string;
  notes?: string;
}

function buildPayrollPaymentReference(input: RecordPayrollPaymentsInput): string {
  const parts: string[] = [`m:${input.payment_method}`];
  if (input.check_number?.trim()) {
    parts.push(`chk:${input.check_number.trim()}`);
  }
  if (input.bank_account_number?.trim()) {
    const acct = input.bank_account_number.replace(/\s/g, '');
    const tail = acct.length > 4 ? acct.slice(-4) : acct;
    parts.push(`acct:***${tail}`);
  }
  if (input.bank_name?.trim()) {
    const bn = input.bank_name.trim();
    parts.push(`bn:${bn.length > 20 ? `${bn.slice(0, 17)}...` : bn}`);
  }
  const s = parts.join('|');
  return s.length > 100 ? `${s.slice(0, 97)}...` : s;
}

export class UpdatePayrollMediator {

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

      // ProcessPayrollMediator sets 'completed' after calculation; legacy runs may use 'calculated'
      const approvableStatuses = ['calculated', 'completed'];
      if (!approvableStatuses.includes(run.status)) {
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
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: approvedBy,
          action: 'MARK_PAYROLL_AS_PAID',
          resourceType: 'payroll_run',
          resourceId: runId,
          endpoint: '/api/hrm/payroll/runs/paid',
          method: 'POST',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: run.status },
          newValues: { status: 'approved', approved_by: approvedBy }
        });
      }

      // Publish event
      eventBus.emit('payroll.approved', {
        runId,
        periodId: run.payroll_period_id,
        approvedBy
      });

      MyLogger.success(action, {
        runId,
        periodId: run.payroll_period_id,
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
        WHERE payroll_period_id = $1 AND status IN ('calculated', 'completed')
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

      // Period CHECK allows open/processing/closed/cancelled — align with calculate flow (closed)
      await client.query(
        'UPDATE payroll_periods SET status = $1, updated_at = $2 WHERE id = $3',
        ['closed', new Date(), periodId]
      );

      // Create audit log for period approval
      if (approvedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: approvedBy,
          action: 'APPROVE_PAYROLL_PERIOD',
          resourceType: 'payroll_period',
          resourceId: periodId,
          endpoint: '/api/hrm/payroll/periods/approve',
          method: 'POST',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: 'calculated' },
          newValues: { status: 'closed' }
        });
      }

      // Publish event
      eventBus.emit('payroll.period.approved', {
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
  static async markPayrollAsPaid(runId: number, approvedBy?: number): Promise<PayrollRun> {
    const action = "UpdatePayrollMediator.markPayrollAsPaid";
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
      if (approvedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: approvedBy,
          action: 'MARK_PAYROLL_AS_PAID',
          resourceType: 'payroll_run',
          resourceId: runId,
          endpoint: '/api/hrm/payroll/runs/paid',
          method: 'POST',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: run.status },
          newValues: { status: 'paid', paid_at: new Date() }
        });
      }

      // Publish event
      eventBus.emit('payroll.paid', {
        runId,
        periodId: run.payroll_period_id,
        employeeId: run.employee_id,
        amount: run.payroll_data?.netPay,
        approvedBy
      });

      MyLogger.success(action, {
        runId,
        periodId: run.payroll_period_id,
        amount: run.payroll_data?.netPay,
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
   * Record payments for selected employees on a payroll run (updates payroll_details).
   * Auto-approves the run when still in completed/calculated; sets run to paid when all lines are paid.
   */
  static async recordPayrollPayments(
    runId: number,
    input: RecordPayrollPaymentsInput,
    processedBy?: number
  ): Promise<{
    payroll_run: PayrollRun;
    updated_count: number;
    voucher_id?: number | null;
    voucher_no?: string | null;
    voucher_warning?: string | null;
  }> {
    const action = 'UpdatePayrollMediator.recordPayrollPayments';
    const client = await pool.connect();

    if (!input.employee_ids?.length) {
      throw new Error('At least one employee_id is required');
    }

    try {
      await client.query('BEGIN');

      const runResult = await client.query(
        'SELECT * FROM payroll_runs WHERE id = $1 FOR UPDATE',
        [runId]
      );
      if (runResult.rows.length === 0) {
        throw new Error('Payroll run not found');
      }
      const run = runResult.rows[0];

      const periodRes = await client.query('SELECT name FROM payroll_periods WHERE id = $1', [
        run.payroll_period_id,
      ]);
      const periodName: string | null = periodRes.rows[0]?.name ?? null;

      if (!['completed', 'calculated', 'approved'].includes(run.status)) {
        throw new Error(
          `Cannot record payments for payroll run in status "${run.status}". Calculate payroll first.`
        );
      }

      if (run.status === 'completed' || run.status === 'calculated') {
        await client.query(
          `UPDATE payroll_runs
           SET status = 'approved', approved_by = $1, approved_at = $2, updated_at = $2
           WHERE id = $3`,
          [processedBy ?? null, new Date(), runId]
        );
      }

      const paymentRef = buildPayrollPaymentReference(input);
      const notesTrim = input.notes?.trim() || null;

      const updateResult = await client.query(
        `UPDATE payroll_details
         SET status = 'paid',
             payment_date = $1::date,
             payment_reference = $2,
             notes = COALESCE($3, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE payroll_run_id = $4
           AND employee_id = ANY($5::bigint[])
           AND status = 'calculated'
         RETURNING id, net_salary`,
        [input.payment_date, paymentRef, notesTrim, runId, input.employee_ids]
      );

      if (updateResult.rowCount === 0) {
        throw new Error(
          'No payroll lines were updated. Selected employees may already be paid or are not in this run.'
        );
      }

      const remaining = await client.query(
        `SELECT COUNT(*)::int AS c FROM payroll_details WHERE payroll_run_id = $1 AND status <> 'paid'`,
        [runId]
      );
      if (remaining.rows[0].c === 0) {
        await client.query(
          `UPDATE payroll_runs SET status = 'paid', paid_at = $1, updated_at = $1 WHERE id = $2`,
          [new Date(), runId]
        );
      }

      const finalRun = await client.query('SELECT * FROM payroll_runs WHERE id = $1', [runId]);

      await client.query('COMMIT');

      const detailRows = updateResult.rows as { id: string | number; net_salary: string | number }[];
      const payrollDetailIds = detailRows.map((r) => Number(r.id));
      const totalNetPay = detailRows.reduce((sum, r) => sum + Number(r.net_salary), 0);

      let voucher_id: number | null = null;
      let voucher_no: string | null = null;
      let voucher_warning: string | null = null;

      const voucherUserId = processedBy && processedBy > 0 ? processedBy : 1;

      if (
        moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS) &&
        payrollDetailIds.length > 0 &&
        totalNetPay > 0.0001
      ) {
        try {
          const vResult = await interModuleConnector.accModule.addPayrollPaymentVoucher(
            {
              payrollRunId: runId,
              payrollDetailIds,
              totalNetPay,
              paymentMethod: input.payment_method,
              paymentDate: input.payment_date,
              paymentReference: paymentRef,
              periodName,
              notes: notesTrim,
            },
            voucherUserId
          );

          if (vResult?.success && vResult.voucherId) {
            voucher_id = vResult.voucherId;
            voucher_no = vResult.voucherNo ?? null;
            await pool.query(
              `UPDATE payroll_details SET voucher_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::bigint[])`,
              [voucher_id, payrollDetailIds]
            );
          } else if (vResult && !vResult.success && vResult.error) {
            voucher_warning = vResult.error;
          }
        } catch (vErr: any) {
          voucher_warning = vErr?.message || 'Accounting voucher failed';
          MyLogger.error(`${action}.accounts`, vErr, { runId });
        }
      }

      if (processedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: processedBy,
          action: 'RECORD_PAYROLL_PAYMENTS',
          resourceType: 'payroll_run',
          resourceId: runId,
          endpoint: '/api/hrm/payroll/runs/pay',
          method: 'POST',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: run.status },
          newValues: {
            employees_paid: input.employee_ids.length,
            payment_method: input.payment_method,
            payment_date: input.payment_date,
            voucher_id,
            voucher_no,
          }
        });
      }

      eventBus.emit('payroll.payments.recorded', {
        runId,
        periodId: run.payroll_period_id,
        employeeIds: input.employee_ids,
        processedBy,
        voucherId: voucher_id,
      });

      MyLogger.success(action, {
        runId,
        updatedCount: updateResult.rowCount,
        finalStatus: finalRun.rows[0]?.status,
        voucher_id,
      });

      return {
        payroll_run: finalRun.rows[0],
        updated_count: updateResult.rowCount ?? 0,
        voucher_id,
        voucher_no,
        voucher_warning,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { runId, input });
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
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: cancelledBy,
          action: 'CANCEL_PAYROLL_RUN',
          resourceType: 'payroll_run',
          resourceId: runId,
          endpoint: '/api/hrm/payroll/runs/cancel',
          method: 'POST',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: run.status },
          newValues: { status: 'cancelled', cancellation_reason: reason },
        });
      }

      // Publish event
      eventBus.emit('payroll.cancelled', {
        runId,
        periodId: run.payroll_period_id,
        reason,
        cancelledBy
      });

      MyLogger.success(action, {
        runId,
        periodId: run.payroll_period_id,
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
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: updatedBy,
          action: 'UPDATE_PAYROLL_PERIOD_STATUS',
          resourceType: 'payroll_period',
          resourceId: periodId,
          endpoint: '/api/hrm/payroll/periods/status',
          method: 'POST',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: period.status },
          newValues: { status },
        });
      }

      // Publish event
      eventBus.emit('payroll.period.status.updated', {
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
