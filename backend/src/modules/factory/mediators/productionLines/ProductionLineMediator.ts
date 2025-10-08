import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  ProductionLine,
  CreateProductionLineRequest,
  UpdateProductionLineRequest,
} from "@/types/factory";

export class ProductionLineMediator {
  // Get all production lines with filtering and pagination
  static async getProductionLines(
    params: {
      factory_id?: number;
      status?: string;
      is_active?: boolean;
      search?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    production_lines: ProductionLine[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "Get Production Lines";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        factory_id,
        status,
        is_active = true,
        search,
        sort_by = "name",
        sort_order = "asc",
        page = 1,
        limit = 20,
      } = params;

      const offset = (page - 1) * limit;

      // Build the WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      if (factory_id !== undefined && factory_id !== null) {
        whereConditions.push(`pl.factory_id = $${queryParams.length + 1}`);
        queryParams.push(factory_id);
      }

      if (status) {
        whereConditions.push(`pl.status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }

      if (is_active !== undefined) {
        whereConditions.push(`pl.is_active = $${queryParams.length + 1}`);
        queryParams.push(is_active);
      }

      if (search) {
        whereConditions.push(`(pl.name ILIKE $${queryParams.length + 1} OR pl.code ILIKE $${queryParams.length + 1} OR pl.description ILIKE $${queryParams.length + 1})`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM production_lines pl
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get production lines with pagination
      const dataQuery = `
        SELECT
          pl.*,
          f.name as factory_name
        FROM production_lines pl
        LEFT JOIN factories f ON pl.factory_id = f.id
        ${whereClause}
        ORDER BY pl.${sort_by} ${sort_order}
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      queryParams.push(limit, offset);

      const result = await client.query(dataQuery, queryParams);

      const production_lines: ProductionLine[] = result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        code: row.code,
        description: row.description,
        capacity: row.capacity,
        current_load: row.current_load,
        status: row.status,
        location: row.location,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
        // Populated fields
        factory_name: row.factory_name,
      }));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        count: production_lines.length,
        total,
        page,
        totalPages,
      });

      return {
        production_lines,
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

  // Get production line by ID
  static async getProductionLineById(id: string): Promise<ProductionLine> {
    const action = "Get Production Line by ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      const query = `
        SELECT
          pl.*,
          f.name as factory_name
        FROM production_lines pl
        LEFT JOIN factories f ON pl.factory_id = f.id
        WHERE pl.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error(`Production line with ID ${id} not found`);
      }

      const row = result.rows[0];

      const production_line: ProductionLine = {
        id: row.id.toString(),
        name: row.name,
        code: row.code,
        description: row.description,
        capacity: row.capacity,
        current_load: row.current_load,
        status: row.status,
        location: row.location,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      };

      MyLogger.success(action, { production_line: { id, name: production_line.name } });

      return production_line;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Create new production line
  static async createProductionLine(
    factory_id: number | null,
    data: CreateProductionLineRequest,
    created_by: number
  ): Promise<ProductionLine> {
    const action = "Create Production Line";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { factory_id, data, created_by });

      const query = `
        INSERT INTO production_lines (
          factory_id, name, code, description, capacity, location, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        factory_id,
        data.name,
        data.code,
        data.description,
        data.capacity,
        data.location,
        created_by,
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      const production_line: ProductionLine = {
        id: row.id.toString(),
        name: row.name,
        code: row.code,
        description: row.description,
        capacity: row.capacity,
        current_load: row.current_load,
        status: row.status,
        location: row.location,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      };

      MyLogger.success(action, { production_line: { id: production_line.id, name: production_line.name } });

      return production_line;
    } catch (error: any) {
      MyLogger.error(action, error, { factory_id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update production line
  static async updateProductionLine(
    id: string,
    data: UpdateProductionLineRequest,
    updated_by: number
  ): Promise<ProductionLine> {
    const action = "Update Production Line";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id, data, updated_by });

      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(data.name);
        paramIndex++;
      }

      if (data.code !== undefined) {
        updateFields.push(`code = $${paramIndex}`);
        queryParams.push(data.code);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        queryParams.push(data.description);
        paramIndex++;
      }

      if (data.capacity !== undefined) {
        updateFields.push(`capacity = $${paramIndex}`);
        queryParams.push(data.capacity);
        paramIndex++;
      }

      if (data.location !== undefined) {
        updateFields.push(`location = $${paramIndex}`);
        queryParams.push(data.location);
        paramIndex++;
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        queryParams.push(data.status);
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
        UPDATE production_lines
        SET ${updateFields.join(', ')}, updated_by = $${paramIndex}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, queryParams);

      if (result.rows.length === 0) {
        throw new Error(`Production line with ID ${id} not found`);
      }

      const row = result.rows[0];

      const production_line: ProductionLine = {
        id: row.id.toString(),
        name: row.name,
        code: row.code,
        description: row.description,
        capacity: row.capacity,
        current_load: row.current_load,
        status: row.status,
        location: row.location,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      };

      MyLogger.success(action, { production_line: { id, name: production_line.name } });

      return production_line;
    } catch (error: any) {
      MyLogger.error(action, error, { id, data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete production line
  static async deleteProductionLine(id: string): Promise<boolean> {
    const action = "Delete Production Line";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id });

      // Check if production line is being used in work orders
      const checkQuery = `
        SELECT COUNT(*) as work_order_count
        FROM work_orders
        WHERE production_line_id = $1
      `;

      const checkResult = await client.query(checkQuery, [id]);
      const workOrderCount = parseInt(checkResult.rows[0].work_order_count);

      if (workOrderCount > 0) {
        throw new Error(`Cannot delete production line. It is assigned to ${workOrderCount} work order(s)`);
      }

      const query = `DELETE FROM production_lines WHERE id = $1`;
      const result = await client.query(query, [id]);

      const deleted = (result.rowCount ?? 0) > 0;

      MyLogger.success(action, { deleted, id });

      return deleted;
    } catch (error: any) {
      MyLogger.error(action, error, { id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update production line load
  static async updateProductionLineLoad(
    id: string,
    loadChange: number
  ): Promise<ProductionLine> {
    const action = "Update Production Line Load";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { id, loadChange });

      const query = `
        UPDATE production_lines
        SET current_load = GREATEST(0, current_load + $1)
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(query, [loadChange, id]);

      if (result.rows.length === 0) {
        throw new Error(`Production line with ID ${id} not found`);
      }

      const row = result.rows[0];

      const production_line: ProductionLine = {
        id: row.id.toString(),
        name: row.name,
        code: row.code,
        description: row.description,
        capacity: row.capacity,
        current_load: row.current_load,
        status: row.status,
        location: row.location,
        is_active: row.is_active,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at?.toISOString(),
      };

      MyLogger.success(action, {
        production_line: { id, name: production_line.name },
        newLoad: production_line.current_load,
      });

      return production_line;
    } catch (error: any) {
      MyLogger.error(action, error, { id, loadChange });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get production line statistics
  static async getProductionLineStats(factory_id?: number): Promise<{
    total_lines: number;
    available_lines: number;
    busy_lines: number;
    maintenance_lines: number;
    offline_lines: number;
    total_capacity: number;
    current_load: number;
    utilization_rate: number;
  }> {
    const action = "Get Production Line Stats";
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
          COUNT(*) as total_lines,
          COUNT(*) FILTER (WHERE status = 'available') as available_lines,
          COUNT(*) FILTER (WHERE status = 'busy') as busy_lines,
          COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_lines,
          COUNT(*) FILTER (WHERE status = 'offline') as offline_lines,
          COALESCE(SUM(capacity), 0) as total_capacity,
          COALESCE(SUM(current_load), 0) as current_load
        FROM production_lines pl
        ${whereClause}
      `;

      const result = await client.query(query, queryParams);
      const row = result.rows[0];

      const stats = {
        total_lines: parseInt(row.total_lines),
        available_lines: parseInt(row.available_lines),
        busy_lines: parseInt(row.busy_lines),
        maintenance_lines: parseInt(row.maintenance_lines),
        offline_lines: parseInt(row.offline_lines),
        total_capacity: parseInt(row.total_capacity),
        current_load: parseInt(row.current_load),
        utilization_rate: row.total_capacity > 0 ?
          Math.round((row.current_load / row.total_capacity) * 100) : 0,
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
