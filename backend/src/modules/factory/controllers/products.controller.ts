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

  // Get orderable products — excludes Raw Materials category (for customer order creation)
  async getOrderableProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/products/orderable";
      MyLogger.info(action);

      // Try to get the "Raw Materials" category ID from the in-memory master data
      const rawMaterialCategory = MasterDataLoader.categories.find(
        (c) => c.name === "Raw Materials"
      );

      let query: string;
      let params: any[] = [];

      if (rawMaterialCategory) {
        // Fast path: use the cached category ID directly
        query = `
          SELECT 
            id, sku, name, description,
            selling_price as unit_price,
            'BDT' as currency,
            current_stock, status,
            created_at, updated_at
          FROM products
          WHERE status = 'active'
            AND (category_id IS NULL OR category_id != $1)
          ORDER BY name
        `;
        params = [rawMaterialCategory.id];
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
              SELECT id FROM categories WHERE name = 'Raw Materials'
            ))
          ORDER BY name
        `;
      }

      const result = await pool.query(query, params);

      const products = result.rows.map((row) => ({
        ...row,
        unit_price: row.unit_price ? parseFloat(row.unit_price) : 0,
        current_stock: row.current_stock ? parseFloat(row.current_stock) : 0,
      }));

      MyLogger.success(action, {
        count: products.length,
        excludedCategoryId: rawMaterialCategory?.id ?? "subquery-fallback",
      });
      serializeSuccessResponse(res, products, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductsController();
