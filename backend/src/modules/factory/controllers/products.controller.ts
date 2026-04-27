import { Request, Response, NextFunction } from "express";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import pool from "@/database/connection";
import { MasterDataLoader } from "@/utils/MasterDataLoader";

class ProductsController {
  // Get all products (unfiltered — used by inventory, BOM, etc.)
  async getAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/products";
      MyLogger.info(action);
      
      const query = `
        SELECT 
          id,
          sku,
          name,
          description,
          selling_price as unit_price,
          'BDT' as currency,
          current_stock,
          status,
          created_at,
          updated_at
        FROM products 
        WHERE status = 'active'
        ORDER BY name
      `;
      
      const result = await pool.query(query);
      
      const products = result.rows.map(row => ({
        ...row,
        unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
        current_stock: row.current_stock ? parseFloat(row.current_stock) : 0
      }));
      
      MyLogger.success(action, { count: products.length });
      serializeSuccessResponse(res, products, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Search products (unfiltered — used by inventory, BOM, etc.)
  async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/products/search";
      const { q } = req.query;
      MyLogger.info(action, { query: q });
      
      const query = `
        SELECT 
          id,
          sku,
          name,
          description,
          selling_price as unit_price,
          'BDT' as currency,
          current_stock,
          status,
          created_at,
          updated_at
        FROM products 
        WHERE status = 'active'
          AND (name ILIKE $1 OR sku ILIKE $1 OR description ILIKE $1)
        ORDER BY name
        LIMIT 20
      `;
      
      const result = await pool.query(query, [`%${q}%`]);
      
      const products = result.rows.map(row => ({
        ...row,
        unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
        current_stock: row.current_stock ? parseFloat(row.current_stock) : 0
      }));
      
      MyLogger.success(action, { query: q, count: products.length });
      serializeSuccessResponse(res, products, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get BOM-eligible parent products — Ready Goods (FG) and Ready Raw Materials (RRM),
  // excluding Raw Materials (RM cannot have a BOM).
  async getBomParentProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/products/bom-parent-eligible";
      MyLogger.info(action);

      const NON_PARENT_NAMES = ["Raw Materials"];

      const cachedNonParentIds = MasterDataLoader.categories
        .filter((c) => NON_PARENT_NAMES.includes(c.name))
        .map((c) => c.id);

      let query: string;
      let params: any[] = [];

      if (cachedNonParentIds.length > 0) {
        query = `
          SELECT
            id, sku, name, description,
            selling_price as unit_price,
            'BDT' as currency,
            current_stock, status,
            created_at, updated_at
          FROM products
          WHERE status = 'active'
            AND (category_id IS NULL OR category_id <> ALL($1::int[]))
          ORDER BY name
        `;
        params = [cachedNonParentIds];
      } else {
        query = `
          SELECT
            id, sku, name, description,
            selling_price as unit_price,
            'BDT' as currency,
            current_stock, status,
            created_at, updated_at
          FROM products
          WHERE status = 'active'
            AND (category_id IS NULL OR category_id NOT IN (
              SELECT id FROM categories WHERE name = ANY($1::text[])
            ))
          ORDER BY name
        `;
        params = [NON_PARENT_NAMES];
      }

      const result = await pool.query(query, params);

      const products = result.rows.map((row) => ({
        ...row,
        unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
        current_stock: row.current_stock ? parseFloat(row.current_stock) : 0,
      }));

      MyLogger.success(action, { count: products.length });
      serializeSuccessResponse(res, products, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get orderable products — excludes internal-only categories (Raw Materials, Ready Raw Materials).
  // Customers can only order Ready Goods (FG); RM and RRM are internal manufacturing inputs.
  async getOrderableProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/products/orderable";
      MyLogger.info(action);

      const NON_ORDERABLE_NAMES = ["Raw Materials", "Ready Raw Materials"];

      const cachedNonOrderableIds = MasterDataLoader.categories
        .filter((c) => NON_ORDERABLE_NAMES.includes(c.name))
        .map((c) => c.id);

      let query: string;
      let params: any[] = [];

      if (cachedNonOrderableIds.length > 0) {
        // Fast path: use the cached category IDs directly
        query = `
          SELECT
            id, sku, name, description,
            selling_price as unit_price,
            'BDT' as currency,
            current_stock, status,
            created_at, updated_at
          FROM products
          WHERE status = 'active'
            AND (category_id IS NULL OR category_id <> ALL($1::int[]))
          ORDER BY name
        `;
        params = [cachedNonOrderableIds];
      } else {
        // Fallback: MasterDataLoader not ready yet — use SQL subquery
        query = `
          SELECT
            id, sku, name, description,
            selling_price as unit_price,
            'BDT' as currency,
            current_stock, status,
            created_at, updated_at
          FROM products
          WHERE status = 'active'
            AND (category_id IS NULL OR category_id NOT IN (
              SELECT id FROM categories WHERE name = ANY($1::text[])
            ))
          ORDER BY name
        `;
        params = [NON_ORDERABLE_NAMES];
      }

      const result = await pool.query(query, params);

      const products = result.rows.map((row) => ({
        ...row,
        unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
        current_stock: row.current_stock ? parseFloat(row.current_stock) : 0,
      }));

      MyLogger.success(action, {
        count: products.length,
        excludedCategoryIds: cachedNonOrderableIds.length > 0 ? cachedNonOrderableIds : "subquery-fallback",
      });
      serializeSuccessResponse(res, products, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductsController();
