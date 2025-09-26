import {
  Supplier,
  SupplierQueryParams,
  SupplierStats,
  UpdateSupplierRequest,
} from "@/types/supplier";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetSupplierInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get all suppliers with pagination and filtering
  async getSupplierList(params: SupplierQueryParams): Promise<{
    suppliers: Supplier[];
    total: number;
    page: number;
    limit: number;
  }> {
    let action = "Get Supplier List";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 10,
        search,
        category,
        status,
        sortBy = "created_at",
        sortOrder = "desc",
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(`(
          name ILIKE $${paramIndex} OR 
          contact_person ILIKE $${paramIndex} OR 
          email ILIKE $${paramIndex} OR
          supplier_code ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (category) {
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count total records
      const countQuery = `SELECT COUNT(*)
                                FROM suppliers ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get suppliers
      const suppliersQuery = `
                SELECT *
                FROM suppliers ${whereClause}
                ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

      queryParams.push(limit, offset);
      const suppliersResult = await client.query(suppliersQuery, queryParams);

      MyLogger.success(action, {
        total,
        page,
        limit,
        returnedCount: suppliersResult.rows.length,
      });
      return {
        suppliers: suppliersResult.rows,
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

  // Get supplier by ID
  async getSupplierById(id: number): Promise<Supplier> {
    let action = "Get Supplier By ID";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { supplierId: id });

      const result = await client.query(
        "SELECT * FROM suppliers WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        MyLogger.warn(action, {
          supplierId: id,
          message: "Supplier not found",
        });
        throw createError("Supplier not found", 404);
      }

      MyLogger.success(action, {
        supplierId: id,
        supplierName: result.rows[0].name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { supplierId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get supplier statistics
  async getSupplierStats(): Promise<SupplierStats> {
    let action = "Get Supplier Statistics";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      const statsQuery = `
                SELECT COUNT(*)                                        as total_suppliers,
                       COUNT(CASE WHEN status = 'active' THEN 1 END)   as active_suppliers,
                       COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_suppliers,
                       COUNT(DISTINCT category)                        as categories_count,
                       COALESCE(AVG(rating), 0)                        as average_rating
                FROM suppliers
            `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      const supplierStats = {
        total_suppliers: parseInt(stats.total_suppliers),
        active_suppliers: parseInt(stats.active_suppliers),
        inactive_suppliers: parseInt(stats.inactive_suppliers),
        categories_count: parseInt(stats.categories_count),
        average_rating: parseFloat(stats.average_rating),
      };

      MyLogger.success(action, supplierStats);
      return supplierStats;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get supplier categories
  async getSupplierCategories(): Promise<string[]> {
    let action = "Get Supplier Categories";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      const result = await client.query(
        "SELECT DISTINCT category FROM suppliers WHERE category IS NOT NULL ORDER BY category"
      );

      const categories = result.rows.map((row) => row.category);
      MyLogger.success(action, {
        categoriesCount: categories.length,
        categories,
      });
      return categories;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Search suppliers by name or code
  async searchSuppliers(
    query: string,
    limit: number = 10
  ): Promise<Supplier[]> {
    let action = "Search Suppliers";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { query, limit });

      const result = await client.query(
        `SELECT id, supplier_code, name, contact_person, phone, email, status
                 FROM suppliers
                 WHERE (name ILIKE $1 OR supplier_code ILIKE $1 OR contact_person ILIKE $1)
                   AND status = 'active'
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
}

export default new GetSupplierInfoMediator();
