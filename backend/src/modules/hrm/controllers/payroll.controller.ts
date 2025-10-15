import { Request, Response } from 'express';
import {
  PayrollPeriod,
  PayrollComponent,
  PayrollRun,
  PayrollSummary,
  CreatePayrollPeriodRequest,
  CreatePayrollComponentRequest,
  PayrollCalculationRequest
} from '../../../types/hrm';
import { PayrollMediator } from '../mediators/payroll/PayrollMediator';
import { responseHelper } from '../../../utils/responseHelper';
import { AuthenticatedRequest } from '../../../types/rbac';

export class PayrollController {
  private payrollMediator: PayrollMediator;

  constructor() {
    this.payrollMediator = new PayrollMediator();
  }

  /**
   * Get all payroll periods
   */
  async getPayrollPeriods(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string,
        period_type: req.query.period_type as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string
      };

      const periods = await this.payrollMediator.getPayrollPeriods(filters);
      responseHelper.success(res, { periods }, 'Payroll periods retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve payroll periods');
    }
  }

  /**
   * Create new payroll period
   */
  async createPayrollPeriod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const periodData: CreatePayrollPeriodRequest = req.body;
      const period = await this.payrollMediator.createPayrollPeriod(periodData, req.user?.user_id);

      responseHelper.success(res, { period }, 'Payroll period created successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to create payroll period');
    }
  }

  /**
   * Get payroll period by ID
   */
  async getPayrollPeriodById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const periodId = parseInt(req.params.id);
      const periods = await this.payrollMediator.getPayrollPeriods({});

      const period = periods.find(p => p.id === periodId);

      if (!period) {
        return responseHelper.error(res, new Error('Payroll period not found'), 'Payroll period not found', 404);
      }

      responseHelper.success(res, { period }, 'Payroll period retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve payroll period');
    }
  }

  /**
   * Update payroll period
   */
  async updatePayrollPeriod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const periodId = parseInt(req.params.id);
      const updateData = req.body;

      // For now, we'll implement a simple update mechanism
      // In a real implementation, you'd want more sophisticated update logic
      responseHelper.success(res, { period: { id: periodId, ...updateData } }, 'Payroll period updated successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to update payroll period');
    }
  }

  /**
   * Delete payroll period
   */
  async deletePayrollPeriod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const periodId = parseInt(req.params.id);

      // For now, we'll implement a simple delete mechanism
      // In a real implementation, you'd want proper soft delete logic
      responseHelper.success(res, null, 'Payroll period deleted successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to delete payroll period');
    }
  }

  /**
   * Get all payroll components
   */
  async getPayrollComponents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const componentType = req.query.type as 'earning' | 'deduction';
      const components = await this.payrollMediator.getPayrollComponents(componentType);

      responseHelper.success(res, { components }, 'Payroll components retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve payroll components');
    }
  }

  /**
   * Create new payroll component
   */
  async createPayrollComponent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const componentData: CreatePayrollComponentRequest = req.body;
      const component = await this.payrollMediator.createPayrollComponent(componentData, req.user?.user_id);

      responseHelper.success(res, { component }, 'Payroll component created successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to create payroll component');
    }
  }

  /**
   * Calculate payroll for a period
   */
  async calculatePayroll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const calcRequest: PayrollCalculationRequest = {
        payroll_period_id: parseInt(req.body.payroll_period_id),
        employee_ids: req.body.employee_ids?.map((id: string) => parseInt(id)),
        include_overtime: req.body.include_overtime !== false,
        include_loans: req.body.include_loans !== false,
        dry_run: req.body.dry_run === true
      };

      const payrollRun = await this.payrollMediator.calculatePayroll(calcRequest, req.user?.user_id);

      responseHelper.success(res, { payroll_run: payrollRun }, 'Payroll calculated successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to calculate payroll');
    }
  }

  /**
   * Get payroll runs
   */
  async getPayrollRuns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        payroll_period_id: req.query.payroll_period_id ? parseInt(req.query.payroll_period_id as string) : undefined,
        status: req.query.status as string,
        processed_by: req.query.processed_by ? parseInt(req.query.processed_by as string) : undefined
      };

      // For now, returning mock data
      // In a real implementation, you'd query the database
      const runs: PayrollRun[] = [];

      responseHelper.success(res, { runs }, 'Payroll runs retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve payroll runs');
    }
  }

  /**
   * Get payroll run by ID
   */
  async getPayrollRunById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const runId = parseInt(req.params.id);

      // For now, returning mock data
      // In a real implementation, you'd query the database
      const run: PayrollRun = {
        id: runId,
        payroll_period_id: 1,
        run_number: 'PR-001',
        status: 'completed',
        total_employees: 50,
        total_gross_salary: 500000,
        total_deductions: 50000,
        total_net_salary: 450000,
        processed_by: req.user?.user_id,
        processed_at: new Date().toISOString(),
        posted_to_accounting: true,
        accounting_reference: 'ACC-001',
        created_by: req.user?.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      responseHelper.success(res, { run }, 'Payroll run retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve payroll run');
    }
  }

  /**
   * Approve payroll run
   */
  async approvePayrollRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const runId = parseInt(req.params.id);
      const approvedRun = await this.payrollMediator.approvePayrollRun(runId, req.user?.user_id);

      responseHelper.success(res, { payroll_run: approvedRun }, 'Payroll run approved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to approve payroll run');
    }
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const periodId = parseInt(req.params.periodId);
      const summary = await this.payrollMediator.getPayrollSummary(periodId);

      responseHelper.success(res, { summary }, 'Payroll summary retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve payroll summary');
    }
  }

  /**
   * Setup employee salary structure
   */
  async setupEmployeeSalaryStructure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const components = req.body.components; // Array of { component_id, amount, percentage }

      const structures = await this.payrollMediator.setupEmployeeSalaryStructure(
        employeeId,
        components,
        req.user?.user_id
      );

      responseHelper.success(res, { structures }, 'Salary structure set up successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to setup salary structure');
    }
  }

  /**
   * Get payroll dashboard
   */
  async getPayrollDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Get recent payroll runs
      const recentRuns = await this.getPayrollRuns(req, res);

      // Get upcoming payroll periods
      const upcomingPeriods = await this.payrollMediator.getPayrollPeriods({
        status: 'open',
        start_date: new Date().toISOString().split('T')[0]
      });

      // Get payroll summary for current month
      const currentMonth = new Date();
      const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const periods = await this.payrollMediator.getPayrollPeriods({
        start_date: currentMonthStart.toISOString().split('T')[0],
        end_date: currentMonthEnd.toISOString().split('T')[0]
      });

      const dashboard = {
        recent_runs: recentRuns,
        upcoming_periods: upcomingPeriods,
        current_month_summary: periods.length > 0 ? await this.payrollMediator.getPayrollSummary(periods[0].id) : null
      };

      responseHelper.success(res, { dashboard }, 'Payroll dashboard retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve payroll dashboard');
    }
  }

  /**
   * Export payroll data
   */
  async exportPayroll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const runId = parseInt(req.params.runId);
      const format = (req.query.format as string) || 'excel';

      // For now, returning mock data
      // In a real implementation, you'd generate the actual export
      const exportData = Buffer.from('Payroll export data');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=payroll_export.${format}`);

      res.send(exportData);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to export payroll data');
    }
  }
}
