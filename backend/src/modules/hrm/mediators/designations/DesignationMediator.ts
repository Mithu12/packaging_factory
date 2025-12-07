import {
  Designation,
  CreateDesignationRequest,
  UpdateDesignationRequest,
  DesignationQueryParams
} from '../../../../types/hrm';
import { MediatorInterface } from '../../../../types';
import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

type DesignationListResult = {
  designations: Designation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

class DesignationMediator implements MediatorInterface {
  constructor() {}

  async process(data: any): Promise<any> {
    return data;
  }

  /**
   * Map raw designation row (with joins) to Designation type
   */
  private mapDesignationRow(row: any): Designation {
    const designation: Designation = {
      id: row.id,
      title: row.title,
      code: row.code,
      department_id: row.department_id,
      department: row.department_id
        ? {
            id: row.department_id,
            name: row.department_name,
            code: row.department_code,
            description: row.department_description,
            manager_id: row.department_manager_id,
            parent_department_id: row.department_parent_id,
            is_active: row.department_is_active,
            created_at: row.department_created_at,
            updated_at: row.department_updated_at
          }
        : undefined,
      grade_level: row.grade_level,
      description: row.description,
      min_salary: row.min_salary,
      max_salary: row.max_salary,
      reports_to_id: row.reports_to_id,
      reports_to: row.reports_to_id
        ? {
            id: row.reports_to_id,
            title: row.reports_to_title,
            code: row.reports_to_code,
            department_id: row.reports_to_department_id,
            is_active: row.reports_to_is_active,
            created_at: row.reports_to_created_at,
            updated_at: row.reports_to_updated_at,
            description: row.reports_to_description,
            grade_level: row.reports_to_grade_level,
            min_salary: row.reports_to_min_salary,
            max_salary: row.reports_to_max_salary
          }
        : undefined,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return designation;
  }

  /**
   * Get designations with filtering, sorting, and pagination
   */
  async getDesignations(queryParams: DesignationQueryParams): Promise<DesignationListResult> {
    const action = 'DesignationMediator.getDesignations';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { queryParams });

      let query = `
        SELECT
          d.*,
          dept.name as department_name,
          dept.code as department_code,
          dept.description as department_description,
          dept.manager_id as department_manager_id,
          dept.parent_department_id as department_parent_id,
          dept.is_active as department_is_active,
          dept.created_at as department_created_at,
          dept.updated_at as department_updated_at,
          rt.title as reports_to_title,
          rt.code as reports_to_code,
          rt.department_id as reports_to_department_id,
          rt.description as reports_to_description,
          rt.grade_level as reports_to_grade_level,
          rt.min_salary as reports_to_min_salary,
          rt.max_salary as reports_to_max_salary,
          rt.is_active as reports_to_is_active,
          rt.created_at as reports_to_created_at,
          rt.updated_at as reports_to_updated_at,
          (SELECT COUNT(*) FROM employees e WHERE e.designation_id = d.id AND e.is_active = true) as employee_count
        FROM designations d
        LEFT JOIN departments dept ON d.department_id = dept.id
        LEFT JOIN designations rt ON d.reports_to_id = rt.id
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramIndex = 1;

      if (queryParams.department_id) {
        query += ` AND d.department_id = $${paramIndex}`;
        values.push(queryParams.department_id);
        paramIndex++;
      }

      if (queryParams.grade_level) {
        query += ` AND d.grade_level = $${paramIndex}`;
        values.push(queryParams.grade_level);
        paramIndex++;
      }

      if (queryParams.is_active !== undefined) {
        query += ` AND d.is_active = $${paramIndex}`;
        values.push(queryParams.is_active);
        paramIndex++;
      }

      if (queryParams.search) {
        query += ` AND (
          d.title ILIKE $${paramIndex} OR
          d.code ILIKE $${paramIndex} OR
          d.description ILIKE $${paramIndex} OR
          d.grade_level ILIKE $${paramIndex}
        )`;
        values.push(`%${queryParams.search}%`);
        paramIndex++;
      }

      const allowedSortFields = ['title', 'code', 'created_at', 'updated_at', 'grade_level'];
      const sortBy = queryParams.sort_by && allowedSortFields.includes(queryParams.sort_by)
        ? queryParams.sort_by
        : 'created_at';
      const sortOrder = queryParams.sort_order === 'asc' ? 'asc' : 'desc';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      const page = queryParams.page && queryParams.page > 0 ? queryParams.page : 1;
      const limit = queryParams.limit && queryParams.limit > 0 ? queryParams.limit : 10;
      const offset = (page - 1) * limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const designationsResult = await client.query(query, values);
      const designations = designationsResult.rows.map((row) => this.mapDesignationRow(row));

      // Count query with same filters
      let countQuery = `
        SELECT COUNT(*) as count
        FROM designations d
        WHERE 1=1
      `;
      const countValues: any[] = [];
      let countIndex = 1;

      if (queryParams.department_id) {
        countQuery += ` AND d.department_id = $${countIndex}`;
        countValues.push(queryParams.department_id);
        countIndex++;
      }

      if (queryParams.grade_level) {
        countQuery += ` AND d.grade_level = $${countIndex}`;
        countValues.push(queryParams.grade_level);
        countIndex++;
      }

      if (queryParams.is_active !== undefined) {
        countQuery += ` AND d.is_active = $${countIndex}`;
        countValues.push(queryParams.is_active);
        countIndex++;
      }

      if (queryParams.search) {
        countQuery += ` AND (
          d.title ILIKE $${countIndex} OR
          d.code ILIKE $${countIndex} OR
          d.description ILIKE $${countIndex} OR
          d.grade_level ILIKE $${countIndex}
        )`;
        countValues.push(`%${queryParams.search}%`);
      }

      const countResult = await client.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].count, 10);

      const result: DesignationListResult = {
        designations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        designationsCount: result.designations.length
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
   * Get a single designation by ID
   */
  async getDesignationById(designationId: number): Promise<Designation> {
    const action = 'DesignationMediator.getDesignationById';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { designationId });

      const query = `
        SELECT
          d.*,
          dept.name as department_name,
          dept.code as department_code,
          dept.description as department_description,
          dept.manager_id as department_manager_id,
          dept.parent_department_id as department_parent_id,
          dept.is_active as department_is_active,
          dept.created_at as department_created_at,
          dept.updated_at as department_updated_at,
          rt.title as reports_to_title,
          rt.code as reports_to_code,
          rt.department_id as reports_to_department_id,
          rt.description as reports_to_description,
          rt.grade_level as reports_to_grade_level,
          rt.min_salary as reports_to_min_salary,
          rt.max_salary as reports_to_max_salary,
          rt.is_active as reports_to_is_active,
          rt.created_at as reports_to_created_at,
          rt.updated_at as reports_to_updated_at
        FROM designations d
        LEFT JOIN departments dept ON d.department_id = dept.id
        LEFT JOIN designations rt ON d.reports_to_id = rt.id
        WHERE d.id = $1
      `;

      const result = await client.query(query, [designationId]);

      if (result.rows.length === 0) {
        throw new Error('Designation not found');
      }

      const designation = this.mapDesignationRow(result.rows[0]);

      MyLogger.success(action, { designationId: designation.id, designationCode: designation.code });

      return designation;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new designation
   */
  async createDesignation(
    designationData: CreateDesignationRequest,
    createdBy?: number
  ): Promise<Designation> {
    const action = 'DesignationMediator.createDesignation';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { designationData, createdBy });

      // Check code uniqueness
      const existingCodeQuery = 'SELECT id FROM designations WHERE code = $1';
      const existingCode = await client.query(existingCodeQuery, [designationData.code]);
      if (existingCode.rows.length > 0) {
        throw new Error('Designation code already exists');
      }

      // Prevent self reference on create
      if (designationData.reports_to_id) {
        const parentCheck = await client.query('SELECT id FROM designations WHERE id = $1', [
          designationData.reports_to_id
        ]);
        if (parentCheck.rows.length === 0) {
          throw new Error('Reports to designation not found');
        }
      }

      const newDesignation = {
        ...designationData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const insertFields = Object.keys(newDesignation);
      const insertValues = Object.values(newDesignation);
      const insertPlaceholders = insertFields.map((_, index) => `$${index + 1}`).join(', ');

      const insertQuery = `
        INSERT INTO designations (${insertFields.join(', ')})
        VALUES (${insertPlaceholders})
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, insertValues);
      const designation = insertResult.rows[0];

      MyLogger.success(action, { designationId: designation.id, designationCode: designation.code });

      return this.getDesignationById(designation.id);
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing designation
   */
  async updateDesignation(
    designationId: number,
    updateData: UpdateDesignationRequest,
    updatedBy?: number
  ): Promise<Designation> {
    const action = 'DesignationMediator.updateDesignation';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { designationId, updateData, updatedBy });

      const currentDesignation = await this.getDesignationById(designationId);

      if (updateData.code && updateData.code !== currentDesignation.code) {
        const existingCodeQuery = 'SELECT id FROM designations WHERE code = $1 AND id != $2';
        const existingCode = await client.query(existingCodeQuery, [updateData.code, designationId]);
        if (existingCode.rows.length > 0) {
          throw new Error('Designation code already exists');
        }
      }

      if (updateData.reports_to_id && updateData.reports_to_id === designationId) {
        throw new Error('Designation cannot report to itself');
      }

      if (updateData.reports_to_id) {
        const parentCheck = await client.query('SELECT id FROM designations WHERE id = $1', [
          updateData.reports_to_id
        ]);
        if (parentCheck.rows.length === 0) {
          throw new Error('Reports to designation not found');
        }
      }

      const updatedDesignationData = {
        ...updateData,
        updated_at: new Date()
      };

      const updateFields = Object.keys(updatedDesignationData);
      const updateValues = Object.values(updatedDesignationData);

      if (updateFields.length === 0) {
        return currentDesignation;
      }

      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const updateQuery = `
        UPDATE designations
        SET ${setClause}
        WHERE id = $${updateValues.length + 1}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [...updateValues, designationId]);
      const designation = updateResult.rows[0];

      MyLogger.success(action, { designationId: designation.id, designationCode: designation.code });

      return this.getDesignationById(designation.id);
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete a designation (requires no active employees)
   */
  async deleteDesignation(designationId: number, deletedBy?: number): Promise<void> {
    const action = 'DesignationMediator.deleteDesignation';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { designationId, deletedBy });

      // Ensure designation exists
      await this.getDesignationById(designationId);

      const employeesQuery =
        'SELECT COUNT(*) as count FROM employees WHERE designation_id = $1 AND is_active = true';
      const employeesResult = await client.query(employeesQuery, [designationId]);
      const employeeCount = parseInt(employeesResult.rows[0].count, 10);

      if (employeeCount > 0) {
        throw new Error(`Cannot delete designation with ${employeeCount} active employees`);
      }

      const updateQuery = `
        UPDATE designations
        SET is_active = false, updated_at = $1
        WHERE id = $2
      `;

      await client.query(updateQuery, [new Date(), designationId]);

      MyLogger.success(action, { designationId, message: 'Designation successfully deleted' });
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Toggle active status of a designation
   */
  async toggleStatus(designationId: number): Promise<Designation> {
    const action = 'DesignationMediator.toggleStatus';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { designationId });

      const designation = await this.getDesignationById(designationId);

      const updateQuery = `
        UPDATE designations
        SET is_active = NOT is_active, updated_at = $1
        WHERE id = $2
        RETURNING *
      `;

      await client.query(updateQuery, [new Date(), designationId]);

      MyLogger.success(action, {
        designationId,
        previousStatus: designation.is_active,
        newStatus: !designation.is_active
      });

      return this.getDesignationById(designationId);
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk update designations
   */
  async bulkUpdate(
    actionType: 'activate' | 'deactivate' | 'delete',
    designationIds: number[]
  ): Promise<{ message: string; updated_count: number }> {
    const action = 'DesignationMediator.bulkUpdate';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { actionType, designationIds });

      if (!designationIds || designationIds.length === 0) {
        throw new Error('No designation IDs provided');
      }

      const now = new Date();
      let query = '';
      let params: any[] = [designationIds, now];

      if (actionType === 'activate') {
        query = `
          UPDATE designations
          SET is_active = true, updated_at = $2
          WHERE id = ANY($1::bigint[])
        `;
      } else if (actionType === 'deactivate') {
        query = `
          UPDATE designations
          SET is_active = false, updated_at = $2
          WHERE id = ANY($1::bigint[])
        `;
      } else if (actionType === 'delete') {
        // Check active employees before delete
        const employeesQuery = `
          SELECT COUNT(*) as count
          FROM employees
          WHERE designation_id = ANY($1::bigint[]) AND is_active = true
        `;
        const employeesResult = await client.query(employeesQuery, [designationIds]);
        const employeeCount = parseInt(employeesResult.rows[0].count, 10);

        if (employeeCount > 0) {
          throw new Error(`Cannot delete designations with ${employeeCount} active employees`);
        }

        query = `
          UPDATE designations
          SET is_active = false, updated_at = $2
          WHERE id = ANY($1::bigint[])
        `;
      } else {
        throw new Error('Invalid bulk action');
      }

      const result = await client.query(query, params);
      const updated_count = result.rowCount || 0;

      MyLogger.success(action, { actionType, updated_count });

      return {
        message: `Bulk ${actionType} completed`,
        updated_count
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get designation hierarchy as nested tree
   */
  async getDesignationHierarchy(): Promise<any[]> {
    const action = 'DesignationMediator.getDesignationHierarchy';
    const client = await pool.connect();

    try {
      MyLogger.info(action, {});

      const query = `
        WITH RECURSIVE designation_tree AS (
          SELECT
            d.*,
            dept.name as department_name,
            dept.code as department_code,
            rt.title as reports_to_title,
            rt.code as reports_to_code,
            0 as level,
            ARRAY[d.id] as path,
            (SELECT COUNT(*) FROM employees e WHERE e.designation_id = d.id AND e.is_active = true) as employee_count
          FROM designations d
          LEFT JOIN departments dept ON d.department_id = dept.id
          LEFT JOIN designations rt ON d.reports_to_id = rt.id
          WHERE d.reports_to_id IS NULL AND d.is_active = true

          UNION ALL

          SELECT
            child.*,
            dept.name as department_name,
            dept.code as department_code,
            rt.title as reports_to_title,
            rt.code as reports_to_code,
            parent.level + 1,
            parent.path || child.id,
            (SELECT COUNT(*) FROM employees e WHERE e.designation_id = child.id AND e.is_active = true) as employee_count
          FROM designations child
          LEFT JOIN departments dept ON child.department_id = dept.id
          LEFT JOIN designations rt ON child.reports_to_id = rt.id
          INNER JOIN designation_tree parent ON child.reports_to_id = parent.id
          WHERE child.is_active = true
        )
        SELECT * FROM designation_tree
        ORDER BY path;
      `;

      const result = await client.query(query);
      const rows = result.rows;

      // Build tree structure
      const nodeMap: Record<number, any> = {};
      const roots: any[] = [];

      rows.forEach((row) => {
        const node = {
          designation: this.mapDesignationRow(row),
          children: [] as any[],
          employee_count: parseInt(row.employee_count, 10) || 0
        };

        nodeMap[row.id] = node;

        if (row.reports_to_id) {
          const parent = nodeMap[row.reports_to_id];
          if (parent) {
            parent.children.push(node);
          } else {
            roots.push(node);
          }
        } else {
          roots.push(node);
        }
      });

      MyLogger.success(action, { roots: roots.length });

      return roots;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DesignationMediator();

