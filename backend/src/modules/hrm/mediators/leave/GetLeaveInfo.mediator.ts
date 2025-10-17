import { LeaveType, LeaveBalance, LeaveApplication } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

export class GetLeaveInfoMediator {
  /**
   * Get all leave types
   */
  static async getLeaveTypes(): Promise<LeaveType[]> {
    const action = "GetLeaveInfoMediator.getLeaveTypes";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const query = `
        SELECT * FROM leave_types
        WHERE is_active = true
        ORDER BY name
      `;

      const result = await client.query(query);
      const leaveTypes = result.rows;

      MyLogger.success(action, {
        leaveTypesCount: leaveTypes.length
      });

      return leaveTypes;
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
  static async getLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
    const action = "GetLeaveInfoMediator.getLeaveBalances";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, year });

      const targetYear = year || new Date().getFullYear();

      // Get all active leave types
      const leaveTypesQuery = 'SELECT * FROM leave_types WHERE is_active = true ORDER BY name';
      const leaveTypesResult = await client.query(leaveTypesQuery);
      const leaveTypes = leaveTypesResult.rows;

      const balances: LeaveBalance[] = [];

      for (const leaveType of leaveTypes) {
        // Get used leave days for the year
        const usedQuery = `
          SELECT COALESCE(SUM(leave_days), 0) as used_days
          FROM leave_applications
          WHERE employee_id = $1
          AND leave_type_id = $2
          AND status = 'approved'
          AND EXTRACT(YEAR FROM start_date) = $3
        `;

        const usedResult = await client.query(usedQuery, [employeeId, leaveType.id, targetYear]);
        const usedDays = parseFloat(usedResult.rows[0]?.used_days || '0');

        const balance: LeaveBalance = {
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          leave_type_name: leaveType.name,
          leave_type_code: leaveType.code,
          allocated_days: leaveType.days_per_year,
          used_days: usedDays,
          available_days: leaveType.days_per_year - usedDays,
          year: targetYear
        };

        balances.push(balance);
      }

      MyLogger.success(action, {
        employeeId,
        year: targetYear,
        balancesCount: balances.length
      });

      return balances;
    } catch (error) {
      MyLogger.error(action, error, { employeeId, year });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get leave applications with optional filtering
   */
  static async getLeaveApplications(filters?: {
    employee_id?: number;
    leave_type_id?: number;
    status?: string;
    start_date_from?: string;
    start_date_to?: string;
    end_date_from?: string;
    end_date_to?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{
    applications: LeaveApplication[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "GetLeaveInfoMediator.getLeaveApplications";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters });

      let query = `
        SELECT
          la.*,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          e.first_name,
          e.last_name,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN employees e ON la.employee_id = e.id
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.employee_id) {
        query += ` AND la.employee_id = $${paramIndex}`;
        values.push(filters.employee_id);
        paramIndex++;
      }

      if (filters?.leave_type_id) {
        query += ` AND la.leave_type_id = $${paramIndex}`;
        values.push(filters.leave_type_id);
        paramIndex++;
      }

      if (filters?.status) {
        query += ` AND la.status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }

      if (filters?.start_date_from) {
        query += ` AND la.start_date >= $${paramIndex}`;
        values.push(filters.start_date_from);
        paramIndex++;
      }

      if (filters?.start_date_to) {
        query += ` AND la.start_date <= $${paramIndex}`;
        values.push(filters.start_date_to);
        paramIndex++;
      }

      if (filters?.end_date_from) {
        query += ` AND la.end_date >= $${paramIndex}`;
        values.push(filters.end_date_from);
        paramIndex++;
      }

      if (filters?.end_date_to) {
        query += ` AND la.end_date <= $${paramIndex}`;
        values.push(filters.end_date_to);
        paramIndex++;
      }

      // Apply sorting
      const sortBy = filters?.sort_by || 'la.created_at';
      const sortOrder = filters?.sort_order || 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Apply pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      // Execute main query
      const applicationsResult = await client.query(query, values);
      const applications = applicationsResult.rows;

      // Get total count (same query without LIMIT/OFFSET)
      const countQuery = query.replace(/ LIMIT \$\d+ OFFSET \$\d+$/, '');
      const countValues = values.slice(0, values.length - 2); // Remove limit and offset values
      const countResult = await client.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0]?.count || '0');

      const result = {
        applications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        applicationsCount: result.applications.length,
        filters
      });

      return result;
    } catch (error) {
      MyLogger.error(action, error, { filters });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get leave dashboard statistics
   */
  static async getLeaveDashboard(): Promise<{
    totalApplications: number;
    pendingApprovals: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
    leaveTypeStats: any[];
    recentApplications: LeaveApplication[];
  }> {
    const action = "GetLeaveInfoMediator.getLeaveDashboard";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Get total applications
      const totalQuery = 'SELECT COUNT(*) as count FROM leave_applications';
      const totalResult = await client.query(totalQuery);
      const totalApplications = parseInt(totalResult.rows[0].count);

      // Get pending approvals
      const pendingQuery = "SELECT COUNT(*) as count FROM leave_applications WHERE status = 'submitted'";
      const pendingResult = await client.query(pendingQuery);
      const pendingApprovals = parseInt(pendingResult.rows[0].count);

      // Get approved this month
      const approvedQuery = `
        SELECT COUNT(*) as count FROM leave_applications
        WHERE status = 'approved' AND EXTRACT(MONTH FROM approved_at) = $1 AND EXTRACT(YEAR FROM approved_at) = $2
      `;
      const approvedResult = await client.query(approvedQuery, [currentMonth, currentYear]);
      const approvedThisMonth = parseInt(approvedResult.rows[0].count);

      // Get rejected this month
      const rejectedQuery = `
        SELECT COUNT(*) as count FROM leave_applications
        WHERE status = 'rejected' AND EXTRACT(MONTH FROM updated_at) = $1 AND EXTRACT(YEAR FROM updated_at) = $2
      `;
      const rejectedResult = await client.query(rejectedQuery, [currentMonth, currentYear]);
      const rejectedThisMonth = parseInt(rejectedResult.rows[0].count);

      // Get leave type statistics
      const typeStatsQuery = `
        SELECT
          lt.name,
          lt.code,
          COUNT(la.id) as applications_count,
          SUM(la.leave_days) as total_days
        FROM leave_types lt
        LEFT JOIN leave_applications la ON lt.id = la.leave_type_id
        GROUP BY lt.id, lt.name, lt.code
        ORDER BY applications_count DESC
      `;

      const typeStatsResult = await client.query(typeStatsQuery);
      const leaveTypeStats = typeStatsResult.rows;

      // Get recent applications
      const recentQuery = `
        SELECT
          la.*,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          e.first_name,
          e.last_name,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN employees e ON la.employee_id = e.id
        ORDER BY la.created_at DESC
        LIMIT 10
      `;

      const recentResult = await client.query(recentQuery);
      const recentApplications = recentResult.rows;

      const dashboard = {
        totalApplications,
        pendingApprovals,
        approvedThisMonth,
        rejectedThisMonth,
        leaveTypeStats,
        recentApplications
      };

      MyLogger.success(action, {
        totalApplications,
        pendingApprovals,
        approvedThisMonth,
        rejectedThisMonth,
        leaveTypesCount: leaveTypeStats.length
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
   * Get leave calendar for a specific month
   */
  static async getLeaveCalendar(year: number, month: number): Promise<{
    year: number;
    month: number;
    days: any[];
  }> {
    const action = "GetLeaveInfoMediator.getLeaveCalendar";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { year, month });

      // Get all approved leave applications for the month
      const query = `
        SELECT
          la.*,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          e.first_name,
          e.last_name,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN employees e ON la.employee_id = e.id
        WHERE la.status = 'approved'
        AND EXTRACT(YEAR FROM la.start_date) = $1
        AND EXTRACT(MONTH FROM la.start_date) = $2
        ORDER BY la.start_date
      `;

      const result = await client.query(query, [year, month]);
      const applications = result.rows;

      // Group applications by date
      const calendarDays: any[] = [];
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month - 1, day);
        const dayApplications = applications.filter(app =>
          new Date(app.start_date) <= date && new Date(app.end_date) >= date
        );

        calendarDays.push({
          date: date.toISOString().split('T')[0],
          day: day,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          applications: dayApplications.map(app => ({
            id: app.id,
            employee_name: app.employee_name,
            leave_type_name: app.leave_type_name,
            leave_days: app.leave_days,
            application_type: app.application_type
          }))
        });
      }

      const calendar = {
        year,
        month,
        days: calendarDays
      };

      MyLogger.success(action, {
        year,
        month,
        totalDays: calendarDays.length,
        applicationsCount: applications.length
      });

      return calendar;
    } catch (error) {
      MyLogger.error(action, error, { year, month });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get leave application by ID
   */
  static async getLeaveApplicationById(applicationId: number): Promise<LeaveApplication> {
    const action = "GetLeaveInfoMediator.getLeaveApplicationById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { applicationId });

      const query = `
        SELECT
          la.*,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          e.first_name,
          e.last_name,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN employees e ON la.employee_id = e.id
        WHERE la.id = $1
      `;

      const result = await client.query(query, [applicationId]);

      if (result.rows.length === 0) {
        throw new Error('Leave application not found');
      }

      const application = result.rows[0];

      MyLogger.success(action, {
        applicationId,
        employeeId: application.employee_id,
        status: application.status
      });

      return application;
    } catch (error) {
      MyLogger.error(action, error, { applicationId });
      throw error;
    } finally {
      client.release();
    }
  }
}
