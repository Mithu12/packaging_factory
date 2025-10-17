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

      const periodResult = await client.query(
        'INSERT INTO payroll_periods (name, period_type, start_date, end_date, status, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [newPeriod.name, newPeriod.period_type, newPeriod.start_date, newPeriod.end_date, newPeriod.status, newPeriod.created_by, newPeriod.created_at, newPeriod.updated_at]
      );
      const period = periodResult.rows[0];



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
      let whereClause = '';
      let params: any[] = [];
      let paramIndex = 1;

      if (filters?.status) {
        whereClause += (whereClause ? ' AND ' : ' WHERE ') + `status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.period_type) {
        whereClause += (whereClause ? ' AND ' : ' WHERE ') + `period_type = $${paramIndex}`;
        params.push(filters.period_type);
        paramIndex++;
      }

      if (filters?.start_date) {
        whereClause += (whereClause ? ' AND ' : ' WHERE ') + `start_date >= $${paramIndex}`;
        params.push(filters.start_date);
        paramIndex++;
      }

      if (filters?.end_date) {
        whereClause += (whereClause ? ' AND ' : ' WHERE ') + `end_date <= $${paramIndex}`;
        params.push(filters.end_date);
        paramIndex++;
      }

      const result = await client.query(
        `SELECT * FROM payroll_periods${whereClause} ORDER BY start_date DESC`,
        params
      );

      return result.rows;
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
      const existingComponentResult = await client.query(
        'SELECT * FROM payroll_components WHERE code = $1',
        [componentData.code]
      );
      const existingComponent = existingComponentResult.rows[0];

      if (existingComponent) {
        throw new Error('Component code already exists');
      }

      const newComponent = {
        ...componentData,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const componentResult = await client.query(
        'INSERT INTO payroll_components (name, code, component_type, category, is_taxable, calculation_method, formula, description, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [newComponent.name, newComponent.code, newComponent.component_type, newComponent.category, newComponent.is_taxable, newComponent.calculation_method, newComponent.formula, newComponent.description, newComponent.created_by, newComponent.created_at, newComponent.updated_at]
      );
      const component = componentResult.rows[0];

      // Audit log
      await this.auditService.logActivity({
        userId: createdBy || null,
        action: 'CREATE',
        resourceType: 'payroll_components',
        resourceId: component.id,
        endpoint: '/payroll/components',
        method: 'POST',
        oldValues: null,
        newValues: component,
        success: true,
        responseStatus: 201,
        durationMs: 0,
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
      let whereClause = ' WHERE is_active = true';
      let params: any[] = [];

      if (componentType) {
        whereClause += ' AND component_type = $1';
        params.push(componentType);
      }

      const result = await client.query(
        `SELECT * FROM payroll_components${whereClause} ORDER BY name`,
        params
      );

      return result.rows;
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
      await client.query(
        'UPDATE employee_salary_structure SET is_active = false, effective_to = $1 WHERE employee_id = $2',
        [new Date(), employeeId]
      );

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

        const createdResult = await client.query(
          'INSERT INTO employee_salary_structure (employee_id, payroll_component_id, amount, percentage, effective_from, is_active, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [structure.employee_id, structure.payroll_component_id, structure.amount, structure.percentage, structure.effective_from, structure.is_active, structure.created_by, structure.created_at, structure.updated_at]
        );
        const created = createdResult.rows[0];

        structures.push(created);
      }

      // Audit log
      await this.auditService.logActivity({
        userId: createdBy || null,
        action: 'CREATE',
        resourceType: 'employee_salary_structure',
        resourceId: employeeId,
        endpoint: '/employees/salary-structure',
        method: 'POST',
        oldValues: null,
        newValues: { component_count: structures.length },
        success: true,
        responseStatus: 201,
        durationMs: 0,
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
      const periodResult = await client.query(
        'SELECT * FROM payroll_periods WHERE id = $1',
        [payroll_period_id]
      );
      const period = periodResult.rows[0];

      if (!period) {
        throw new Error('Payroll period not found');
      }

      if (period.status !== 'open') {
        throw new Error('Payroll period is not open for calculation');
      }

      // Get employees for calculation
      let whereClause = ' WHERE is_active = true AND join_date <= $1';
      let params: any[] = [period.end_date];

      if (employee_ids && employee_ids.length > 0) {
        const placeholders = employee_ids.map((_, index) => `$${params.length + index + 1}`).join(',');
        whereClause += ` AND id IN (${placeholders})`;
        params = params.concat(employee_ids);
      }

      const employeesResult = await client.query(
        `SELECT * FROM employees${whereClause}`,
        params
      );
      const employees = employeesResult.rows;

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
        payrollRun.processed_at = new Date().toISOString();
      }

      const runResult = await client.query(
        'INSERT INTO payroll_runs (payroll_period_id, run_number, status, total_employees, total_gross_salary, total_deductions, total_net_salary, processed_by, notes, processed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [payrollRun.payroll_period_id, payrollRun.run_number, payrollRun.status, payrollRun.total_employees, payrollRun.total_gross_salary, payrollRun.total_deductions, payrollRun.total_net_salary, payrollRun.processed_by, payrollRun.notes, payrollRun.processed_at]
      );
      const run = runResult.rows[0];

      // Calculate payroll for each employee
      const payrollDetails: PayrollDetail[] = [];

      for (const employee of employees) {
        const detail = await this.calculateEmployeePayroll(run.id, employee.id, period, include_overtime, include_loans);
        payrollDetails.push(detail);

        // Update run totals
        if (!dry_run) {
          await client.query(
            'UPDATE payroll_runs SET total_gross_salary = total_gross_salary + $1, total_deductions = total_deductions + $2, total_net_salary = total_net_salary + $3 WHERE id = $4',
            [detail.total_earnings, detail.total_deductions, detail.net_salary, run.id]
          );
        }
      }

      // Update run status
      if (!dry_run) {
        await client.query(
          'UPDATE payroll_runs SET status = $1, total_employees = $2, updated_at = $3 WHERE id = $4',
          ['completed', employees.length, new Date(), run.id]
        );
      }

      // Audit log
      await this.auditService.logActivity({
        userId: calculatedBy || null,
        action: 'CREATE',
        resourceType: 'payroll_runs',
        resourceId: run.id,
        endpoint: '/payroll/calculate',
        method: 'POST',
        oldValues: null,
        newValues: run,
        success: true,
        responseStatus: 201,
        durationMs: 0,
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
      const salaryStructureResult = await client.query(
        'SELECT ess.*, pc.* FROM employee_salary_structure ess JOIN payroll_components pc ON ess.payroll_component_id = pc.id WHERE ess.employee_id = $1 AND ess.is_active = true AND ess.effective_from <= $2 AND (ess.effective_to IS NULL OR ess.effective_to >= $3)',
        [employeeId, period.end_date, period.start_date]
      );
      const salaryStructure = salaryStructureResult.rows;

      // Calculate basic salary (first earning component)
      const basicComponent = salaryStructure.find(s => s.component_type === 'earning' && s.category === 'basic');
      const basicSalary = basicComponent ? basicComponent.amount : 0;

      // Calculate working days in period
      const workingDays = this.calculateWorkingDays(period.start_date, period.end_date);

      // Get attendance data for the period
      const attendanceResult = await client.query(
        'SELECT SUM(total_hours_worked) as total_hours, COUNT(*) as days_present FROM attendance_records WHERE employee_id = $1 AND attendance_date BETWEEN $2 AND $3',
        [employeeId, period.start_date, period.end_date]
      );
      const attendanceData = attendanceResult.rows;

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
          quantity: component.category === 'overtime' ? Math.max(0, totalHours - (workingDays * 8)) : 1,
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
          const loanResult = await client.query(
            'SELECT SUM(monthly_installment) as total_loan_deduction FROM employee_loans WHERE employee_id = $1 AND status = $2',
            [employeeId, 'active']
          );
          const loanData = loanResult.rows[0];

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
        overtime_amount: earnings.find(e => e.component_id === salaryStructure.find(s => s.category === 'overtime')?.payroll_component_id)?.amount || 0,
        leave_deductions: deductions.find(d => d.component_id === salaryStructure.find(s => s.category === 'leave')?.payroll_component_id)?.amount || 0,
        loan_deductions: deductions.find(d => d.component_id === salaryStructure.find(s => s.category === 'loan')?.payroll_component_id)?.amount || 0,
        tax_deduction: 0, // Will be calculated based on tax rules
        status: 'calculated',
        created_at: new Date(),
        updated_at: new Date()
      };

      const detailResult = await client.query(
        'INSERT INTO payroll_details (payroll_run_id, employee_id, basic_salary, total_earnings, total_deductions, net_salary, working_days, paid_days, absent_days, overtime_hours, overtime_amount, leave_deductions, loan_deductions, tax_deduction, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *',
        [payrollDetail.payroll_run_id, payrollDetail.employee_id, payrollDetail.basic_salary, payrollDetail.total_earnings, payrollDetail.total_deductions, payrollDetail.net_salary, payrollDetail.working_days, payrollDetail.paid_days, payrollDetail.absent_days, payrollDetail.overtime_hours, payrollDetail.overtime_amount, payrollDetail.leave_deductions, payrollDetail.loan_deductions, payrollDetail.tax_deduction, payrollDetail.status, payrollDetail.created_at, payrollDetail.updated_at]
      );
      const detail = detailResult.rows[0];

      // Save component details
      for (const earning of earnings) {
        await client.query(
          'INSERT INTO payroll_component_details (payroll_detail_id, payroll_component_id, amount, quantity, rate, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [detail.id, earning.component_id, earning.amount, earning.quantity, earning.rate, new Date()]
        );
      }

      for (const deduction of deductions) {
        await client.query(
          'INSERT INTO payroll_component_details (payroll_detail_id, payroll_component_id, amount, quantity, rate, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [detail.id, deduction.component_id, deduction.amount, deduction.quantity, deduction.rate, new Date()]
        );
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
      const runResult = await client.query(
        'SELECT * FROM payroll_runs WHERE id = $1',
        [runId]
      );
      const run = runResult.rows[0];

      if (!run) {
        throw new Error('Payroll run not found');
      }

      if (run.status !== 'completed') {
        throw new Error('Payroll run must be completed before approval');
      }

      // Update payroll details status
      await client.query(
        'UPDATE payroll_details SET status = $1, approved_by = $2, approved_at = $3 WHERE payroll_run_id = $4',
        ['approved', approvedBy, new Date(), runId]
      );

      // Update run status
      const updatedRunResult = await client.query(
        'UPDATE payroll_runs SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        ['posted', new Date(), runId]
      );
      const updatedRun = updatedRunResult.rows[0];

      // Audit log
      await this.auditService.logActivity({
        userId: approvedBy || null,
        action: 'UPDATE',
        resourceType: 'payroll_runs',
        resourceId: runId,
        endpoint: '/payroll/approve',
        method: 'POST',
        oldValues: run,
        newValues: updatedRun,
        success: true,
        responseStatus: 200,
        durationMs: 0,
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
      const periodResult = await client.query(
        'SELECT * FROM payroll_periods WHERE id = $1',
        [periodId]
      );
      const period = periodResult.rows[0];

      if (!period) {
        throw new Error('Payroll period not found');
      }

      const runResult = await client.query(
        'SELECT * FROM payroll_runs WHERE payroll_period_id = $1 AND status = $2',
        [periodId, 'completed']
      );
      const run = runResult.rows[0];

      if (!run) {
        throw new Error('No completed payroll run found for this period');
      }

      // Get department-wise salary breakdown
      const departmentResult = await client.query(
        'SELECT d.name as department, SUM(pd.net_salary) as total_salary, COUNT(*) as employee_count FROM payroll_details pd JOIN employees e ON pd.employee_id = e.id JOIN departments d ON e.department_id = d.id WHERE pd.payroll_run_id = $1 AND e.department_id IS NOT NULL GROUP BY d.name',
        [run.id]
      );
      const departmentSalaries = departmentResult.rows;

      // Get top earners
      const topEarnersResult = await client.query(
        "SELECT CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as employee, pd.net_salary as salary FROM payroll_details pd JOIN employees e ON pd.employee_id = e.id WHERE pd.payroll_run_id = $1 ORDER BY pd.net_salary DESC LIMIT 10",
        [run.id]
      );
      const topEarners = topEarnersResult.rows;

      return {
        period_id: periodId,
        period_name: period.name,
        total_employees: run.total_employees,
        total_gross_salary: run.total_gross_salary,
        total_deductions: run.total_deductions,
        total_net_salary: run.total_net_salary,
        average_salary: run.total_employees > 0 ? run.total_net_salary / run.total_employees : 0,
        top_earners: topEarners.map((earner: any) => ({
          employee: earner.employee,
          salary: parseFloat(earner.salary)
        })),
        department_salaries: departmentSalaries.map(item => ({
          department: item.department,
          total_salary: parseFloat(item.total_salary),
          employee_count: parseInt(item.employee_count)
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get payroll summary: ${error}`);
    }
  }
}

export default new PayrollMediator();