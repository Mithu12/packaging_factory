import {
  LeaveType,
  LeaveApplication,
  LeaveBalance,
  LeaveApplicationRequest,
  CreateLeaveTypeRequest
} from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import pool from '@/database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '@/utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

class LeaveMediator implements MediatorInterface {
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
   * Create leave type
   */
  async createLeaveType(leaveTypeData: CreateLeaveTypeRequest, createdBy?: number): Promise<LeaveType> {
    const action = "LeaveMediator.createLeaveType";
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

      const insertResult = await client.query(
        'INSERT INTO leave_types (name, code, max_days_per_year, accrual_rate, max_consecutive_days, is_carry_forward, max_carry_forward_days, is_active, description, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
        [newLeaveType.name, newLeaveType.code, newLeaveType.max_days_per_year, newLeaveType.accrual_rate, newLeaveType.max_consecutive_days, newLeaveType.is_carry_forward, newLeaveType.max_carry_forward_days, newLeaveType.is_active, newLeaveType.description, newLeaveType.created_by, newLeaveType.created_at, newLeaveType.updated_at]
      );
      const leaveType = insertResult.rows[0];

      // Audit log
      await this.auditService.logActivity({
        userId: createdBy || null,
        action: 'CREATE',
        resourceType: 'leave_types',
        resourceId: leaveType.id,
        endpoint: '/leave/types',
        method: 'POST',
        oldValues: null,
        newValues: leaveType,
        success: true,
        responseStatus: 201,
        durationMs: 0
      });

      MyLogger.success(action, {
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        leaveTypeCode: leaveType.code
      });

      return leaveType;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all leave types
   */
  async getLeaveTypes(): Promise<LeaveType[]> {
    const action = "LeaveMediator.getLeaveTypes";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {});

      const query = 'SELECT * FROM leave_types WHERE is_active = true ORDER BY name';
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
   * Get leave balances for an employee
   */
  async getLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
    const action = "LeaveMediator.getLeaveBalances";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, year });

      const currentYear = year || new Date().getFullYear();

      const query = `
        SELECT
          lb.*,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          lt.max_days_per_year,
          lt.is_carry_forward,
          lt.max_carry_forward_days
        FROM leave_balances as lb
        JOIN leave_types as lt ON lb.leave_type_id = lt.id
        WHERE lb.employee_id = $1 AND lb.year = $2
      `;

      const result = await client.query(query, [employeeId, currentYear]);

      MyLogger.success(action, {
        employeeId,
        year: currentYear,
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
   * Calculate and update leave balances for an employee
   */
  async calculateLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
    const action = "LeaveMediator.calculateLeaveBalances";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, year });

      const currentYear = year || new Date().getFullYear();

      // Get all leave types
      const leaveTypes = await this.getLeaveTypes();

      const balances: LeaveBalance[] = [];

      for (const leaveType of leaveTypes) {
        // Check if balance already exists for this year
        const existingBalanceResult = await client.query(
          'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
          [employeeId, leaveType.id, currentYear]
        );
        let existingBalance = existingBalanceResult.rows[0];

        if (!existingBalance) {
          // Calculate allocated days based on accrual rate
          const allocatedDays = leaveType.accrual_rate ?
            (leaveType.accrual_rate * 12) : // Annual allocation
            (leaveType.max_days_per_year || 0);

          // Check for carried forward days from previous year
          const previousYearBalanceResult = await client.query(
            'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
            [employeeId, leaveType.id, currentYear - 1]
          );
          const previousYearBalance = previousYearBalanceResult.rows[0];
          const carriedForwardDays = previousYearBalance?.remaining_days || 0;

          existingBalance = {
            employee_id: employeeId,
            leave_type_id: leaveType.id,
            year: currentYear,
            allocated_days: allocatedDays,
            used_days: 0,
            pending_days: 0,
            remaining_days: allocatedDays + carriedForwardDays,
            carried_forward_days: carriedForwardDays,
            last_updated: new Date()
          };

          await client.query(
            'INSERT INTO leave_balances (employee_id, leave_type_id, year, allocated_days, used_days, pending_days, remaining_days, carried_forward_days, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [existingBalance.employee_id, existingBalance.leave_type_id, existingBalance.year, existingBalance.allocated_days, existingBalance.used_days, existingBalance.pending_days, existingBalance.remaining_days, existingBalance.carried_forward_days, existingBalance.last_updated]
          );
        }

        balances.push(existingBalance);
      }

      // Audit log
      await this.auditService.logActivity({
        userId: null,
        action: 'CREATE',
        resourceType: 'leave_balances',
        resourceId: employeeId,
        endpoint: '/employees/leave-balances/calculate',
        method: 'POST',
        oldValues: null,
        newValues: { balances_count: balances.length, year: currentYear },
        success: true,
        responseStatus: 201,
        durationMs: 0
      });

      MyLogger.success(action, {
        employeeId,
        year: currentYear,
        balancesCount: balances.length
      });

      return balances;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create leave application
   */
  async createLeaveApplication(applicationData: LeaveApplicationRequest, employeeId: number, appliedBy?: number): Promise<LeaveApplication> {
    const action = "LeaveMediator.createLeaveApplication";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { applicationData, employeeId, appliedBy });

      // Validate leave application
      await this.validateLeaveApplication(applicationData, employeeId);

      // Calculate total days
      const startDate = new Date(applicationData.start_date);
      const endDate = new Date(applicationData.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Check leave balance
      const currentYear = new Date().getFullYear();
      const leaveBalanceQuery = `
        SELECT lb.*, lt.name as leave_type_name
        FROM leave_balances as lb
        JOIN leave_types as lt ON lb.leave_type_id = lt.id
        WHERE lb.employee_id = $1 AND lb.leave_type_id = $2 AND lb.year = $3
      `;
      const leaveBalanceResult = await client.query(leaveBalanceQuery, [employeeId, applicationData.leave_type_id, currentYear]);
      const leaveBalance = leaveBalanceResult.rows[0];

      if (!leaveBalance) {
        throw new Error('Leave balance not found for this leave type');
      }

      if (leaveBalance.remaining_days < totalDays) {
        throw new Error(`Insufficient leave balance. Available: ${leaveBalance.remaining_days} days, Requested: ${totalDays} days`);
      }

      const newApplication = {
        employee_id: employeeId,
        leave_type_id: applicationData.leave_type_id,
        start_date: applicationData.start_date,
        end_date: applicationData.end_date,
        total_days: totalDays,
        reason: applicationData.reason,
        status: 'pending',
        emergency_contact: applicationData.emergency_contact,
        work_handover_notes: applicationData.work_handover_notes,
        applied_at: new Date(),
        updated_at: new Date()
      };

      const insertResult = await client.query(
        'INSERT INTO leave_applications (employee_id, leave_type_id, start_date, end_date, total_days, reason, status, emergency_contact, work_handover_notes, applied_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [newApplication.employee_id, newApplication.leave_type_id, newApplication.start_date, newApplication.end_date, newApplication.total_days, newApplication.reason, newApplication.status, newApplication.emergency_contact, newApplication.work_handover_notes, newApplication.applied_at, newApplication.updated_at]
      );
      const application = insertResult.rows[0];

      // Update leave balance (pending days)
      await client.query(
        'UPDATE leave_balances SET pending_days = pending_days + $1 WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4',
        [totalDays, employeeId, applicationData.leave_type_id, currentYear]
      );

      // Audit log
      await this.auditService.logActivity({
        userId: appliedBy || null,
        action: 'CREATE',
        resourceType: 'leave_applications',
        resourceId: application.id,
        endpoint: '/leave/applications',
        method: 'POST',
        oldValues: null,
        newValues: application,
        success: true,
        responseStatus: 201,
        durationMs: 0
      });

      // Emit event
      eventBus.emit('leave.application.created', { application, appliedBy });

      MyLogger.success(action, {
        applicationId: application.id,
        employeeId,
        totalDays,
        leaveTypeId: applicationData.leave_type_id
      });

      return application;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get leave applications
   */
  async getLeaveApplications(filters?: {
    employee_id?: number;
    status?: string;
    leave_type_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<LeaveApplication[]> {
    const action = "LeaveMediator.getLeaveApplications";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters });

      let query = `
        SELECT
          la.*,
          e.first_name,
          e.last_name,
          e.employee_id,
          lt.name as leave_type_name,
          lt.code as leave_type_code
        FROM leave_applications as la
        JOIN employees as e ON la.employee_id = e.id
        JOIN leave_types as lt ON la.leave_type_id = lt.id
      `;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.employee_id) {
        conditions.push(`la.employee_id = $${paramIndex}`);
        values.push(filters.employee_id);
        paramIndex++;
      }

      if (filters?.status) {
        conditions.push(`la.status = $${paramIndex}`);
        values.push(filters.status);
        paramIndex++;
      }

      if (filters?.leave_type_id) {
        conditions.push(`la.leave_type_id = $${paramIndex}`);
        values.push(filters.leave_type_id);
        paramIndex++;
      }

      if (filters?.start_date) {
        conditions.push(`la.start_date >= $${paramIndex}`);
        values.push(filters.start_date);
        paramIndex++;
      }

      if (filters?.end_date) {
        conditions.push(`la.end_date <= $${paramIndex}`);
        values.push(filters.end_date);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY la.applied_at DESC';

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
   * Approve or reject leave application
   */
  async processLeaveApplication(
    applicationId: number,
    action: 'approve' | 'reject',
    approvedBy?: number,
    rejectedReason?: string
  ): Promise<LeaveApplication> {
    const actionLog = "LeaveMediator.processLeaveApplication";
    const client = await pool.connect();

    try {
      MyLogger.info(actionLog, { applicationId, action, approvedBy, rejectedReason });

      // Get application
      const applicationResult = await client.query(
        'SELECT * FROM leave_applications WHERE id = $1',
        [applicationId]
      );
      const application = applicationResult.rows[0];

      if (!application) {
        throw new Error('Leave application not found');
      }

      if (application.status !== 'pending') {
        throw new Error('Leave application is not pending');
      }

      const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: approvedBy,
        approved_at: new Date(),
        updated_at: new Date()
      };

      if (action === 'reject' && rejectedReason) {
        updateData.rejected_reason = rejectedReason;
      }

      // Update application
      let updateQuery: string;
      let updateParams: any[];

      if (action === 'reject' && rejectedReason) {
        updateQuery = 'UPDATE leave_applications SET status = $1, approved_by = $2, approved_at = $3, updated_at = $4, rejected_reason = $5 WHERE id = $6 RETURNING *';
        updateParams = ['rejected', approvedBy, new Date(), new Date(), rejectedReason, applicationId];
      } else {
        updateQuery = 'UPDATE leave_applications SET status = $1, approved_by = $2, approved_at = $3, updated_at = $4 WHERE id = $5 RETURNING *';
        updateParams = [action === 'approve' ? 'approved' : 'rejected', approvedBy, new Date(), new Date(), applicationId];
      }

      const updateResult = await client.query(updateQuery, updateParams);
      const updatedApplication = updateResult.rows[0];

      // Audit log
      await this.auditService.logActivity({
        userId: approvedBy || null,
        action: action === 'approve' ? 'UPDATE' : 'UPDATE',
        resourceType: 'leave_applications',
        resourceId: applicationId,
        endpoint: '/leave/applications/process',
        method: 'POST',
        oldValues: application,
        newValues: updatedApplication,
        success: true,
        responseStatus: 200,
        durationMs: 0
      });

      // Update leave balance
      const currentYear = new Date().getFullYear();
      if (action === 'approve') {
        // Move from pending to used
        await client.query(
          'UPDATE leave_balances SET pending_days = pending_days - $1, used_days = used_days + $1 WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4',
          [application.total_days, application.employee_id, application.leave_type_id, currentYear]
        );
      } else {
        // Remove from pending
        await client.query(
          'UPDATE leave_balances SET pending_days = pending_days - $1 WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4',
          [application.total_days, application.employee_id, application.leave_type_id, currentYear]
        );
      }

      // Emit event
      eventBus.emit('leave.application.processed', {
        application: updatedApplication,
        action,
        processedBy: approvedBy
      });

      MyLogger.success(actionLog, {
        applicationId,
        action,
        employeeId: application.employee_id,
        totalDays: application.total_days
      });

      return updatedApplication;
    } catch (error) {
      MyLogger.error(actionLog, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get leave dashboard data
   */
  async getLeaveDashboard(): Promise<{
    total_applications: number;
    pending_applications: number;
    approved_applications: number;
    recent_applications: LeaveApplication[];
    leave_type_usage: { leave_type: string; count: number; total_days: number }[];
  }> {
    const action = "LeaveMediator.getLeaveDashboard";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {});

      // Get counts
      const totalApplicationsResult = await client.query('SELECT COUNT(*) as count FROM leave_applications');
      const pendingApplicationsResult = await client.query('SELECT COUNT(*) as count FROM leave_applications WHERE status = $1', ['pending']);
      const approvedApplicationsResult = await client.query('SELECT COUNT(*) as count FROM leave_applications WHERE status = $1', ['approved']);

      // Recent applications
      const recentApplicationsQuery = `
        SELECT
          la.*,
          e.first_name,
          e.last_name,
          lt.name as leave_type_name
        FROM leave_applications as la
        JOIN employees as e ON la.employee_id = e.id
        JOIN leave_types as lt ON la.leave_type_id = lt.id
        ORDER BY la.applied_at DESC
        LIMIT 10
      `;
      const recentApplicationsResult = await client.query(recentApplicationsQuery);

      // Leave type usage
      const leaveTypeUsageQuery = `
        SELECT
          lt.name as leave_type,
          COUNT(*) as count,
          SUM(la.total_days) as total_days
        FROM leave_applications as la
        JOIN leave_types as lt ON la.leave_type_id = lt.id
        WHERE la.status = 'approved'
        GROUP BY lt.name
        ORDER BY total_days DESC
      `;
      const leaveTypeUsageResult = await client.query(leaveTypeUsageQuery);

      const dashboard = {
        total_applications: parseInt(totalApplicationsResult.rows[0].count),
        pending_applications: parseInt(pendingApplicationsResult.rows[0].count),
        approved_applications: parseInt(approvedApplicationsResult.rows[0].count),
        recent_applications: recentApplicationsResult.rows,
        leave_type_usage: leaveTypeUsageResult.rows.map(item => ({
          leave_type: item.leave_type,
          count: parseInt(item.count),
          total_days: parseFloat(item.total_days)
        }))
      };

      MyLogger.success(action, {
        totalApplications: dashboard.total_applications,
        pendingApplications: dashboard.pending_applications,
        approvedApplications: dashboard.approved_applications
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
   * Validate leave application
   */
  private async validateLeaveApplication(applicationData: LeaveApplicationRequest, employeeId: number): Promise<void> {
    const client = await pool.connect();

    try {
      // Check if leave type exists and is active
    const leaveTypeResult = await client.query(
      'SELECT * FROM leave_types WHERE id = $1 AND is_active = true',
      [applicationData.leave_type_id]
    );
    const leaveType = leaveTypeResult.rows[0];

    if (!leaveType) {
      throw new Error('Invalid or inactive leave type');
    }

    // Check for overlapping leave applications
    const overlappingQuery = `
      SELECT * FROM leave_applications
      WHERE employee_id = $1 AND status = 'approved'
      AND (
        (start_date BETWEEN $2 AND $3)
        OR (end_date BETWEEN $2 AND $3)
        OR (start_date <= $2 AND end_date >= $3)
      )
    `;
    const overlappingResult = await client.query(overlappingQuery, [
      employeeId,
      applicationData.start_date,
      applicationData.end_date
    ]);
    const overlappingLeave = overlappingResult.rows[0];

    if (overlappingLeave) {
      throw new Error('Overlapping leave application already exists');
    }

    // Check maximum consecutive days
    if (leaveType.max_consecutive_days) {
      const startDate = new Date(applicationData.start_date);
      const endDate = new Date(applicationData.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (totalDays > leaveType.max_consecutive_days) {
        throw new Error(`Maximum consecutive days for this leave type is ${leaveType.max_consecutive_days}`);
      }
    }

    // Check if start date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateCheck = new Date(applicationData.start_date);

    if (startDateCheck < today) {
      throw new Error('Leave start date cannot be in the past');
    }
  } finally {
    client.release();
  }
}

  /**
   * Get leave calendar data for a specific month
   */
  async getLeaveCalendar(year: number, month: number): Promise<{
    holidays: any[];
    leave_applications: any[];
    working_days: number;
  }> {
    const action = "LeaveMediator.getLeaveCalendar";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { year, month });

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get holidays for the month
      const holidaysQuery = `
        SELECT * FROM holidays
        WHERE holiday_date BETWEEN $1 AND $2
        ORDER BY holiday_date
      `;
      const holidaysResult = await client.query(holidaysQuery, [startDateStr, endDateStr]);
      const holidays = holidaysResult.rows;

      // Get approved leave applications for the month
      const leaveApplicationsQuery = `
        SELECT
          la.*,
          e.first_name,
          e.last_name,
          e.employee_id
        FROM leave_applications as la
        JOIN employees as e ON la.employee_id = e.id
        WHERE la.status = 'approved'
        AND (
          la.start_date BETWEEN $1 AND $2
          OR la.end_date BETWEEN $1 AND $2
        )
      `;
      const leaveApplicationsResult = await client.query(leaveApplicationsQuery, [startDateStr, endDateStr]);
      const leaveApplications = leaveApplicationsResult.rows;

      // Calculate working days (excluding weekends and holidays)
      let workingDays = 0;
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        if (date.getDay() !== 0 && date.getDay() !== 6) { // Not Sunday or Saturday
          const dateStr = date.toISOString().split('T')[0];
          const isHoliday = holidays.some(h => h.holiday_date === dateStr);
          if (!isHoliday) {
            workingDays++;
          }
        }
      }

      const calendar = {
        holidays,
        leave_applications: leaveApplications,
        working_days: workingDays
      };

      MyLogger.success(action, {
        year,
        month,
        holidaysCount: holidays.length,
        leaveApplicationsCount: leaveApplications.length,
        workingDays
      });

      return calendar;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new LeaveMediator();