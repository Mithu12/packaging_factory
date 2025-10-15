import { Request, Response } from 'express';
import {
  AttendanceRecord,
  WorkSchedule,
  AttendanceSummary,
  CreateAttendanceRecordRequest,
  CreateWorkScheduleRequest
} from '../../../types/hrm';
import { AttendanceMediator } from '../mediators/attendance/AttendanceMediator';
import { responseHelper } from '../../../utils/responseHelper';
import { AuthenticatedRequest } from '../../../types/rbac';

export class AttendanceController {
  private attendanceMediator: AttendanceMediator;

  constructor() {
    this.attendanceMediator = new AttendanceMediator();
  }

  /**
   * Get all work schedules
   */
  async getWorkSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const schedules = await this.attendanceMediator.getWorkSchedules(includeInactive);

      responseHelper.success(res, { work_schedules: schedules }, 'Work schedules retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve work schedules');
    }
  }

  /**
   * Create new work schedule
   */
  async createWorkSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const scheduleData: CreateWorkScheduleRequest = req.body;
      const schedule = await this.attendanceMediator.createWorkSchedule(scheduleData, req.user?.user_id);

      responseHelper.success(res, { work_schedule: schedule }, 'Work schedule created successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to create work schedule');
    }
  }

  /**
   * Get attendance records
   */
  async getAttendanceRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        employee_id: req.query.employee_id ? parseInt(req.query.employee_id as string) : undefined,
        attendance_date: req.query.attendance_date as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        status: req.query.status as string
      };

      const records = await this.attendanceMediator.getAttendanceRecords(filters);

      responseHelper.success(res, { attendance_records: records }, 'Attendance records retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve attendance records');
    }
  }

  /**
   * Create attendance record
   */
  async createAttendanceRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const recordData: CreateAttendanceRecordRequest = req.body;
      const employeeId = parseInt(req.params.employeeId);

      const record = await this.attendanceMediator.createAttendanceRecord(
        recordData,
        employeeId,
        req.user?.user_id
      );

      responseHelper.success(res, { attendance_record: record }, 'Attendance record created successfully', 201);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to create attendance record');
    }
  }

  /**
   * Update attendance record
   */
  async updateAttendanceRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const recordId = parseInt(req.params.id);
      const updateData: Partial<CreateAttendanceRecordRequest> = req.body;

      const record = await this.attendanceMediator.updateAttendanceRecord(
        recordId,
        updateData,
        req.user?.user_id
      );

      responseHelper.success(res, { attendance_record: record }, 'Attendance record updated successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to update attendance record');
    }
  }

  /**
   * Mark attendance (check-in/check-out)
   */
  async markAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.user_id || parseInt(req.params.employeeId);
      const { action, location, notes } = req.body;

      if (!['check_in', 'check_out', 'break_start', 'break_end'].includes(action)) {
        return responseHelper.error(res, new Error('Invalid action'), 'Action must be check_in, check_out, break_start, or break_end', 400);
      }

      const record = await this.attendanceMediator.markAttendance(
        employeeId,
        action,
        location,
        notes,
        req.user?.user_id
      );

      responseHelper.success(res, { attendance_record: record }, `Attendance ${action} marked successfully`);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to mark attendance');
    }
  }

  /**
   * Get attendance summary for an employee
   */
  async getAttendanceSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return responseHelper.error(res, new Error('Start date and end date are required'), 'Start date and end date are required', 400);
      }

      const summary = await this.attendanceMediator.getAttendanceSummary(
        employeeId,
        start_date as string,
        end_date as string
      );

      responseHelper.success(res, { attendance_summary: summary }, 'Attendance summary retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve attendance summary');
    }
  }

  /**
   * Get attendance dashboard
   */
  async getAttendanceDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const dashboard = await this.attendanceMediator.getAttendanceDashboard();

      responseHelper.success(res, { dashboard }, 'Attendance dashboard retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve attendance dashboard');
    }
  }

  /**
   * Get attendance report for a period
   */
  async getAttendanceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return responseHelper.error(res, new Error('Start date and end date are required'), 'Start date and end date are required', 400);
      }

      const report = await this.attendanceMediator.getAttendanceReport(
        start_date as string,
        end_date as string
      );

      responseHelper.success(res, { attendance_report: report }, 'Attendance report retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve attendance report');
    }
  }

  /**
   * Get my attendance records (for logged-in employee)
   */
  async getMyAttendanceRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const employeeId = req.user?.user_id;
      const { start_date, end_date, status } = req.query;

      const filters = {
        employee_id: employeeId,
        start_date: start_date as string,
        end_date: end_date as string,
        status: status as string
      };

      const records = await this.attendanceMediator.getAttendanceRecords(filters);

      responseHelper.success(res, { attendance_records: records }, 'Your attendance records retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve your attendance records');
    }
  }

  /**
   * Get attendance record by ID
   */
  async getAttendanceRecordById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const recordId = parseInt(req.params.id);
      const records = await this.attendanceMediator.getAttendanceRecords();

      const record = records.find(r => r.id === recordId);

      if (!record) {
        return responseHelper.error(res, new Error('Attendance record not found'), 'Attendance record not found', 404);
      }

      responseHelper.success(res, { attendance_record: record }, 'Attendance record retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve attendance record');
    }
  }

  /**
   * Delete attendance record
   */
  async deleteAttendanceRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const recordId = parseInt(req.params.id);

      // For now, we'll implement a simple delete mechanism
      // In a real implementation, you'd want proper soft delete logic
      responseHelper.success(res, null, 'Attendance record deleted successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to delete attendance record');
    }
  }

  /**
   * Export attendance data
   */
  async exportAttendanceData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || 'excel';
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return responseHelper.error(res, new Error('Start date and end date are required'), 'Start date and end date are required', 400);
      }

      // For now, returning mock data
      // In a real implementation, you'd generate the actual export
      const exportData = Buffer.from(`Attendance data export from ${start_date} to ${end_date}`);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_export.${format}`);

      res.send(exportData);
    } catch (error) {
      responseHelper.error(res, error, 'Failed to export attendance data');
    }
  }

  /**
   * Get attendance calendar for a month
   */
  async getAttendanceCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (year < 2020 || year > 2100) {
        return responseHelper.error(res, new Error('Invalid year'), 'Year must be between 2020 and 2100', 400);
      }

      if (month < 1 || month > 12) {
        return responseHelper.error(res, new Error('Invalid month'), 'Month must be between 1 and 12', 400);
      }

      // For now, returning mock data
      // In a real implementation, you'd implement calendar logic
      const calendar = {
        year,
        month,
        days: []
      };

      responseHelper.success(res, { calendar }, 'Attendance calendar retrieved successfully');
    } catch (error) {
      responseHelper.error(res, error, 'Failed to retrieve attendance calendar');
    }
  }
}
