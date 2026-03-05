import { Employee, CreateEmployeeRequest } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import { AuthMediator } from '@/mediators/auth/AuthMediator';

export class AddEmployeeMediator {

  /**
   * Helper to convert empty strings to null for database compatibility
   */
  private static toNullIfEmpty(value: any): any {
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }
    return value;
  }

  /**
   * Create a new employee
   */
  static async createEmployee(employeeData: CreateEmployeeRequest, createdBy?: number): Promise<Employee> {
    const action = "AddEmployeeMediator.createEmployee";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeData: { ...employeeData, password: '[HIDDEN]' }, createdBy });

      await client.query('BEGIN');

      // Generate employee ID if not provided
      const employeeId = employeeData.employee_id || await this.generateEmployeeId();

      // Create user account first if employee doesn't already have a user_id
      let newUser = null;
      if (!employeeData.user_id && employeeData.create_user_account !== false) {
        try {
          const employeeRoleId = employeeData.role_id;

          if (!employeeRoleId) {
            throw new Error('Role ID is required to create a user account for the employee.');
          }

          // Use form data for username, email, and password if provided, otherwise use defaults
          const username = employeeData.username || employeeId.toLowerCase();
          const email = employeeData.email || `${employeeId.toLowerCase()}@company.com`;
          const password = employeeData.password || `TempPass${Date.now()}${Math.floor(Math.random() * 10000)}`;

          // Create user data using form data where available
          const userData = {
            username: username,
            email: email,
            full_name: `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim(),
            mobile_number: employeeData.phone || undefined,
            departments: [], // Empty departments array for now
            role_id: employeeRoleId, // Use the actual Employee role ID
            password: password
          };

          // Create the user account using AuthMediator (which handles its own transaction internally)
          newUser = await AuthMediator.createUser(userData);

          MyLogger.info('User account created for new employee', {
            employee_id: employeeId,
            user_id: newUser.id,
            username: newUser.username,
            email: newUser.email
          });

        } catch (error) {
          MyLogger.error('Failed to create user account for new employee, rolling back employee creation', {
            employee_id: employeeId,
            error: error
          });
          throw error; // Re-throw to trigger transaction rollback
        }
      }

      // Insert employee with the user_id (either provided or newly created)
      const userId = employeeData.user_id || newUser?.id;
      const insertQuery = `
        INSERT INTO employees (
          employee_id, factory_id, user_id, first_name, last_name, date_of_birth,
          gender, marital_status, nationality, address, city, state, postal_code,
          country, phone, emergency_contact_name, emergency_contact_phone,
          emergency_contact_relationship, blood_group, cnic, passport_number,
          tax_id, designation_id, reporting_manager_id, department_id,
          employment_type, join_date, confirmation_date, termination_date,
          probation_period_months, notice_period_days, work_location, shift_type,
          bank_account_number, bank_name, skill_level, availability_status,
          hourly_rate, department, current_work_order_id, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
        ) RETURNING *
      `;

      const values = [
        employeeId, employeeData.factory_id, userId,
        employeeData.first_name, employeeData.last_name, this.toNullIfEmpty(employeeData.date_of_birth),
        employeeData.gender, employeeData.marital_status, employeeData.nationality,
        employeeData.address, employeeData.city, employeeData.state, employeeData.postal_code,
        employeeData.country, employeeData.phone, employeeData.emergency_contact_name,
        employeeData.emergency_contact_phone, employeeData.emergency_contact_relationship,
        employeeData.blood_group, employeeData.cnic, employeeData.passport_number,
        employeeData.tax_id, employeeData.designation_id, employeeData.reporting_manager_id,
        employeeData.department_id, employeeData.employment_type, this.toNullIfEmpty(employeeData.join_date),
        this.toNullIfEmpty(employeeData.confirmation_date), this.toNullIfEmpty(employeeData.termination_date),
        employeeData.probation_period_months, employeeData.notice_period_days,
        employeeData.work_location, employeeData.shift_type, employeeData.bank_account_number,
        employeeData.bank_name, employeeData.skill_level, employeeData.availability_status,
        employeeData.hourly_rate, employeeData.department, employeeData.current_work_order_id, true
      ];

      const result = await client.query(insertQuery, values);
      const newEmployee = result.rows[0];

      // Publish event
      eventBus.emit('employee.created', {
        employeeId: newEmployee.id,
        employeeData: newEmployee,
        createdBy
      });

      await client.query('COMMIT');

      MyLogger.success(action, { employeeId: newEmployee.id, createdBy });

      // Fetch complete employee data with relations
      return await this.getEmployeeById(newEmployee.id);

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { employeeData, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk import employees
   */
  static async bulkImportEmployees(employeesData: CreateEmployeeRequest[], createdBy?: number  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ index: number; data: CreateEmployeeRequest; error: string }>;
    employees: Employee[];
  }> {
    const action = "AddEmployeeMediator.bulkImportEmployees";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { count: employeesData.length, createdBy });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as any[],
        employees: [] as Employee[]
      };

      await client.query('BEGIN');

      for (let i = 0; i < employeesData.length; i++) {
        const employeeData = employeesData[i];

        try {
          const employee = await this.createEmployee(employeeData, createdBy);
          results.employees.push(employee);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            index: i,
            data: employeeData,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      await client.query('COMMIT');

      MyLogger.success(action, {
        total: employeesData.length,
        success: results.success,
        failed: results.failed,
        createdBy
      });

      return results;

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { count: employeesData.length, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique employee ID
   */
  private static async generateEmployeeId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `EMP${timestamp}${random}`;
  }

  /**
   * Get employee by ID (helper method)
   */
  private static async getEmployeeById(employeeId: number): Promise<Employee> {
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
      WHERE e.id = $1
    `;

    const result = await pool.query(query, [employeeId]);

    if (result.rows.length === 0) {
      throw new Error('Employee not found');
    }

    return this.mapToEmployee(result.rows[0]);
  }

  /**
   * Map database row to Employee object with nested relations
   */
  private static mapToEmployee(row: any): Employee {
    if (!row) return row;

    const employee: Employee = { ...row };

    // Set department object
    if (row.department_id) {
      employee.department = {
        id: row.department_id,
        name: row.department_name,
        code: row.department_code,
        is_active: true,
        created_at: '',
        updated_at: ''
      };
    }

    // Set designation object
    if (row.designation_id) {
      employee.designation = {
        id: row.designation_id,
        title: row.designation_title,
        code: row.designation_code,
        is_active: true,
        created_at: '',
        updated_at: ''
      };
    }

    // Set reporting manager object
    if (row.reporting_manager_id) {
      employee.reporting_manager = {
        id: row.reporting_manager_id,
        first_name: row.reporting_manager_first_name,
        last_name: row.reporting_manager_last_name,
        full_name: row.reporting_manager_name,
        employee_id: '',
        employment_type: 'permanent',
        probation_period_months: 6,
        notice_period_days: 30,
        shift_type: 'day',
        skill_level: 'intermediate',
        availability_status: 'available',
        is_active: true,
        created_at: '',
        updated_at: ''
      } as Employee;
    }

    return employee;
  }

}
