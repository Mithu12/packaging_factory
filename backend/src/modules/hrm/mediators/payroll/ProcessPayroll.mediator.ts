import { PayrollRun, PayrollCalculationRequest, EmployeeSalaryStructure } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import SettingsMediator from '@/mediators/settings/SettingsMediator';

export class ProcessPayrollMediator {

  /** Payroll income tax % of gross (settings key payroll_default_tax_rate); fallback 10. */
  private static parseDefaultTaxPercent(payrollSettings: { [key: string]: { value?: unknown } }): number {
    const raw = payrollSettings.payroll_default_tax_rate?.value;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
    if (!Number.isFinite(n) || n < 0) {
      return 10;
    }
    return Math.min(100, n);
  }

  /**
   * Calculate payroll for employees
   */
  static async calculatePayroll(calcRequest: PayrollCalculationRequest, calculatedBy?: number): Promise<PayrollRun> {
    const action = "ProcessPayrollMediator.calculatePayroll";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { calcRequest, calculatedBy });

      await client.query('BEGIN');

      // Get payroll period
      const periodQuery = 'SELECT * FROM payroll_periods WHERE id = $1';
      const periodResult = await client.query(periodQuery, [calcRequest.payroll_period_id]);

      if (periodResult.rows.length === 0) {
        throw new Error('Payroll period not found');
      }

      const period = periodResult.rows[0];

      // Get payroll settings (salary mode, overtime)
      const settingsMediator = new SettingsMediator();
      const payrollSettings = await settingsMediator.getSettingsByCategory('payroll');
      const salaryMode = (payrollSettings.payroll_salary_mode?.value as string || 'hourly').toLowerCase();
      const isMonthlyMode = salaryMode === 'monthly';
      const overtimeVal = payrollSettings.payroll_overtime_enabled?.value;
      const overtimeEnabled = String(overtimeVal ?? true).toLowerCase() !== 'false';
      const defaultTaxPercent = this.parseDefaultTaxPercent(payrollSettings);
      MyLogger.info(action, { salaryMode, isMonthlyMode, overtimeEnabled, defaultTaxPercent });

      // Get employees to process
      let employeeIds: number[] = [];
      if (calcRequest.employee_ids && calcRequest.employee_ids.length > 0) {
        employeeIds = calcRequest.employee_ids;
      } else {
        // Get all active employees in the factory
        const employeesQuery = 'SELECT id FROM employees WHERE is_active = true';
        const employeesResult = await client.query(employeesQuery);
        employeeIds = employeesResult.rows.map((row: any) => row.id);
      }

      // Create one payroll_run for the period (schema: payroll_runs)
      const runNumber = `PR-${calcRequest.payroll_period_id}-${Date.now()}`;
      const runInsert = await client.query(
        `INSERT INTO payroll_runs (payroll_period_id, run_number, status, total_employees, total_gross_salary, total_deductions, total_net_salary, processed_by, processed_at, notes)
         VALUES ($1, $2, $3, 0, 0, 0, 0, $4, $5, $6) RETURNING *`,
        [calcRequest.payroll_period_id, runNumber, calcRequest.dry_run ? 'draft' : 'processing', calculatedBy, new Date(), calcRequest.dry_run ? 'Dry run' : 'Live calculation']
      );
      const payrollRun = runInsert.rows[0];

      // Process each employee and insert payroll_details
      const payrollDetails: any[] = [];
      for (const employeeId of employeeIds) {
        try {
          const payrollData = await this.calculateEmployeePayroll(
            employeeId,
            period,
            calcRequest,
            isMonthlyMode,
            overtimeEnabled,
            defaultTaxPercent
          );
          const detail = await this.insertPayrollDetail(client, payrollRun.id, employeeId, payrollData);
          payrollDetails.push(detail);

          if (!calcRequest.dry_run) {
            await client.query(
              'UPDATE payroll_runs SET total_gross_salary = total_gross_salary + $1, total_deductions = total_deductions + $2, total_net_salary = total_net_salary + $3 WHERE id = $4',
              [payrollData.grossPay, payrollData.totalDeductions + payrollData.tax, payrollData.netPay, payrollRun.id]
            );
          }
        } catch (error) {
          MyLogger.error(`Payroll calculation failed for employee ${employeeId}`, error);
          // Continue processing other employees
        }
      }

      if (!calcRequest.dry_run) {
        await client.query(
          'UPDATE payroll_runs SET status = $1, total_employees = $2, updated_at = $3 WHERE id = $4',
          ['completed', payrollDetails.length, new Date(), payrollRun.id]
        );
        // Update period status to closed (constraint allows: open, processing, closed, cancelled)
        await client.query(
          'UPDATE payroll_periods SET status = $1, updated_at = $2 WHERE id = $3',
          ['closed', new Date(), calcRequest.payroll_period_id]
        );
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }

      const result: PayrollRun = {
        id: payrollRun.id,
        payroll_period_id: calcRequest.payroll_period_id,
        run_number: payrollRun.run_number,
        status: payrollRun.status,
        total_employees: payrollDetails.length,
        total_gross_salary: payrollDetails.reduce((s, d) => s + (d.total_earnings || 0), 0),
        total_deductions: payrollDetails.reduce((s, d) => s + (d.total_deductions || 0) + (d.tax_deduction || 0), 0),
        total_net_salary: payrollDetails.reduce((s, d) => s + (d.net_salary || 0), 0),
        processed_by: calculatedBy,
        processed_at: new Date().toISOString(),
        posted_to_accounting: false,
        created_by: calculatedBy,
        created_at: payrollRun.created_at,
        updated_at: new Date().toISOString()
      };

      // Publish event
      eventBus.emit('payroll.calculated', {
        periodId: calcRequest.payroll_period_id,
        employeeCount: payrollDetails.length,
        totalGrossSalary: result.total_gross_salary,
        calculatedBy
      });

      MyLogger.success(action, {
        periodId: calcRequest.payroll_period_id,
        employeeCount: payrollDetails.length,
        totalGrossSalary: result.total_gross_salary,
        calculatedBy
      });

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { calcRequest, calculatedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate payroll for a single employee
   */
  private static async calculateEmployeePayroll(
    employeeId: number,
    period: any,
    calcRequest: PayrollCalculationRequest,
    isMonthlyMode: boolean = false,
    overtimeEnabled: boolean = true,
    defaultTaxPercent: number = 10
  ): Promise<any> {
    const client = await pool.connect();

    try {
      // Get employee details
      const employeeQuery = `
        SELECT e.*, d.name as department_name, des.title as designation_title, des.min_salary as designation_min_salary
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations des ON e.designation_id = des.id
        WHERE e.id = $1 AND e.is_active = true
      `;

      const employeeResult = await client.query(employeeQuery, [employeeId]);

      if (employeeResult.rows.length === 0) {
        throw new Error('Employee not found');
      }

      const employee = employeeResult.rows[0];

      // Get attendance records for the period
      const attendanceQuery = `
        SELECT * FROM attendance_records
        WHERE employee_id = $1 AND attendance_date BETWEEN $2 AND $3
        ORDER BY attendance_date, check_in_time
      `;

      const attendanceResult = await client.query(attendanceQuery, [employeeId, period.start_date, period.end_date]);

      // Use actual attendance hours only (no fallback)
      let regularHours = 0;
      let overtimeHours = 0;
      let daysPresent = 0;

      for (const record of attendanceResult.rows) {
        const recordOvertime = parseFloat(record.overtime_hours || '0');
        let recordTotal = parseFloat(record.total_hours_worked || '0');

        // If total_hours_worked is missing, compute from check_in/check_out
        if (isNaN(recordTotal) || recordTotal <= 0) {
          recordTotal = this.computeHoursFromTimes(record.check_in_time, record.check_out_time);
        }
        if (recordTotal > 0) {
          daysPresent++;
          // Regular = total - overtime (overtime is typically already in total_hours_worked)
          const regular = Math.max(0, recordTotal - recordOvertime);
          regularHours += regular;
          overtimeHours += recordOvertime;
        }
      }

      // Get salary components (use employee_salary_structure - table from V55 migration)
      const componentsQuery = `
        SELECT
          pc.*,
          ess.amount as assigned_amount,
          ess.percentage as assigned_percentage
        FROM payroll_components pc
        LEFT JOIN employee_salary_structure ess ON pc.id = ess.payroll_component_id AND ess.employee_id = $1
          AND ess.is_active = true
          AND ess.effective_from <= CURRENT_DATE
          AND (ess.effective_to IS NULL OR ess.effective_to >= CURRENT_DATE)
        WHERE pc.is_active = true
        ORDER BY pc.component_type, pc.name
      `;

      const componentsResult = await client.query(componentsQuery, [employeeId]);
      const components = componentsResult.rows;

      // Use hourly_rate; fallback to employee_salary_structure (basic) or designation min_salary when 0
      let hourlyRate = parseFloat(employee.hourly_rate || '0');
      if (hourlyRate <= 0) {
        const basicComponent = components.find((c: any) => c.component_type === 'earning' && (c.category === 'basic' || c.name?.toLowerCase().includes('basic')));
        const basicMonthly = basicComponent ? parseFloat(basicComponent.assigned_amount || '0') : 0;
        if (basicMonthly > 0) {
          hourlyRate = basicMonthly / (8 * 22); // monthly to hourly (22 working days)
        } else {
          const designationMin = parseFloat(employee.designation_min_salary || '0');
          if (designationMin > 0) {
            hourlyRate = designationMin / (8 * 22);
          }
        }
      }
      const workingDaysInPeriod = this.calculateWorkingDays(period.start_date, period.end_date);

      let totalEarnings: number;
      let overtimePay = 0;

      const includeOvertime = overtimeEnabled && (calcRequest.include_overtime !== false);

      if (isMonthlyMode) {
        // Monthly: salary = (hourly_rate * 8 * working_days) * (days_present / working_days) - deducts for absent days
        const monthlyFullPay = hourlyRate * 8 * workingDaysInPeriod;
        const payForDaysPresent = workingDaysInPeriod > 0
          ? monthlyFullPay * (daysPresent / workingDaysInPeriod)
          : 0;
        totalEarnings = payForDaysPresent;
        if (includeOvertime && overtimeHours > 0) {
          overtimePay = hourlyRate * overtimeHours * 1.5;
          totalEarnings += overtimePay;
        }
      } else {
        // Hourly: salary = hourly_rate * hours_worked
        totalEarnings = hourlyRate * regularHours;
        if (includeOvertime && overtimeHours > 0) {
          overtimePay = hourlyRate * overtimeHours * 1.5;
          totalEarnings += overtimePay;
        }
      }

      let bonuses = 0;
      if (calcRequest.include_loans !== false) {
        bonuses = this.calculateBonuses(employeeId, period.start_date, period.end_date);
        totalEarnings += bonuses;
      }

      // Calculate deductions (advance salary / loans from employee_loans)
      let totalDeductions = 0;
      if (calcRequest.include_loans !== false) {
        totalDeductions = await this.calculateDeductions(employeeId, period.start_date, period.end_date);
      }

      const grossPay = totalEarnings;
      const empTaxRaw = employee.tax_rate;
      const useEmployeeRate = empTaxRaw !== null && empTaxRaw !== undefined && String(empTaxRaw).trim() !== '';
      const rawPct = useEmployeeRate ? Number(empTaxRaw) : defaultTaxPercent;
      const effectiveTaxPercent = Math.min(100, Math.max(0, Number.isFinite(rawPct) ? rawPct : defaultTaxPercent));
      const tax = Math.round(grossPay * (effectiveTaxPercent / 100) * 100) / 100;

      const netPay = grossPay - totalDeductions - tax;

      const payrollData = {
        employee_id: employeeId,
        baseSalary: parseFloat(employee.hourly_rate || '0'),
        regularHours,
        overtimeHours,
        overtimePay,
        bonuses,
        totalEarnings,
        totalDeductions,
        grossPay,
        tax,
        netPay,
        workingDays: daysPresent,
        periodStart: period.start_date,
        periodEnd: period.end_date
      };

      return payrollData;
    } catch (error) {
      MyLogger.error(`Employee payroll calculation failed for ${employeeId}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert payroll_detail for an employee (schema: payroll_details)
   */
  private static async insertPayrollDetail(client: any, payrollRunId: number, employeeId: number, payrollData: any): Promise<any> {
    const totalDeductions = (payrollData.totalDeductions || 0) + (payrollData.tax || 0);
    const insertQuery = `
      INSERT INTO payroll_details (
        payroll_run_id, employee_id, basic_salary, total_earnings, total_deductions, net_salary,
        working_days, overtime_hours, overtime_amount, loan_deductions, tax_deduction, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      payrollRunId,
      employeeId,
      payrollData.baseSalary || 0,
      payrollData.grossPay || 0,
      totalDeductions,
      payrollData.netPay || 0,
      payrollData.workingDays || 0,
      payrollData.overtimeHours || 0,
      payrollData.overtimePay || 0,
      payrollData.totalDeductions || 0,
      payrollData.tax || 0,
      'calculated'
    ]);
    return result.rows[0];
  }

  /**
   * Compute hours between check-in and check-out time strings
   */
  private static computeHoursFromTimes(checkIn: string | null, checkOut: string | null): number {
    if (!checkIn || !checkOut) return 0;
    const parse = (t: string) => {
      const s = String(t).trim();
      const timePart = s.includes('T') ? s.split('T')[1] : s;
      const m = (timePart || s).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt(m[3] || '0', 10) / 60 : NaN;
    };
    const inMins = parse(checkIn);
    const outMins = parse(checkOut);
    if (isNaN(inMins) || isNaN(outMins)) return 0;
    const diffMins = outMins - inMins;
    return diffMins > 0 ? Math.round((diffMins / 60) * 100) / 100 : 0;
  }

  /**
   * Calculate working days between dates
   */
  private static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Calculate bonuses for an employee
   */
  private static calculateBonuses(employeeId: number, startDate: string, endDate: string): number {
    // This would query actual bonus records
    // For now, return a placeholder calculation
    return 0;
  }

  /**
   * Calculate deductions for an employee (advance salary / loans from employee_loans)
   */
  private static async calculateDeductions(employeeId: number, startDate: string, endDate: string): Promise<number> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          id,
          monthly_installment,
          remaining_amount,
          paid_installments,
          total_installments,
          start_date
        FROM employee_loans
        WHERE employee_id = $1
          AND status = 'active'
          AND remaining_amount > 0
          AND start_date <= $2
          AND paid_installments < total_installments
      `;
      const result = await client.query(query, [employeeId, endDate]);
      let totalDeduction = 0;
      for (const loan of result.rows) {
        const installment = parseFloat(loan.monthly_installment || '0');
        const remaining = parseFloat(loan.remaining_amount || '0');
        const deduction = Math.min(installment, remaining);
        totalDeduction += deduction;
      }
      return totalDeduction;
    } finally {
      client.release();
    }
  }

  /**
   * Setup employee salary structure
   */
  static async setupEmployeeSalaryStructure(
    employeeId: number,
    baseSalary: number,
    components: Array<{ component_id: number; amount?: number; percentage?: number }>,
    setupBy?: number
  ): Promise<any> {
    const action = "ProcessPayrollMediator.setupEmployeeSalaryStructure";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, baseSalary, componentsCount: components.length, setupBy });

      await client.query('BEGIN');

      // Update employee base salary
      await client.query(
        'UPDATE employees SET hourly_rate = $1, updated_at = $2 WHERE id = $3',
        [baseSalary, new Date(), employeeId]
      );

      // Deactivate existing salary structure for this employee
      await client.query(
        'UPDATE employee_salary_structure SET is_active = false, effective_to = CURRENT_DATE WHERE employee_id = $1',
        [employeeId]
      );

      // Insert new salary structure entries
      for (const component of components) {
        await client.query(
          `INSERT INTO employee_salary_structure (employee_id, payroll_component_id, amount, percentage, effective_from, is_active, created_by)
           VALUES ($1, $2, $3, $4, CURRENT_DATE, true, $5)`,
          [employeeId, component.component_id, component.amount ?? 0, component.percentage, setupBy]
        );
      }

      await client.query('COMMIT');

      // Create audit log
      if (setupBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: setupBy,
          action: 'SETUP_EMPLOYEE_SALARY_STRUCTURE',
          resourceType: 'employee_salary_structure',
          resourceId: employeeId,
          endpoint: '/api/hrm/payroll/setup/salary-structure',
          method: 'POST',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { hourly_rate: 'previous_value' }, // This would be fetched from before update
          newValues: { hourly_rate: baseSalary }
        });
      }

      // Publish event
      eventBus.emit('employee.salary.structure.updated', {
        employeeId,
        baseSalary,
        componentsCount: components.length,
        setupBy
      });

      MyLogger.success(action, {
        employeeId,
        baseSalary,
        componentsCount: components.length,
        setupBy
      });

      return {
        employee_id: employeeId,
        base_salary: baseSalary,
        components: components,
        setup_by: setupBy,
        setup_at: new Date()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { employeeId, setupBy });
      throw error;
    } finally {
      client.release();
    }
  }
}
