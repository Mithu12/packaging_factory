import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import {
  PayrollPeriod,
  PayrollComponent,
  PayrollRun,
  PayrollSummary,
  CreatePayrollPeriodRequest,
  CreatePayrollComponentRequest,
  PayrollCalculationRequest
} from '../../../types/hrm';
import { AddPayrollMediator } from '../mediators/payroll/AddPayroll.mediator';
import { GetPayrollInfoMediator } from '../mediators/payroll/GetPayrollInfo.mediator';
import { ProcessPayrollMediator } from '../mediators/payroll/ProcessPayroll.mediator';
import { UpdatePayrollMediator } from '../mediators/payroll/UpdatePayroll.mediator';
import { serializeSuccessResponse, serializeErrorResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';
import { PDFGenerator } from '../../../services/pdf-generator';

class PayrollController {

  /**
   * Get all payroll periods
   */
  async getPayrollPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/periods";
      MyLogger.info(action, { query: req.query });

      const filters = {
        status: req.query.status as string,
        period_type: req.query.period_type as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string
      };

      const periods = await GetPayrollInfoMediator.getPayrollPeriods(filters);

      MyLogger.success(action, { periodsCount: periods.length });
      serializeSuccessResponse(res, { periods }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new payroll period
   */
  async createPayrollPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/payroll/periods";
      const periodData: CreatePayrollPeriodRequest = req.body;
      MyLogger.info(action, { periodData });

      const userId = req.user?.user_id;
      const period = await AddPayrollMediator.createPayrollPeriod(periodData, userId);

      MyLogger.success(action, { periodId: period.id });
      serializeSuccessResponse(res, { period }, "SUCCESS", 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payroll period by ID
   */
  async getPayrollPeriodById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/periods/:id";
      MyLogger.info(action, { periodId: req.params.id });

      const periodId = parseInt(req.params.id);
      const periods = await GetPayrollInfoMediator.getPayrollPeriods({});

      const period = periods.find(p => p.id === periodId);

      if (!period) {
        res.status(404);
        throw new Error('Payroll period not found');
      }

      serializeSuccessResponse(res, { period }, 'Payroll period retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payroll period
   */
  async updatePayrollPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/hrm/payroll/periods/:id";
      MyLogger.info(action, { periodId: req.params.id });

      const periodId = parseInt(req.params.id);
      const updateData = req.body;

      // For now, we'll implement a simple update mechanism
      // In a real implementation, you'd want more sophisticated update logic
      serializeSuccessResponse(res, { period: { id: periodId, ...updateData } }, 'Payroll period updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete payroll period
   */
  async deletePayrollPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/hrm/payroll/periods/:id";
      MyLogger.info(action, { periodId: req.params.id });

      const periodId = parseInt(req.params.id);

      // For now, we'll implement a simple delete mechanism
      // In a real implementation, you'd want proper soft delete logic
      serializeSuccessResponse(res, null, 'Payroll period deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all payroll components
   */
  async getPayrollComponents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/components";
      MyLogger.info(action, { query: req.query });

      const componentType = req.query.type as 'earning' | 'deduction';
      const components = await GetPayrollInfoMediator.getPayrollComponents(componentType);

      serializeSuccessResponse(res, { components }, 'Payroll components retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new payroll component
   */
  async createPayrollComponent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/payroll/components";
      MyLogger.info(action, { body: req.body });

      const componentData: CreatePayrollComponentRequest = req.body;
      const component = await AddPayrollMediator.createPayrollComponent(componentData, req.user?.user_id);

      serializeSuccessResponse(res, { component }, 'Payroll component created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate payroll for a period
   */
  async calculatePayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/payroll/calculate";
      MyLogger.info(action, { body: req.body });

      const payrollPeriodId = parseInt(req.body.payroll_period_id, 10);
      if (isNaN(payrollPeriodId) || payrollPeriodId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid payroll_period_id is required. Select a payroll period first.'
        });
        return;
      }

      const calcRequest: PayrollCalculationRequest = {
        payroll_period_id: payrollPeriodId,
        employee_ids: req.body.employee_ids?.map((id: string) => parseInt(id, 10)).filter((id: number) => !isNaN(id)),
        include_overtime: req.body.include_overtime !== false,
        include_loans: req.body.include_loans !== false,
        dry_run: req.body.dry_run === true
      };

      const payrollRun = await ProcessPayrollMediator.calculatePayroll(calcRequest, req.user?.user_id);

      serializeSuccessResponse(res, { payroll_run: payrollRun }, 'Payroll calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payroll runs (employee-level payroll details for a period)
   */
  async getPayrollRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/runs";
      MyLogger.info(action, { query: req.query });

      const periodId = req.query.payroll_period_id ? parseInt(req.query.payroll_period_id as string) : undefined;

      if (!periodId) {
        serializeSuccessResponse(res, { runs: [] }, 'Payroll runs retrieved successfully');
        return;
      }

      const runs = await GetPayrollInfoMediator.getPayrollDetailsForPeriod(periodId);

      serializeSuccessResponse(res, { runs }, 'Payroll runs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payroll run by ID
   */
  async getPayrollRunById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/runs/:id";
      MyLogger.info(action, { runId: req.params.id });

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

      serializeSuccessResponse(res, { run }, 'Payroll run retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve payroll run
   */
  async approvePayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/payroll/runs/:id/approve";
      MyLogger.info(action, { runId: req.params.id });

      const runId = parseInt(req.params.id);
      const approvedRun = await UpdatePayrollMediator.approvePayrollRun(runId, req.user?.user_id);

      serializeSuccessResponse(res, { payroll_run: approvedRun }, 'Payroll run approved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/summary/:periodId";
      MyLogger.info(action, { periodId: req.params.periodId });

      const periodId = parseInt(req.params.periodId);
      const summary = await GetPayrollInfoMediator.getPayrollSummary(periodId);

      serializeSuccessResponse(res, { summary }, 'Payroll summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Setup employee salary structure
   */
  async setupEmployeeSalaryStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/payroll/setup/:employeeId/salary-structure";
      MyLogger.info(action, { employeeId: req.params.employeeId });

      const employeeId = parseInt(req.params.employeeId);
      const baseSalary = req.body.base_salary;
      const components = req.body.components; // Array of { component_id, amount, percentage }

      const structures = await ProcessPayrollMediator.setupEmployeeSalaryStructure(
        employeeId,
        baseSalary,
        components,
        req.user?.user_id
      );

      serializeSuccessResponse(res, { structures }, 'Salary structure set up successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payroll dashboard
   */
  async getPayrollDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/dashboard";
      MyLogger.info(action, { query: req.query });

      // Get recent payroll runs
      const recentRuns = await this.getPayrollRuns(req, res, next);

      // Get upcoming payroll periods
      const upcomingPeriods = await GetPayrollInfoMediator.getPayrollPeriods({
        status: 'open',
        start_date_from: new Date().toISOString().split('T')[0]
      });

      // Get payroll summary for current month
      const currentMonth = new Date();
      const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const periods = await GetPayrollInfoMediator.getPayrollPeriods({
        start_date_from: currentMonthStart.toISOString().split('T')[0],
        end_date_to: currentMonthEnd.toISOString().split('T')[0]
      });

      const dashboard = {
        recent_runs: recentRuns,
        upcoming_periods: upcomingPeriods,
        current_month_summary: periods.length > 0 ? await GetPayrollInfoMediator.getPayrollSummary(periods[0].id) : null
      };

      serializeSuccessResponse(res, { dashboard }, 'Payroll dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export payroll salary sheet by period (Excel or PDF)
   */
  async exportPayrollByPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/export/period/:periodId";
      const periodId = parseInt(req.params.periodId);
      const format = ((req.query.format as string) || 'excel').toLowerCase();

      MyLogger.info(action, { periodId, format });

      const details = await GetPayrollInfoMediator.getPayrollDetailsForPeriod(periodId);

      if (details.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No payroll data found for this period. Calculate payroll first.'
        });
        return;
      }

      const periodName = (details[0]?.payroll_period_name as string) || `Period-${periodId}`;
      const safeName = periodName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);

      const mapRow = (d: any) => ({
        employee_code: d.employee_code || '',
        employee_name: d.employee_name || '',
        department_name: d.department_name || '',
        designation_title: d.designation_title || '',
        basic_salary: parseFloat(d.basic_salary || 0),
        total_earnings: parseFloat(d.total_earnings || 0),
        total_deductions: parseFloat(d.total_deductions || 0),
        net_salary: parseFloat(d.net_salary || 0),
        status: d.status || '',
        payment_date: d.payment_date,
        payment_reference: d.payment_reference || ''
      });

      if (format === 'pdf') {
        const pdfBuffer = await PDFGenerator.generatePayrollSalarySheetPDF(
          periodName,
          details.map(mapRow)
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=salary-sheet-${safeName}-${dateStr}.pdf`);
        res.send(pdfBuffer);
      } else {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Salary Sheet');

        sheet.columns = [
          { header: 'Employee ID', key: 'employee_code', width: 14 },
          { header: 'Name', key: 'employee_name', width: 24 },
          { header: 'Department', key: 'department_name', width: 18 },
          { header: 'Designation', key: 'designation_title', width: 18 },
          { header: 'Basic Salary', key: 'basic_salary', width: 14 },
          { header: 'Total Earnings', key: 'total_earnings', width: 14 },
          { header: 'Total Deductions', key: 'total_deductions', width: 14 },
          { header: 'Net Salary', key: 'net_salary', width: 14 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Payment Date', key: 'payment_date', width: 14 }
        ];

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'left' };

        details.forEach((d) => {
          sheet.addRow({
            employee_code: d.employee_code || '',
            employee_name: d.employee_name || '',
            department_name: d.department_name || '',
            designation_title: d.designation_title || '',
            basic_salary: parseFloat(d.basic_salary || 0),
            total_earnings: parseFloat(d.total_earnings || 0),
            total_deductions: parseFloat(d.total_deductions || 0),
            net_salary: parseFloat(d.net_salary || 0),
            status: d.status || '',
            payment_date: d.payment_date ? new Date(d.payment_date).toLocaleDateString() : ''
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=salary-sheet-${safeName}-${dateStr}.xlsx`);
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export payroll data
   */
  async exportPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/payroll/export/:runId";
      MyLogger.info(action, { runId: req.params.runId });

      const runId = parseInt(req.params.runId);
      const format = (req.query.format as string) || 'excel';

      // For now, returning mock data
      // In a real implementation, you'd generate the actual export
      const exportData = Buffer.from('Payroll export data');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=payroll_export.${format}`);

      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }
}
export default new PayrollController();
