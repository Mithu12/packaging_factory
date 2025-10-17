import { AttendanceRecord, WorkSchedule, CreateAttendanceRecordRequest, CreateWorkScheduleRequest } from '../../../../../types/hrm';
import pool from '../../../../../database/connection';
import { AuditService } from '../../../../../services/audit-service';
import { eventBus } from '../../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class AddAttendanceMediator {
  private auditService: AuditService;
  private eventBus: any;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = eventBus;
  }

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

      const newSchedule = {
        ...scheduleData,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO work_schedules (name, code, schedule_type, start_time, end_time, break_start_time, break_end_time, working_days, is_default, is_active, description, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        newSchedule.name,
        newSchedule.code,
        newSchedule.schedule_type,
        newSchedule.start_time,
        newSchedule.end_time,
        newSchedule.break_start_time,
        newSchedule.break_end_time,
        JSON.stringify(newSchedule.working_days),
        newSchedule.is_default || false,
        newSchedule.is_active !== false,
        newSchedule.description,
        newSchedule.created_by,
        newSchedule.created_at,
        newSchedule.updated_at
      ];

      const result = await client.query(insertQuery, values);
      const schedule = result.rows[0];

      // Create audit log
      if (createdBy) {
        await this.auditService.createAuditLog({
          table_name: 'work_schedules',
          record_id: schedule.id,
          action: 'INSERT',
          old_values: null,
          new_values: scheduleData,
          user_id: createdBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('work.schedule.created', {
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
        record_date: recordData.record_date,
        record_type: recordData.record_type,
        record_time: recordData.record_time,
        location: recordData.location,
        notes: recordData.notes,
        created_by: createdBy,
        created_at: new Date()
      };

      const insertQuery = `
        INSERT INTO attendance_records (employee_id, record_date, record_type, record_time, location, notes, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        newRecord.employee_id,
        newRecord.record_date,
        newRecord.record_type,
        newRecord.record_time,
        newRecord.location,
        newRecord.notes,
        newRecord.created_by,
        newRecord.created_at
      ];

      const result = await client.query(insertQuery, values);
      const record = result.rows[0];

      // Create audit log
      if (createdBy) {
        await this.auditService.createAuditLog({
          table_name: 'attendance_records',
          record_id: record.id,
          action: 'INSERT',
          old_values: null,
          new_values: recordData,
          user_id: createdBy,
          timestamp: new Date()
        });
      }

      // Publish event
      this.eventBus.publish('attendance.record.created', {
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
   * Mark attendance for multiple employees (bulk operation)
   */
  static async markAttendance(
    employeeIds: number[],
    recordDate: string,
    status: string,
    checkInTime?: string,
    checkOutTime?: string,
    notes?: string,
    markedBy?: number
  ): Promise<{
    success: number;
    failed: number;
    errors: any[];
    records: AttendanceRecord[];
  }> {
    const action = "AddAttendanceMediator.markAttendance";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {
        employeeIdsCount: employeeIds.length,
        recordDate,
        status,
        markedBy
      });

      const results = {
        success: 0,
        failed: 0,
        errors: [],
        records: []
      };

      await client.query('BEGIN');

      for (let i = 0; i < employeeIds.length; i++) {
        const employeeId = employeeIds[i];

        try {
          // Create check-in record
          if (checkInTime) {
            const checkInRecord: CreateAttendanceRecordRequest = {
              record_date: recordDate,
              record_type: 'check_in',
              record_time: checkInTime,
              location: null,
              notes: notes
            };

            const record = await this.createAttendanceRecord(checkInRecord, employeeId, markedBy);
            results.records.push(record);
            results.success++;
          }

          // Create check-out record
          if (checkOutTime) {
            const checkOutRecord: CreateAttendanceRecordRequest = {
              record_date: recordDate,
              record_type: 'check_out',
              record_time: checkOutTime,
              location: null,
              notes: notes
            };

            const record = await this.createAttendanceRecord(checkOutRecord, employeeId, markedBy);
            results.records.push(record);
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            employeeId,
            error: error.message
          });
        }
      }

      await client.query('COMMIT');

      MyLogger.success(action, {
        total: employeeIds.length,
        success: results.success,
        failed: results.failed,
        markedBy
      });

      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { employeeIds, markedBy });
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
        AND record_date = $2
        AND record_type = $3
      `;

      const duplicateResult = await pool.query(duplicateQuery, [
        employeeId,
        recordData.record_date,
        recordData.record_type
      ]);

      if (duplicateResult.rows.length > 0) {
        throw new Error(`${recordData.record_type} record already exists for this date`);
      }

      // Validate time format (HH:MM)
      if (recordData.record_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(recordData.record_time)) {
        throw new Error('Invalid time format. Use HH:MM format');
      }

      MyLogger.info(action, { employeeId, recordType: recordData.record_type, valid: true });

    } catch (error) {
      MyLogger.error(action, error, { employeeId, recordData });
      throw error;
    }
  }
}
