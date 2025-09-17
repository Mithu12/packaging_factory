import pool from "@/database/connection";
import { 
  SupplierCategory, 
  CreateSupplierCategoryRequest, 
  UpdateSupplierCategoryRequest,
  SupplierCategoryQueryParams 
} from "@/types/supplier-category";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class SupplierCategoryMediator {

  // Get all supplier categories with pagination and filtering
  async getSupplierCategories(params: SupplierCategoryQueryParams = {}): Promise<{
    categories: SupplierCategory[],
    total: number,
    page: number,
    limit: number
  }> {
    let action = 'Get Supplier Categories'
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params })
      
      const page = params.page || 1;
      const limit = params.limit || 100;
      const offset = (page - 1) * limit;
      const search = params.search || '';
      const isActive = params.is_active;

      let whereClause = '';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` WHERE (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (isActive !== undefined) {
        whereClause += whereClause ? ` AND is_active = $${paramIndex}` : ` WHERE is_active = $${paramIndex}`;
        queryParams.push(isActive);
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM supplier_categories${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get categories
      const query = `
        SELECT * FROM supplier_categories
        ${whereClause}
        ORDER BY name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);
      
      MyLogger.success(action, { total, page, limit, count: result.rows.length })
      return {
        categories: result.rows,
        total,
        page,
        limit
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params })
      throw error;
    } finally {
      client.release();
    }
  }

  // Get a single supplier category by ID
  async getSupplierCategoryById(id: number): Promise<SupplierCategory> {
    let action = 'Get Supplier Category By ID'
    const client = await pool.connect();
    try {
      MyLogger.info(action, { categoryId: id })
      
      const query = 'SELECT * FROM supplier_categories WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw createError('Supplier category not found', 404);
      }

      MyLogger.success(action, { categoryId: id, categoryName: result.rows[0].name })
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: id })
      throw error;
    } finally {
      client.release();
    }
  }

  // Create a new supplier category
  async createSupplierCategory(data: CreateSupplierCategoryRequest): Promise<SupplierCategory> {
    let action = 'Create Supplier Category'
    const client = await pool.connect();
    try {
      MyLogger.info(action, { categoryName: data.name })
      
      const { name, description, color = '#3B82F6' } = data;

      const query = `
        INSERT INTO supplier_categories (name, description, color)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [name, description, color];
      const result = await client.query(query, values);

      MyLogger.success(action, { categoryId: result.rows[0].id, categoryName: result.rows[0].name })
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { categoryName: data.name })
      if (error.code === '23505') { // Unique violation
        throw createError('Supplier category with this name already exists', 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Update a supplier category
  async updateSupplierCategory(id: number, data: UpdateSupplierCategoryRequest): Promise<SupplierCategory> {
    let action = 'Update Supplier Category'
    const client = await pool.connect();
    try {
      MyLogger.info(action, { categoryId: id, updateData: data })
      
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        fields.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }

      if (data.description !== undefined) {
        fields.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }

      if (data.color !== undefined) {
        fields.push(`color = $${paramIndex}`);
        values.push(data.color);
        paramIndex++;
      }

      if (data.is_active !== undefined) {
        fields.push(`is_active = $${paramIndex}`);
        values.push(data.is_active);
        paramIndex++;
      }

      if (fields.length === 0) {
        throw createError('No fields to update', 400);
      }

      values.push(id);
      const query = `
        UPDATE supplier_categories 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw createError('Supplier category not found', 404);
      }

      MyLogger.success(action, { categoryId: id, categoryName: result.rows[0].name })
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: id, updateData: data })
      if (error.code === '23505') { // Unique violation
        throw createError('Supplier category with this name already exists', 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete a supplier category
  async deleteSupplierCategory(id: number): Promise<void> {
    let action = 'Delete Supplier Category'
    const client = await pool.connect();
    try {
      MyLogger.info(action, { categoryId: id })
      
      // Check if category is being used by any suppliers
      const checkQuery = 'SELECT COUNT(*) FROM suppliers WHERE category = (SELECT name FROM supplier_categories WHERE id = $1)';
      const checkResult = await client.query(checkQuery, [id]);
      const supplierCount = parseInt(checkResult.rows[0].count);

      if (supplierCount > 0) {
        throw createError(`Cannot delete category. It is being used by ${supplierCount} supplier(s).`, 409);
      }

      const query = 'DELETE FROM supplier_categories WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rowCount === 0) {
        throw createError('Supplier category not found', 404);
      }

      MyLogger.success(action, { categoryId: id })
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: id })
      throw error;
    } finally {
      client.release();
    }
  }

  // Get simple list of category names (for backward compatibility)
  async getSupplierCategoryNames(): Promise<string[]> {
    let action = 'Get Supplier Category Names'
    const client = await pool.connect();
    try {
      MyLogger.info(action)
      
      const query = 'SELECT name FROM supplier_categories WHERE is_active = true ORDER BY name';
      const result = await client.query(query);

      const categories = result.rows.map(row => row.name);
      MyLogger.success(action, { categoriesCount: categories.length })
      return categories;
    } catch (error: any) {
      MyLogger.error(action, error)
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new SupplierCategoryMediator();
