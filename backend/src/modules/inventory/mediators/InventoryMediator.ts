import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  InventoryItem,
  InventoryStats,
  InventoryQueryParams,
  StockMovement,
  StockMovementQueryParams,
} from "@/types/inventory";

export class InventoryMediator {
  static async getInventoryItems(
    params: InventoryQueryParams = {}
  ): Promise<InventoryItem[]> {
    const action = "Get Inventory Items";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 50,
        search,
        category_id,
        subcategory_id,
        supplier_id,
        status,
        stock_status,
        sortBy = "product_name",
        sortOrder = "asc",
      } = params;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_sku,
          c.name as category_name,
          sc.name as subcategory_name,
          s.name as supplier_name,
          p.current_stock,
          p.min_stock_level,
          p.max_stock_level,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price,
          (p.current_stock * p.cost_price) as total_value,
          p.status,
          p.created_at,
          p.updated_at,
          COALESCE(pl.reserved_stock, 0) as reserved_stock,
          COALESCE(pl.available_stock, p.current_stock) as available_stock,
          COALESCE(sa.last_movement_date, p.updated_at) as last_movement_date,
          sa.last_movement_type
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN (
          SELECT 
            product_id,
            SUM(reserved_stock) as reserved_stock,
            SUM(current_stock - reserved_stock) as available_stock
          FROM product_locations
          GROUP BY product_id
        ) pl ON p.id = pl.product_id
        LEFT JOIN (
          SELECT 
            product_id,
            MAX(created_at) as last_movement_date,
            adjustment_type as last_movement_type
          FROM stock_adjustments
          GROUP BY product_id, adjustment_type
        ) sa ON p.id = sa.product_id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (
          p.name ILIKE $${paramIndex} OR 
          p.sku ILIKE $${paramIndex} OR 
          c.name ILIKE $${paramIndex} OR 
          s.name ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (category_id) {
        query += ` AND p.category_id = $${paramIndex}`;
        queryParams.push(category_id);
        paramIndex++;
      }

      if (subcategory_id) {
        query += ` AND p.subcategory_id = $${paramIndex}`;
        queryParams.push(subcategory_id);
        paramIndex++;
      }

      if (supplier_id) {
        query += ` AND p.supplier_id = $${paramIndex}`;
        queryParams.push(supplier_id);
        paramIndex++;
      }

      if (status) {
        query += ` AND p.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (stock_status) {
        switch (stock_status) {
          case "low":
            query += ` AND p.current_stock <= p.min_stock_level AND p.current_stock > 0`;
            break;
          case "critical":
            query += ` AND p.current_stock <= (p.min_stock_level * 0.5) AND p.current_stock > 0`;
            break;
          case "out_of_stock":
            query += ` AND p.current_stock = 0`;
            break;
          case "overstock":
            query += ` AND p.max_stock_level IS NOT NULL AND p.current_stock >= (p.max_stock_level * 0.9)`;
            break;
          case "optimal":
            query += ` AND p.current_stock > p.min_stock_level AND (p.max_stock_level IS NULL OR p.current_stock < (p.max_stock_level * 0.9))`;
            break;
        }
      }

      const validSortColumns = [
        "product_name",
        "product_sku",
        "category_name",
        "supplier_name",
        "current_stock",
        "total_value",
        "last_movement_date",
      ];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "product_name";
      const sortDirection = sortOrder === "desc" ? "DESC" : "ASC";

      query += ` ORDER BY ${sortColumn} ${sortDirection}`;

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);

      MyLogger.success(action, { count: result.rows.length, page, limit });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getInventoryStats(): Promise<InventoryStats> {
    const action = "Get Inventory Stats";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
          COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock_items,
          COUNT(CASE WHEN (SELECT COALESCE(SUM(current_stock - reserved_stock), products.current_stock) FROM product_locations WHERE product_id = products.id) <= min_stock_level AND current_stock > 0 THEN 1 END) as low_stock_items,
          COUNT(CASE WHEN (SELECT COALESCE(SUM(current_stock - reserved_stock), products.current_stock) FROM product_locations WHERE product_id = products.id) <= (min_stock_level * 0.5) AND current_stock > 0 THEN 1 END) as critical_stock_items,
          COUNT(CASE WHEN max_stock_level IS NOT NULL AND current_stock >= (max_stock_level * 0.9) THEN 1 END) as overstock_items,
          SUM(current_stock * cost_price) as total_inventory_value
        FROM products
        WHERE status != 'discontinued'
      `;

      const statsResult = await client.query(statsQuery);
      const stats = statsResult.rows[0];

      const movementsQuery = `
        SELECT COUNT(*) as recent_movements_count
        FROM stock_adjustments
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;

      const movementsResult = await client.query(movementsQuery);
      const recentMovementsCount = parseInt(
        movementsResult.rows[0].recent_movements_count
      );

      const trendQuery = `
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(CASE WHEN adjustment_type = 'increase' THEN 1 END) as receipts,
          COUNT(CASE WHEN adjustment_type = 'decrease' THEN 1 END) as issues,
          COUNT(CASE WHEN adjustment_type = 'set' THEN 1 END) as adjustments
        FROM stock_adjustments
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
      `;

      const trendResult = await client.query(trendQuery);

      const inventoryStats: InventoryStats = {
        total_inventory_value: parseFloat(stats.total_inventory_value) || 0,
        total_products: parseInt(stats.total_products),
        low_stock_items: parseInt(stats.low_stock_items),
        critical_stock_items: parseInt(stats.critical_stock_items),
        out_of_stock_items: parseInt(stats.out_of_stock_items),
        overstock_items: parseInt(stats.overstock_items),
        total_locations: 1,
        recent_movements_count: recentMovementsCount,
        monthly_movement_trend: trendResult.rows.map((row) => ({
          month: row.month,
          receipts: parseInt(row.receipts),
          issues: parseInt(row.issues),
          adjustments: parseInt(row.adjustments),
        })),
      };

      MyLogger.success(action, inventoryStats);
      return inventoryStats;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getStockMovements(
    params: StockMovementQueryParams = {}
  ): Promise<StockMovement[]> {
    const action = "Get Stock Movements";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        product_id,
        movement_type,
        start_date,
        end_date,
        page = 1,
        limit = 50,
        sortBy = "created_at",
        sortOrder = "desc",
      } = params;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          sa.id,
          sa.product_id,
          p.name as product_name,
          p.sku as product_sku,
          sa.adjustment_type as movement_type,
          sa.quantity,
          sa.previous_stock,
          sa.new_stock,
          sa.reason,
          sa.reference,
          sa.notes,
          sa.adjusted_by as user_name,
          sa.created_at
        FROM stock_adjustments sa
        LEFT JOIN products p ON sa.product_id = p.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (product_id) {
        query += ` AND sa.product_id = $${paramIndex}`;
        queryParams.push(product_id);
        paramIndex++;
      }

      if (movement_type) {
        query += ` AND sa.adjustment_type = $${paramIndex}`;
        queryParams.push(movement_type);
        paramIndex++;
      }

      if (start_date) {
        query += ` AND sa.created_at >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND sa.created_at <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      const validSortColumns = [
        "created_at",
        "product_name",
        "movement_type",
        "quantity",
      ];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";
      const sortDirection = sortOrder === "desc" ? "DESC" : "ASC";

      query += ` ORDER BY ${sortColumn} ${sortDirection}`;

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);

      MyLogger.success(action, { count: result.rows.length, page, limit });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getInventoryItemById(
    productId: number
  ): Promise<InventoryItem | null> {
    const action = "Get Inventory Item By ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { productId });

      const query = `
        SELECT 
          p.id,
          p.name as product_name,
          p.sku as product_sku,
          c.name as category_name,
          sc.name as subcategory_name,
          s.name as supplier_name,
          p.current_stock,
          p.min_stock_level,
          p.max_stock_level,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price,
          (p.current_stock * p.cost_price) as total_value,
          p.status,
          p.created_at,
          p.updated_at,
          COALESCE(pl.reserved_stock, 0) as reserved_stock,
          COALESCE(pl.available_stock, p.current_stock) as available_stock,
          COALESCE(sa.last_movement_date, p.updated_at) as last_movement_date,
          sa.last_movement_type
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN (
          SELECT 
            product_id,
            SUM(reserved_stock) as reserved_stock,
            SUM(current_stock - reserved_stock) as available_stock
          FROM product_locations
          WHERE product_id = $1
          GROUP BY product_id
        ) pl ON p.id = pl.product_id
        LEFT JOIN (
          SELECT 
            product_id,
            MAX(created_at) as last_movement_date,
            adjustment_type as last_movement_type
          FROM stock_adjustments
          WHERE product_id = $1
          GROUP BY product_id, adjustment_type
        ) sa ON p.id = sa.product_id
        WHERE p.id = $1
      `;

      const result = await client.query(query, [productId]);

      if (result.rows.length === 0) {
        MyLogger.warn(action, { productId, message: "Product not found" });
        return null;
      }

      MyLogger.success(action, {
        productId,
        productName: result.rows[0].product_name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { productId });
      throw error;
    } finally {
      client.release();
    }
  }
}
