import {
  LeaveType,
  LeaveApplication,
  LeaveBalance,
  LeaveApplicationRequest,
  CreateLeaveTypeRequest
} from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import { databaseConnection } from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { EventBus } from '../../../../utils/eventBus';

export class LeaveMediator implements MediatorInterface {
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
   * Create leave type
   */
  async createLeaveType(leaveTypeData: CreateLeaveTypeRequest, createdBy?: number): Promise<LeaveType> {
    const { db } = await databaseConnection();

    try {
      // Check if leave type code already exists
      const existingLeaveType = await db('leave_types')
        .where('code', leaveTypeData.code)
        .first();

      if (existingLeaveType) {
        throw new Error('Leave type code already exists');
      }

      const newLeaveType = {
        ...leaveTypeData,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [leaveType] = await db('leave_types')
        .insert(newLeaveType)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: createdBy,
        action: 'CREATE',
        table_name: 'leave_types',
        record_id: leaveType.id,
        old_values: null,
        new_values: leaveType,
        description: `Leave type ${leaveType.name} created`
      });

      return leaveType;
    } catch (error) {
      throw new Error(`Failed to create leave type: ${error}`);
    }
  }

  /**
   * Get all leave types
   */
  async getLeaveTypes(): Promise<LeaveType[]> {
    const { db } = await databaseConnection();

    try {
      return await db('leave_types')
        .where('is_active', true)
        .orderBy('name');
    } catch (error) {
      throw new Error(`Failed to retrieve leave types: ${error}`);
    }
  }

  /**
   * Get leave balances for an employee
   */
  async getLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
    const { db } = await databaseConnection();

    try {
      const currentYear = year || new Date().getFullYear();

      let query = db('leave_balances as lb')
        .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
        .select(
          'lb.*',
          'lt.name as leave_type_name',
          'lt.code as leave_type_code',
          'lt.max_days_per_year',
          'lt.is_carry_forward',
          'lt.max_carry_forward_days'
        )
        .where('lb.employee_id', employeeId)
        .where('lb.year', currentYear);

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve leave balances: ${error}`);
    }
  }

  /**
   * Calculate and update leave balances for an employee
   */
  async calculateLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
    const { db } = await databaseConnection();

    try {
      const currentYear = year || new Date().getFullYear();

      // Get all leave types
      const leaveTypes = await this.getLeaveTypes();

      const balances: LeaveBalance[] = [];

      for (const leaveType of leaveTypes) {
        // Check if balance already exists for this year
        let existingBalance = await db('leave_balances')
          .where('employee_id', employeeId)
          .where('leave_type_id', leaveType.id)
          .where('year', currentYear)
          .first();

        if (!existingBalance) {
          // Calculate allocated days based on accrual rate
          const allocatedDays = leaveType.accrual_rate ?
            (leaveType.accrual_rate * 12) : // Annual allocation
            (leaveType.max_days_per_year || 0);

          // Check for carried forward days from previous year
          const previousYearBalance = await db('leave_balances')
            .where('employee_id', employeeId)
            .where('leave_type_id', leaveType.id)
            .where('year', currentYear - 1)
            .first();

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

          await db('leave_balances').insert(existingBalance);
        }

        balances.push(existingBalance);
      }

      return balances;
    } catch (error) {
      throw new Error(`Failed to calculate leave balances: ${error}`);
    }
  }

  /**
   * Create leave application
   */
  async createLeaveApplication(applicationData: LeaveApplicationRequest, employeeId: number, appliedBy?: number): Promise<LeaveApplication> {
    const { db } = await databaseConnection();

    try {
      // Validate leave application
      await this.validateLeaveApplication(applicationData, employeeId);

      // Calculate total days
      const startDate = new Date(applicationData.start_date);
      const endDate = new Date(applicationData.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Check leave balance
      const leaveBalance = await db('leave_balances as lb')
        .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
        .select('lb.*', 'lt.name as leave_type_name')
        .where('lb.employee_id', employeeId)
        .where('lb.leave_type_id', applicationData.leave_type_id)
        .where('lb.year', new Date().getFullYear())
        .first();

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

      const [application] = await db('leave_applications')
        .insert(newApplication)
        .returning('*');

      // Update leave balance (pending days)
      await db('leave_balances')
        .where('employee_id', employeeId)
        .where('leave_type_id', applicationData.leave_type_id)
        .where('year', new Date().getFullYear())
        .increment('pending_days', totalDays);

      // Audit log
      await this.auditService.log({
        user_id: appliedBy,
        action: 'CREATE',
        table_name: 'leave_applications',
        record_id: application.id,
        old_values: null,
        new_values: application,
        description: `Leave application created for ${totalDays} days`
      });

      // Emit event
      this.eventBus.emit('leave.application.created', { application, appliedBy });

      return application;
    } catch (error) {
      throw new Error(`Failed to create leave application: ${error}`);
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
    const { db } = await databaseConnection();

    try {
      let query = db('leave_applications as la')
        .join('employees as e', 'la.employee_id', 'e.id')
        .join('leave_types as lt', 'la.leave_type_id', 'lt.id')
        .select(
          'la.*',
          'e.first_name',
          'e.last_name',
          'e.employee_id',
          'lt.name as leave_type_name',
          'lt.code as leave_type_code'
        )
        .orderBy('la.applied_at', 'desc');

      if (filters?.employee_id) {
        query = query.where('la.employee_id', filters.employee_id);
      }

      if (filters?.status) {
        query = query.where('la.status', filters.status);
      }

      if (filters?.leave_type_id) {
        query = query.where('la.leave_type_id', filters.leave_type_id);
      }

      if (filters?.start_date) {
        query = query.where('la.start_date', '>=', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.where('la.end_date', '<=', filters.end_date);
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve leave applications: ${error}`);
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
    const { db } = await databaseConnection();

    try {
      const application = await db('leave_applications')
        .where('id', applicationId)
        .first();

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

      const [updatedApplication] = await db('leave_applications')
        .where('id', applicationId)
        .update(updateData)
        .returning('*');

      // Update leave balance
      if (action === 'approve') {
        // Move from pending to used
        await db('leave_balances')
          .where('employee_id', application.employee_id)
          .where('leave_type_id', application.leave_type_id)
          .where('year', new Date().getFullYear())
          .decrement('pending_days', application.total_days)
          .increment('used_days', application.total_days);
      } else {
        // Remove from pending
        await db('leave_balances')
          .where('employee_id', application.employee_id)
          .where('leave_type_id', application.leave_type_id)
          .where('year', new Date().getFullYear())
          .decrement('pending_days', application.total_days);
      }

      // Audit log
      await this.auditService.log({
        user_id: approvedBy,
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        table_name: 'leave_applications',
        record_id: applicationId,
        old_values: application,
        new_values: updatedApplication,
        description: `Leave application ${action}d`
      });

      // Emit event
      this.eventBus.emit('leave.application.processed', {
        application: updatedApplication,
        action,
        processedBy: approvedBy
      });

      return updatedApplication;
    } catch (error) {
      throw new Error(`Failed to process leave application: ${error}`);
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
    const { db } = await databaseConnection();

    try {
      // Get counts
      const totalApplications = await db('leave_applications')
        .count('* as count')
        .first();

      const pendingApplications = await db('leave_applications')
        .where('status', 'pending')
        .count('* as count')
        .first();

      const approvedApplications = await db('leave_applications')
        .where('status', 'approved')
        .count('* as count')
        .first();

      // Recent applications
      const recentApplications = await db('leave_applications as la')
        .join('employees as e', 'la.employee_id', 'e.id')
        .join('leave_types as lt', 'la.leave_type_id', 'lt.id')
        .select(
          'la.*',
          'e.first_name',
          'e.last_name',
          'lt.name as leave_type_name'
        )
        .orderBy('la.applied_at', 'desc')
        .limit(10);

      // Leave type usage
      const leaveTypeUsage = await db('leave_applications as la')
        .join('leave_types as lt', 'la.leave_type_id', 'lt.id')
        .select('lt.name as leave_type')
        .count('* as count')
        .sum('la.total_days as total_days')
        .where('la.status', 'approved')
        .groupBy('lt.name')
        .orderBy('total_days', 'desc');

      return {
        total_applications: parseInt(totalApplications?.count as string) || 0,
        pending_applications: parseInt(pendingApplications?.count as string) || 0,
        approved_applications: parseInt(approvedApplications?.count as string) || 0,
        recent_applications: recentApplications,
        leave_type_usage: leaveTypeUsage.map(item => ({
          leave_type: item.leave_type,
          count: parseInt(item.count as string),
          total_days: parseFloat(item.total_days as string)
        }))
      };
    } catch (error) {
      throw new Error(`Failed to retrieve leave dashboard: ${error}`);
    }
  }

  /**
   * Validate leave application
   */
  private async validateLeaveApplication(applicationData: LeaveApplicationRequest, employeeId: number): Promise<void> {
    const { db } = await databaseConnection();

    // Check if leave type exists and is active
    const leaveType = await db('leave_types')
      .where('id', applicationData.leave_type_id)
      .where('is_active', true)
      .first();

    if (!leaveType) {
      throw new Error('Invalid or inactive leave type');
    }

    // Check for overlapping leave applications
    const overlappingLeave = await db('leave_applications')
      .where('employee_id', employeeId)
      .where('status', 'approved')
      .where(function() {
        this.whereBetween('start_date', [applicationData.start_date, applicationData.end_date])
          .orWhereBetween('end_date', [applicationData.start_date, applicationData.end_date])
          .orWhere(function() {
            this.where('start_date', '<=', applicationData.start_date)
              .andWhere('end_date', '>=', applicationData.end_date);
          });
      })
      .first();

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
    const startDate = new Date(applicationData.start_date);

    if (startDate < today) {
      throw new Error('Leave start date cannot be in the past');
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
    const { db } = await databaseConnection();

    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Get holidays for the month
      const holidays = await db('holidays')
        .whereBetween('holiday_date', [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]])
        .orderBy('holiday_date');

      // Get approved leave applications for the month
      const leaveApplications = await db('leave_applications as la')
        .join('employees as e', 'la.employee_id', 'e.id')
        .select(
          'la.*',
          'e.first_name',
          'e.last_name',
          'e.employee_id'
        )
        .where('la.status', 'approved')
        .where(function() {
          this.whereBetween('la.start_date', [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]])
            .orWhereBetween('la.end_date', [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);
        });

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

      return {
        holidays,
        leave_applications: leaveApplications,
        working_days: workingDays
      };
    } catch (error) {
      throw new Error(`Failed to retrieve leave calendar: ${error}`);
    }
  }
}
