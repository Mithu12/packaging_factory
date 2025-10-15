import {
  AttendanceRecord,
  WorkSchedule,
  AttendanceSummary,
  CreateAttendanceRecordRequest,
  CreateWorkScheduleRequest
} from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import { databaseConnection } from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { EventBus } from '../../../../utils/eventBus';

export class AttendanceMediator implements MediatorInterface {
  private auditService: AuditService;
  private eventBus: EventBus;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = EventBus.getInstance();
  }

  async process(data: any): Promise<any> {
    return data;
  }

  /**
   * Create work schedule
   */
  async createWorkSchedule(scheduleData: CreateWorkScheduleRequest, createdBy?: number): Promise<WorkSchedule> {
    const { db } = await databaseConnection();

    try {
      // If this is set as default, unset other default schedules
      if (scheduleData.is_default) {
        await db('work_schedules')
          .where('is_default', true)
          .update({ is_default: false });
      }

      const newSchedule = {
        ...scheduleData,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [schedule] = await db('work_schedules')
        .insert(newSchedule)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: createdBy,
        action: 'CREATE',
        table_name: 'work_schedules',
        record_id: schedule.id,
        old_values: null,
        new_values: schedule,
        description: `Work schedule ${schedule.name} created`
      });

      return schedule;
    } catch (error) {
      throw new Error(`Failed to create work schedule: ${error}`);
    }
  }

  /**
   * Get work schedules
   */
  async getWorkSchedules(includeInactive?: boolean): Promise<WorkSchedule[]> {
    const { db } = await databaseConnection();

    try {
      let query = db('work_schedules').orderBy('name');

      if (!includeInactive) {
        query = query.where('is_active', true);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve work schedules: ${error}`);
    }
  }

  /**
   * Create attendance record
   */
  async createAttendanceRecord(recordData: CreateAttendanceRecordRequest, employeeId: number, createdBy?: number): Promise<AttendanceRecord> {
    const { db } = await databaseConnection();

    try {
      // Validate attendance record
      await this.validateAttendanceRecord(recordData, employeeId);

      // Calculate total hours worked
      const totalHoursWorked = this.calculateHoursWorked(
        recordData.check_in_time,
        recordData.check_out_time,
        recordData.break_start_time,
        recordData.break_end_time
      );

      // Determine status
      const status = this.determineAttendanceStatus(recordData, totalHoursWorked);

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

      const [record] = await db('attendance_records')
        .insert(newRecord)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: createdBy,
        action: 'CREATE',
        table_name: 'attendance_records',
        record_id: record.id,
        old_values: null,
        new_values: record,
        description: `Attendance record created for ${record.attendance_date}`
      });

      // Emit event
      this.eventBus.emit('attendance.record.created', { record, createdBy });

      return record;
    } catch (error) {
      throw new Error(`Failed to create attendance record: ${error}`);
    }
  }

  /**
   * Get attendance records
   */
  async getAttendanceRecords(filters?: {
    employee_id?: number;
    attendance_date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<AttendanceRecord[]> {
    const { db } = await databaseConnection();

    try {
      let query = db('attendance_records as ar')
        .join('employees as e', 'ar.employee_id', 'e.id')
        .select(
          'ar.*',
          'e.first_name',
          'e.last_name',
          'e.employee_id'
        )
        .orderBy('ar.attendance_date', 'desc')
        .orderBy('ar.check_in_time');

      if (filters?.employee_id) {
        query = query.where('ar.employee_id', filters.employee_id);
      }

      if (filters?.attendance_date) {
        query = query.where('ar.attendance_date', filters.attendance_date);
      }

      if (filters?.start_date) {
        query = query.where('ar.attendance_date', '>=', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.where('ar.attendance_date', '<=', filters.end_date);
      }

      if (filters?.status) {
        query = query.where('ar.status', filters.status);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve attendance records: ${error}`);
    }
  }

  /**
   * Update attendance record
   */
  async updateAttendanceRecord(
    recordId: number,
    updateData: Partial<CreateAttendanceRecordRequest>,
    updatedBy?: number
  ): Promise<AttendanceRecord> {
    const { db } = await databaseConnection();

    try {
      // Get current record
      const currentRecord = await db('attendance_records')
        .where('id', recordId)
        .first();

      if (!currentRecord) {
        throw new Error('Attendance record not found');
      }

      // Calculate hours if time data is being updated
      let totalHoursWorked = currentRecord.total_hours_worked;
      let overtimeHours = currentRecord.overtime_hours;
      let status = currentRecord.status;

      if (updateData.check_in_time || updateData.check_out_time || updateData.break_start_time || updateData.break_end_time) {
        totalHoursWorked = this.calculateHoursWorked(
          updateData.check_in_time || currentRecord.check_in_time,
          updateData.check_out_time || currentRecord.check_out_time,
          updateData.break_start_time || currentRecord.break_start_time,
          updateData.break_end_time || currentRecord.break_end_time
        );

        overtimeHours = Math.max(0, totalHoursWorked - 8);
        status = this.determineAttendanceStatus(updateData, totalHoursWorked);
      }

      const updatedRecordData = {
        ...updateData,
        total_hours_worked: totalHoursWorked,
        overtime_hours: overtimeHours,
        status,
        updated_at: new Date()
      };

      const [record] = await db('attendance_records')
        .where('id', recordId)
        .update(updatedRecordData)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: updatedBy,
        action: 'UPDATE',
        table_name: 'attendance_records',
        record_id: recordId,
        old_values: currentRecord,
        new_values: record,
        description: `Attendance record updated`
      });

      // Emit event
      this.eventBus.emit('attendance.record.updated', { record, updatedBy });

      return record;
    } catch (error) {
      throw new Error(`Failed to update attendance record: ${error}`);
    }
  }

  /**
   * Get attendance summary for a period
   */
  async getAttendanceSummary(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<AttendanceSummary> {
    const { db } = await databaseConnection();

    try {
      const records = await db('attendance_records')
        .where('employee_id', employeeId)
        .whereBetween('attendance_date', [startDate, endDate])
        .orderBy('attendance_date');

      const totalWorkingDays = this.calculateWorkingDaysBetweenDates(startDate, endDate);
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const halfDays = records.filter(r => r.status === 'half_day').length;

      const totalHoursWorked = records.reduce((sum, record) => sum + (record.total_hours_worked || 0), 0);
      const totalOvertimeHours = records.reduce((sum, record) => sum + (record.overtime_hours || 0), 0);

      const averageHoursPerDay = presentDays > 0 ? totalHoursWorked / presentDays : 0;

      return {
        period_start: startDate,
        period_end: endDate,
        total_working_days: totalWorkingDays,
        average_attendance_rate: totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0,
        total_absenteeism: absentDays,
        overtime_hours: totalOvertimeHours,
        employee_attendance: [{
          employee: `Employee ${employeeId}`,
          attendance_rate: totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0,
          total_days: totalWorkingDays
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get attendance summary: ${error}`);
    }
  }

  /**
   * Get attendance dashboard
   */
  async getAttendanceDashboard(): Promise<{
    total_records_today: number;
    present_today: number;
    absent_today: number;
    late_today: number;
    average_hours_today: number;
    recent_records: AttendanceRecord[];
    employee_summary: { employee: string; status: string; hours: number }[];
  }> {
    const { db } = await databaseConnection();

    try {
      const today = new Date().toISOString().split('T')[0];

      // Today's attendance
      const todayRecords = await db('attendance_records as ar')
        .join('employees as e', 'ar.employee_id', 'e.id')
        .select(
          'ar.*',
          'e.first_name',
          'e.last_name'
        )
        .where('ar.attendance_date', today);

      const totalRecordsToday = todayRecords.length;
      const presentToday = todayRecords.filter(r => r.status === 'present').length;
      const absentToday = todayRecords.filter(r => r.status === 'absent').length;
      const lateToday = todayRecords.filter(r => r.status === 'late').length;

      const totalHoursToday = todayRecords.reduce((sum, record) => sum + (record.total_hours_worked || 0), 0);
      const averageHoursToday = totalRecordsToday > 0 ? totalHoursToday / totalRecordsToday : 0;

      // Recent records (last 10)
      const recentRecords = await db('attendance_records as ar')
        .join('employees as e', 'ar.employee_id', 'e.id')
        .select(
          'ar.*',
          'e.first_name',
          'e.last_name',
          'e.employee_id'
        )
        .orderBy('ar.created_at', 'desc')
        .limit(10);

      // Employee summary for today
      const employeeSummary = todayRecords.map(record => ({
        employee: `${record.first_name} ${record.last_name}`,
        status: record.status,
        hours: record.total_hours_worked || 0
      }));

      return {
        total_records_today: totalRecordsToday,
        present_today: presentToday,
        absent_today: absentToday,
        late_today: lateToday,
        average_hours_today: averageHoursToday,
        recent_records: recentRecords,
        employee_summary: employeeSummary
      };
    } catch (error) {
      throw new Error(`Failed to get attendance dashboard: ${error}`);
    }
  }

  /**
   * Mark attendance (check-in/check-out)
   */
  async markAttendance(
    employeeId: number,
    action: 'check_in' | 'check_out' | 'break_start' | 'break_end',
    location?: string,
    notes?: string,
    markedBy?: number
  ): Promise<AttendanceRecord> {
    const { db } = await databaseConnection();

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // Get or create today's attendance record
      let record = await db('attendance_records')
        .where('employee_id', employeeId)
        .where('attendance_date', today)
        .first();

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

        const [newRecord] = await db('attendance_records')
          .insert(record)
          .returning('*');

        record = newRecord;
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
            updateData.total_hours_worked = this.calculateHoursWorked(
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
            updateData.total_hours_worked = this.calculateHoursWorked(
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

      const [updatedRecord] = await db('attendance_records')
        .where('id', record.id)
        .update(updateData)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: markedBy,
        action: 'UPDATE',
        table_name: 'attendance_records',
        record_id: record.id,
        old_values: record,
        new_values: updatedRecord,
        description: `Attendance ${action} marked`
      });

      // Emit event
      this.eventBus.emit('attendance.marked', { record: updatedRecord, action, markedBy });

      return updatedRecord;
    } catch (error) {
      throw new Error(`Failed to mark attendance: ${error}`);
    }
  }

  /**
   * Calculate hours worked between times
   */
  private calculateHoursWorked(
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
  private determineAttendanceStatus(recordData: Partial<CreateAttendanceRecordRequest>, totalHours: number): string {
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
  private calculateWorkingDaysBetweenDates(startDate: string, endDate: string): number {
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
  private async validateAttendanceRecord(recordData: CreateAttendanceRecordRequest, employeeId: number): Promise<void> {
    // Check if record already exists for this employee and date
    const { db } = await databaseConnection();

    const existingRecord = await db('attendance_records')
      .where('employee_id', employeeId)
      .where('attendance_date', recordData.attendance_date)
      .first();

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
  }

  /**
   * Get attendance report for a period
   */
  async getAttendanceReport(startDate: string, endDate: string): Promise<{
    total_employees: number;
    total_attendance_records: number;
    average_attendance_rate: number;
    total_overtime_hours: number;
    department_breakdown: { department: string; attendance_rate: number; total_employees: number }[];
  }> {
    const { db } = await databaseConnection();

    try {
      // Get total employees
      const totalEmployees = await db('employees')
        .where('is_active', true)
        .count('* as count')
        .first();

      // Get attendance data for the period
      const attendanceData = await db('attendance_records as ar')
        .join('employees as e', 'ar.employee_id', 'e.id')
        .join('departments as d', 'e.department_id', 'd.id')
        .select(
          'd.name as department',
          db.raw('COUNT(*) as total_records'),
          db.raw('COUNT(CASE WHEN ar.status = \'present\' THEN 1 END) as present_days'),
          db.raw('SUM(ar.overtime_hours) as overtime_hours')
        )
        .whereBetween('ar.attendance_date', [startDate, endDate])
        .groupBy('d.name');

      const totalRecords = attendanceData.reduce((sum, item) => sum + parseInt(item.total_records as string), 0);
      const totalPresent = attendanceData.reduce((sum, item) => sum + parseInt(item.present_days as string), 0);
      const totalOvertime = attendanceData.reduce((sum, item) => sum + parseFloat(item.overtime_hours as string || '0'), 0);

      const workingDays = this.calculateWorkingDaysBetweenDates(startDate, endDate);
      const averageAttendanceRate = workingDays > 0 ? (totalPresent / (totalEmployees.count * workingDays)) * 100 : 0;

      return {
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
    } catch (error) {
      throw new Error(`Failed to get attendance report: ${error}`);
    }
  }
}
