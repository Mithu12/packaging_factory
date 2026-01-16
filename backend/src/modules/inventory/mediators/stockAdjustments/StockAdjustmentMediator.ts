import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { eventBus, EVENT_NAMES } from "@/utils/eventBus";
import { interModuleConnector } from "@/utils/InterModuleConnector";
import {
  StockAdjustment,
  CreateStockAdjustmentRequest,
  StockAdjustmentQueryParams,
  StockAdjustmentStats,
} from "@/types/stockAdjustment";

export class StockAdjustmentMediator {
  static async createStockAdjustment(
    data: CreateStockAdjustmentRequest & { distribution_center_id?: number }
  ): Promise<StockAdjustment> {
    const action = "Create Stock Adjustment";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, {
        productId: data.product_id,
        adjustmentType: data.adjustment_type,
        quantity: data.quantity,
        distributionCenterId: data.distribution_center_id
      });

      // Determine Distribution Center
      let distributionCenterId = data.distribution_center_id;
      if (!distributionCenterId) {
        const primaryDcQuery = "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1";
        const primaryDcResult = await client.query(primaryDcQuery);
        if (primaryDcResult.rows.length > 0) {
          distributionCenterId = primaryDcResult.rows[0].id;
        } else {
          // Fallback or Error? For now, if no DC is specified and no primary exists, we might error or just update global stock (legacy behavior).
          // But the requirement is to "add/remove stock from default ware house".
          throw new Error("No distribution center specified and no primary distribution center found.");
        }
      }

      // Update Product Location Stock
      // Check if location exists
      const locationQuery = "SELECT * FROM product_locations WHERE product_id = $1 AND distribution_center_id = $2";
      const locationResult = await client.query(locationQuery, [data.product_id, distributionCenterId]);

      let currentLocationStock = 0;

      if (locationResult.rows.length === 0) {
        // If increasing stock, create location if it doesn't exist? 
        // Or should we error? Usually you can't adjust stock for a location that doesn't exist.
        // But for "Connect to default warehouse", maybe we should create it if it's missing?
        // Let's assume we create it if it's missing and we are increasing stock.
        if (data.adjustment_type === 'increase' || data.adjustment_type === 'set') {
          const insertLocQuery = `
                INSERT INTO product_locations (product_id, distribution_center_id, current_stock)
                VALUES ($1, $2, 0) RETURNING *
             `;
          const newLoc = await client.query(insertLocQuery, [data.product_id, distributionCenterId]);
          currentLocationStock = 0;
        } else {
          throw new Error("Product location not found for this distribution center");
        }
      } else {
        currentLocationStock = parseFloat(locationResult.rows[0].current_stock);
      }

      let newLocationStock: number;
      switch (data.adjustment_type) {
        case "increase":
          newLocationStock = currentLocationStock + data.quantity;
          break;
        case "decrease":
          newLocationStock = currentLocationStock - data.quantity;
          if (newLocationStock < 0) throw new Error("Cannot decrease stock below zero at this location");
          break;
        case "set":
          newLocationStock = data.quantity;
          break;
        default:
          throw new Error("Invalid adjustment type");
      }

      // Update Location Stock
      await client.query(
        "UPDATE product_locations SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND distribution_center_id = $3",
        [newLocationStock, data.product_id, distributionCenterId]
      );


      // Get current GLOBAL stock (for legacy compatibility and total count)
      const productResult = await client.query(
        "SELECT current_stock FROM products WHERE id = $1",
        [data.product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error("Product not found");
      }

      const currentGlobalStock = parseFloat(productResult.rows[0].current_stock);
      let newGlobalStock: number;

      // Calculate new GLOBAL stock based on adjustment type
      // Note: This is a bit tricky. If we 'set' stock at a location, the global stock change is diff.
      // If we increase/decrease, it's straightforward.

      let quantityChange = 0;
      if (data.adjustment_type === 'set') {
        quantityChange = newLocationStock - currentLocationStock;
      } else if (data.adjustment_type === 'increase') {
        quantityChange = data.quantity;
      } else if (data.adjustment_type === 'decrease') {
        quantityChange = -data.quantity;
      }

      newGlobalStock = currentGlobalStock + quantityChange;

      // Create stock adjustment record
      const adjustmentResult = await client.query(
        `
        INSERT INTO stock_adjustments (
          product_id, adjustment_type, quantity, previous_stock, new_stock,
          reason, reference, notes, adjusted_by, distribution_center_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
        [
          data.product_id,
          data.adjustment_type,
          data.quantity,
          currentGlobalStock, // Keeping global stock history for now, or should it be location stock? 
          // The schema has 'previous_stock' and 'new_stock'. Usually this refers to the scope of adjustment.
          // If we add distribution_center_id, maybe these should reflect location stock?
          // Let's stick to global for consistency with existing data, or maybe location stock is better?
          // Given the user asked to "connect stock to default warehouse", tracking location stock seems more correct here.
          // BUT, the existing frontend might expect global stock. 
          // Let's use Global Stock for now to avoid breaking other things, but log the DC.
          newGlobalStock,
          data.reason,
          data.reference || null,
          data.notes || null,
          data.adjusted_by || null,
          distributionCenterId
        ]
      );

      // Update product stock
      await client.query(
        "UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newGlobalStock, data.product_id]
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
          previousStock: currentGlobalStock,
          newStock: newGlobalStock,
          reason: data.reason,
          reference: data.reference || `ADJ-${adjustment.id}`,
          notes: data.notes,
          adjustmentDate: new Date().toISOString().split("T")[0],
          distributionCenterId // Add this to event
        };

        // Emit event for accounting integration
        eventBus.emit(EVENT_NAMES.STOCK_ADJUSTMENT_CREATED, {
          adjustmentData,
          userId: data.adjusted_by || "System User"
        });

        // Central Bridge: Call accounts module directly via InterModuleConnector
        MyLogger.info("Stock Adjustment Bridge: Calling accModule.addStockAdjustmentVoucher", { adjustmentId: adjustment.id });
        await interModuleConnector.accModule.addStockAdjustmentVoucher(adjustmentData, data.adjusted_by || "System User");

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
        previousStock: currentGlobalStock,
        newStock: newGlobalStock,
        distributionCenterId
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
