import { PayrollPeriod, PayrollComponent, PayrollSummary } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

export class GetPayrollInfoMediator {
  /**
   * Get payroll periods with optional filtering
   */
  static async getPayrollPeriods(filters?: {
    status?: string;
    start_date_from?: string;
    start_date_to?: string;
    end_date_from?: string;
    end_date_to?: string;
  }): Promise<PayrollPeriod[]> {
    const action = "GetPayrollInfoMediator.getPayrollPeriods";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters });

      let query = 'SELECT * FROM payroll_periods WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      if (filters?.start_date_from) {
        query += ` AND start_date >= $${paramIndex}`;
        values.push(filters.start_date_from);
        paramIndex++;
      }

      if (filters?.start_date_to) {
        query += ` AND start_date <= $${paramIndex}`;
        values.push(filters.start_date_to);
        paramIndex++;
      }

      if (filters?.end_date_from) {
        query += ` AND end_date >= $${paramIndex}`;
        values.push(filters.end_date_from);
        paramIndex++;
      }

      if (filters?.end_date_to) {
        query += ` AND end_date <= $${paramIndex}`;
        values.push(filters.end_date_to);
        paramIndex++;
      }

      query += ' ORDER BY start_date DESC';

      const result = await client.query(query, values);
      const periods = result.rows;

      MyLogger.success(action, {
        periodsCount: periods.length,
        filters
      });

      return periods;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payroll components with optional filtering
   */
  static async getPayrollComponents(componentType?: 'earning' | 'deduction'): Promise<PayrollComponent[]> {
    const action = "GetPayrollInfoMediator.getPayrollComponents";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { componentType });

      let query = 'SELECT * FROM payroll_components WHERE 1=1';
      const values: any[] = [];

      if (componentType) {
        query += ' AND component_type = $1';
        values.push(componentType);
      }

      query += ' ORDER BY name';

      const result = await client.query(query, values);
      const components = result.rows;

      MyLogger.success(action, {
        componentsCount: components.length,
        componentType
      });

      return components;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payroll summary for a specific period
   */
  static async getPayrollSummary(periodId: number): Promise<PayrollSummary> {
    const action = "GetPayrollInfoMediator.getPayrollSummary";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { periodId });

      // Get period details
      const periodQuery = 'SELECT * FROM payroll_periods WHERE id = $1';
      const periodResult = await client.query(periodQuery, [periodId]);

      if (periodResult.rows.length === 0) {
        throw new Error('Payroll period not found');
      }

      const period = periodResult.rows[0];

      // Get payroll runs for the period
      const runsQuery = `
        SELECT
          COUNT(*) as total_employees,
          SUM(payroll_data->>'grossPay') as total_gross_pay,
          SUM(payroll_data->>'netPay') as total_net_pay,
          SUM(payroll_data->>'tax') as total_tax,
          SUM(payroll_data->>'bonuses') as total_bonuses,
          SUM(payroll_data->>'deductions') as total_deductions
        FROM payroll_runs
        WHERE period_id = $1 AND status IN ('calculated', 'approved', 'paid')
      `;

      const runsResult = await client.query(runsQuery, [periodId]);

      const summary = runsResult.rows[0];

      const payrollSummary: PayrollSummary = {
        period_id: periodId,
        period_name: period.name,
        total_employees: parseInt(summary.total_employees || '0'),
        total_gross_pay: parseFloat(summary.total_gross_pay || '0'),
        total_net_pay: parseFloat(summary.total_net_pay || '0'),
        total_tax: parseFloat(summary.total_tax || '0'),
        total_bonuses: parseFloat(summary.total_bonuses || '0'),
        total_deductions: parseFloat(summary.total_deductions || '0'),
        average_salary: summary.total_employees > 0 ?
          parseFloat(summary.total_net_pay || '0') / parseInt(summary.total_employees) : 0
      };

      MyLogger.success(action, {
        periodId,
        totalEmployees: payrollSummary.total_employees,
        totalGrossPay: payrollSummary.total_gross_pay
      });

      return payrollSummary;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employee salary structure
   */
  static async getEmployeeSalaryStructure(employeeId: number): Promise<any> {
    const action = "GetPayrollInfoMediator.getEmployeeSalaryStructure";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId });

      // Get employee basic info
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

      // Get salary components assigned to employee
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

      const salaryStructure = {
        employee,
        components,
        base_salary: employee.hourly_rate,
        total_earnings: 0,
        total_deductions: 0
      };

      // Calculate totals
      for (const component of components) {
        if (component.component_type === 'earning') {
          salaryStructure.total_earnings += parseFloat(component.assigned_amount || '0');
        } else if (component.component_type === 'deduction') {
          salaryStructure.total_deductions += parseFloat(component.assigned_amount || '0');
        }
      }

      MyLogger.success(action, {
        employeeId,
        employeeCode: employee.employee_id,
        componentsCount: components.length
      });

      return salaryStructure;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payroll runs for a period
   */
  static async getPayrollRuns(periodId: number): Promise<any[]> {
    const action = "GetPayrollInfoMediator.getPayrollRuns";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { periodId });

      const query = `
        SELECT
          pr.*,
          e.employee_id as employee_code,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          d.name as department_name,
          des.title as designation_title
        FROM payroll_runs pr
        JOIN employees e ON pr.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations des ON e.designation_id = des.id
        WHERE pr.period_id = $1
        ORDER BY e.first_name, e.last_name
      `;

      const result = await client.query(query, [periodId]);
      const runs = result.rows;

      MyLogger.success(action, {
        periodId,
        runsCount: runs.length
      });

      return runs;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payroll dashboard data
   */
  static async getPayrollDashboard(): Promise<{
    totalPeriods: number;
    activePeriods: number;
    totalRuns: number;
    pendingApprovals: number;
    recentRuns: any[];
  }> {
    const action = "GetPayrollInfoMediator.getPayrollDashboard";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      // Get period statistics
      const periodsQuery = `
        SELECT
          COUNT(*) as total_periods,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as active_periods
        FROM payroll_periods
      `;

      const periodsResult = await client.query(periodsQuery);
      const periods = periodsResult.rows[0];

      // Get run statistics
      const runsQuery = `
        SELECT
          COUNT(*) as total_runs,
          COUNT(CASE WHEN status = 'calculated' THEN 1 END) as pending_approvals
        FROM payroll_runs
      `;

      const runsResult = await client.query(runsQuery);
      const runs = runsResult.rows[0];

      // Get recent runs
      const recentQuery = `
        SELECT
          pr.*,
          e.employee_id as employee_code,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          pp.name as period_name
        FROM payroll_runs pr
        JOIN employees e ON pr.employee_id = e.id
        JOIN payroll_periods pp ON pr.period_id = pp.id
        ORDER BY pr.created_at DESC
        LIMIT 10
      `;

      const recentResult = await client.query(recentQuery);
      const recentRuns = recentResult.rows;

      const dashboard = {
        totalPeriods: parseInt(periods.total_periods),
        activePeriods: parseInt(periods.active_periods),
        totalRuns: parseInt(runs.total_runs),
        pendingApprovals: parseInt(runs.pending_approvals),
        recentRuns
      };

      MyLogger.success(action, {
        totalPeriods: dashboard.totalPeriods,
        activePeriods: dashboard.activePeriods,
        totalRuns: dashboard.totalRuns,
        pendingApprovals: dashboard.pendingApprovals
      });

      return dashboard;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
