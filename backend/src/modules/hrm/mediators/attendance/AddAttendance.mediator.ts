import { AttendanceRecord, WorkSchedule, CreateAttendanceRecordRequest, CreateWorkScheduleRequest } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class AddAttendanceMediator {

  /**
   * Create work schedule
   */
  static async createWorkSchedule(scheduleData: CreateWorkScheduleRequest, createdBy?: number): Promise<WorkSchedule> {
    const action = "AddAttendanceMediator.createWorkSchedule";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { scheduleData, createdBy });

      await client.query('BEGIN');

      // If this is set as default, unset other default schedules
      if (scheduleData.is_default) {
        await client.query('UPDATE work_schedules SET is_default = false WHERE is_default = true');
      }

      const insertQuery = `
        INSERT INTO work_schedules (name, schedule_type, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end, saturday_start, saturday_end, sunday_start, sunday_end, total_hours_per_week, is_default, is_active, description, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `;

      const values = [
        scheduleData.name,
        scheduleData.schedule_type,
        scheduleData.monday_start,
        scheduleData.monday_end,
        scheduleData.tuesday_start,
        scheduleData.tuesday_end,
        scheduleData.wednesday_start,
        scheduleData.wednesday_end,
        scheduleData.thursday_start,
        scheduleData.thursday_end,
        scheduleData.friday_start,
        scheduleData.friday_end,
        scheduleData.saturday_start,
        scheduleData.saturday_end,
        scheduleData.sunday_start,
        scheduleData.sunday_end,
        scheduleData.total_hours_per_week,
        scheduleData.is_default || false,
        true, // is_active defaults to true
        scheduleData.description,
        createdBy,
        new Date(),
        new Date()
      ];

      const result = await client.query(insertQuery, values);
      const schedule = result.rows[0];

      // TODO: Add audit logging when AuditService interface is updated
      // For now, just log the action
      MyLogger.info('Work schedule created', { scheduleId: schedule.id, createdBy });

      // Publish event
      eventBus.emit('work.schedule.created', {
        scheduleId: schedule.id,
        scheduleData: schedule,
        createdBy
      });

      await client.query('COMMIT');

      MyLogger.success(action, {
        scheduleId: schedule.id,
        code: schedule.code,
        createdBy
      });

      return schedule;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { scheduleData, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create attendance record
   */
  static async createAttendanceRecord(recordData: CreateAttendanceRecordRequest, employeeId: number, createdBy?: number): Promise<AttendanceRecord> {
    const action = "AddAttendanceMediator.createAttendanceRecord";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { recordData, employeeId, createdBy });

      await client.query('BEGIN');

      // Validate attendance record
      await this.validateAttendanceRecord(recordData, employeeId);

      const newRecord = {
        employee_id: employeeId,
        attendance_date: recordData.attendance_date,
        check_in_time: recordData.check_in_time,
        check_out_time: recordData.check_out_time,
        break_start_time: recordData.break_start_time,
        break_end_time: recordData.break_end_time,
        location: recordData.location,
        notes: recordData.notes,
        recorded_by: recordData.recorded_by,
        is_manual_entry: recordData.is_manual_entry,
        created_by: createdBy,
        created_at: new Date()
      };

      const insertQuery = `
        INSERT INTO attendance_records (employee_id, attendance_date, check_in_time, check_out_time, break_start_time, break_end_time, location, notes, recorded_by, is_manual_entry, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        newRecord.employee_id,
        newRecord.attendance_date,
        newRecord.check_in_time,
        newRecord.check_out_time,
        newRecord.break_start_time,
        newRecord.break_end_time,
        newRecord.location,
        newRecord.notes,
        newRecord.recorded_by,
        newRecord.is_manual_entry,
        newRecord.created_by,
        newRecord.created_at
      ];

      const result = await client.query(insertQuery, values);
      const record = result.rows[0];

      // TODO: Add audit logging when AuditService interface is updated
      // For now, just log the action
      MyLogger.info('Attendance record created', { recordId: record.id, employeeId, createdBy });

      // Publish event
      eventBus.emit('attendance.record.created', {
        recordId: record.id,
        employeeId,
        recordType: record.record_type,
        recordDate: record.record_date,
        createdBy
      });

      await client.query('COMMIT');

      MyLogger.success(action, {
        recordId: record.id,
        employeeId,
        recordType: record.record_type,
        recordDate: record.record_date,
        createdBy
      });

      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { recordData, employeeId, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }


  /**
   * Validate attendance record
   */
  private static async validateAttendanceRecord(recordData: CreateAttendanceRecordRequest, employeeId: number): Promise<void> {
    const action = "AddAttendanceMediator.validateAttendanceRecord";

    try {
      // Check for duplicate records on the same day
      const duplicateQuery = `
        SELECT * FROM attendance_records
        WHERE employee_id = $1
        AND attendance_date = $2
        AND (check_in_time IS NOT NULL OR check_out_time IS NOT NULL)
      `;

      const duplicateResult = await pool.query(duplicateQuery, [
        employeeId,
        recordData.attendance_date
      ]);

      if (duplicateResult.rows.length > 0) {
        throw new Error('Attendance record already exists for this date');
      }

      // Validate time format (HH:MM)
      if (recordData.check_in_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(recordData.check_in_time)) {
        throw new Error('Invalid check-in time format. Use HH:MM format');
      }

      if (recordData.check_out_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(recordData.check_out_time)) {
        throw new Error('Invalid check-out time format. Use HH:MM format');
      }

      MyLogger.info(action, { employeeId, attendanceDate: recordData.attendance_date, valid: true });

    } catch (error) {
      MyLogger.error(action, error, { employeeId, recordData });
      throw error;
    }
  }
}
