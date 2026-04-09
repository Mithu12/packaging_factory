import {
  Category,
  Subcategory,
  CategoryQueryParams,
  SubcategoryQueryParams,
  CategoryStats,
} from "@/types/category";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { INVENTORY_PRIMARY_CATEGORY_NAMES } from "@/constants/inventoryProductCategories";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetCategoryInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get all categories with pagination and filtering
  async getCategoryList(params: CategoryQueryParams): Promise<{
    categories: Category[];
    total: number;
    page: number;
    limit: number;
  }> {
    let action = "Get Category List";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 10,
        search,
        sortBy = "id",
        sortOrder = "asc",
        primary_product_types_only,
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (primary_product_types_only) {
        whereConditions.push(`name = ANY($${paramIndex}::text[])`);
        queryParams.push(INVENTORY_PRIMARY_CATEGORY_NAMES);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM categories ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get categories
      const categoriesQuery = `
                SELECT *
                FROM categories ${whereClause}
                ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

      queryParams.push(limit, offset);
      const categoriesResult = await client.query(categoriesQuery, queryParams);

      MyLogger.success(action, {
        total,
        page,
        limit,
        returnedCount: categoriesResult.rows.length,
      });
      return {
        categories: categoriesResult.rows,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get category by ID with subcategories
  async getCategoryById(id: number): Promise<Category> {
    let action = "Get Category By ID";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { categoryId: id });

      const result = await client.query(
        "SELECT * FROM categories WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        MyLogger.warn(action, {
          categoryId: id,
          message: "Category not found",
        });
        throw createError("Category not found", 404);
      }

      const category = result.rows[0];

      // Get subcategories for this category
      const subcategoriesResult = await client.query(
        "SELECT * FROM subcategories WHERE category_id = $1 ORDER BY name",
        [id]
      );

      category.subcategories = subcategoriesResult.rows;

      MyLogger.success(action, {
        categoryId: id,
        categoryName: category.name,
        subcategoriesCount: subcategoriesResult.rows.length,
      });
      return category;
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all subcategories with pagination and filtering
  async getSubcategoryList(params: SubcategoryQueryParams): Promise<{
    subcategories: Subcategory[];
    total: number;
    page: number;
    limit: number;
  }> {
    let action = "Get Subcategory List";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 10,
        search,
        category_id,
        sortBy = "id",
        sortOrder = "asc",
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (category_id) {
        whereConditions.push(`s.category_id = $${paramIndex}`);
        queryParams.push(category_id);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count total records
      const countQuery = `
                SELECT COUNT(*) 
                FROM subcategories s 
                ${whereClause}
            `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get subcategories with category name
      const subcategoriesQuery = `
                SELECT s.*, c.name as category_name
                FROM subcategories s
                LEFT JOIN categories c ON s.category_id = c.id
                ${whereClause}
                ORDER BY s.${sortBy} ${sortOrder.toUpperCase()}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

      queryParams.push(limit, offset);
      const subcategoriesResult = await client.query(
        subcategoriesQuery,
        queryParams
      );

      MyLogger.success(action, {
        total,
        page,
        limit,
        returnedCount: subcategoriesResult.rows.length,
      });
      return {
        subcategories: subcategoriesResult.rows,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get subcategory by ID
  async getSubcategoryById(id: number): Promise<Subcategory> {
    let action = "Get Subcategory By ID";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { subcategoryId: id });

      const result = await client.query(
        "SELECT s.*, c.name as category_name FROM subcategories s LEFT JOIN categories c ON s.category_id = c.id WHERE s.id = $1",
        [id]
      );

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
      throw error;
    } finally {
      client.release();
    }
  }

  // Get category statistics
  async getCategoryStats(): Promise<CategoryStats> {
    let action = "Get Category Statistics";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      const statsQuery = `
                SELECT 
                    COUNT(DISTINCT c.id) as total_categories,
                    COUNT(s.id) as total_subcategories,
                    COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN c.id END) as categories_with_subcategories,
                    COALESCE(AVG(subcategory_count), 0) as average_subcategories_per_category
                FROM categories c
                LEFT JOIN subcategories s ON c.id = s.category_id
                LEFT JOIN (
                    SELECT category_id, COUNT(*) as subcategory_count
                    FROM subcategories
                    GROUP BY category_id
                ) sc ON c.id = sc.category_id
            `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      const categoryStats = {
        total_categories: parseInt(stats.total_categories),
        total_subcategories: parseInt(stats.total_subcategories),
        categories_with_subcategories: parseInt(
          stats.categories_with_subcategories
        ),
        average_subcategories_per_category: parseFloat(
          stats.average_subcategories_per_category
        ),
      };

      MyLogger.success(action, categoryStats);
      return categoryStats;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Search categories by name
  async searchCategories(
    query: string,
    limit: number = 10
  ): Promise<Category[]> {
    let action = "Search Categories";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { query, limit });

      const result = await client.query(
        `SELECT id, name, description
                 FROM categories
                 WHERE name ILIKE $1
                 ORDER BY name
                 LIMIT $2`,
        [`%${query}%`, limit]
      );

      MyLogger.success(action, {
        query,
        limit,
        resultsCount: result.rows.length,
      });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { query, limit });
      throw error;
    } finally {
      client.release();
    }
  }

  // Search subcategories by name
  async searchSubcategories(
    query: string,
    limit: number = 10
  ): Promise<Subcategory[]> {
    let action = "Search Subcategories";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { query, limit });

      const result = await client.query(
        `SELECT s.id, s.name, s.description, s.category_id, c.name as category_name
                 FROM subcategories s
                 LEFT JOIN categories c ON s.category_id = c.id
                 WHERE s.name ILIKE $1
                 ORDER BY s.name
                 LIMIT $2`,
        [`%${query}%`, limit]
      );

      MyLogger.success(action, {
        query,
        limit,
        resultsCount: result.rows.length,
      });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { query, limit });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetCategoryInfoMediator();
