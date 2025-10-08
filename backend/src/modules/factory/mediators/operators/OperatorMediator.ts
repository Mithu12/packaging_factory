import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  Operator,
  CreateOperatorRequest,
  UpdateOperatorRequest,
} from "@/types/factory";

export class OperatorMediator {
  // Get all operators with filtering and pagination
  static async getOperators(
    params: {
      factory_id?: number;
      skill_level?: string;
      department?: string;
      availability_status?: string;
      is_active?: boolean;
      search?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    operators: Operator[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "Get Operators";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        factory_id,
        skill_level,
        department,
        availability_status,
        is_active = true,
        search,
        sort_by = "employee_id",
        sort_order = "asc",
        page = 1,
        limit = 20,
      } = params;

      const offset = (page - 1) * limit;

      // Build the WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (factory_id !== undefined && factory_id !== null) {
        whereConditions.push(`o.factory_id = $${queryParams.length + 1}`);
        queryParams.push(factory_id);
      }

      if (skill_level) {
        whereConditions.push(`o.skill_level = $${queryParams.length + 1}`);
        queryParams.push(skill_level);
      }

      if (department) {
        whereConditions.push(`o.department = $${queryParams.length + 1}`);
        queryParams.push(department);
      }

      if (availability_status) {
        whereConditions.push(`o.availability_status = $${queryParams.length + 1}`);
        queryParams.push(availability_status);
      }

      if (is_active !== undefined) {
        whereConditions.push(`o.is_active = $${queryParams.length + 1}`);
        queryParams.push(is_active);
      }

      if (search) {
        whereConditions.push(`(o.employee_id ILIKE $${queryParams.length + 1} OR u.name ILIKE $${queryParams.length + 1} OR u.email ILIKE $${queryParams.length + 1})`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM operators o
        LEFT JOIN users u ON o.user_id = u.id
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get operators with pagination
      const dataQuery = `
        SELECT
          o.*,
          u.name as user_name,
          u.email as user_email
        FROM operators o
        LEFT JOIN users u ON o.user_id = u.id
        ${whereClause}
        ORDER BY o.${sort_by} ${sort_order}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);

      const operators: Operator[] = result.rows.map(row => ({
        id: row.id.toString(),
        user_id: row.user_id,
        employee_id: row.employee_id,
        skill_level: row.skill_level,
        department: row.department,
        current_work_order_id: row.current_work_order_id?.toString(),
        availability_status: row.availability_status,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
        // Populated fields
        user_name: row.user_name,
        user_email: row.user_email,
      }));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        count: operators.length,
        total,
        page,
        totalPages,
      });

      return {
        operators,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get operator by ID
  static async getOperatorById(id: string): Promise<Operator> {
    const action = "Get Operator by ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      const query = `
        SELECT
          o.*,
          u.name as user_name,
          u.email as user_email
        FROM operators o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error(`Operator with ID ${id} not found`);
      }

      const row = result.rows[0];

      const operator: Operator = {
        id: row.id.toString(),
        user_id: row.user_id,
        employee_id: row.employee_id,
        skill_level: row.skill_level,
        department: row.department,
        current_work_order_id: row.current_work_order_id?.toString(),
        availability_status: row.availability_status,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
        // Populated fields
        user_name: row.user_name,
        user_email: row.user_email,
      };

      MyLogger.success(action, { operator: { id, employee_id: operator.employee_id } });

      return operator;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get operator by employee ID
  static async getOperatorByEmployeeId(employee_id: string): Promise<Operator> {
    const action = "Get Operator by Employee ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employee_id });

      const query = `
        SELECT
          o.*,
          u.name as user_name,
          u.email as user_email
        FROM operators o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.employee_id = $1
      `;

      const result = await client.query(query, [employee_id]);

      if (result.rows.length === 0) {
        throw new Error(`Operator with employee ID ${employee_id} not found`);
      }

      const row = result.rows[0];

      const operator: Operator = {
        id: row.id.toString(),
        user_id: row.user_id,
        employee_id: row.employee_id,
        skill_level: row.skill_level,
        department: row.department,
        current_work_order_id: row.current_work_order_id?.toString(),
        availability_status: row.availability_status,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
        // Populated fields
        user_name: row.user_name,
        user_email: row.user_email,
      };

      MyLogger.success(action, { operator: { id: operator.id, employee_id } });

      return operator;
    } catch (error: any) {
      MyLogger.error(action, error, { employee_id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Create new operator
  static async createOperator(
    factory_id: number | null,
    data: CreateOperatorRequest,
    created_by: number
  ): Promise<Operator> {
    const action = "Create Operator";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { factory_id, data, created_by });

      // Check if employee_id already exists
      const checkQuery = `SELECT id FROM operators WHERE employee_id = $1`;
      const checkResult = await client.query(checkQuery, [data.employee_id]);

      if (checkResult.rows.length > 0) {
        throw new Error(`Employee ID ${data.employee_id} already exists`);
      }

      const query = `
        INSERT INTO operators (
          factory_id, employee_id, skill_level, department, hourly_rate, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        factory_id,
        data.employee_id,
        data.skill_level,
        data.department,
        data.hourly_rate,
        created_by,
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      const operator: Operator = {
        id: row.id.toString(),
        user_id: row.user_id,
        employee_id: row.employee_id,
        skill_level: row.skill_level,
        department: row.department,
        current_work_order_id: row.current_work_order_id?.toString(),
        availability_status: row.availability_status,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      };

      MyLogger.success(action, { operator: { id: operator.id, employee_id: operator.employee_id } });

      return operator;
    } catch (error: any) {
      MyLogger.error(action, error, { factory_id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update operator
  static async updateOperator(
    id: string,
    data: UpdateOperatorRequest,
    updated_by: number
  ): Promise<Operator> {
    const action = "Update Operator";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id, data, updated_by });

      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (data.employee_id !== undefined) {
        // Check if new employee_id already exists (excluding current operator)
        const checkQuery = `SELECT id FROM operators WHERE employee_id = $1 AND id != $2`;
        const checkResult = await client.query(checkQuery, [data.employee_id, id]);

        if (checkResult.rows.length > 0) {
          throw new Error(`Employee ID ${data.employee_id} already exists`);
        }

        updateFields.push(`employee_id = $${paramIndex}`);
        queryParams.push(data.employee_id);
        paramIndex++;
      }

      if (data.skill_level !== undefined) {
        updateFields.push(`skill_level = $${paramIndex}`);
        queryParams.push(data.skill_level);
        paramIndex++;
      }

      if (data.department !== undefined) {
        updateFields.push(`department = $${paramIndex}`);
        queryParams.push(data.department);
        paramIndex++;
      }

      if (data.availability_status !== undefined) {
        updateFields.push(`availability_status = $${paramIndex}`);
        queryParams.push(data.availability_status);
        paramIndex++;
      }

      if (data.hourly_rate !== undefined) {
        updateFields.push(`hourly_rate = $${paramIndex}`);
        queryParams.push(data.hourly_rate);
        paramIndex++;
      }

      if (data.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(data.is_active);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error("No fields to update");
      }

      queryParams.push(updated_by, id);

      const query = `
        UPDATE operators
        SET ${updateFields.join(', ')}, updated_by = $${paramIndex}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, queryParams);

      if (result.rows.length === 0) {
        throw new Error(`Operator with ID ${id} not found`);
      }

      const row = result.rows[0];

      const operator: Operator = {
        id: row.id.toString(),
        user_id: row.user_id,
        employee_id: row.employee_id,
        skill_level: row.skill_level,
        department: row.department,
        current_work_order_id: row.current_work_order_id?.toString(),
        availability_status: row.availability_status,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      };

      MyLogger.success(action, { operator: { id, employee_id: operator.employee_id } });

      return operator;
    } catch (error: any) {
      MyLogger.error(action, error, { id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete operator
  static async deleteOperator(id: string): Promise<boolean> {
    const action = "Delete Operator";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      // Check if operator is assigned to work orders
      const checkQuery = `
        SELECT COUNT(*) as assignment_count
        FROM work_order_assignments
        WHERE operator_id = $1
      `;

      const checkResult = await client.query(checkQuery, [id]);
      const assignmentCount = parseInt(checkResult.rows[0].assignment_count);

      if (assignmentCount > 0) {
        throw new Error(`Cannot delete operator. They are assigned to ${assignmentCount} work order(s)`);
      }

      const query = `DELETE FROM operators WHERE id = $1`;
      const result = await client.query(query, [id]);

      const deleted = result.rowCount > 0;

      MyLogger.success(action, { deleted, id });

      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update operator availability status
  static async updateOperatorAvailability(
    id: string,
    availability_status: string,
    current_work_order_id?: string
  ): Promise<Operator> {
    const action = "Update Operator Availability";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id, availability_status, current_work_order_id });

      const query = `
        UPDATE operators
        SET availability_status = $1, current_work_order_id = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(query, [availability_status, current_work_order_id, id]);

      if (result.rows.length === 0) {
        throw new Error(`Operator with ID ${id} not found`);
      }

      const row = result.rows[0];

      const operator: Operator = {
        id: row.id.toString(),
        user_id: row.user_id,
        employee_id: row.employee_id,
        skill_level: row.skill_level,
        department: row.department,
        current_work_order_id: row.current_work_order_id?.toString(),
        availability_status: row.availability_status,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      };

      MyLogger.success(action, {
        operator: { id, employee_id: operator.employee_id },
        newStatus: availability_status,
      });

      return operator;
    } catch (error: any) {
      MyLogger.error(action, error, { id, availability_status });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get operator statistics
  static async getOperatorStats(factory_id?: number): Promise<{
    total_operators: number;
    active_operators: number;
    available_operators: number;
    busy_operators: number;
    off_duty_operators: number;
    on_leave_operators: number;
    beginner_operators: number;
    intermediate_operators: number;
    expert_operators: number;
    master_operators: number;
    average_hourly_rate: number;
  }> {
    const action = "Get Operator Stats";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { factory_id });

      let whereClause = "";
      const queryParams: any[] = [];

      if (factory_id !== undefined && factory_id !== null) {
        whereClause = "WHERE factory_id = $1";
        queryParams.push(factory_id);
      }

      const query = `
        SELECT
          COUNT(*) as total_operators,
          COUNT(*) FILTER (WHERE is_active = true) as active_operators,
          COUNT(*) FILTER (WHERE availability_status = 'available') as available_operators,
          COUNT(*) FILTER (WHERE availability_status = 'busy') as busy_operators,
          COUNT(*) FILTER (WHERE availability_status = 'off_duty') as off_duty_operators,
          COUNT(*) FILTER (WHERE availability_status = 'on_leave') as on_leave_operators,
          COUNT(*) FILTER (WHERE skill_level = 'beginner') as beginner_operators,
          COUNT(*) FILTER (WHERE skill_level = 'intermediate') as intermediate_operators,
          COUNT(*) FILTER (WHERE skill_level = 'expert') as expert_operators,
          COUNT(*) FILTER (WHERE skill_level = 'master') as master_operators,
          COALESCE(AVG(hourly_rate), 0) as average_hourly_rate
        FROM operators o
        ${whereClause}
      `;

      const result = await client.query(query, queryParams);
      const row = result.rows[0];

      const stats = {
        total_operators: parseInt(row.total_operators),
        active_operators: parseInt(row.active_operators),
        available_operators: parseInt(row.available_operators),
        busy_operators: parseInt(row.busy_operators),
        off_duty_operators: parseInt(row.off_duty_operators),
        on_leave_operators: parseInt(row.on_leave_operators),
        beginner_operators: parseInt(row.beginner_operators),
        intermediate_operators: parseInt(row.intermediate_operators),
        expert_operators: parseInt(row.expert_operators),
        master_operators: parseInt(row.master_operators),
        average_hourly_rate: parseFloat(row.average_hourly_rate),
      };

      MyLogger.success(action, { stats });

      return stats;
    } catch (error: any) {
      MyLogger.error(action, error, { factory_id });
      throw error;
    } finally {
      client.release();
    }
  }
}
