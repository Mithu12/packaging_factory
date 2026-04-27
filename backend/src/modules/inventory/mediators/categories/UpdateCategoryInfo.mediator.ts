import {
  Category,
  Subcategory,
  UpdateCategoryRequest,
  UpdateSubcategoryRequest,
} from "@/types/category";
import pool from "@/database/connection";
import { isInventoryPrimaryCategoryName } from "@/constants/inventoryProductCategories";
import { createError } from "@/middleware/errorHandler";
import GetCategoryInfoMediator from "./GetCategoryInfo.mediator";
import { MyLogger } from "@/utils/new-logger";

class UpdateCategoryInfoMediator {
  // Update category
  async updateCategory(
    id: number,
    data: UpdateCategoryRequest
  ): Promise<Category> {
    let action = "Update Category";
    const client = await pool.connect();
    try {
      MyLogger.info(action, {
        categoryId: id,
        updateFields: Object.keys(data),
      });

      const existing = await GetCategoryInfoMediator.getCategoryById(id);
      if (
        isInventoryPrimaryCategoryName(existing.name) &&
        data.name !== undefined &&
        data.name !== existing.name
      ) {
        throw createError(
          "Cannot rename Raw Materials, Ready Raw Materials, or Ready Goods",
          400
        );
      }

      const { name, description } = data;

      const query = {
        text: `
                    UPDATE categories
                    SET name = $2,
                        description = $3
                    WHERE id = $1
                    RETURNING *
                `,
        values: [id, name, description],
      };

      const result = await client.query(query);

      if (result.rows.length === 0) {
        MyLogger.warn(action, {
          categoryId: id,
          message: "Category not found",
        });
        throw createError("Category not found", 404);
      }

      MyLogger.success(action, {
        categoryId: id,
        categoryName: result.rows[0].name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: id });
      if (error.code === "23505") {
        // Unique violation
        throw createError("Category with this name already exists", 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Update subcategory
  async updateSubcategory(
    id: number,
    data: UpdateSubcategoryRequest
  ): Promise<Subcategory> {
    let action = "Update Subcategory";
    const client = await pool.connect();
    try {
      MyLogger.info(action, {
        subcategoryId: id,
        updateFields: Object.keys(data),
      });

      const { name, description, category_id } = data;

      if (category_id) {
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
            "Subcategories can only be placed under Raw Materials, Ready Raw Materials, or Ready Goods",
            400
          );
        }
      }

      const query = {
        text: `
                    UPDATE subcategories
                    SET name = $2,
                        description = $3,
                        category_id = $4
                    WHERE id = $1
                    RETURNING *
                `,
        values: [id, name, description, category_id],
      };

      const result = await client.query(query);

      if (result.rows.length === 0) {
        MyLogger.warn(action, {
          subcategoryId: id,
          message: "Subcategory not found",
        });
        throw createError("Subcategory not found", 404);
      }

      MyLogger.success(action, {
        subcategoryId: id,
        subcategoryName: result.rows[0].name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { subcategoryId: id });
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

export default new UpdateCategoryInfoMediator();
