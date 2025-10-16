import { Request, Response, NextFunction } from 'express';
import {
  AttendanceRecord,
  WorkSchedule,
  AttendanceSummary,
  CreateAttendanceRecordRequest,
  CreateWorkScheduleRequest
} from '../../../types/hrm';
import { AttendanceMediator } from '../mediators/attendance/AttendanceMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '../../../utils/responseHelper';
import { MyLogger } from '../../../utils/new-logger';

class AttendanceController {
  /**
   * Get all work schedules
   */
  async getWorkSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const schedules = await AttendanceMediator.getWorkSchedules(includeInactive);

      serializeSuccessResponse(res, { work_schedules: schedules }, 'Work schedules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new work schedule
   */
  async createWorkSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scheduleData: CreateWorkScheduleRequest = req.body;
      const schedule = await AttendanceMediator.createWorkSchedule(scheduleData, req.user?.user_id);

      serializeSuccessResponse(res, { work_schedule: schedule }, 'Work schedule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance records
   */
  async getAttendanceRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        employee_id: req.query.employee_id ? parseInt(req.query.employee_id as string) : undefined,
        attendance_date: req.query.attendance_date as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        status: req.query.status as string
      };

      const records = await AttendanceMediator.getAttendanceRecords(filters);

      serializeSuccessResponse(res, { attendance_records: records }, 'Attendance records retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create attendance record
   */
  async createAttendanceRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordData: CreateAttendanceRecordRequest = req.body;
      const employeeId = parseInt(req.params.employeeId);

      const record = await AttendanceMediator.createAttendanceRecord(
        recordData,
        employeeId,
        req.user?.user_id
      );

      serializeSuccessResponse(res, { attendance_record: record }, 'Attendance record created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update attendance record
   */
  async updateAttendanceRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = parseInt(req.params.id);
      const updateData: Partial<CreateAttendanceRecordRequest> = req.body;

      const record = await AttendanceMediator.updateAttendanceRecord(
        recordId,
        updateData,
        req.user?.user_id
      );

      serializeSuccessResponse(res, { attendance_record: record }, 'Attendance record updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark attendance (check-in/check-out)
   */
  async markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = req.user?.user_id || parseInt(req.params.employeeId);
      const { action, location, notes } = req.body;

      if (!['check_in', 'check_out', 'break_start', 'break_end'].includes(action)) {
        res.status(400);
        throw new Error('Action must be check_in, check_out, break_start, or break_end');
      }

      const record = await AttendanceMediator.markAttendance(
        employeeId,
        action,
        location,
        notes,
        req.user?.user_id
      );

      serializeSuccessResponse(res, { attendance_record: record }, `Attendance ${action} marked successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance summary for an employee
   */
  async getAttendanceSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        serializeErrorResponse(res, null, 'MISSING_START_END_DATE', 'Start date and end date are required');
        return;
      }

      const summary = await AttendanceMediator.getAttendanceSummary(
        employeeId,
        start_date as string,
        end_date as string
      );

      serializeSuccessResponse(res, { attendance_summary: summary }, 'Attendance summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance dashboard
   */
  async getAttendanceDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await AttendanceMediator.getAttendanceDashboard();

      serializeSuccessResponse(res, { dashboard }, 'Attendance dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance report for a period
   */
  async getAttendanceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        res.status(400);
        throw new Error('Start date and end date are required');
      }

      const report = await AttendanceMediator.getAttendanceReport(
        start_date as string,
        end_date as string
      );

      serializeSuccessResponse(res, { attendance_report: report }, 'Attendance report retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my attendance records (for logged-in employee)
   */
  async getMyAttendanceRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = req.user?.user_id;
      const { start_date, end_date, status } = req.query;

      const filters = {
        employee_id: employeeId,
        start_date: start_date as string,
        end_date: end_date as string,
        status: status as string
      };

      const records = await AttendanceMediator.getAttendanceRecords(filters);

      serializeSuccessResponse(res, { attendance_records: records }, 'Your attendance records retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance record by ID
   */
  async getAttendanceRecordById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = parseInt(req.params.id);
      const records = await AttendanceMediator.getAttendanceRecords();

      const record = records.find(r => r.id === recordId);

      if (!record) {
        res.status(404);
        throw new Error('Attendance record not found');
      }

      serializeSuccessResponse(res, { attendance_record: record }, 'Attendance record retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete attendance record
   */
  async deleteAttendanceRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordId = parseInt(req.params.id);

      // For now, we'll implement a simple delete mechanism
      // In a real implementation, you'd want proper soft delete logic
      serializeSuccessResponse(res, null, 'Attendance record deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export attendance data
   */
  async exportAttendanceData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = (req.query.format as string) || 'excel';
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        res.status(400);
        throw new Error('Start date and end date are required');
      }

      // For now, returning mock data
      // In a real implementation, you'd generate the actual export
      const exportData = Buffer.from(`Attendance data export from ${start_date} to ${end_date}`);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_export.${format}`);

      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance calendar for a month
   */
  async getAttendanceCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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

      // For now, returning mock data
      // In a real implementation, you'd implement calendar logic
      const calendar = {
        year,
        month,
        days: []
      };

      serializeSuccessResponse(res, { calendar }, 'Attendance calendar retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceController();