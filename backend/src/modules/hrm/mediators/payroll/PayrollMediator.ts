import {
  PayrollPeriod,
  PayrollRun,
  PayrollDetail,
  PayrollComponent,
  EmployeeSalaryStructure,
  PayrollCalculationRequest,
  PayrollSummary,
  CreatePayrollPeriodRequest,
  CreatePayrollComponentRequest,
  CreatePayrollRunRequest
} from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';

class PayrollMediator implements MediatorInterface {
  private auditService: AuditService;
  private eventBus: any;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = eventBus;
  }

  async process(data: any): Promise<any> {
    return data;
  }

  /**
   * Create payroll period
   */
  async createPayrollPeriod(periodData: CreatePayrollPeriodRequest, createdBy?: number): Promise<PayrollPeriod> {
    const client = await pool.connect();

    try {
      // Check for overlapping periods
      const overlappingPeriod = await client.query('SELECT * FROM payroll_periods WHERE start_date BETWEEN $1 AND $2 OR end_date BETWEEN $1 AND $2 OR (start_date <= $1 AND end_date >= $2)', [periodData.start_date, periodData.end_date]);

      if (overlappingPeriod) {
        throw new Error('Overlapping payroll period exists');
      }

      const newPeriod = {
        ...periodData,
        status: 'open',
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [period] = await db('payroll_periods')
        .insert(newPeriod)
        .returning('*');



      return period;
    } catch (error) {
      throw new Error(`Failed to create payroll period: ${error}`);
    }
  }

  /**
   * Get payroll periods
   */
  async getPayrollPeriods(filters?: {
    status?: string;
    period_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PayrollPeriod[]> {
    const client = await pool.connect();

    try {
      let query = db('payroll_periods').orderBy('start_date', 'desc');

      if (filters?.status) {
        query = query.where('status', filters.status);
      }

      if (filters?.period_type) {
        query = query.where('period_type', filters.period_type);
      }

      if (filters?.start_date) {
        query = query.where('start_date', '>=', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.where('end_date', '<=', filters.end_date);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve payroll periods: ${error}`);
    }
  }

  /**
   * Create payroll component
   */
  async createPayrollComponent(componentData: CreatePayrollComponentRequest, createdBy?: number): Promise<PayrollComponent> {
    const client = await pool.connect();

    try {
      // Check if component code already exists
      const existingComponent = await db('payroll_components')
        .where('code', componentData.code)
        .first();

      if (existingComponent) {
        throw new Error('Component code already exists');
      }

      const newComponent = {
        ...componentData,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [component] = await db('payroll_components')
        .insert(newComponent)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: createdBy,
        action: 'CREATE',
        table_name: 'payroll_components',
        record_id: component.id,
        old_values: null,
        new_values: component,
        description: `Payroll component ${component.name} created`
      });

      return component;
    } catch (error) {
      throw new Error(`Failed to create payroll component: ${error}`);
    }
  }

  /**
   * Get payroll components
   */
  async getPayrollComponents(componentType?: 'earning' | 'deduction'): Promise<PayrollComponent[]> {
    const client = await pool.connect();

    try {
      let query = db('payroll_components').where('is_active', true).orderBy('name');

      if (componentType) {
        query = query.where('component_type', componentType);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve payroll components: ${error}`);
    }
  }

  /**
   * Set up employee salary structure
   */
  async setupEmployeeSalaryStructure(
    employeeId: number,
    components: { component_id: number; amount: number; percentage?: number }[],
    createdBy?: number
  ): Promise<EmployeeSalaryStructure[]> {
    const client = await pool.connect();

    try {
      // Remove existing salary structure
      await db('employee_salary_structure')
        .where('employee_id', employeeId)
        .update({ is_active: false, effective_to: new Date() });

      const structures: EmployeeSalaryStructure[] = [];

      for (const component of components) {
        const structure = {
          employee_id: employeeId,
          payroll_component_id: component.component_id,
          amount: component.amount,
          percentage: component.percentage,
          effective_from: new Date(),
          is_active: true,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        };

        const [created] = await db('employee_salary_structure')
          .insert(structure)
          .returning('*');

        structures.push(created);
      }

      // Audit log
      await this.auditService.log({
        user_id: createdBy,
        action: 'CREATE',
        table_name: 'employee_salary_structure',
        record_id: employeeId,
        old_values: null,
        new_values: { component_count: structures.length },
        description: `Salary structure set up for employee ${employeeId}`
      });

      return structures;
    } catch (error) {
      throw new Error(`Failed to setup salary structure: ${error}`);
    }
  }

  /**
   * Calculate payroll for a period
   */
  async calculatePayroll(calcRequest: PayrollCalculationRequest, calculatedBy?: number): Promise<PayrollRun> {
    const client = await pool.connect();

    try {
      const { payroll_period_id, employee_ids, include_overtime = true, include_loans = true, dry_run = false } = calcRequest;

      // Get payroll period
      const period = await db('payroll_periods')
        .where('id', payroll_period_id)
        .first();

      if (!period) {
        throw new Error('Payroll period not found');
      }

      if (period.status !== 'open') {
        throw new Error('Payroll period is not open for calculation');
      }

      // Get employees for calculation
      let employeeQuery = db('employees')
        .where('is_active', true)
        .where('join_date', '<=', period.end_date);

      if (employee_ids && employee_ids.length > 0) {
        employeeQuery = employeeQuery.whereIn('id', employee_ids);
      }

      const employees = await employeeQuery;

      if (employees.length === 0) {
        throw new Error('No employees found for payroll calculation');
      }

      // Create payroll run
      const runNumber = `PR-${Date.now()}`;
      const payrollRun: CreatePayrollRunRequest = {
        payroll_period_id,
        run_number: runNumber,
        status: dry_run ? 'draft' : 'processing',
        total_employees: employees.length,
        total_gross_salary: 0,
        total_deductions: 0,
        total_net_salary: 0,
        processed_by: calculatedBy,
        notes: dry_run ? 'Dry run calculation' : 'Live payroll calculation'
      };

      if (!dry_run) {
        payrollRun.processed_at = new Date();
      }

      const [run] = await db('payroll_runs')
        .insert(payrollRun)
        .returning('*');

      // Calculate payroll for each employee
      const payrollDetails: PayrollDetail[] = [];

      for (const employee of employees) {
        const detail = await this.calculateEmployeePayroll(run.id, employee.id, period, include_overtime, include_loans);
        payrollDetails.push(detail);

        // Update run totals
        if (!dry_run) {
          await db('payroll_runs')
            .where('id', run.id)
            .increment('total_gross_salary', detail.total_earnings)
            .increment('total_deductions', detail.total_deductions)
            .increment('total_net_salary', detail.net_salary);
        }
      }

      // Update run status
      if (!dry_run) {
        await db('payroll_runs')
          .where('id', run.id)
          .update({
            status: 'completed',
            total_employees: employees.length,
            updated_at: new Date()
          });
      }

      // Audit log
      await this.auditService.log({
        user_id: calculatedBy,
        action: 'CREATE',
        table_name: 'payroll_runs',
        record_id: run.id,
        old_values: null,
        new_values: run,
        description: `Payroll run ${run.run_number} calculated for ${employees.length} employees`
      });

      // Emit event
      this.eventBus.emit('payroll.calculated', { run, details: payrollDetails, calculatedBy });

      return run;
    } catch (error) {
      throw new Error(`Failed to calculate payroll: ${error}`);
    }
  }

  /**
   * Calculate payroll for a single employee
   */
  private async calculateEmployeePayroll(
    payrollRunId: number,
    employeeId: number,
    period: PayrollPeriod,
    includeOvertime: boolean,
    includeLoans: boolean
  ): Promise<PayrollDetail> {
    const client = await pool.connect();

    try {
      // Get employee salary structure
      const salaryStructure = await db('employee_salary_structure as ess')
        .join('payroll_components as pc', 'ess.payroll_component_id', 'pc.id')
        .select('ess.*', 'pc.*')
        .where('ess.employee_id', employeeId)
        .where('ess.is_active', true)
        .where('ess.effective_from', '<=', period.end_date)
        .where(function() {
          this.whereNull('ess.effective_to').orWhere('ess.effective_to', '>=', period.start_date);
        });

      // Calculate basic salary (first earning component)
      const basicComponent = salaryStructure.find(s => s.component_type === 'earning' && s.category === 'basic');
      const basicSalary = basicComponent ? basicComponent.amount : 0;

      // Calculate working days in period
      const workingDays = this.calculateWorkingDays(period.start_date, period.end_date);

      // Get attendance data for the period
      const attendanceData = await db('attendance_records')
        .where('employee_id', employeeId)
        .whereBetween('attendance_date', [period.start_date, period.end_date])
        .select(db.raw('SUM(total_hours_worked) as total_hours, COUNT(*) as days_present'));

      const totalHours = parseFloat(attendanceData[0]?.total_hours || '0');
      const daysPresent = parseInt(attendanceData[0]?.days_present || '0');

      // Calculate daily rate
      const dailyRate = basicSalary / workingDays;

      // Calculate earnings
      let totalEarnings = basicSalary;
      const earnings: any[] = [];

      for (const component of salaryStructure.filter(s => s.component_type === 'earning')) {
        let amount = component.amount;

        // Calculate overtime if applicable
        if (component.category === 'overtime' && includeOvertime) {
          const overtimeHours = Math.max(0, totalHours - (workingDays * 8)); // Assuming 8 hours per day
          amount = overtimeHours * (component.amount || 0); // Rate per hour
        }

        earnings.push({
          component_id: component.payroll_component_id,
          amount,
          quantity: component.category === 'overtime' ? overtimeHours : 1,
          rate: component.amount
        });

        totalEarnings += amount;
      }

      // Calculate deductions
      let totalDeductions = 0;
      const deductions: any[] = [];

      for (const component of salaryStructure.filter(s => s.component_type === 'deduction')) {
        let amount = component.amount;

        // Calculate loan deductions if applicable
        if (component.category === 'loan' && includeLoans) {
          const loanData = await db('employee_loans')
            .where('employee_id', employeeId)
            .where('status', 'active')
            .select(db.raw('SUM(monthly_installment) as total_loan_deduction'))
            .first();

          amount = parseFloat(loanData?.total_loan_deduction || '0');
        }

        // Calculate leave deductions
        if (component.category === 'leave') {
          const absentDays = workingDays - daysPresent;
          amount = absentDays * dailyRate;
        }

        deductions.push({
          component_id: component.payroll_component_id,
          amount,
          quantity: 1,
          rate: amount
        });

        totalDeductions += amount;
      }

      // Create payroll detail
      const netSalary = totalEarnings - totalDeductions;

      const payrollDetail = {
        payroll_run_id: payrollRunId,
        employee_id: employeeId,
        basic_salary: basicSalary,
        total_earnings: totalEarnings,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        working_days: workingDays,
        paid_days: daysPresent,
        absent_days: workingDays - daysPresent,
        overtime_hours: Math.max(0, totalHours - (workingDays * 8)),
        overtime_amount: earnings.find(e => e.component_id === basicComponent?.payroll_component_id)?.amount || 0,
        leave_deductions: deductions.find(d => d.component_id === salaryStructure.find(s => s.category === 'leave')?.payroll_component_id)?.amount || 0,
        loan_deductions: deductions.find(d => d.component_id === salaryStructure.find(s => s.category === 'loan')?.payroll_component_id)?.amount || 0,
        tax_deduction: 0, // Will be calculated based on tax rules
        status: 'calculated',
        created_at: new Date(),
        updated_at: new Date()
      };

      const [detail] = await db('payroll_details')
        .insert(payrollDetail)
        .returning('*');

      // Save component details
      for (const earning of earnings) {
        await db('payroll_component_details').insert({
          payroll_detail_id: detail.id,
          payroll_component_id: earning.component_id,
          amount: earning.amount,
          quantity: earning.quantity,
          rate: earning.rate,
          created_at: new Date()
        });
      }

      for (const deduction of deductions) {
        await db('payroll_component_details').insert({
          payroll_detail_id: detail.id,
          payroll_component_id: deduction.component_id,
          amount: deduction.amount,
          quantity: deduction.quantity,
          rate: deduction.rate,
          created_at: new Date()
        });
      }

      return detail;
    } catch (error) {
      throw new Error(`Failed to calculate payroll for employee ${employeeId}: ${error}`);
    }
  }

  /**
   * Calculate working days between two dates (excluding weekends and holidays)
   */
  private calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  /**
   * Approve payroll run
   */
  async approvePayrollRun(runId: number, approvedBy?: number): Promise<PayrollRun> {
    const client = await pool.connect();

    try {
      const run = await db('payroll_runs')
        .where('id', runId)
        .first();

      if (!run) {
        throw new Error('Payroll run not found');
      }

      if (run.status !== 'completed') {
        throw new Error('Payroll run must be completed before approval');
      }

      // Update payroll details status
      await db('payroll_details')
        .where('payroll_run_id', runId)
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date()
        });

      // Update run status
      const [updatedRun] = await db('payroll_runs')
        .where('id', runId)
        .update({
          status: 'posted',
          updated_at: new Date()
        })
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: approvedBy,
        action: 'UPDATE',
        table_name: 'payroll_runs',
        record_id: runId,
        old_values: run,
        new_values: updatedRun,
        description: `Payroll run ${run.run_number} approved`
      });

      // Emit event
      this.eventBus.emit('payroll.approved', { run: updatedRun, approvedBy });

      return updatedRun;
    } catch (error) {
      throw new Error(`Failed to approve payroll run: ${error}`);
    }
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(periodId: number): Promise<PayrollSummary> {
    const client = await pool.connect();

    try {
      const period = await db('payroll_periods')
        .where('id', periodId)
        .first();

      if (!period) {
        throw new Error('Payroll period not found');
      }

      const run = await db('payroll_runs')
        .where('payroll_period_id', periodId)
        .where('status', 'completed')
        .first();

      if (!run) {
        throw new Error('No completed payroll run found for this period');
      }

      // Get department-wise salary breakdown
      const departmentSalaries = await db('payroll_details as pd')
        .join('employees as e', 'pd.employee_id', 'e.id')
        .join('departments as d', 'e.department_id', 'd.id')
        .select('d.name as department')
        .sum('pd.net_salary as total_salary')
        .count('* as employee_count')
        .where('pd.payroll_run_id', run.id)
        .whereNotNull('e.department_id')
        .groupBy('d.name');

      // Get top earners
      const topEarners = await db('payroll_details as pd')
        .join('employees as e', 'pd.employee_id', 'e.id')
        .select(
          db.raw(`CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as employee`),
          'pd.net_salary as salary'
        )
        .where('pd.payroll_run_id', run.id)
        .orderBy('pd.net_salary', 'desc')
        .limit(10);

      return {
        period_id: periodId,
        period_name: period.name,
        total_employees: run.total_employees,
        total_gross_salary: run.total_gross_salary,
        total_deductions: run.total_deductions,
        total_net_salary: run.total_net_salary,
        average_salary: run.total_employees > 0 ? run.total_net_salary / run.total_employees : 0,
        top_earners: topEarners,
        department_salaries: departmentSalaries.map(item => ({
          department: item.department,
          total_salary: parseFloat(item.total_salary as string),
          employee_count: parseInt(item.employee_count as string)
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get payroll summary: ${error}`);
    }
  }
}

export default new PayrollMediator();