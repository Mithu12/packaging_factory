import { LeaveType, LeaveApplication, CreateLeaveTypeRequest, LeaveApplicationRequest } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class AddLeaveMediator {

  /**
   * Create leave type
   */
  static async createLeaveType(leaveTypeData: CreateLeaveTypeRequest, createdBy?: number): Promise<LeaveType> {
    const action = "AddLeaveMediator.createLeaveType";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { leaveTypeData, createdBy });

      // Check if leave type code already exists
      const existingLeaveTypeResult = await client.query(
        'SELECT * FROM leave_types WHERE code = $1',
        [leaveTypeData.code]
      );
      const existingLeaveType = existingLeaveTypeResult.rows[0];

      if (existingLeaveType) {
        throw new Error('Leave type code already exists');
      }

      const newLeaveType = {
        ...leaveTypeData,
        is_active: true,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO leave_types (name, code, days_per_year, max_consecutive_days, requires_approval, is_active, description, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        leaveTypeData.name,
        leaveTypeData.code,
        leaveTypeData.max_days_per_year,
        leaveTypeData.max_consecutive_days,
        leaveTypeData.requires_approval !== false,
        true, // is_active
        leaveTypeData.description,
        createdBy,
        new Date(),
        new Date()
      ];

      const result = await client.query(insertQuery, values);
      const leaveType = result.rows[0];

      // Create audit log
      if (createdBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: createdBy,
          action: 'CREATE_LEAVE_TYPE',
          resourceType: 'leave_type',
          resourceId: leaveType.id,
          endpoint: '/api/hrm/leave/types',
          method: 'POST',
          responseStatus: 201,
          success: true,
          durationMs: 0,
          oldValues: null,
          newValues: leaveTypeData
        });
      }

      // Publish event
      eventBus.emit('leave.type.created', {
        leaveTypeId: leaveType.id,
        leaveTypeData: leaveType,
        createdBy
      });

      MyLogger.success(action, {
        leaveTypeId: leaveType.id,
        code: leaveType.code,
        createdBy
      });

      return leaveType;
    } catch (error) {
      MyLogger.error(action, error, { leaveTypeData, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create leave application
   */
  static async createLeaveApplication(applicationData: LeaveApplicationRequest, employeeId: number, appliedBy?: number): Promise<LeaveApplication> {
    const action = "AddLeaveMediator.createLeaveApplication";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { applicationData, employeeId, appliedBy });

      await client.query('BEGIN');

      // Validate leave application
      await this.validateLeaveApplication(applicationData, employeeId);

      // Get leave type details
      const leaveTypeQuery = 'SELECT * FROM leave_types WHERE id = $1';
      const leaveTypeResult = await client.query(leaveTypeQuery, [applicationData.leave_type_id]);

      if (leaveTypeResult.rows.length === 0) {
        throw new Error('Leave type not found');
      }

      const leaveType = leaveTypeResult.rows[0];

      // Calculate leave days
      const startDate = new Date(applicationData.start_date);
      const endDate = new Date(applicationData.end_date);
      const leaveDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Create leave application
      const newApplication = {
        employee_id: employeeId,
        leave_type_id: applicationData.leave_type_id,
        start_date: applicationData.start_date,
        end_date: applicationData.end_date,
        total_days: leaveDays,
        reason: applicationData.reason,
        emergency_contact: applicationData.emergency_contact,
        work_handover_notes: applicationData.work_handover_notes,
        status: 'pending',
        applied_at: new Date()
      };

      const insertQuery = `
        INSERT INTO leave_applications (
          employee_id, leave_type_id, start_date, end_date, total_days, reason,
          emergency_contact, work_handover_notes, status, applied_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        newApplication.employee_id,
        newApplication.leave_type_id,
        newApplication.start_date,
        newApplication.end_date,
        newApplication.total_days,
        newApplication.reason,
        newApplication.emergency_contact,
        newApplication.work_handover_notes,
        newApplication.status,
        newApplication.applied_at
      ];

      const result = await client.query(insertQuery, values);
      const application = result.rows[0];

      // Create audit log
      if (appliedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: appliedBy,
          action: 'CREATE_LEAVE_APPLICATION',
          resourceType: 'leave_application',
          resourceId: application.id,
          endpoint: '/api/hrm/leave/applications',
          method: 'POST',
          responseStatus: 201,
          success: true,
          durationMs: 0,
          oldValues: null,
          newValues: applicationData
        });
      }

      // Publish event
      eventBus.emit('leave.application.created', {
        applicationId: application.id,
        employeeId,
        leaveType: leaveType.name,
        leaveDays: leaveDays,
        appliedBy
      });

      await client.query('COMMIT');

      MyLogger.success(action, {
        applicationId: application.id,
        employeeId,
        leaveDays: leaveDays,
        appliedBy
      });

      return application;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { applicationData, employeeId, appliedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate leave application
   */
  private static async validateLeaveApplication(applicationData: LeaveApplicationRequest, employeeId: number): Promise<void> {
    const action = "AddLeaveMediator.validateLeaveApplication";

    try {
      // Check if employee has enough leave balance
      const leaveBalance = await this.getLeaveBalance(employeeId, applicationData.leave_type_id);

      if (leaveBalance.available_days < 1) {
        throw new Error('Insufficient leave balance');
      }

      // Check for overlapping leave applications
      const overlappingQuery = `
        SELECT * FROM leave_applications
        WHERE employee_id = $1
        AND status IN ('submitted', 'approved')
        AND (
          (start_date BETWEEN $2 AND $3) OR
          (end_date BETWEEN $2 AND $3) OR
          (start_date <= $2 AND end_date >= $3)
        )
      `;

      const overlappingResult = await pool.query(overlappingQuery, [
        employeeId,
        applicationData.start_date,
        applicationData.end_date
      ]);

      if (overlappingResult.rows.length > 0) {
        throw new Error('Overlapping leave application exists');
      }

      MyLogger.info(action, { employeeId, leaveTypeId: applicationData.leave_type_id, valid: true });

    } catch (error) {
      MyLogger.error(action, error, { employeeId, applicationData });
      throw error;
    }
  }

  /**
   * Get employee leave balance for a specific leave type
   */
  private static async getLeaveBalance(employeeId: number, leaveTypeId: number): Promise<any> {
    const client = await pool.connect();

    try {
      // Get leave type details
      const leaveTypeQuery = 'SELECT * FROM leave_types WHERE id = $1';
      const leaveTypeResult = await client.query(leaveTypeQuery, [leaveTypeId]);

      if (leaveTypeResult.rows.length === 0) {
        throw new Error('Leave type not found');
      }

      const leaveType = leaveTypeResult.rows[0];

      // Calculate leave balance
      const currentYear = new Date().getFullYear();

      // Get used leave days for current year
      const usedQuery = `
        SELECT COALESCE(SUM(leave_days), 0) as used_days
        FROM leave_applications
        WHERE employee_id = $1
        AND leave_type_id = $2
        AND status = 'approved'
        AND EXTRACT(YEAR FROM start_date) = $3
      `;

      const usedResult = await client.query(usedQuery, [employeeId, leaveTypeId, currentYear]);
      const usedDays = parseFloat(usedResult.rows[0]?.used_days || '0');

      const availableDays = leaveType.days_per_year - usedDays;

      return {
        leave_type_id: leaveTypeId,
        leave_type_name: leaveType.name,
        allocated_days: leaveType.days_per_year,
        used_days: usedDays,
        available_days: availableDays,
        year: currentYear
      };

    } catch (error) {
      MyLogger.error('AddLeaveMediator.getLeaveBalance', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
