import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQueryParams, HRDashboardStats } from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';

export class EmployeeMediator implements MediatorInterface {
  private auditService: AuditService;
  private eventBus: any;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = eventBus;
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
    const client = await pool.connect();

    try {
      // Build the main query
      let query = `
        SELECT
          e.*,
          d.name as department_name,
          d.code as department_code,
          des.title as designation_title,
          des.code as designation_code,
          rm.first_name as reporting_manager_first_name,
          rm.last_name as reporting_manager_last_name,
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name,
          CONCAT(COALESCE(rm.first_name, ''), ' ', COALESCE(rm.last_name, '')) as reporting_manager_name
        FROM employees as e
        LEFT JOIN departments as d ON e.department_id = d.id
        LEFT JOIN designations as des ON e.designation_id = des.id
        LEFT JOIN employees as rm ON e.reporting_manager_id = rm.id
        WHERE e.is_active = true
      `;

      const values: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (queryParams.factory_id) {
        query += ` AND e.factory_id = $${paramIndex}`;
        values.push(queryParams.factory_id);
        paramIndex++;
      }

      if (queryParams.department_id) {
        query += ` AND e.department_id = $${paramIndex}`;
        values.push(queryParams.department_id);
        paramIndex++;
      }

      if (queryParams.designation_id) {
        query += ` AND e.designation_id = $${paramIndex}`;
        values.push(queryParams.designation_id);
        paramIndex++;
      }

      if (queryParams.employment_type) {
        query += ` AND e.employment_type = $${paramIndex}`;
        values.push(queryParams.employment_type);
        paramIndex++;
      }

      if (queryParams.is_active !== undefined) {
        query += ` AND e.is_active = $${paramIndex}`;
        values.push(queryParams.is_active);
        paramIndex++;
      }

      if (queryParams.search) {
        query += ` AND (
          e.first_name ILIKE $${paramIndex} OR
          e.last_name ILIKE $${paramIndex} OR
          e.employee_id ILIKE $${paramIndex} OR
          e.cnic ILIKE $${paramIndex} OR
          d.name ILIKE $${paramIndex}
        )`;
        values.push(`%${queryParams.search}%`);
        paramIndex++;
      }

      // Apply sorting
      const sortBy = queryParams.sort_by || 'created_at';
      const sortOrder = queryParams.sort_order || 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Apply pagination
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 10;
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      // Execute main query
      const result = await client.query(query, values);
      const employees = result.rows;

      // Get total count (same query without LIMIT/OFFSET)
      const countQuery = query.replace(/ LIMIT \$\d+ OFFSET \$\d+$/, '');
      const countValues = values.slice(0, values.length - 2); // Remove limit and offset values
      const countResult = await client.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].count);

      return {
        employees,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to retrieve employees: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId: number): Promise<Employee> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT
          e.*,
          d.name as department_name,
          d.code as department_code,
          des.title as designation_title,
          des.code as designation_code,
          rm.first_name as reporting_manager_first_name,
          rm.last_name as reporting_manager_last_name,
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name,
          CONCAT(COALESCE(rm.first_name, ''), ' ', COALESCE(rm.last_name, '')) as reporting_manager_name
        FROM employees as e
        LEFT JOIN departments as d ON e.department_id = d.id
        LEFT JOIN designations as des ON e.designation_id = des.id
        LEFT JOIN employees as rm ON e.reporting_manager_id = rm.id
        WHERE e.id = $1 AND e.is_active = true
      `;

      const result = await client.query(query, [employeeId]);

      if (result.rows.length === 0) {
        throw new Error('Employee not found');
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to retrieve employee: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(employeeData: CreateEmployeeRequest, createdBy?: number): Promise<Employee> {
    const client = await pool.connect();

    try {
      // Check if employee_id already exists
      const existingEmployeeQuery = 'SELECT id FROM employees WHERE employee_id = $1';
      const existingEmployeeResult = await client.query(existingEmployeeQuery, [employeeData.employee_id]);

      if (existingEmployeeResult.rows.length > 0) {
        throw new Error('Employee ID already exists');
      }

      // Check if CNIC already exists
      if (employeeData.cnic) {
        const existingCnicQuery = 'SELECT id FROM employees WHERE cnic = $1';
        const existingCnicResult = await client.query(existingCnicQuery, [employeeData.cnic]);

        if (existingCnicResult.rows.length > 0) {
          throw new Error('CNIC already exists');
        }
      }

      const newEmployee = {
        ...employeeData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO employees (${Object.keys(newEmployee).join(', ')})
        VALUES (${Object.keys(newEmployee).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, Object.values(newEmployee));
      const employee = insertResult.rows[0];

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
    } finally {
      client.release();
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(employeeId: number, updateData: UpdateEmployeeRequest, updatedBy?: number): Promise<Employee> {
    const client = await pool.connect();

    try {
      // Get current employee data
      const currentEmployee = await this.getEmployeeById(employeeId);

      // Check if CNIC already exists (if being updated)
      if (updateData.cnic && updateData.cnic !== currentEmployee.cnic) {
        const existingCnicQuery = 'SELECT id FROM employees WHERE cnic = $1 AND id != $2';
        const existingCnicResult = await client.query(existingCnicQuery, [updateData.cnic, employeeId]);

        if (existingCnicResult.rows.length > 0) {
          throw new Error('CNIC already exists');
        }
      }

      const updatedEmployeeData = {
        ...updateData,
        updated_at: new Date()
      };

      const updateFields = Object.keys(updatedEmployeeData);
      const updateValues = Object.values(updatedEmployeeData);

      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const updateQuery = `
        UPDATE employees
        SET ${setClause}
        WHERE id = $${updateValues.length + 1}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [...updateValues, employeeId]);
      const employee = updateResult.rows[0];

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
    } finally {
      client.release();
    }
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(employeeId: number, deletedBy?: number): Promise<void> {
    const client = await pool.connect();

    try {
      const employee = await this.getEmployeeById(employeeId);

      const updateQuery = `
        UPDATE employees
        SET is_active = false, termination_date = $1, updated_at = $2
        WHERE id = $3
      `;

      await client.query(updateQuery, [new Date(), new Date(), employeeId]);

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
    } finally {
      client.release();
    }
  }

  /**
   * Get employee dashboard statistics
   */
  async getEmployeeDashboard(factoryId?: number): Promise<HRDashboardStats> {
    const client = await pool.connect();

    try {
      // Total employees count
      let totalQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = true';
      const totalValues: any[] = [];

      if (factoryId) {
        totalQuery += ' AND factory_id = $1';
        totalValues.push(factoryId);
      }

      const totalResult = await client.query(totalQuery, totalValues);
      const activeEmployees = parseInt(totalResult.rows[0].count);

      // Employees on leave
      const leaveQuery = `
        SELECT COUNT(*) as count FROM leave_applications la
        JOIN employees e ON la.employee_id = e.id
        WHERE la.status = 'approved'
        AND la.start_date <= $1
        AND la.end_date >= $1
        AND e.is_active = true
        ${factoryId ? 'AND e.factory_id = $2' : ''}
      `;

      const leaveValues = factoryId ? [new Date(), factoryId] : [new Date()];
      const leaveResult = await client.query(leaveQuery, leaveValues);

      // Pending leave applications
      const pendingQuery = `
        SELECT COUNT(*) as count FROM leave_applications la
        JOIN employees e ON la.employee_id = e.id
        WHERE la.status = 'pending'
        AND e.is_active = true
        ${factoryId ? 'AND e.factory_id = $1' : ''}
      `;

      const pendingResult = await client.query(pendingQuery, factoryId ? [factoryId] : []);

      // Upcoming payroll runs
      const payrollQuery = `
        SELECT COUNT(*) as count FROM payroll_runs pr
        JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
        WHERE pr.status = 'draft'
        AND pp.start_date >= $1
      `;

      const payrollResult = await client.query(payrollQuery, [new Date()]);

      // Department breakdown
      const deptQuery = `
        SELECT d.name as department, COUNT(*) as count
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE e.is_active = true
        AND e.department_id IS NOT NULL
        ${factoryId ? 'AND e.factory_id = $1' : ''}
        GROUP BY d.name
        ORDER BY count DESC
      `;

      const deptResult = await client.query(deptQuery, factoryId ? [factoryId] : []);

      // Recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentHiresQuery = `
        SELECT * FROM employees
        WHERE is_active = true
        AND join_date >= $1
        ORDER BY join_date DESC
        LIMIT 5
      `;
      const recentHiresResult = await client.query(recentHiresQuery, [thirtyDaysAgo]);
      const recentHires = recentHiresResult.rows;

      // Upcoming birthdays (next 30 days)
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const birthdayQuery = `
        SELECT * FROM employees
        WHERE is_active = true
        AND date_of_birth IS NOT NULL
        AND (
          (EXTRACT(month FROM date_of_birth) = $1 AND EXTRACT(day FROM date_of_birth) >= $2)
          OR (EXTRACT(month FROM date_of_birth) = $3 AND EXTRACT(day FROM date_of_birth) <= $4)
        )
        ORDER BY EXTRACT(month FROM date_of_birth), EXTRACT(day FROM date_of_birth)
        LIMIT 5
      `;
      const birthdayResult = await client.query(birthdayQuery, [
        today.getMonth() + 1,
        today.getDate(),
        thirtyDaysFromNow.getMonth() + 1,
        thirtyDaysFromNow.getDate()
      ]);
      const upcomingBirthdays = birthdayResult.rows;

      // Leave balance warnings (employees with less than 5 days remaining)
      const leaveBalanceQuery = `
        SELECT
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as employee,
          lt.name as leave_type,
          lb.remaining_days
        FROM leave_balances lb
        JOIN employees e ON lb.employee_id = e.id
        JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.remaining_days < 5
        AND lb.remaining_days > 0
        AND e.is_active = true
        LIMIT 10
      `;
      const leaveBalanceResult = await client.query(leaveBalanceQuery);
      const leaveBalanceWarnings = leaveBalanceResult.rows;

      return {
        total_employees: activeEmployees,
        active_employees: activeEmployees,
        employees_on_leave: parseInt(leaveResult.rows[0].count),
        pending_leave_applications: parseInt(pendingResult.rows[0].count),
        upcoming_payroll_runs: parseInt(payrollResult.rows[0].count),
        department_breakdown: deptResult.rows.map(item => ({
          department: item.department,
          count: parseInt(item.count)
        })),
        recent_hires: recentHires,
        upcoming_birthdays: upcomingBirthdays,
        leave_balance_warnings: leaveBalanceWarnings
      };
    } catch (error) {
      throw new Error(`Failed to retrieve employee dashboard: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(departmentId: number): Promise<Employee[]> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT * FROM employees
        WHERE department_id = $1
        AND is_active = true
        ORDER BY first_name
      `;

      const result = await client.query(query, [departmentId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to retrieve employees by department: ${error}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get employees by designation
   */
  async getEmployeesByDesignation(designationId: number): Promise<Employee[]> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT * FROM employees
        WHERE designation_id = $1
        AND is_active = true
        ORDER BY first_name
      `;

      const result = await client.query(query, [designationId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to retrieve employees by designation: ${error}`);
    } finally {
      client.release();
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
    const client = await pool.connect();

    try {
      const query = `
        SELECT
          id,
          employee_id,
          CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as full_name,
          designation_id,
          department_id
        FROM employees
        WHERE is_active = true
        AND (
          first_name ILIKE $1 OR
          last_name ILIKE $1 OR
          employee_id ILIKE $1 OR
          cnic ILIKE $1
        )
        LIMIT $2
      `;

      const result = await client.query(query, [`%${searchTerm}%`, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to search employees: ${error}`);
    } finally {
      client.release();
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
    const client = await pool.connect();

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      await client.query('BEGIN');

      for (let i = 0; i < employeesData.length; i++) {
        const employeeData = employeesData[i];

        try {
          const newEmployee = {
            ...employeeData,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          };

          const insertQuery = `
            INSERT INTO employees (${Object.keys(newEmployee).join(', ')})
            VALUES (${Object.keys(newEmployee).map((_, i) => `$${i + 1}`).join(', ')})
            RETURNING *
          `;

          const insertResult = await client.query(insertQuery, Object.values(newEmployee));
          const employee = insertResult.rows[0];

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

      await client.query('COMMIT');
      return { successful, failed, errors };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Bulk import failed: ${error}`);
    } finally {
      client.release();
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
