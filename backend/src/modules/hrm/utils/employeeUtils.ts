import pool from '../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

/**
 * Employee utility functions for common operations
 */
export class EmployeeUtils {
  /**
   * Generate unique employee ID
   */
  static async generateEmployeeId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `EMP${timestamp}${random}`;
  }

  /**
   * Check if CNIC already exists
   */
  static async checkCnicExists(cnic: string, excludeEmployeeId?: number): Promise<boolean> {
    const query = 'SELECT id FROM employees WHERE cnic = $1';
    const values: any[] = [cnic];

    if (excludeEmployeeId) {
      const excludeQuery = 'SELECT id FROM employees WHERE cnic = $1 AND id != $2';
      const excludeResult = await pool.query(excludeQuery, [cnic, excludeEmployeeId]);
      return excludeResult.rows.length > 0;
    }

    const result = await pool.query(query, values);
    return result.rows.length > 0;
  }

  /**
   * Check if employee ID already exists
   */
  static async checkEmployeeIdExists(employeeId: string, excludeId?: number): Promise<boolean> {
    const query = 'SELECT id FROM employees WHERE employee_id = $1';
    const values: any[] = [employeeId];

    if (excludeId) {
      const excludeQuery = 'SELECT id FROM employees WHERE employee_id = $1 AND id != $2';
      const excludeResult = await pool.query(excludeQuery, [employeeId, excludeId]);
      return excludeResult.rows.length > 0;
    }

    const result = await pool.query(query, values);
    return result.rows.length > 0;
  }

  /**
   * Get employee reporting hierarchy
   */
  static async getEmployeeReportingHierarchy(employeeId: number): Promise<any[]> {
    const query = `
      WITH RECURSIVE employee_hierarchy AS (
        SELECT
          id,
          employee_id,
          first_name,
          last_name,
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
      LEFT JOIN departments d ON (
        SELECT department_id FROM employees WHERE id = eh.id
      ) = d.id
      LEFT JOIN designations des ON (
        SELECT designation_id FROM employees WHERE id = eh.id
      ) = des.id
      ORDER BY eh.level, eh.full_name
    `;

    const result = await pool.query(query, [employeeId]);
    return result.rows;
  }

  /**
   * Calculate employee age from date of birth
   */
  static calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Format employee name
   */
  static formatEmployeeName(firstName?: string, lastName?: string): string {
    const first = firstName || '';
    const last = lastName || '';
    return `${first} ${last}`.trim();
  }

  /**
   * Validate employee data before operations
   */
  static validateEmployeeData(employeeData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!employeeData.first_name || employeeData.first_name.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!employeeData.last_name || employeeData.last_name.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (employeeData.date_of_birth) {
      const age = this.calculateAge(employeeData.date_of_birth);
      if (age < 18) {
        errors.push('Employee must be at least 18 years old');
      }
      if (age > 65) {
        errors.push('Employee age cannot exceed 65 years');
      }
    }

    if (employeeData.cnic && !/^\d{5}-\d{7}-\d{1}$/.test(employeeData.cnic)) {
      errors.push('CNIC format must be XXXXX-XXXXXXX-X');
    }

    if (employeeData.phone && !/^(\+92|0)[0-9]{10}$/.test(employeeData.phone)) {
      errors.push('Phone number format is invalid');
    }

    if (employeeData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeData.email)) {
      errors.push('Email format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get employee statistics for dashboard
   */
  static async getEmployeeStats(factoryId?: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
    byDepartment: any[];
    byDesignation: any[];
  }> {
    const client = await pool.connect();

    try {
      // Total employees
      let totalQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = true';
      const totalValues: any[] = [];

      if (factoryId) {
        totalQuery += ' AND factory_id = $1';
        totalValues.push(factoryId);
      }

      const totalResult = await client.query(totalQuery, totalValues);
      const total = parseInt(totalResult.rows[0].count);

      // Active employees
      let activeQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = true';
      const activeValues: any[] = [];

      if (factoryId) {
        activeQuery += ' AND factory_id = $1';
        activeValues.push(factoryId);
      }

      const activeResult = await client.query(activeQuery, activeValues);
      const active = parseInt(activeResult.rows[0].count);

      // Inactive employees
      let inactiveQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = false';
      const inactiveValues: any[] = [];

      if (factoryId) {
        inactiveQuery += ' AND factory_id = $1';
        inactiveValues.push(factoryId);
      }

      const inactiveResult = await client.query(inactiveQuery, inactiveValues);
      const inactive = parseInt(inactiveResult.rows[0].count);

      // New employees this month
      let newQuery = `
        SELECT COUNT(*) as count FROM employees
        WHERE is_active = true AND created_at >= date_trunc('month', CURRENT_DATE)
      `;
      const newValues: any[] = [];

      if (factoryId) {
        newQuery += ' AND factory_id = $1';
        newValues.push(factoryId);
      }

      const newResult = await client.query(newQuery, newValues);
      const newThisMonth = parseInt(newResult.rows[0].count);

      // By department
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
      const byDepartment = deptResult.rows;

      // By designation
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
      const byDesignation = desigResult.rows;

      return {
        total,
        active,
        inactive,
        newThisMonth,
        byDepartment,
        byDesignation
      };
    } catch (error) {
      MyLogger.error('EmployeeUtils.getEmployeeStats', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
