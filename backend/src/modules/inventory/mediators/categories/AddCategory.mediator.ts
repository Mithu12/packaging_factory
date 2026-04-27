import pool from "@/database/connection";
import {
  CreateCategoryRequest,
  CreateSubcategoryRequest,
  Category,
  Subcategory,
} from "@/types/category";
import { isInventoryPrimaryCategoryName } from "@/constants/inventoryProductCategories";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class AddCategoryMediator {
  // Create a new category
  async createCategory(_data: CreateCategoryRequest): Promise<Category> {
    const action = "Create Category";
    MyLogger.info(action, { attemptedName: _data.name });
    throw createError(
      "Top-level categories are fixed to Raw Materials, Ready Raw Materials, and Ready Goods. Create subcategories instead.",
      400
    );
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

      const categoryCheck = await client.query(
        "SELECT id, name FROM categories WHERE id = $1",
        [category_id]
      );
      if (categoryCheck.rows.length === 0) {
        MyLogger.warn(action, {
          categoryId: category_id,
          message: "Parent category not found",
        });
        throw createError("Parent category not found", 404);
      }

      const parentName = categoryCheck.rows[0].name as string;
      if (!isInventoryPrimaryCategoryName(parentName)) {
        throw createError(
          "Subcategories can only be created under Raw Materials, Ready Raw Materials, or Ready Goods",
          400
        );
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
