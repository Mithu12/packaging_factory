import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQueryParams, HRDashboardStats } from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import { databaseConnection } from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { EventBus } from '../../../../utils/eventBus';

export class EmployeeMediator implements MediatorInterface {
  private auditService: AuditService;
  private eventBus: EventBus;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = EventBus.getInstance();
  }

  async process(data: any): Promise<any> {
    // This method can be used for processing employee-related events
    return data;
  }

  /**
   * Get all employees with filtering and pagination
   */
  async getEmployees(queryParams: EmployeeQueryParams): Promise<{
    employees: Employee[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { db } = await databaseConnection();

    try {
      let query = db('employees as e')
        .select(
          'e.*',
          'd.name as department_name',
          'd.code as department_code',
          'des.title as designation_title',
          'des.code as designation_code',
          'rm.first_name as reporting_manager_first_name',
          'rm.last_name as reporting_manager_last_name',
          db.raw(`
            CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name,
            CONCAT(COALESCE(rm.first_name, ''), ' ', COALESCE(rm.last_name, '')) as reporting_manager_name
          `)
        )
        .leftJoin('departments as d', 'e.department_id', 'd.id')
        .leftJoin('designations as des', 'e.designation_id', 'des.id')
        .leftJoin('employees as rm', 'e.reporting_manager_id', 'rm.id')
        .where('e.is_active', true);

      // Apply filters
      if (queryParams.factory_id) {
        query = query.where('e.factory_id', queryParams.factory_id);
      }

      if (queryParams.department_id) {
        query = query.where('e.department_id', queryParams.department_id);
      }

      if (queryParams.designation_id) {
        query = query.where('e.designation_id', queryParams.designation_id);
      }

      if (queryParams.employment_type) {
        query = query.where('e.employment_type', queryParams.employment_type);
      }

      if (queryParams.is_active !== undefined) {
        query = query.where('e.is_active', queryParams.is_active);
      }

      if (queryParams.search) {
        query = query.where(function() {
          this.where('e.first_name', 'ilike', `%${queryParams.search}%`)
            .orWhere('e.last_name', 'ilike', `%${queryParams.search}%`)
            .orWhere('e.employee_id', 'ilike', `%${queryParams.search}%`)
            .orWhere('e.cnic', 'ilike', `%${queryParams.search}%`)
            .orWhere('d.name', 'ilike', `%${queryParams.search}%`);
        });
      }

      // Apply sorting
      const sortBy = queryParams.sort_by || 'created_at';
      const sortOrder = queryParams.sort_order || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Apply pagination
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const totalQuery = db('employees as e')
        .count('* as count')
        .leftJoin('departments as d', 'e.department_id', 'd.id')
        .where('e.is_active', true);

      // Apply same filters for count
      if (queryParams.factory_id) totalQuery.where('e.factory_id', queryParams.factory_id);
      if (queryParams.department_id) totalQuery.where('e.department_id', queryParams.department_id);
      if (queryParams.designation_id) totalQuery.where('e.designation_id', queryParams.designation_id);
      if (queryParams.employment_type) totalQuery.where('e.employment_type', queryParams.employment_type);
      if (queryParams.is_active !== undefined) totalQuery.where('e.is_active', queryParams.is_active);

      if (queryParams.search) {
        totalQuery.where(function() {
          this.where('e.first_name', 'ilike', `%${queryParams.search}%`)
            .orWhere('e.last_name', 'ilike', `%${queryParams.search}%`)
            .orWhere('e.employee_id', 'ilike', `%${queryParams.search}%`)
            .orWhere('e.cnic', 'ilike', `%${queryParams.search}%`)
            .orWhere('d.name', 'ilike', `%${queryParams.search}%`);
        });
      }

      const [{ count }] = await totalQuery;
      const total = parseInt(count as string);

      // Get paginated results
      const employees = await query.limit(limit).offset(offset);

      return {
        employees,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to retrieve employees: ${error}`);
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId: number): Promise<Employee> {
    const { db } = await databaseConnection();

    try {
      const employee = await db('employees as e')
        .select(
          'e.*',
          'd.name as department_name',
          'd.code as department_code',
          'des.title as designation_title',
          'des.code as designation_code',
          'rm.first_name as reporting_manager_first_name',
          'rm.last_name as reporting_manager_last_name',
          db.raw(`
            CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name,
            CONCAT(COALESCE(rm.first_name, ''), ' ', COALESCE(rm.last_name, '')) as reporting_manager_name
          `)
        )
        .leftJoin('departments as d', 'e.department_id', 'd.id')
        .leftJoin('designations as des', 'e.designation_id', 'des.id')
        .leftJoin('employees as rm', 'e.reporting_manager_id', 'rm.id')
        .where('e.id', employeeId)
        .where('e.is_active', true)
        .first();

      if (!employee) {
        throw new Error('Employee not found');
      }

      return employee;
    } catch (error) {
      throw new Error(`Failed to retrieve employee: ${error}`);
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(employeeData: CreateEmployeeRequest, createdBy?: number): Promise<Employee> {
    const { db } = await databaseConnection();

    try {
      // Check if employee_id already exists
      const existingEmployee = await db('employees')
        .where('employee_id', employeeData.employee_id)
        .first();

      if (existingEmployee) {
        throw new Error('Employee ID already exists');
      }

      // Check if CNIC already exists
      if (employeeData.cnic) {
        const existingCnic = await db('employees')
          .where('cnic', employeeData.cnic)
          .first();

        if (existingCnic) {
          throw new Error('CNIC already exists');
        }
      }

      const newEmployee = {
        ...employeeData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [employee] = await db('employees')
        .insert(newEmployee)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: createdBy,
        action: 'CREATE',
        table_name: 'employees',
        record_id: employee.id,
        old_values: null,
        new_values: employee,
        description: `Employee ${employee.first_name} ${employee.last_name} created`
      });

      // Emit event
      this.eventBus.emit('employee.created', { employee, createdBy });

      return employee;
    } catch (error) {
      throw new Error(`Failed to create employee: ${error}`);
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(employeeId: number, updateData: UpdateEmployeeRequest, updatedBy?: number): Promise<Employee> {
    const { db } = await databaseConnection();

    try {
      // Get current employee data
      const currentEmployee = await this.getEmployeeById(employeeId);

      // Check if CNIC already exists (if being updated)
      if (updateData.cnic && updateData.cnic !== currentEmployee.cnic) {
        const existingCnic = await db('employees')
          .where('cnic', updateData.cnic)
          .whereNot('id', employeeId)
          .first();

        if (existingCnic) {
          throw new Error('CNIC already exists');
        }
      }

      const updatedEmployeeData = {
        ...updateData,
        updated_at: new Date()
      };

      const [employee] = await db('employees')
        .where('id', employeeId)
        .update(updatedEmployeeData)
        .returning('*');

      // Audit log
      await this.auditService.log({
        user_id: updatedBy,
        action: 'UPDATE',
        table_name: 'employees',
        record_id: employee.id,
        old_values: currentEmployee,
        new_values: employee,
        description: `Employee ${employee.first_name} ${employee.last_name} updated`
      });

      // Emit event
      this.eventBus.emit('employee.updated', { employee, updatedBy });

      return employee;
    } catch (error) {
      throw new Error(`Failed to update employee: ${error}`);
    }
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(employeeId: number, deletedBy?: number): Promise<void> {
    const { db } = await databaseConnection();

    try {
      const employee = await this.getEmployeeById(employeeId);

      await db('employees')
        .where('id', employeeId)
        .update({
          is_active: false,
          termination_date: new Date(),
          updated_at: new Date()
        });

      // Audit log
      await this.auditService.log({
        user_id: deletedBy,
        action: 'DELETE',
        table_name: 'employees',
        record_id: employeeId,
        old_values: employee,
        new_values: { is_active: false },
        description: `Employee ${employee.first_name} ${employee.last_name} deleted`
      });

      // Emit event
      this.eventBus.emit('employee.deleted', { employee, deletedBy });
    } catch (error) {
      throw new Error(`Failed to delete employee: ${error}`);
    }
  }

  /**
   * Get employee dashboard statistics
   */
  async getEmployeeDashboard(factoryId?: number): Promise<HRDashboardStats> {
    const { db } = await databaseConnection();

    try {
      // Total employees count
      let totalQuery = db('employees').where('is_active', true);
      if (factoryId) totalQuery = totalQuery.where('factory_id', factoryId);

      const totalEmployees = await totalQuery.clone().count('* as count').first();
      const activeEmployees = parseInt(totalEmployees?.count as string) || 0;

      // Employees on leave
      const employeesOnLeave = await db('leave_applications as la')
        .join('employees as e', 'la.employee_id', 'e.id')
        .where('la.status', 'approved')
        .where('la.start_date', '<=', new Date())
        .where('la.end_date', '>=', new Date())
        .where('e.is_active', true)
        .count('* as count')
        .first();

      // Pending leave applications
      const pendingLeaves = await db('leave_applications as la')
        .join('employees as e', 'la.employee_id', 'e.id')
        .where('la.status', 'pending')
        .where('e.is_active', true)
        .count('* as count')
        .first();

      // Upcoming payroll runs
      const upcomingPayroll = await db('payroll_runs as pr')
        .join('payroll_periods as pp', 'pr.payroll_period_id', 'pp.id')
        .where('pr.status', 'draft')
        .where('pp.start_date', '>=', new Date())
        .count('* as count')
        .first();

      // Department breakdown
      const departmentBreakdown = await db('employees as e')
        .join('departments as d', 'e.department_id', 'd.id')
        .select('d.name as department')
        .count('* as count')
        .where('e.is_active', true)
        .whereNotNull('e.department_id')
        .groupBy('d.name')
        .orderBy('count', 'desc');

      // Recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentHires = await db('employees')
        .where('is_active', true)
        .where('join_date', '>=', thirtyDaysAgo)
        .orderBy('join_date', 'desc')
        .limit(5);

      // Upcoming birthdays (next 30 days)
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const upcomingBirthdays = await db('employees')
        .where('is_active', true)
        .whereNotNull('date_of_birth')
        .whereRaw(`
          EXTRACT(month FROM date_of_birth) = ? AND EXTRACT(day FROM date_of_birth) >= ?
          OR EXTRACT(month FROM date_of_birth) = ? AND EXTRACT(day FROM date_of_birth) <= ?
        `, [today.getMonth() + 1, today.getDate(), thirtyDaysFromNow.getMonth() + 1, thirtyDaysFromNow.getDate()])
        .orderByRaw(`EXTRACT(month FROM date_of_birth), EXTRACT(day FROM date_of_birth)`)
        .limit(5);

      // Leave balance warnings (employees with less than 5 days remaining)
      const leaveBalanceWarnings = await db('leave_balances as lb')
        .join('employees as e', 'lb.employee_id', 'e.id')
        .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
        .select(
          db.raw(`CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as employee`),
          'lt.name as leave_type',
          'lb.remaining_days'
        )
        .where('lb.remaining_days', '<', 5)
        .where('lb.remaining_days', '>', 0)
        .where('e.is_active', true)
        .limit(10);

      return {
        total_employees: activeEmployees,
        active_employees: activeEmployees,
        employees_on_leave: parseInt(employeesOnLeave?.count as string) || 0,
        pending_leave_applications: parseInt(pendingLeaves?.count as string) || 0,
        upcoming_payroll_runs: parseInt(upcomingPayroll?.count as string) || 0,
        department_breakdown: departmentBreakdown.map(item => ({
          department: item.department,
          count: parseInt(item.count as string)
        })),
        recent_hires: recentHires,
        upcoming_birthdays: upcomingBirthdays,
        leave_balance_warnings: leaveBalanceWarnings
      };
    } catch (error) {
      throw new Error(`Failed to retrieve employee dashboard: ${error}`);
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(departmentId: number): Promise<Employee[]> {
    const { db } = await databaseConnection();

    try {
      const employees = await db('employees')
        .where('department_id', departmentId)
        .where('is_active', true)
        .orderBy('first_name');

      return employees;
    } catch (error) {
      throw new Error(`Failed to retrieve employees by department: ${error}`);
    }
  }

  /**
   * Get employees by designation
   */
  async getEmployeesByDesignation(designationId: number): Promise<Employee[]> {
    const { db } = await databaseConnection();

    try {
      const employees = await db('employees')
        .where('designation_id', designationId)
        .where('is_active', true)
        .orderBy('first_name');

      return employees;
    } catch (error) {
      throw new Error(`Failed to retrieve employees by designation: ${error}`);
    }
  }

  /**
   * Get employee hierarchy (reporting structure)
   */
  async getEmployeeHierarchy(employeeId?: number): Promise<any> {
    // This would implement a hierarchical query to get the reporting structure
    // For now, returning a placeholder structure
    return {
      root: employeeId,
      hierarchy: []
    };
  }

  /**
   * Search employees
   */
  async searchEmployees(searchTerm: string, limit: number = 10): Promise<Employee[]> {
    const { db } = await databaseConnection();

    try {
      const employees = await db('employees')
        .select(
          'id',
          'employee_id',
          db.raw(`CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as full_name`),
          'designation_id',
          'department_id'
        )
        .where(function() {
          this.where('first_name', 'ilike', `%${searchTerm}%`)
            .orWhere('last_name', 'ilike', `%${searchTerm}%`)
            .orWhere('employee_id', 'ilike', `%${searchTerm}%`)
            .orWhere('cnic', 'ilike', `%${searchTerm}%`);
        })
        .where('is_active', true)
        .limit(limit);

      return employees;
    } catch (error) {
      throw new Error(`Failed to search employees: ${error}`);
    }
  }

  /**
   * Bulk import employees
   */
  async bulkImportEmployees(employeesData: CreateEmployeeRequest[], createdBy?: number): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const { db } = await databaseConnection();

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      await db.transaction(async (trx) => {
        for (let i = 0; i < employeesData.length; i++) {
          const employeeData = employeesData[i];

          try {
            const newEmployee = {
              ...employeeData,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            };

            const [employee] = await trx('employees')
              .insert(newEmployee)
              .returning('*');

            // Audit log
            await this.auditService.log({
              user_id: createdBy,
              action: 'CREATE',
              table_name: 'employees',
              record_id: employee.id,
              old_values: null,
              new_values: employee,
              description: `Employee ${employee.first_name} ${employee.last_name} created via bulk import`
            });

            successful++;
          } catch (error) {
            failed++;
            errors.push(`Row ${i + 1}: ${error}`);
          }
        }
      });

      return { successful, failed, errors };
    } catch (error) {
      throw new Error(`Bulk import failed: ${error}`);
    }
  }

  /**
   * Export employees data
   */
  async exportEmployees(queryParams: EmployeeQueryParams, format: string): Promise<Buffer> {
    // This would implement export functionality
    // For now, returning a placeholder
    return Buffer.from('Export functionality to be implemented');
  }

  /**
   * Get employee documents
   */
  async getEmployeeDocuments(employeeId: number): Promise<any[]> {
    // This would retrieve employee documents
    return [];
  }

  /**
   * Upload employee document
   */
  async uploadEmployeeDocument(employeeId: number, file: any, documentType: string, uploadedBy?: number): Promise<any> {
    // This would handle document upload
    return { id: 1, employee_id: employeeId, document_type: documentType };
  }

  /**
   * Get employee salary history
   */
  async getEmployeeSalaryHistory(employeeId: number): Promise<any[]> {
    // This would retrieve salary history
    return [];
  }

  /**
   * Update employee salary
   */
  async updateEmployeeSalary(employeeId: number, newSalary: number, effectiveDate: string, reason: string, updatedBy?: number): Promise<any> {
    // This would update employee salary
    return { employee_id: employeeId, new_salary: newSalary, effective_date: effectiveDate };
  }
}
