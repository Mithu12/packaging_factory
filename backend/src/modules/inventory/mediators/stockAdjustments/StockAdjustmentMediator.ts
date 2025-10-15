import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { eventBus, EVENT_NAMES } from "@/utils/eventBus";
import {
  StockAdjustment,
  CreateStockAdjustmentRequest,
  StockAdjustmentQueryParams,
  StockAdjustmentStats,
} from "@/types/stockAdjustment";

export class StockAdjustmentMediator {
  static async createStockAdjustment(
    data: CreateStockAdjustmentRequest
  ): Promise<StockAdjustment> {
    const action = "Create Stock Adjustment";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, {
        productId: data.product_id,
        adjustmentType: data.adjustment_type,
        quantity: data.quantity,
      });

      // Get current stock
      const productResult = await client.query(
        "SELECT current_stock FROM products WHERE id = $1",
        [data.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error("Product not found");
      }

      const currentStock = parseFloat(productResult.rows[0].current_stock);
      let newStock: number;

      // Calculate new stock based on adjustment type
      switch (data.adjustment_type) {
        case "increase":
          newStock = currentStock + data.quantity;
          break;
        case "decrease":
          newStock = currentStock - data.quantity;
          if (newStock < 0) {
            throw new Error("Cannot decrease stock below zero");
          }
          break;
        case "set":
          newStock = data.quantity;
          break;
        default:
          throw new Error("Invalid adjustment type");
      }

      // Create stock adjustment record
      const adjustmentResult = await client.query(
        `
        INSERT INTO stock_adjustments (
          product_id, adjustment_type, quantity, previous_stock, new_stock,
          reason, reference, notes, adjusted_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          data.product_id,
          data.adjustment_type,
          data.quantity,
          currentStock,
          newStock,
          data.reason,
          data.reference || null,
          data.notes || null,
          data.adjusted_by || null,
        ]
      );

      // Update product stock
      await client.query(
        "UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newStock, data.product_id]
      );

      await client.query("COMMIT");

      const adjustment = adjustmentResult.rows[0];

      // Emit accounting integration event
      try {
        // Get product information for the event
        const productQuery = `SELECT name, sku FROM products WHERE id = $1`;
        const productResult = await pool.query(productQuery, [data.product_id]);
        const product = productResult.rows[0];

        const adjustmentData = {
          adjustmentId: adjustment.id,
          productId: data.product_id,
          productName: product?.name || 'Unknown Product',
          productSku: product?.sku || 'UNKNOWN',
          adjustmentType: data.adjustment_type,
          quantity: data.quantity,
          previousStock: currentStock,
          newStock: newStock,
          reason: data.reason,
          reference: data.reference || `ADJ-${adjustment.id}`,
          notes: data.notes,
          adjustmentDate: new Date().toISOString().split("T")[0]
        };

        // Emit event for accounting integration
        eventBus.emit(EVENT_NAMES.STOCK_ADJUSTMENT_CREATED, {
          adjustmentData,
          userId: data.adjusted_by || "System User"
        });

        MyLogger.success("Stock Adjustment Accounting Event Emitted", {
          adjustmentId: adjustment.id,
          event: EVENT_NAMES.STOCK_ADJUSTMENT_CREATED,
          productId: data.product_id
        });
      } catch (eventError: any) {
        MyLogger.error("Failed to emit stock adjustment accounting event", eventError, {
          adjustmentId: adjustment.id,
        });
        // Don't fail the entire operation if event emission fails
      }

      MyLogger.success(action, {
        adjustmentId: adjustment.id,
        productId: data.product_id,
        previousStock: currentStock,
        newStock: newStock,
      });

      return adjustment;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, {
        productId: data.product_id,
        adjustmentType: data.adjustment_type,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getStockAdjustments(
    params: StockAdjustmentQueryParams
  ): Promise<StockAdjustment[]> {
    const action = "Get Stock Adjustments";

    try {
      MyLogger.info(action, { params });

      let query = `
        SELECT sa.*, p.name as product_name, p.sku as product_sku
        FROM stock_adjustments sa
        JOIN products p ON sa.product_id = p.id
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.product_id) {
        query += ` AND sa.product_id = $${paramIndex}`;
        queryParams.push(params.product_id);
        paramIndex++;
      }

      if (params.adjustment_type) {
        query += ` AND sa.adjustment_type = $${paramIndex}`;
        queryParams.push(params.adjustment_type);
        paramIndex++;
      }

      if (params.start_date) {
        query += ` AND sa.created_at >= $${paramIndex}`;
        queryParams.push(params.start_date);
        paramIndex++;
      }

      if (params.end_date) {
        query += ` AND sa.created_at <= $${paramIndex}`;
        queryParams.push(params.end_date);
        paramIndex++;
      }

      query += ` ORDER BY sa.created_at DESC`;

      if (params.limit) {
        query += ` LIMIT $${paramIndex}`;
        queryParams.push(params.limit);
        paramIndex++;
      }

      if (params.offset) {
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(params.offset);
        paramIndex++;
      }

      const result = await pool.query(query, queryParams);
      MyLogger.success(action, { count: result.rows.length });

      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }

  static async getStockAdjustmentStats(
    productId?: number
  ): Promise<StockAdjustmentStats> {
    const action = "Get Stock Adjustment Stats";

    try {
      MyLogger.info(action, { productId });

      let whereClause = "";
      const queryParams: any[] = [];

      if (productId) {
        whereClause = "WHERE product_id = $1";
        queryParams.push(productId);
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_adjustments,
          COUNT(CASE WHEN adjustment_type = 'increase' THEN 1 END) as total_increases,
          COUNT(CASE WHEN adjustment_type = 'decrease' THEN 1 END) as total_decreases,
          SUM(quantity) as total_quantity_adjusted
        FROM stock_adjustments
        ${whereClause}
      `;

      const recentQuery = `
        SELECT sa.*, p.name as product_name, p.sku as product_sku
        FROM stock_adjustments sa
        JOIN products p ON sa.product_id = p.id
        ${whereClause}
        ORDER BY sa.created_at DESC
        LIMIT 5
      `;

      const [statsResult, recentResult] = await Promise.all([
        pool.query(statsQuery, queryParams),
        pool.query(recentQuery, queryParams),
      ]);

      const stats = {
        total_adjustments: parseInt(statsResult.rows[0].total_adjustments) || 0,
        total_increases: parseInt(statsResult.rows[0].total_increases) || 0,
        total_decreases: parseInt(statsResult.rows[0].total_decreases) || 0,
        total_quantity_adjusted:
          parseFloat(statsResult.rows[0].total_quantity_adjusted) || 0,
        recent_adjustments: recentResult.rows,
      };

      MyLogger.success(action, {
        totalAdjustments: stats.total_adjustments,
        productId,
      });

      return stats;
    } catch (error: any) {
      MyLogger.error(action, error, { productId });
      throw error;
    }
  }

  static async getStockAdjustmentById(id: number): Promise<StockAdjustment> {
    const action = "Get Stock Adjustment By ID";

    try {
      MyLogger.info(action, { adjustmentId: id });

      const result = await pool.query(
        `
        SELECT sa.*, p.name as product_name, p.sku as product_sku
        FROM stock_adjustments sa
        JOIN products p ON sa.product_id = p.id
        WHERE sa.id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("Stock adjustment not found");
      }

      MyLogger.success(action, { adjustmentId: id });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { adjustmentId: id });
      throw error;
    }
  }
}
