import pool from "../../../../src/database/connection";
import {
  CreateCategoryRequest,
  CreateSubcategoryRequest,
  Category,
  Subcategory,
} from "../../../../src/types/category";
import { createError } from "../../../../src/middleware/errorHandler";
import { MyLogger } from "../../../../src/utils/new-logger";

class AddCategoryMediator {
  // Create a new category
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    let action = "Create Category";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { categoryName: data.name });

      const { name, description } = data;

      const query = `
                INSERT INTO categories (name, description)
                VALUES ($1, $2)
                RETURNING *
            `;

      const values = [name, description];

      const result = await client.query(query, values);
      MyLogger.success(action, {
        categoryId: result.rows[0].id,
        categoryName: result.rows[0].name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { categoryName: data.name });
      if (error.code === "23505") {
        // Unique violation
        throw createError("Category with this name already exists", 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Create a new subcategory
  async createSubcategory(
    data: CreateSubcategoryRequest
  ): Promise<Subcategory> {
    let action = "Create Subcategory";
    const client = await pool.connect();
    try {
      MyLogger.info(action, {
        subcategoryName: data.name,
        categoryId: data.category_id,
      });

      const { name, description, category_id } = data;

      // First, verify that the category exists
      const categoryCheck = await client.query(
        "SELECT id FROM categories WHERE id = $1",
        [category_id]
      );
      if (categoryCheck.rows.length === 0) {
        MyLogger.warn(action, {
          categoryId: category_id,
          message: "Parent category not found",
        });
        throw createError("Parent category not found", 404);
      }

      const query = `
                INSERT INTO subcategories (name, description, category_id)
                VALUES ($1, $2, $3)
                RETURNING *
            `;

      const values = [name, description, category_id];

      const result = await client.query(query, values);
      MyLogger.success(action, {
        subcategoryId: result.rows[0].id,
        subcategoryName: result.rows[0].name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, {
        subcategoryName: data.name,
        categoryId: data.category_id,
      });
      if (error.code === "23505") {
        // Unique violation
        throw createError(
          "Subcategory with this name already exists in this category",
          409
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AddCategoryMediator();
