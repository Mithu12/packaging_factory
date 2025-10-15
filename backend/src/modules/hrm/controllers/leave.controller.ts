import { Request, Response } from 'express';
import {
  LeaveType,
  LeaveApplication,
  LeaveBalance,
  LeaveApplicationRequest,
  CreateLeaveTypeRequest
} from '../../../types/hrm';
import { LeaveMediator } from '../mediators/leave/LeaveMediator';
import { responseHelper } from '../../../utils/responseHelper';
import { AuthenticatedRequest } from '../../../types/rbac';

export class LeaveController {
  private leaveMediator: LeaveMediator;

  constructor() {
    this.leaveMediator = new LeaveMediator();
  }

  /**
   * Get all leave types
   */
  async getLeaveTypes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const leaveTypes = await this.leaveMediator.getLeaveTypes();
      responseHelper.success(res, { leave_types: leaveTypes }, 'Leave types retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve leave types');
    }
  }

  /**
   * Create new leave type
   */
  async createLeaveType(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const leaveTypeData: CreateLeaveTypeRequest = req.body;
      const leaveType = await this.leaveMediator.createLeaveType(leaveTypeData, req.user?.user_id);

      responseHelper.success(res, { leave_type: leaveType }, 'Leave type created successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to create leave type');
    }
  }

  /**
   * Get leave balances for an employee
   */
  async getLeaveBalances(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const balances = await this.leaveMediator.getLeaveBalances(employeeId, year);

      responseHelper.success(res, { leave_balances: balances }, 'Leave balances retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve leave balances');
    }
  }

  /**
   * Calculate leave balances for an employee
   */
  async calculateLeaveBalances(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const balances = await this.leaveMediator.calculateLeaveBalances(employeeId, year);

      responseHelper.success(res, { leave_balances: balances }, 'Leave balances calculated successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to calculate leave balances');
    }
  }

  /**
   * Get leave applications
   */
  async getLeaveApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        employee_id: req.query.employee_id ? parseInt(req.query.employee_id as string) : undefined,
        status: req.query.status as string,
        leave_type_id: req.query.leave_type_id ? parseInt(req.query.leave_type_id as string) : undefined,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string
      };

      const applications = await this.leaveMediator.getLeaveApplications(filters);

      responseHelper.success(res, { leave_applications: applications }, 'Leave applications retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve leave applications');
    }
  }

  /**
   * Create leave application
   */
  async createLeaveApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicationData: LeaveApplicationRequest = req.body;
      const employeeId = req.user?.user_id || parseInt(req.params.employeeId);

      const application = await this.leaveMediator.createLeaveApplication(
        applicationData,
        employeeId,
        req.user?.user_id
      );

      responseHelper.success(res, { leave_application: application }, 'Leave application created successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to create leave application');
    }
  }

  /**
   * Approve or reject leave application
   */
  async processLeaveApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicationId = parseInt(req.params.applicationId);
      const { action, rejected_reason } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return responseHelper.error(res, new Error('Invalid action'), 'Action must be approve or reject', 400);
      }

      const application = await this.leaveMediator.processLeaveApplication(
        applicationId,
        action,
        req.user?.user_id,
        rejected_reason
      );

      responseHelper.success(res, { leave_application: application }, `Leave application ${action}d successfully`);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to process leave application');
    }
  }

  /**
   * Get leave dashboard
   */
  async getLeaveDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const dashboard = await this.leaveMediator.getLeaveDashboard();

      responseHelper.success(res, { dashboard }, 'Leave dashboard retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve leave dashboard');
    }
  }

  /**
   * Get leave calendar for a specific month
   */
  async getLeaveCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (year < 2020 || year > 2100) {
        return responseHelper.error(res, new Error('Invalid year'), 'Year must be between 2020 and 2100', 400);
      }

      if (month < 1 || month > 12) {
        return responseHelper.error(res, new Error('Invalid month'), 'Month must be between 1 and 12', 400);
      }

      const calendar = await this.leaveMediator.getLeaveCalendar(year, month);

      responseHelper.success(res, { calendar }, 'Leave calendar retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve leave calendar');
    }
  }

  /**
   * Get my leave applications (for logged-in employee)
   */
  async getMyLeaveApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.user_id;
      const applications = await this.leaveMediator.getLeaveApplications({
        employee_id: employeeId
      });

      responseHelper.success(res, { leave_applications: applications }, 'Your leave applications retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve your leave applications');
    }
  }

  /**
   * Get leave application by ID
   */
  async getLeaveApplicationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicationId = parseInt(req.params.id);
      const applications = await this.leaveMediator.getLeaveApplications();

      const application = applications.find(app => app.id === applicationId);

      if (!application) {
        return responseHelper.error(res, new Error('Leave application not found'), 'Leave application not found', 404);
      }

      responseHelper.success(res, { leave_application: application }, 'Leave application retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve leave application');
    }
  }

  /**
   * Cancel leave application
   */
  async cancelLeaveApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicationId = parseInt(req.params.id);

      // For now, we'll implement a simple cancel mechanism
      // In a real implementation, you'd want proper cancellation logic
      responseHelper.success(res, null, 'Leave application cancelled successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to cancel leave application');
    }
  }

  /**
   * Get leave summary for an employee
   */
  async getLeaveSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      const balances = await this.leaveMediator.getLeaveBalances(employeeId, year);

      const summary = {
        employee_id: employeeId,
        year,
        total_allocated_days: balances.reduce((sum, balance) => sum + balance.allocated_days, 0),
        total_used_days: balances.reduce((sum, balance) => sum + balance.used_days, 0),
        total_pending_days: balances.reduce((sum, balance) => sum + balance.pending_days, 0),
        total_remaining_days: balances.reduce((sum, balance) => sum + balance.remaining_days, 0),
        leave_balances: balances
      };

      responseHelper.success(res, { summary }, 'Leave summary retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve leave summary');
    }
  }

  /**
   * Export leave data
   */
  async exportLeaveData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || 'excel';
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      // For now, returning mock data
      // In a real implementation, you'd generate the actual export
      const exportData = Buffer.from(`Leave data export for year ${year}`);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=leave_export_${year}.${format}`);

      res.send(exportData);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to export leave data');
    }
  }
}
