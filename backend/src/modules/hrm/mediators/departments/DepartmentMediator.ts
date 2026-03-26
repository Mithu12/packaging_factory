import { Department, CreateDepartmentRequest, UpdateDepartmentRequest, DepartmentQueryParams } from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';
import {
  baseCodeFromLabel,
  ensureUniqueDepartmentCode
} from '../../utils/hrmCodeUtils';

class DepartmentMediator implements MediatorInterface {
  constructor() {}

  async process(data: any): Promise<any> {
    return data;
  }

  /**
   * Get all departments with filtering and pagination
   */
  async getDepartments(queryParams: DepartmentQueryParams): Promise<{
    departments: Department[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "DepartmentMediator.getDepartments";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { queryParams });

      let query = `
        SELECT
          d.*,
          m.first_name as manager_first_name,
          m.last_name as manager_last_name,
          CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, '')) as manager_name,
          pd.name as parent_department_name,
          (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = true) as employee_count
        FROM departments d
        LEFT JOIN employees m ON d.manager_id = m.id
        LEFT JOIN departments pd ON d.parent_department_id = pd.id
        WHERE d.is_active = true
      `;

      const values: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (queryParams.manager_id) {
        query += ` AND d.manager_id = $${paramIndex}`;
        values.push(queryParams.manager_id);
        paramIndex++;
      }

      if (queryParams.parent_department_id) {
        query += ` AND d.parent_department_id = $${paramIndex}`;
        values.push(queryParams.parent_department_id);
        paramIndex++;
      }

      if (queryParams.is_active !== undefined) {
        query += ` AND d.is_active = $${paramIndex}`;
        values.push(queryParams.is_active);
        paramIndex++;
      }

      if (queryParams.search) {
        query += ` AND (
          d.name ILIKE $${paramIndex} OR
          d.code ILIKE $${paramIndex} OR
          d.description ILIKE $${paramIndex}
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
      const departmentsResult = await client.query(query, values);
      const departments = departmentsResult.rows;

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as count
        FROM departments d
        WHERE d.is_active = true
      `;

      let countParamIndex = 1;
      const countValues: any[] = [];

      // Apply the same filters as the main query
      if (queryParams.manager_id) {
        countQuery += ` AND d.manager_id = $${countParamIndex}`;
        countValues.push(queryParams.manager_id);
        countParamIndex++;
      }

      if (queryParams.parent_department_id) {
        countQuery += ` AND d.parent_department_id = $${countParamIndex}`;
        countValues.push(queryParams.parent_department_id);
        countParamIndex++;
      }

      if (queryParams.is_active !== undefined) {
        countQuery += ` AND d.is_active = $${countParamIndex}`;
        countValues.push(queryParams.is_active);
        countParamIndex++;
      }

      if (queryParams.search) {
        countQuery += ` AND (
          d.name ILIKE $${countParamIndex} OR
          d.code ILIKE $${countParamIndex} OR
          d.description ILIKE $${countParamIndex}
        )`;
        countValues.push(`%${queryParams.search}%`);
      }

      const countResult = await client.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].count);

      const result = {
        departments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        departmentsCount: result.departments.length,
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
   * Get department by ID
   */
  async getDepartmentById(departmentId: number): Promise<Department> {
    const action = "DepartmentMediator.getDepartmentById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { departmentId });

      const query = `
        SELECT
          d.*,
          m.first_name as manager_first_name,
          m.last_name as manager_last_name,
          CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, '')) as manager_name,
          pd.name as parent_department_name,
          (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.is_active = true) as employee_count
        FROM departments d
        LEFT JOIN employees m ON d.manager_id = m.id
        LEFT JOIN departments pd ON d.parent_department_id = pd.id
        WHERE d.id = $1 AND d.is_active = true
      `;

      const result = await client.query(query, [departmentId]);

      if (result.rows.length === 0) {
        throw new Error('Department not found');
      }

      const department = result.rows[0];

      MyLogger.success(action, {
        departmentId: department.id,
        departmentName: department.name,
        departmentCode: department.code
      });

      return department;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create new department
   */
  async createDepartment(departmentData: CreateDepartmentRequest, createdBy?: number): Promise<Department> {
    const action = "DepartmentMediator.createDepartment";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { departmentData, createdBy });

      const trimmedCode = departmentData.code?.trim();
      const code =
        trimmedCode && trimmedCode.length > 0
          ? trimmedCode.toUpperCase()
          : await ensureUniqueDepartmentCode(
              client,
              baseCodeFromLabel(departmentData.name, 'DEPT')
            );

      // Check if department code already exists
      const existingDeptQuery = 'SELECT id FROM departments WHERE code = $1';
      const existingDeptResult = await client.query(existingDeptQuery, [code]);

      if (existingDeptResult.rows.length > 0) {
        throw new Error('Department code already exists');
      }

      const newDepartment = {
        ...departmentData,
        code,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertQuery = `
        INSERT INTO departments (${Object.keys(newDepartment).join(', ')})
        VALUES (${Object.keys(newDepartment).map((_, i) => `$${i + 1}`).join(', ')})
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, Object.values(newDepartment));
      const department = insertResult.rows[0];

      MyLogger.success(action, {
        departmentId: department.id,
        departmentName: department.name,
        departmentCode: department.code
      });

      return department;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update department
   */
  async updateDepartment(departmentId: number, updateData: UpdateDepartmentRequest, updatedBy?: number): Promise<Department> {
    const action = "DepartmentMediator.updateDepartment";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { departmentId, updateData, updatedBy });

      // Get current department data
      const currentDepartment = await this.getDepartmentById(departmentId);

      // Check if code already exists (if being updated)
      if (updateData.code && updateData.code !== currentDepartment.code) {
        const existingCodeQuery = 'SELECT id FROM departments WHERE code = $1 AND id != $2';
        const existingCodeResult = await client.query(existingCodeQuery, [updateData.code, departmentId]);

        if (existingCodeResult.rows.length > 0) {
          throw new Error('Department code already exists');
        }
      }

      const updatedDepartmentData = {
        ...updateData,
        updated_at: new Date()
      };

      const updateFields = Object.keys(updatedDepartmentData);
      const updateValues = Object.values(updatedDepartmentData);

      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const updateQuery = `
        UPDATE departments
        SET ${setClause}
        WHERE id = $${updateValues.length + 1}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [...updateValues, departmentId]);
      const department = updateResult.rows[0];

      MyLogger.success(action, {
        departmentId: department.id,
        departmentName: department.name,
        departmentCode: department.code
      });

      return department;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete department (soft delete)
   */
  async deleteDepartment(departmentId: number, deletedBy?: number): Promise<void> {
    const action = "DepartmentMediator.deleteDepartment";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { departmentId, deletedBy });

      // Check if department has active employees
      const employeesQuery = 'SELECT COUNT(*) as count FROM employees WHERE department_id = $1 AND is_active = true';
      const employeesResult = await client.query(employeesQuery, [departmentId]);
      const employeeCount = parseInt(employeesResult.rows[0].count);

      if (employeeCount > 0) {
        throw new Error(`Cannot delete department with ${employeeCount} active employees`);
      }

      const updateQuery = `
        UPDATE departments
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `;

      await client.query(updateQuery, [new Date(), departmentId]);

      MyLogger.success(action, {
        departmentId,
        message: 'Department successfully deleted'
      });
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy(): Promise<Department[]> {
    const action = "DepartmentMediator.getDepartmentHierarchy";
    const client = await pool.connect();

    try {
      const query = `
        WITH RECURSIVE dept_hierarchy AS (
          -- Base case: root departments
          SELECT
            d.*,
            m.first_name as manager_first_name,
            m.last_name as manager_last_name,
            CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, '')) as manager_name,
            0 as level,
            ARRAY[d.id] as path
          FROM departments d
          LEFT JOIN employees m ON d.manager_id = m.id
          WHERE d.parent_department_id IS NULL AND d.is_active = true

          UNION ALL

          -- Recursive case: child departments
          SELECT
            d.*,
            m.first_name as manager_first_name,
            m.last_name as manager_last_name,
            CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, '')) as manager_name,
            dh.level + 1,
            dh.path || d.id
          FROM departments d
          LEFT JOIN employees m ON d.manager_id = m.id
          INNER JOIN dept_hierarchy dh ON d.parent_department_id = dh.id
          WHERE d.is_active = true
        )
        SELECT * FROM dept_hierarchy
        ORDER BY level, name
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DepartmentMediator();