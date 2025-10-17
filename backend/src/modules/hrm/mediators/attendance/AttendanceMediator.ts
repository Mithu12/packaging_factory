import {
  AttendanceRecord,
  WorkSchedule,
  AttendanceSummary,
  CreateAttendanceRecordRequest,
  CreateWorkScheduleRequest
} from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

class AttendanceMediator implements MediatorInterface {
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
   * Create work schedule
   */
  static async createWorkSchedule(scheduleData: CreateWorkScheduleRequest, createdBy?: number): Promise<WorkSchedule> {
    const action = "AttendanceMediator.createWorkSchedule";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { scheduleData, createdBy });

      // If this is set as default, unset other default schedules
      if (scheduleData.is_default) {
        await client.query('UPDATE work_schedules SET is_default = false WHERE is_default = true');
      }

      const newSchedule = {
        ...scheduleData,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO work_schedules (${Object.keys(newSchedule).join(', ')})
        VALUES (${Object.keys(newSchedule).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, Object.values(newSchedule));
      const schedule = insertResult.rows[0];

      // Note: Audit logging can be added through event emission if needed

      MyLogger.success(action, {
        scheduleId: schedule.id,
        scheduleName: schedule.name
      });

      return schedule;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get work schedules
   */
  static async getWorkSchedules(includeInactive?: boolean): Promise<WorkSchedule[]> {
    const action = "AttendanceMediator.getWorkSchedules";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { includeInactive });

      let query = 'SELECT * FROM work_schedules ORDER BY name';

      if (!includeInactive) {
        query += ' WHERE is_active = true';
      }

      const result = await client.query(query);

      MyLogger.success(action, {
        count: result.rows.length
      });

      return result.rows;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create attendance record
   */
  static async createAttendanceRecord(recordData: CreateAttendanceRecordRequest, employeeId: number, createdBy?: number): Promise<AttendanceRecord> {
    const action = "AttendanceMediator.createAttendanceRecord";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { recordData, employeeId, createdBy });

      // Validate attendance record
      await AttendanceMediator.validateAttendanceRecord(recordData, employeeId);

      // Calculate total hours worked
      const totalHoursWorked = AttendanceMediator.calculateHoursWorked(
        recordData.check_in_time,
        recordData.check_out_time,
        recordData.break_start_time,
        recordData.break_end_time
      );

      // Determine status
      const status = AttendanceMediator.determineAttendanceStatus(recordData, totalHoursWorked);

      const newRecord = {
        employee_id: employeeId,
        attendance_date: recordData.attendance_date,
        check_in_time: recordData.check_in_time,
        check_out_time: recordData.check_out_time,
        break_start_time: recordData.break_start_time,
        break_end_time: recordData.break_end_time,
        total_hours_worked: totalHoursWorked,
        overtime_hours: Math.max(0, totalHoursWorked - 8), // Assuming 8 hours standard
        status,
        location: recordData.location,
        notes: recordData.notes,
        recorded_by: recordData.recorded_by || 'manual',
        is_manual_entry: recordData.is_manual_entry || false,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO attendance_records (${Object.keys(newRecord).join(', ')})
        VALUES (${Object.keys(newRecord).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, Object.values(newRecord));
      const record = insertResult.rows[0];

      // Note: Audit logging can be added through event emission if needed

      // Emit event
      eventBus.emit('attendance.record.created', { record, createdBy });

      MyLogger.success(action, {
        recordId: record.id,
        employeeId: record.employee_id,
        attendanceDate: record.attendance_date,
        status: record.status
      });

      return record;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get attendance records
   */
  static async getAttendanceRecords(filters?: {
    employee_id?: number;
    attendance_date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<AttendanceRecord[]> {
    const action = "AttendanceMediator.getAttendanceRecords";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters });

      let query = `
        SELECT
          ar.*,
          e.first_name,
          e.last_name,
          e.employee_id
        FROM attendance_records as ar
        JOIN employees as e ON ar.employee_id = e.id
      `;

      const values: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      const conditions: string[] = [];

      if (filters?.employee_id) {
        conditions.push(`ar.employee_id = $${paramIndex}`);
        values.push(filters.employee_id);
        paramIndex++;
      }

      if (filters?.attendance_date) {
        conditions.push(`ar.attendance_date = $${paramIndex}`);
        values.push(filters.attendance_date);
        paramIndex++;
      }

      if (filters?.start_date) {
        conditions.push(`ar.attendance_date >= $${paramIndex}`);
        values.push(filters.start_date);
        paramIndex++;
      }

      if (filters?.end_date) {
        conditions.push(`ar.attendance_date <= $${paramIndex}`);
        values.push(filters.end_date);
        paramIndex++;
      }

      if (filters?.status) {
        conditions.push(`ar.status = $${paramIndex}`);
        values.push(filters.status);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY ar.attendance_date DESC, ar.check_in_time DESC';

      const result = await client.query(query, values);

      MyLogger.success(action, {
        count: result.rows.length,
        filters
      });

      return result.rows;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update attendance record
   */
  static async updateAttendanceRecord(
    recordId: number,
    updateData: Partial<CreateAttendanceRecordRequest>,
    updatedBy?: number
  ): Promise<AttendanceRecord> {
    const action = "AttendanceMediator.updateAttendanceRecord";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { recordId, updateData, updatedBy });

      // Get current record
      const currentRecordResult = await client.query('SELECT * FROM attendance_records WHERE id = $1', [recordId]);
      const currentRecord = currentRecordResult.rows[0];

      if (!currentRecord) {
        throw new Error('Attendance record not found');
      }

      // Calculate hours if time data is being updated
      let totalHoursWorked = currentRecord.total_hours_worked;
      let overtimeHours = currentRecord.overtime_hours;
      let status = currentRecord.status;

      if (updateData.check_in_time || updateData.check_out_time || updateData.break_start_time || updateData.break_end_time) {
        totalHoursWorked = AttendanceMediator.calculateHoursWorked(
          updateData.check_in_time || currentRecord.check_in_time,
          updateData.check_out_time || currentRecord.check_out_time,
          updateData.break_start_time || currentRecord.break_start_time,
          updateData.break_end_time || currentRecord.break_end_time
        );

        overtimeHours = Math.max(0, totalHoursWorked - 8);
        status = AttendanceMediator.determineAttendanceStatus(updateData, totalHoursWorked);
      }

      const updatedRecordData = {
        ...updateData,
        total_hours_worked: totalHoursWorked,
        overtime_hours: overtimeHours,
        status,
        updated_at: new Date()
      };

      const updateFields = Object.keys(updatedRecordData);
      const updateValues = Object.values(updatedRecordData);

      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const updateQuery = `
        UPDATE attendance_records
        SET ${setClause}
        WHERE id = $${updateValues.length + 1}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [...updateValues, recordId]);
      const record = updateResult.rows[0];

      // Note: Audit logging can be added through event emission if needed

      // Emit event
      eventBus.emit('attendance.record.updated', { record, updatedBy });

      MyLogger.success(action, {
        recordId: record.id,
        employeeId: record.employee_id,
        attendanceDate: record.attendance_date,
        status: record.status
      });

      return record;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get attendance summary for a period
   */
  static async getAttendanceSummary(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<AttendanceSummary> {
    const action = "AttendanceMediator.getAttendanceSummary";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, startDate, endDate });

      const recordsResult = await client.query(
        'SELECT * FROM attendance_records WHERE employee_id = $1 AND attendance_date BETWEEN $2 AND $3 ORDER BY attendance_date',
        [employeeId, startDate, endDate]
      );
      const records = recordsResult.rows;

      const totalWorkingDays = AttendanceMediator.calculateWorkingDaysBetweenDates(startDate, endDate);
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const halfDays = records.filter(r => r.status === 'half_day').length;

      const totalHoursWorked = records.reduce((sum, record) => sum + (record.total_hours_worked || 0), 0);
      const totalOvertimeHours = records.reduce((sum, record) => sum + (record.overtime_hours || 0), 0);

      const averageHoursPerDay = presentDays > 0 ? totalHoursWorked / presentDays : 0;

      const summary: AttendanceSummary = {
        period_start: startDate,
        period_end: endDate,
        total_working_days: totalWorkingDays,
        average_attendance_rate: totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0,
        total_absenteeism: absentDays,
        overtime_hours: totalOvertimeHours,
        department_attendance: [], // Will be populated if department data is available
        employee_attendance: [{
          employee: `Employee ${employeeId}`,
          attendance_rate: totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0,
          total_days: totalWorkingDays
        }]
      };

      MyLogger.success(action, {
        employeeId,
        periodStart: startDate,
        periodEnd: endDate,
        totalWorkingDays,
        presentDays,
        averageAttendanceRate: summary.average_attendance_rate
      });

      return summary;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get attendance dashboard
   */
  static async getAttendanceDashboard(): Promise<{
    total_records_today: number;
    present_today: number;
    absent_today: number;
    late_today: number;
    average_hours_today: number;
    recent_records: AttendanceRecord[];
    employee_summary: { employee: string; status: string; hours: number }[];
  }> {
    const action = "AttendanceMediator.getAttendanceDashboard";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {});

      const today = new Date().toISOString().split('T')[0];

      // Today's attendance
      const todayRecordsResult = await client.query(`
        SELECT
          ar.*,
          e.first_name,
          e.last_name
        FROM attendance_records as ar
        JOIN employees as e ON ar.employee_id = e.id
        WHERE ar.attendance_date = $1
      `, [today]);
      const todayRecords = todayRecordsResult.rows;

      const totalRecordsToday = todayRecords.length;
      const presentToday = todayRecords.filter(r => r.status === 'present').length;
      const absentToday = todayRecords.filter(r => r.status === 'absent').length;
      const lateToday = todayRecords.filter(r => r.status === 'late').length;

      const totalHoursToday = todayRecords.reduce((sum, record) => sum + (record.total_hours_worked || 0), 0);
      const averageHoursToday = totalRecordsToday > 0 ? totalHoursToday / totalRecordsToday : 0;

      // Recent records (last 10)
      const recentRecordsResult = await client.query(`
        SELECT
          ar.*,
          e.first_name,
          e.last_name,
          e.employee_id
        FROM attendance_records as ar
        JOIN employees as e ON ar.employee_id = e.id
        ORDER BY ar.created_at DESC
        LIMIT 10
      `);
      const recentRecords = recentRecordsResult.rows;

      // Employee summary for today
      const employeeSummary = todayRecords.map(record => ({
        employee: `${record.first_name} ${record.last_name}`,
        status: record.status,
        hours: record.total_hours_worked || 0
      }));

      const dashboard = {
        total_records_today: totalRecordsToday,
        present_today: presentToday,
        absent_today: absentToday,
        late_today: lateToday,
        average_hours_today: averageHoursToday,
        recent_records: recentRecords,
        employee_summary: employeeSummary
      };

      MyLogger.success(action, {
        totalRecordsToday,
        presentToday,
        absentToday,
        lateToday,
        averageHoursToday
      });

      return dashboard;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark attendance (check-in/check-out)
   */
  static async markAttendance(
    employeeId: number,
    action: 'check_in' | 'check_out' | 'break_start' | 'break_end',
    location?: string,
    notes?: string,
    markedBy?: number
  ): Promise<AttendanceRecord> {
    const actionLog = "AttendanceMediator.markAttendance";
    const client = await pool.connect();

    try {
      MyLogger.info(actionLog, { employeeId, action, location, notes, markedBy });

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // Get or create today's attendance record
      const recordResult = await client.query(
        'SELECT * FROM attendance_records WHERE employee_id = $1 AND attendance_date = $2',
        [employeeId, today]
      );
      let record = recordResult.rows[0];

      if (!record) {
        // Create new record for today
        record = {
          employee_id: employeeId,
          attendance_date: today,
          status: 'present',
          recorded_by: 'system',
          is_manual_entry: false,
          created_at: new Date(),
          updated_at: new Date()
        };

        const insertQuery = `
          INSERT INTO attendance_records (${Object.keys(record).join(', ')})
          VALUES (${Object.keys(record).map((_, i) => `$${i + 1}`).join(', ')})
          RETURNING *
        `;

        const insertResult = await client.query(insertQuery, Object.values(record));
        record = insertResult.rows[0];
      }

      // Update record based on action
      const updateData: any = { updated_at: new Date() };

      switch (action) {
        case 'check_in':
          updateData.check_in_time = now;
          updateData.status = 'present';
          break;
        case 'check_out':
          updateData.check_out_time = now;
          // Calculate total hours
          if (record.check_in_time) {
            updateData.total_hours_worked = AttendanceMediator.calculateHoursWorked(
              record.check_in_time,
              now,
              record.break_start_time,
              record.break_end_time
            );
            updateData.overtime_hours = Math.max(0, updateData.total_hours_worked - 8);
          }
          break;
        case 'break_start':
          updateData.break_start_time = now;
          break;
        case 'break_end':
          updateData.break_end_time = now;
          // Recalculate total hours
          if (record.check_in_time && record.check_out_time) {
            updateData.total_hours_worked = AttendanceMediator.calculateHoursWorked(
              record.check_in_time,
              record.check_out_time,
              now,
              record.break_start_time
            );
          }
          break;
      }

      if (location) updateData.location = location;
      if (notes) updateData.notes = notes;

      const updateFields = Object.keys(updateData);
      const updateValues = Object.values(updateData);

      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const updateQuery = `
        UPDATE attendance_records
        SET ${setClause}
        WHERE id = $${updateValues.length + 1}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [...updateValues, record.id]);
      const updatedRecord = updateResult.rows[0];

      // Note: Audit logging can be added through event emission if needed

      // Emit event
      eventBus.emit('attendance.marked', { record: updatedRecord, action, markedBy });

      MyLogger.success(actionLog, {
        recordId: updatedRecord.id,
        employeeId: updatedRecord.employee_id,
        attendanceDate: updatedRecord.attendance_date,
        action,
        status: updatedRecord.status
      });

      return updatedRecord;
    } catch (error) {
      MyLogger.error(actionLog, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate hours worked between times
   */
  private static calculateHoursWorked(
    checkInTime?: string,
    checkOutTime?: string,
    breakStartTime?: string,
    breakEndTime?: string
  ): number {
    if (!checkInTime || !checkOutTime) return 0;

    const checkIn = new Date(`1970-01-01T${checkInTime}:00`);
    const checkOut = new Date(`1970-01-01T${checkOutTime}:00`);

    let totalMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);

    // Subtract break time if both break times are provided
    if (breakStartTime && breakEndTime) {
      const breakStart = new Date(`1970-01-01T${breakStartTime}:00`);
      const breakEnd = new Date(`1970-01-01T${breakEndTime}:00`);
      const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
      totalMinutes -= breakMinutes;
    }

    return Math.max(0, totalMinutes / 60); // Convert to hours
  }

  /**
   * Determine attendance status
   */
  private static determineAttendanceStatus(recordData: Partial<CreateAttendanceRecordRequest>, totalHours: number): string {
    if (!recordData.check_in_time || !recordData.check_out_time) {
      return 'absent';
    }

    // If hours worked is less than 4, consider half day
    if (totalHours < 4) {
      return 'half_day';
    }

    // If check-in is after 9:00 AM, consider late
    const checkInTime = recordData.check_in_time;
    if (checkInTime && checkInTime > '09:00') {
      return 'late';
    }

    return 'present';
  }

  /**
   * Calculate working days between two dates
   */
  private static calculateWorkingDaysBetweenDates(startDate: string, endDate: string): number {
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
   * Validate attendance record
   */
  private static async validateAttendanceRecord(recordData: CreateAttendanceRecordRequest, employeeId: number): Promise<void> {
    const client = await pool.connect();

    try {
      // Check if record already exists for this employee and date
      const existingRecordResult = await client.query(
        'SELECT * FROM attendance_records WHERE employee_id = $1 AND attendance_date = $2',
        [employeeId, recordData.attendance_date]
      );
      const existingRecord = existingRecordResult.rows[0];

      if (existingRecord) {
        throw new Error('Attendance record already exists for this date');
      }

      // Validate time logic
      if (recordData.check_in_time && recordData.check_out_time) {
        const checkIn = new Date(`1970-01-01T${recordData.check_in_time}:00`);
        const checkOut = new Date(`1970-01-01T${recordData.check_out_time}:00`);

        if (checkOut <= checkIn) {
          throw new Error('Check-out time must be after check-in time');
        }
      }

      if (recordData.break_start_time && recordData.break_end_time) {
        const breakStart = new Date(`1970-01-01T${recordData.break_start_time}:00`);
        const breakEnd = new Date(`1970-01-01T${recordData.break_end_time}:00`);

        if (breakEnd <= breakStart) {
          throw new Error('Break end time must be after break start time');
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Get attendance report for a period
   */
  static async getAttendanceReport(startDate: string, endDate: string): Promise<{
    total_employees: number;
    total_attendance_records: number;
    average_attendance_rate: number;
    total_overtime_hours: number;
    department_breakdown: { department: string; attendance_rate: number; total_employees: number }[];
  }> {
    const action = "AttendanceMediator.getAttendanceReport";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { startDate, endDate });

      // Get total employees
      const totalEmployeesResult = await client.query('SELECT COUNT(*) as count FROM employees WHERE is_active = true');
      const totalEmployees = totalEmployeesResult.rows[0];

      // Get attendance data for the period
      const attendanceDataResult = await client.query(`
        SELECT
          d.name as department,
          COUNT(*) as total_records,
          COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_days,
          COALESCE(SUM(ar.overtime_hours), 0) as overtime_hours
        FROM attendance_records as ar
        JOIN employees as e ON ar.employee_id = e.id
        JOIN departments as d ON e.department_id = d.id
        WHERE ar.attendance_date BETWEEN $1 AND $2
        GROUP BY d.name
      `, [startDate, endDate]);
      const attendanceData = attendanceDataResult.rows;

      const totalRecords = attendanceData.reduce((sum, item) => sum + parseInt(item.total_records as string), 0);
      const totalPresent = attendanceData.reduce((sum, item) => sum + parseInt(item.present_days as string), 0);
      const totalOvertime = attendanceData.reduce((sum, item) => sum + parseFloat(item.overtime_hours as string || '0'), 0);

      const workingDays = AttendanceMediator.calculateWorkingDaysBetweenDates(startDate, endDate);
      const averageAttendanceRate = workingDays > 0 ? (totalPresent / (totalEmployees.count * workingDays)) * 100 : 0;

      const report = {
        total_employees: parseInt(totalEmployees.count as string),
        total_attendance_records: totalRecords,
        average_attendance_rate: averageAttendanceRate,
        total_overtime_hours: totalOvertime,
        department_breakdown: attendanceData.map(item => ({
          department: item.department,
          attendance_rate: workingDays > 0 ? (parseInt(item.present_days as string) / workingDays) * 100 : 0,
          total_employees: 1 // This would need to be calculated properly
        }))
      };

      MyLogger.success(action, {
        startDate,
        endDate,
        totalEmployees: report.total_employees,
        totalRecords,
        averageAttendanceRate: report.average_attendance_rate,
        totalOvertime: report.total_overtime_hours
      });

      return report;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default AttendanceMediator;