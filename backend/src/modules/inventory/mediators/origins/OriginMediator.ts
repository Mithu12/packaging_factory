import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { createError } from "@/utils/responseHelper";
import {
  Origin,
  CreateOriginRequest,
  UpdateOriginRequest,
  OriginWithProductCount,
} from "@/types/origin";

export class OriginMediator {
  // Get all origins with product count
  static async getAllOrigins(): Promise<OriginWithProductCount[]> {
    const action = "Get All Origins";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const result = await client.query(`
        SELECT 
          o.*,
          COALESCE(p.product_count, 0) as product_count
        FROM origins o
        LEFT JOIN (
          SELECT origin_id, COUNT(*) as product_count
          FROM products
          WHERE status = 'active'
          GROUP BY origin_id
        ) p ON o.id = p.origin_id
        ORDER BY o.created_at DESC
      `);

      const origins = result.rows.map((row) => ({
        ...row,
        product_count: parseInt(row.product_count) || 0,
      }));

      MyLogger.success(action, { count: origins.length });
      return origins;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get origin by ID
  static async getOriginById(id: number): Promise<OriginWithProductCount> {
    const action = "Get Origin By ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { origin_id: id });

      const result = await client.query(
        `
        SELECT 
          o.*,
          COALESCE(p.product_count, 0) as product_count
        FROM origins o
        LEFT JOIN (
          SELECT origin_id, COUNT(*) as product_count
          FROM products
          WHERE status = 'active'
          GROUP BY origin_id
        ) p ON o.id = p.origin_id
        WHERE o.id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        throw createError("Origin not found", 404);
      }

      const origin = {
        ...result.rows[0],
        product_count: parseInt(result.rows[0].product_count) || 0,
      };

      MyLogger.success(action, { origin_id: id });
      return origin;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create new origin
  static async createOrigin(originData: CreateOriginRequest): Promise<Origin> {
    const action = "Create Origin";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { name: originData.name });

      // Check if origin name already exists
      const existingOrigin = await client.query(
        "SELECT id FROM origins WHERE LOWER(name) = LOWER($1)",
        [originData.name]
      );

      if (existingOrigin.rows.length > 0) {
        throw createError("Origin name already exists", 400);
      }

      const result = await client.query(
        `
        INSERT INTO origins (name, description, status)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
        [
          originData.name,
          originData.description || null,
          originData.status || "active",
        ]
      );

      const origin = result.rows[0];
      MyLogger.success(action, { origin_id: origin.id, name: origin.name });

      return origin;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update origin
  static async updateOrigin(
    id: number,
    updateData: UpdateOriginRequest
  ): Promise<Origin> {
    const action = "Update Origin";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { origin_id: id });

      // Check if origin exists
      const existingOrigin = await client.query(
        "SELECT id FROM origins WHERE id = $1",
        [id]
      );

      if (existingOrigin.rows.length === 0) {
        throw createError("Origin not found", 404);
      }

      // Check if new name already exists (if name is being updated)
      if (updateData.name) {
        const nameCheck = await client.query(
          "SELECT id FROM origins WHERE LOWER(name) = LOWER($1) AND id != $2",
          [updateData.name, id]
        );

        if (nameCheck.rows.length > 0) {
          throw createError("Origin name already exists", 400);
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(updateData.name);
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(updateData.description || null);
      }

      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(updateData.status);
      }

      if (updateFields.length === 0) {
        throw createError("No fields to update", 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await client.query(
        `
        UPDATE origins 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `,
        updateValues
      );

      const origin = result.rows[0];
      MyLogger.success(action, { origin_id: id });

      return origin;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete origin (soft delete by setting status to inactive)
  static async deleteOrigin(id: number): Promise<void> {
    const action = "Delete Origin";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { origin_id: id });

      // Check if origin exists
      const existingOrigin = await client.query(
        "SELECT id FROM origins WHERE id = $1",
        [id]
      );

      if (existingOrigin.rows.length === 0) {
        throw createError("Origin not found", 404);
      }

      // Check if origin has active products
      const productCount = await client.query(
        `SELECT COUNT(*) as count FROM products WHERE origin_id = $1 AND status = 'active'`,
        [id]
      );

      if (parseInt(productCount.rows[0].count) > 0) {
        throw createError("Cannot delete origin with active products", 400);
      }

      // Soft delete by setting status to inactive
      await client.query("DELETE FROM origins WHERE id = $1", [id]);

      MyLogger.success(action, { origin_id: id });
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get origins by status
  static async getOriginsByStatus(
    status: "active" | "inactive"
  ): Promise<OriginWithProductCount[]> {
    const action = "Get Origins By Status";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { status });

      const result = await client.query(
        `
        SELECT 
          o.*,
          COALESCE(p.product_count, 0) as product_count
        FROM origins o
        LEFT JOIN (
          SELECT origin_id, COUNT(*) as product_count
          FROM products
          WHERE status = 'active'
          GROUP BY origin_id
        ) p ON o.id = p.origin_id
        WHERE o.status = $1
        ORDER BY o.created_at DESC
      `,
        [status]
      );

      const origins = result.rows.map((row) => ({
        ...row,
        product_count: parseInt(row.product_count) || 0,
      }));

      MyLogger.success(action, { count: origins.length, status });
      return origins;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get origin statistics
  static async getOriginStats(): Promise<{
    total_origins: number;
    active_origins: number;
    inactive_origins: number;
    total_products: number;
  }> {
    const action = "Get Origin Statistics";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const result = await client.query(`
        SELECT 
          COUNT(*) as total_origins,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_origins,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_origins,
          COALESCE(SUM(p.product_count), 0) as total_products
        FROM origins o
        LEFT JOIN (
          SELECT origin_id, COUNT(*) as product_count
          FROM products
          WHERE status = 'active'
          GROUP BY origin_id
        ) p ON o.id = p.origin_id
      `);

      const stats = {
        total_origins: parseInt(result.rows[0].total_origins) || 0,
        active_origins: parseInt(result.rows[0].active_origins) || 0,
        inactive_origins: parseInt(result.rows[0].inactive_origins) || 0,
        total_products: parseInt(result.rows[0].total_products) || 0,
      };

      MyLogger.success(action, { stats });
      return stats;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
