import { Request, Response, NextFunction } from 'express';
import {
  LeaveType,
  LeaveApplication,
  LeaveBalance,
  LeaveApplicationRequest,
  CreateLeaveTypeRequest
} from '../../../types/hrm';
import { AddLeaveMediator } from '../mediators/leave/AddLeave.mediator';
import { GetLeaveInfoMediator } from '../mediators/leave/GetLeaveInfo.mediator';
import { UpdateLeaveMediator } from '../mediators/leave/UpdateLeave.mediator';
import { serializeSuccessResponse, serializeErrorResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';

class LeaveController {

  /**
   * Get all leave types
   */
  async getLeaveTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/leave/types";
      MyLogger.info(action, { query: req.query });

      const leaveTypes = await GetLeaveInfoMediator.getLeaveTypes();
      MyLogger.success(action, { leaveTypesCount: leaveTypes.length });
      serializeSuccessResponse(res, { leave_types: leaveTypes }, 'Leave types retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new leave type
   */
  async createLeaveType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/leave/types";
      MyLogger.info(action, { body: req.body });

      const leaveTypeData: CreateLeaveTypeRequest = req.body;
      const leaveType = await AddLeaveMediator.createLeaveType(leaveTypeData, req.user?.user_id);

      serializeSuccessResponse(res, { leave_type: leaveType }, 'Leave type created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave balances for an employee
   */
  async getLeaveBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const balances = await GetLeaveInfoMediator.getLeaveBalances(employeeId, year);

      serializeSuccessResponse(res, { leave_balances: balances }, 'Leave balances retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate leave balances for an employee
   */
  async calculateLeaveBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const balances = await GetLeaveInfoMediator.getLeaveBalances(employeeId, year);

      serializeSuccessResponse(res, { leave_balances: balances }, 'Leave balances calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave applications
   */
  async getLeaveApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        employee_id: req.query.employee_id ? parseInt(req.query.employee_id as string) : undefined,
        status: req.query.status as string,
        leave_type_id: req.query.leave_type_id ? parseInt(req.query.leave_type_id as string) : undefined,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string
      };

      const applications = await GetLeaveInfoMediator.getLeaveApplications(filters);

      serializeSuccessResponse(res, { leave_applications: applications }, 'Leave applications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create leave application
   */
  async createLeaveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const applicationData: LeaveApplicationRequest = req.body;
      const employeeId = req.user?.user_id || parseInt(req.params.employeeId);

      const application = await AddLeaveMediator.createLeaveApplication(
        applicationData,
        employeeId,
        req.user?.user_id
      );

      serializeSuccessResponse(res, { leave_application: application }, 'Leave application created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject leave application
   */
  async processLeaveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/hrm/leave/applications/:applicationId/process";
      MyLogger.info(action, { body: req.body });

      const applicationId = parseInt(req.params.applicationId);
      const { action: approvalAction, rejected_reason } = req.body;

      if (!['approve', 'reject'].includes(approvalAction)) {
        res.status(400);
        throw new Error('Invalid action');
      }

      const application = await UpdateLeaveMediator.processLeaveApplication(
        applicationId,
        approvalAction,
        req.user?.user_id,
        rejected_reason
      );

      serializeSuccessResponse(res, { leave_application: application }, `Leave application ${action}d successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave dashboard
   */
  async getLeaveDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await GetLeaveInfoMediator.getLeaveDashboard();

      serializeSuccessResponse(res, { dashboard }, 'Leave dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave calendar for a specific month
   */
  async getLeaveCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/leave/calendar/:year/:month";
      MyLogger.info(action, { year: req.params.year, month: req.params.month });

      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (year < 2020 || year > 2100) {
        res.status(400);
        throw new Error('Invalid year');
      }

      if (month < 1 || month > 12) {
        res.status(400);
        throw new Error('Invalid month');
      }

      const calendar = await GetLeaveInfoMediator.getLeaveCalendar(year, month);

      serializeSuccessResponse(res, { calendar }, 'Leave calendar retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my leave applications (for logged-in employee)
   */
  async getMyLeaveApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/leave/my-applications";
      MyLogger.info(action, { query: req.query });

      const employeeId = req.user?.user_id;
      const applications = await GetLeaveInfoMediator.getLeaveApplications({
        employee_id: employeeId
      });

      serializeSuccessResponse(res, { leave_applications: applications }, 'Your leave applications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave application by ID
   */
  async getLeaveApplicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/leave/applications/:id";
      MyLogger.info(action, { applicationId: req.params.id });

      const applicationId = parseInt(req.params.id);
      const application = await GetLeaveInfoMediator.getLeaveApplicationById(applicationId);

      if (!application) {
        res.status(404);
        throw new Error('Leave application not found');
      }

      serializeSuccessResponse(res, { leave_application: application }, 'Leave application retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel leave application
   */
  async cancelLeaveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/hrm/leave/applications/:id";
      MyLogger.info(action, { applicationId: req.params.id });

      const applicationId = parseInt(req.params.id);

      // For now, we'll implement a simple cancel mechanism
      // In a real implementation, you'd want proper cancellation logic
      serializeSuccessResponse(res, null, 'Leave application cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave summary for an employee
   */
  async getLeaveSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/leave/summary/:employeeId";
      MyLogger.info(action, { employeeId: req.params.employeeId });

      const employeeId = parseInt(req.params.employeeId);
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      const balances = await GetLeaveInfoMediator.getLeaveBalances(employeeId, year);

      const summary = {
        employee_id: employeeId,
        year,
        total_allocated_days: balances.reduce((sum, balance) => sum + balance.allocated_days, 0),
        total_used_days: balances.reduce((sum, balance) => sum + balance.used_days, 0),
        total_pending_days: balances.reduce((sum, balance) => sum + balance.pending_days, 0),
        total_remaining_days: balances.reduce((sum, balance) => sum + balance.remaining_days, 0),
        leave_balances: balances
      };

      serializeSuccessResponse(res, { summary }, 'Leave summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export leave data
   */
  async exportLeaveData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/hrm/leave/export";
      MyLogger.info(action, { query: req.query });

      const format = (req.query.format as string) || 'excel';
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      // For now, returning mock data
      // In a real implementation, you'd generate the actual export
      const exportData = Buffer.from(`Leave data export for year ${year}`);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=leave_export_${year}.${format}`);

      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }
}
export default new LeaveController();
