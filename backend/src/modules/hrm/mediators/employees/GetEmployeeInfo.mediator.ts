import { Employee, EmployeeQueryParams, HRDashboardStats } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

export class GetEmployeeInfoMediator {
  /**
   * Get all employees with filtering and pagination
   */
  static async getEmployees(queryParams: EmployeeQueryParams): Promise<{
    employees: Employee[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "GetEmployeeInfoMediator.getEmployees";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { queryParams });

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
        WHERE 1=1
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
      const employeesResult = await client.query(query, values);
      const employees = employeesResult.rows;

      // Get total count - construct count query from the original query parts
      let countQuery = `
        SELECT COUNT(*) as count
        FROM employees as e
        LEFT JOIN departments as d ON e.department_id = d.id
        LEFT JOIN designations as des ON e.designation_id = des.id
        LEFT JOIN employees as rm ON e.reporting_manager_id = rm.id
        WHERE 1=1
      `;

      let countParamIndex = 1;
      const countValues: any[] = [];

      // Apply the same filters as the main query
      if (queryParams.factory_id) {
        countQuery += ` AND e.factory_id = $${countParamIndex}`;
        countValues.push(queryParams.factory_id);
        countParamIndex++;
      }

      if (queryParams.department_id) {
        countQuery += ` AND e.department_id = $${countParamIndex}`;
        countValues.push(queryParams.department_id);
        countParamIndex++;
      }

      if (queryParams.designation_id) {
        countQuery += ` AND e.designation_id = $${countParamIndex}`;
        countValues.push(queryParams.designation_id);
        countParamIndex++;
      }

      if (queryParams.employment_type) {
        countQuery += ` AND e.employment_type = $${countParamIndex}`;
        countValues.push(queryParams.employment_type);
        countParamIndex++;
      }

      if (queryParams.is_active !== undefined) {
        countQuery += ` AND e.is_active = $${countParamIndex}`;
        countValues.push(queryParams.is_active);
        countParamIndex++;
      }

      if (queryParams.search) {
        countQuery += ` AND (
          e.first_name ILIKE $${countParamIndex} OR
          e.last_name ILIKE $${countParamIndex} OR
          e.employee_id ILIKE $${countParamIndex} OR
          e.cnic ILIKE $${countParamIndex} OR
          d.name ILIKE $${countParamIndex}
        )`;
        countValues.push(`%${queryParams.search}%`);
      }

      const countResult = await client.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].count);

      const result = {
        employees: employees.map(emp => this.mapToEmployee(emp)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        employeesCount: result.employees.length,
        queryParams
      });

      return result;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Employee object with nested relations
   */
  private static mapToEmployee(row: any): Employee {
    if (!row) return row;

    const employee: Employee = { ...row };

    if (row.tax_rate != null && String(row.tax_rate).trim() !== '') {
      const t = parseFloat(String(row.tax_rate));
      employee.tax_rate = Number.isFinite(t) ? t : null;
    } else {
      employee.tax_rate = null;
    }

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

  /**
   * Get employee by ID
   */
  static async getEmployeeById(employeeId: number): Promise<Employee> {
    const action = "GetEmployeeInfoMediator.getEmployeeById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId });
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

      const employee = this.mapToEmployee(result.rows[0]);

      MyLogger.success(action, {
        employeeId: employee.id,
        employeeCode: employee.employee_id
      });

      return employee;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employees by department
   */
  static async getEmployeesByDepartment(departmentId: number): Promise<Employee[]> {
    const action = "GetEmployeeInfoMediator.getEmployeesByDepartment";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { departmentId });

      const query = `
        SELECT
          e.*,
          d.name as department_name,
          d.code as department_code,
          des.title as designation_title,
          des.code as designation_code,
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name
        FROM employees as e
        LEFT JOIN departments as d ON e.department_id = d.id
        LEFT JOIN designations as des ON e.designation_id = des.id
        WHERE e.department_id = $1 AND e.is_active = true
        ORDER BY e.first_name, e.last_name
      `;

      const result = await client.query(query, [departmentId]);
      const employees = result.rows;

      MyLogger.success(action, {
        departmentId,
        employeesCount: employees.length
      });

      return result.rows.map(emp => this.mapToEmployee(emp));
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employees by designation
   */
  static async getEmployeesByDesignation(designationId: number): Promise<Employee[]> {
    const action = "GetEmployeeInfoMediator.getEmployeesByDesignation";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { designationId });

      const query = `
        SELECT
          e.*,
          d.name as department_name,
          d.code as department_code,
          des.title as designation_title,
          des.code as designation_code,
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name
        FROM employees as e
        LEFT JOIN departments as d ON e.department_id = d.id
        LEFT JOIN designations as des ON e.designation_id = des.id
        WHERE e.designation_id = $1 AND e.is_active = true
        ORDER BY e.first_name, e.last_name
      `;

      const result = await client.query(query, [designationId]);
      const employees = result.rows;

      MyLogger.success(action, {
        designationId,
        employeesCount: employees.length
      });

      return result.rows.map(emp => this.mapToEmployee(emp));
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search employees
   */
  static async searchEmployees(searchTerm: string, limit: number = 10): Promise<Employee[]> {
    const action = "GetEmployeeInfoMediator.searchEmployees";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { searchTerm, limit });

      const query = `
        SELECT
          e.*,
          d.name as department_name,
          d.code as department_code,
          des.title as designation_title,
          des.code as designation_code,
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name
        FROM employees as e
        LEFT JOIN departments as d ON e.department_id = d.id
        LEFT JOIN designations as des ON e.designation_id = des.id
        WHERE e.is_active = true
        AND (
          e.first_name ILIKE $1 OR
          e.last_name ILIKE $1 OR
          e.employee_id ILIKE $1 OR
          e.cnic ILIKE $1 OR
          d.name ILIKE $1
        )
        ORDER BY
          CASE
            WHEN e.employee_id ILIKE $1 THEN 1
            WHEN e.first_name ILIKE $1 THEN 2
            WHEN e.last_name ILIKE $1 THEN 3
            ELSE 4
          END,
          e.first_name, e.last_name
        LIMIT $2
      `;

      const result = await client.query(query, [`%${searchTerm}%`, limit]);
      const employees = result.rows;

      MyLogger.success(action, {
        searchTerm,
        limit,
        resultsCount: employees.length
      });

      return result.rows.map(emp => this.mapToEmployee(emp));
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employee hierarchy (reporting structure)
   */
  static async getEmployeeHierarchy(employeeId?: number): Promise<any> {
    const action = "GetEmployeeInfoMediator.getEmployeeHierarchy";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId });

      let query: string;
      let values: any[];

      if (employeeId) {
        // Get hierarchy for specific employee
        query = `
          WITH RECURSIVE employee_hierarchy AS (
            SELECT
              id,
              employee_id,
              first_name,
              last_name,
              designation_id,
              department_id,
              reporting_manager_id,
              0 as level,
              ARRAY[id] as path,
              CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as full_name
            FROM employees
            WHERE id = $1 AND is_active = true

            UNION ALL

            SELECT
              e.id,
              e.employee_id,
              e.first_name,
              e.last_name,
              e.designation_id,
              e.department_id,
              e.reporting_manager_id,
              eh.level + 1,
              eh.path || e.id,
              CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name
            FROM employees e
            INNER JOIN employee_hierarchy eh ON e.reporting_manager_id = eh.id
            WHERE e.is_active = true AND e.id != ALL(eh.path)
          )
          SELECT
            eh.*,
            d.name as department_name,
            d.code as department_code,
            des.title as designation_title,
            des.code as designation_code
          FROM employee_hierarchy eh
          LEFT JOIN departments d ON eh.department_id = d.id
          LEFT JOIN designations des ON eh.designation_id = des.id
          ORDER BY eh.level, eh.full_name
        `;
        values = [employeeId];
      } else {
        // Get top-level hierarchy (employees with no reporting manager)
        query = `
          SELECT
            e.id,
            e.employee_id,
            e.first_name,
            e.last_name,
            e.designation_id,
            e.department_id,
            e.reporting_manager_id,
            0 as level,
            ARRAY[e.id] as path,
            CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name,
            d.name as department_name,
            d.code as department_code,
            des.title as designation_title,
            des.code as designation_code
          FROM employees e
          LEFT JOIN departments d ON e.department_id = d.id
          LEFT JOIN designations des ON e.designation_id = des.id
          WHERE e.reporting_manager_id IS NULL AND e.is_active = true
          ORDER BY d.name, e.first_name, e.last_name
        `;
        values = [];
      }

      const result = await client.query(query, values);
      const hierarchy = result.rows;

      MyLogger.success(action, {
        employeeId,
        hierarchyCount: hierarchy.length
      });

      return result.rows.map(emp => this.mapToEmployee(emp));
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employee dashboard statistics
   */
  static async getEmployeeDashboard(factoryId?: number): Promise<HRDashboardStats> {
    const action = "GetEmployeeInfoMediator.getEmployeeDashboard";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { factoryId });

      // Total employees count
      let totalQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = true';
      const totalValues: any[] = [];

      if (factoryId) {
        totalQuery += ' AND factory_id = $1';
        totalValues.push(factoryId);
      }

      const totalResult = await client.query(totalQuery, totalValues);
      const totalEmployees = parseInt(totalResult.rows[0].count);

      // Department distribution
      let deptQuery = `
        SELECT d.name, d.code, COUNT(e.id) as count
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      `;

      if (factoryId) {
        deptQuery += ' AND e.factory_id = $1';
      }

      deptQuery += ' GROUP BY d.id, d.name, d.code ORDER BY count DESC';

      const deptResult = await client.query(deptQuery, factoryId ? [factoryId] : []);
      const departmentDistribution = deptResult.rows;

      // Designation distribution
      let desigQuery = `
        SELECT des.title, des.code, COUNT(e.id) as count
        FROM designations des
        LEFT JOIN employees e ON des.id = e.designation_id AND e.is_active = true
      `;

      if (factoryId) {
        desigQuery += ' AND e.factory_id = $1';
      }

      desigQuery += ' GROUP BY des.id, des.title, des.code ORDER BY count DESC';

      const desigResult = await client.query(desigQuery, factoryId ? [factoryId] : []);
      const designationDistribution = desigResult.rows;

      // Employment type distribution
      let empTypeQuery = `
        SELECT employment_type, COUNT(*) as count
        FROM employees
        WHERE is_active = true
      `;

      if (factoryId) {
        empTypeQuery += ' AND factory_id = $1';
      }

      empTypeQuery += ' GROUP BY employment_type ORDER BY count DESC';

      const empTypeResult = await client.query(empTypeQuery, factoryId ? [factoryId] : []);
      const employmentTypeDistribution = empTypeResult.rows;

      // Recent employees (last 30 days)
      let recentQuery = `
        SELECT COUNT(*) as count
        FROM employees
        WHERE is_active = true AND created_at >= NOW() - INTERVAL '30 days'
      `;

      if (factoryId) {
        recentQuery += ' AND factory_id = $1';
      }

      const recentResult = await client.query(recentQuery, factoryId ? [factoryId] : []);
      const recentEmployees = parseInt(recentResult.rows[0].count);

      const dashboard: HRDashboardStats = {
        total_employees: totalEmployees,
        active_employees: totalEmployees, // Assuming all are active for now
        employees_on_leave: 0, // TODO: Calculate actual leave count
        pending_leave_applications: 0, // TODO: Calculate pending applications
        upcoming_payroll_runs: 0, // TODO: Calculate upcoming payroll runs
        department_breakdown: departmentDistribution.map(d => ({ department: d.name, count: d.count })),
        recent_hires: [], // TODO: Implement recent hires
        upcoming_birthdays: [], // TODO: Implement birthdays
        leave_balance_warnings: [] // TODO: Implement leave warnings
      };

      MyLogger.success(action, {
        total_employees: totalEmployees,
        departmentsCount: departmentDistribution.length,
        designationsCount: designationDistribution.length,
        recentEmployees,
        factoryId
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
   * Get employee documents
   */
  static async getEmployeeDocuments(employeeId: number): Promise<any[]> {
    const action = "GetEmployeeInfoMediator.getEmployeeDocuments";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId });

      const query = `
        SELECT * FROM employee_documents
        WHERE employee_id = $1
        ORDER BY uploaded_at DESC
      `;

      const result = await client.query(query, [employeeId]);
      const documents = result.rows;

      MyLogger.success(action, {
        employeeId,
        documentsCount: documents.length
      });

      return documents;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employee salary history
   */
  static async getEmployeeSalaryHistory(employeeId: number): Promise<any[]> {
    const action = "GetEmployeeInfoMediator.getEmployeeSalaryHistory";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId });

      const query = `
        SELECT * FROM employee_salary_history
        WHERE employee_id = $1
        ORDER BY effective_date DESC
      `;

      const result = await client.query(query, [employeeId]);
      const history = result.rows;

      MyLogger.success(action, {
        employeeId,
        historyCount: history.length
      });

      return history;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get global salary history
   */
  static async getGlobalSalaryHistory(limit: number = 50, offset: number = 0): Promise<{ history: any[], total: number }> {
    const action = "GetEmployeeInfoMediator.getGlobalSalaryHistory";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { limit, offset });

      // Get total count
      const countQuery = 'SELECT COUNT(*) as count FROM employee_salary_history';
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      // Get history with employee details
      const query = `
        SELECT 
          h.*,
          e.first_name,
          e.last_name,
          e.employee_id as employee_code,
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name,
          d.name as department_name,
          des.title as designation_title
        FROM employee_salary_history h
        JOIN employees e ON h.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations des ON e.designation_id = des.id
        ORDER BY h.effective_date DESC, h.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await client.query(query, [limit, offset]);
      const history = result.rows;

      MyLogger.success(action, {
        historyCount: history.length,
        total
      });

      return { history, total };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Export employees data
   */
  static async exportEmployees(queryParams: EmployeeQueryParams, format: string): Promise<Buffer> {
    const action = "GetEmployeeInfoMediator.exportEmployees";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { queryParams, format });

      // Get employees data for export
      const result = await this.getEmployees(queryParams);
      const employees = result.employees;

      // For now, return a simple CSV buffer
      // In a real implementation, you might use a library like 'exceljs' or 'csv-writer'
      const csvHeaders = 'ID,Employee ID,First Name,Last Name,Department,Designation,Employment Type,Join Date\n';
      const csvRows = employees.map(emp =>
        `${emp.id},"${emp.employee_id}","${emp.first_name}","${emp.last_name}","${emp.department_name}","${emp.designation_id}","${emp.employment_type}","${emp.join_date}"`
      ).join('\n');

      const csvData = csvHeaders + csvRows;
      const buffer = Buffer.from(csvData, 'utf8');

      MyLogger.success(action, {
        format,
        employeesCount: employees.length,
        bufferSize: buffer.length
      });

      return buffer;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
