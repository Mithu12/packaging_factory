import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import GetCategoryInfoMediator from "./GetCategoryInfo.mediator";
import { MyLogger } from "@/utils/new-logger";

class DeleteCategoryMediator {
  // Delete category (and all its subcategories)
  async deleteCategory(id: number): Promise<void> {
    let action = "Delete Category";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { categoryId: id });

      // Check if category exists
      const category = await GetCategoryInfoMediator.getCategoryById(id);

      // Delete all subcategories first (due to foreign key constraint)
      await client.query("DELETE FROM subcategories WHERE category_id = $1", [
        id,
      ]);
      MyLogger.info("Delete Subcategories", {
        categoryId: id,
        message: "Deleted all subcategories",
      });

      // Delete the category
      const result = await client.query(
        "DELETE FROM categories WHERE id = $1",
        [id]
      );

      if (result.rowCount === 0) {
        MyLogger.warn(action, {
          categoryId: id,
          message: "Category not found for deletion",
        });
        throw createError("Category not found", 404);
      }

      MyLogger.success(action, { categoryId: id, categoryName: category.name });
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete subcategory
  async deleteSubcategory(id: number): Promise<void> {
    let action = "Delete Subcategory";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { subcategoryId: id });

      // Check if subcategory exists
      const subcategory = await GetCategoryInfoMediator.getSubcategoryById(id);

      const result = await client.query(
        "DELETE FROM subcategories WHERE id = $1",
        [id]
      );

      if (result.rowCount === 0) {
        MyLogger.warn(action, {
          subcategoryId: id,
          message: "Subcategory not found for deletion",
        });
        throw createError("Subcategory not found", 404);
      }

      MyLogger.success(action, {
        subcategoryId: id,
        subcategoryName: subcategory.name,
      });
    } catch (error: any) {
      MyLogger.error(action, error, { subcategoryId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DeleteCategoryMediator();
