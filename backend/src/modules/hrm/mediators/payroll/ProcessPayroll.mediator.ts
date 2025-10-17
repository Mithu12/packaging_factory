import { PayrollRun, PayrollCalculationRequest, EmployeeSalaryStructure } from '../../../../../types/hrm';
import pool from '../../../../../database/connection';
import { AuditService } from '../../../../../services/audit-service';
import { eventBus } from '../../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class ProcessPayrollMediator {
  private auditService: AuditService;
  private eventBus: any;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = eventBus;
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
      const periodResult = await client.query(periodQuery, [calcRequest.period_id]);

      if (periodResult.rows.length === 0) {
        throw new Error('Payroll period not found');
      }

      const period = periodResult.rows[0];

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

      // Process each employee
      const payrollRuns: any[] = [];
      for (const employeeId of employeeIds) {
        try {
          const payrollData = await this.calculateEmployeePayroll(employeeId, period, calcRequest);
          const run = await this.createPayrollRun(employeeId, calcRequest.period_id, payrollData, calculatedBy);
          payrollRuns.push(run);
        } catch (error) {
          MyLogger.error(`Payroll calculation failed for employee ${employeeId}`, error);
          // Continue processing other employees
        }
      }

      await client.query('COMMIT');

      // Update period status to calculated
      await client.query(
        'UPDATE payroll_periods SET status = $1, updated_at = $2 WHERE id = $3',
        ['calculated', new Date(), calcRequest.period_id]
      );

      const result: PayrollRun = {
        id: 0, // This would be set if we created a master run record
        period_id: calcRequest.period_id,
        employee_runs: payrollRuns.length,
        total_gross_pay: payrollRuns.reduce((sum, run) => sum + (run.payroll_data?.grossPay || 0), 0),
        total_net_pay: payrollRuns.reduce((sum, run) => sum + (run.payroll_data?.netPay || 0), 0),
        status: 'calculated',
        calculated_by: calculatedBy,
        calculated_at: new Date(),
        approved_by: null,
        approved_at: null,
        paid_at: null
      };

      // Publish event
      this.eventBus.publish('payroll.calculated', {
        periodId: calcRequest.period_id,
        employeeCount: payrollRuns.length,
        totalGrossPay: result.total_gross_pay,
        calculatedBy
      });

      MyLogger.success(action, {
        periodId: calcRequest.period_id,
        employeeCount: payrollRuns.length,
        totalGrossPay: result.total_gross_pay,
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
    calcRequest: PayrollCalculationRequest
  ): Promise<any> {
    const client = await pool.connect();

    try {
      // Get employee details
      const employeeQuery = `
        SELECT e.*, d.name as department_name, des.title as designation_title
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
        WHERE employee_id = $1 AND record_date BETWEEN $2 AND $3
        ORDER BY record_date, record_time
      `;

      const attendanceResult = await client.query(attendanceQuery, [employeeId, period.start_date, period.end_date]);

      // Calculate working days and overtime
      const workingDays = this.calculateWorkingDays(period.start_date, period.end_date);
      const regularHours = workingDays * 8; // 8 hours per day
      let overtimeHours = 0;

      for (const record of attendanceResult.rows) {
        if (record.record_type === 'overtime_start' || record.record_type === 'overtime_end') {
          overtimeHours += 1; // Simplified calculation
        }
      }

      // Get salary components
      const componentsQuery = `
        SELECT
          pc.*,
          esc.amount as assigned_amount,
          esc.percentage as assigned_percentage
        FROM payroll_components pc
        LEFT JOIN employee_salary_components esc ON pc.id = esc.component_id AND esc.employee_id = $1
        WHERE pc.is_active = true
        ORDER BY pc.component_type, pc.name
      `;

      const componentsResult = await client.query(componentsQuery, [employeeId]);
      const components = componentsResult.rows;

      // Calculate earnings
      let totalEarnings = parseFloat(employee.hourly_rate || '0') * regularHours;
      let bonuses = 0;
      let overtimePay = 0;

      if (calcRequest.include_bonuses !== false) {
        bonuses = this.calculateBonuses(employeeId, period.start_date, period.end_date);
        totalEarnings += bonuses;
      }

      if (calcRequest.include_overtime !== false && overtimeHours > 0) {
        overtimePay = parseFloat(employee.hourly_rate || '0') * overtimeHours * 1.5;
        totalEarnings += overtimePay;
      }

      // Calculate deductions
      let totalDeductions = 0;
      if (calcRequest.include_deductions !== false) {
        totalDeductions = this.calculateDeductions(employeeId, period.start_date, period.end_date);
      }

      // Calculate tax (simplified)
      const grossPay = totalEarnings;
      const tax = grossPay * 0.1; // 10% tax rate

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
        workingDays,
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
   * Create payroll run record
   */
  private static async createPayrollRun(employeeId: number, periodId: number, payrollData: any, calculatedBy?: number): Promise<any> {
    const client = await pool.connect();

    try {
      const insertQuery = `
        INSERT INTO payroll_runs (
          employee_id, period_id, payroll_data, status, calculated_by, calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const runResult = await client.query(insertQuery, [
        employeeId,
        periodId,
        JSON.stringify(payrollData),
        'calculated',
        calculatedBy,
        new Date()
      ]);

      return runResult.rows[0];
    } catch (error) {
      MyLogger.error(`Payroll run creation failed for employee ${employeeId}`, error);
      throw error;
    } finally {
      client.release();
    }
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
   * Calculate deductions for an employee
   */
  private static calculateDeductions(employeeId: number, startDate: string, endDate: string): number {
    // This would query actual deduction records
    // For now, return a placeholder calculation
    return 0;
  }

  /**
   * Setup employee salary structure
   */
  static async setupEmployeeSalaryStructure(
    employeeId: number,
    baseSalary: number,
    components: Array<{ component_id: number; amount?: number; percentage?: number }>,
    setupBy?: number
  ): Promise<EmployeeSalaryStructure> {
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

      // Remove existing salary components for this employee
      await client.query('DELETE FROM employee_salary_components WHERE employee_id = $1', [employeeId]);

      // Insert new salary components
      for (const component of components) {
        await client.query(
          'INSERT INTO employee_salary_components (employee_id, component_id, amount, percentage) VALUES ($1, $2, $3, $4)',
          [employeeId, component.component_id, component.amount, component.percentage]
        );
      }

      await client.query('COMMIT');

      // Create audit log
      if (setupBy) {
        await this.auditService.createAuditLog({
          table_name: 'employees',
          record_id: employeeId,
          action: 'UPDATE',
          old_values: { hourly_rate: 'previous_value' }, // This would be fetched from before update
          new_values: { hourly_rate: baseSalary },
          user_id: setupBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('employee.salary.structure.updated', {
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
