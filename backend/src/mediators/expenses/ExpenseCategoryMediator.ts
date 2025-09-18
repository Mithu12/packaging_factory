import { pool } from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  ExpenseCategory,
  CreateExpenseCategoryRequest,
  UpdateExpenseCategoryRequest,
  ExpenseCategoryQueryParams,
  ExpenseCategoryListResponse
} from '@/types/expense';

export class ExpenseCategoryMediator {
  // Create new expense category
  async createExpenseCategory(data: CreateExpenseCategoryRequest): Promise<ExpenseCategory> {
    let action = 'Create Expense Category';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { name: data.name });

      const insertQuery = `
        INSERT INTO expense_categories (name, description, color)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        data.name,
        data.description || null,
        data.color || '#3B82F6'
      ];

      const result = await client.query(insertQuery, values);
      const category = result.rows[0];

      MyLogger.success(action, { categoryId: category.id, name: category.name });
      return category;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get expense categories with filtering and pagination
  async getExpenseCategories(params: ExpenseCategoryQueryParams): Promise<ExpenseCategoryListResponse> {
    let action = 'Get Expense Categories';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { params });

      let query = `
        SELECT *
        FROM expense_categories
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add filters
      if (params.search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }

      if (params.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        queryParams.push(params.is_active);
        paramIndex++;
      }

      // Add sorting
      const validSortColumns = ['id', 'name', 'created_at', 'updated_at'];
      const sortColumn = validSortColumns.includes(params.sortBy || 'name') ? params.sortBy || 'name' : 'name';
      const sortDirection = params.sortOrder === 'desc' ? 'DESC' : 'ASC';
      
      query += ` ORDER BY ${sortColumn} ${sortDirection}`;

      // Add pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);
      const categories = result.rows;

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM expense_categories
        WHERE 1=1
      `;
      
      const countParams: any[] = [];
      let countParamIndex = 1;

      // Apply same filters for count
      if (params.search) {
        countQuery += ` AND (name ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
        countParams.push(`%${params.search}%`);
        countParamIndex++;
      }

      if (params.is_active !== undefined) {
        countQuery += ` AND is_active = $${countParamIndex}`;
        countParams.push(params.is_active);
        countParamIndex++;
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, { count: categories.length, total, page, totalPages });

      return {
        categories,
        total,
        page,
        limit,
        total_pages: totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get expense category by ID
  async getExpenseCategoryById(id: number): Promise<ExpenseCategory> {
    let action = 'Get Expense Category By ID';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { categoryId: id });

      const query = 'SELECT * FROM expense_categories WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw createError('Expense category not found', 404);
      }

      const category = result.rows[0];
      MyLogger.success(action, { categoryId: id, name: category.name });
      return category;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update expense category
  async updateExpenseCategory(id: number, data: UpdateExpenseCategoryRequest): Promise<ExpenseCategory> {
    let action = 'Update Expense Category';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { categoryId: id });

      // Check if category exists
      const checkResult = await client.query('SELECT id FROM expense_categories WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        throw createError('Expense category not found', 404);
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw createError('No fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE expense_categories 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const category = result.rows[0];

      MyLogger.success(action, { categoryId: id, name: category.name });
      return category;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete expense category
  async deleteExpenseCategory(id: number): Promise<void> {
    let action = 'Delete Expense Category';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { categoryId: id });

      // Check if category is being used by any expenses
      const usageCheck = await client.query('SELECT COUNT(*) as count FROM expenses WHERE category_id = $1', [id]);
      const usageCount = parseInt(usageCheck.rows[0].count);

      if (usageCount > 0) {
        throw createError('Cannot delete category that is being used by expenses', 400);
      }

      const result = await client.query('DELETE FROM expense_categories WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        throw createError('Expense category not found', 404);
      }

      MyLogger.success(action, { categoryId: id });

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all active expense categories (for dropdowns)
  async getActiveExpenseCategories(): Promise<ExpenseCategory[]> {
    let action = 'Get Active Expense Categories';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action);

      const query = `
        SELECT *
        FROM expense_categories
        WHERE is_active = true
        ORDER BY name ASC
      `;

      const result = await client.query(query);
      const categories = result.rows;

      MyLogger.success(action, { count: categories.length });
      return categories;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
