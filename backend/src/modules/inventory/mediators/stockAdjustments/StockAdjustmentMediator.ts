import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { eventBus, EVENT_NAMES } from "@/utils/eventBus";
import { interModuleConnector } from "@/utils/InterModuleConnector";
import {
  StockAdjustment,
  CreateStockAdjustmentRequest,
  StockAdjustmentQueryParams,
  StockAdjustmentStats,
  CreateStockAdjustmentBatchRequest,
  StockAdjustmentBatch,
  StockAdjustmentBatchQueryParams,
} from "@/types/stockAdjustment";
import { ReusableStockService } from "@/modules/inventory/services/ReusableStockService";
import type { PoolClient } from "pg";

interface UnitsLineResult {
  adjustment: StockAdjustment;
  adjustmentData: {
    adjustmentId: number;
    productId: number;
    productName: string;
    productSku: string;
    adjustmentType: "increase" | "decrease" | "set";
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    reference: string;
    notes: string | null;
    adjustmentDate: string;
    distributionCenterId: number;
  };
}

export class StockAdjustmentMediator {
  static async createStockAdjustment(
    data: CreateStockAdjustmentRequest & { distribution_center_id?: number }
  ): Promise<StockAdjustment> {
    if (data.adjustment_mode === "uses") {
      return StockAdjustmentMediator.consumeReusableUses(data);
    }

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

      const distributionCenterId = await StockAdjustmentMediator.resolveDistributionCenterId(
        client,
        data.distribution_center_id
      );

      const { adjustment, adjustmentData } = await StockAdjustmentMediator.applyUnitsLine(client, {
        product_id: data.product_id,
        adjustment_type: data.adjustment_type,
        quantity: data.quantity,
        reason: data.reason,
        reference: data.reference,
        notes: data.notes,
        adjusted_by: data.adjusted_by,
        distributionCenterId,
        batchId: null,
      });

      await client.query("COMMIT");

      // Emit accounting integration event
      try {
        eventBus.emit(EVENT_NAMES.STOCK_ADJUSTMENT_CREATED, {
          adjustmentData,
          userId: data.adjusted_by || "System User",
        });

        MyLogger.info("Stock Adjustment Bridge: Calling accModule.addStockAdjustmentVoucher", {
          adjustmentId: adjustment.id,
        });
        await interModuleConnector.accModule.addStockAdjustmentVoucher(
          adjustmentData,
          data.adjusted_by || "System User"
        );

        MyLogger.success("Stock Adjustment Accounting Event Emitted", {
          adjustmentId: adjustment.id,
          event: EVENT_NAMES.STOCK_ADJUSTMENT_CREATED,
          productId: data.product_id,
        });
      } catch (eventError: any) {
        MyLogger.error("Failed to emit stock adjustment accounting event", eventError, {
          adjustmentId: adjustment.id,
        });
      }

      MyLogger.success(action, {
        adjustmentId: adjustment.id,
        productId: data.product_id,
        previousStock: adjustmentData.previousStock,
        newStock: adjustmentData.newStock,
        distributionCenterId,
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

  private static async resolveDistributionCenterId(
    client: PoolClient,
    requested?: number
  ): Promise<number> {
    if (requested) return requested;
    const primaryDcResult = await client.query(
      "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1"
    );
    if (primaryDcResult.rows.length === 0) {
      throw new Error("No distribution center specified and no primary distribution center found.");
    }
    return primaryDcResult.rows[0].id;
  }

  /**
   * Apply a single 'units' adjustment line inside an open transaction.
   * Used by both the single-product createStockAdjustment and the bulk
   * createStockAdjustmentBatch so the stock-update logic stays in one place.
   */
  private static async applyUnitsLine(
    client: PoolClient,
    params: {
      product_id: number;
      adjustment_type: "increase" | "decrease" | "set";
      quantity: number;
      reason: string;
      reference?: string;
      notes?: string | null;
      adjusted_by?: string | null;
      distributionCenterId: number;
      batchId: number | null;
      /** When false, skip the global products.current_stock write (DC-only). */
      syncGlobalStock?: boolean;
    }
  ): Promise<UnitsLineResult> {
    const locationResult = await client.query(
      "SELECT current_stock FROM product_locations WHERE product_id = $1 AND distribution_center_id = $2",
      [params.product_id, params.distributionCenterId]
    );

    let currentLocationStock = 0;
    if (locationResult.rows.length === 0) {
      if (params.adjustment_type === "increase" || params.adjustment_type === "set") {
        await client.query(
          "INSERT INTO product_locations (product_id, distribution_center_id, current_stock) VALUES ($1, $2, 0)",
          [params.product_id, params.distributionCenterId]
        );
      } else {
        throw new Error("Product location not found for this distribution center");
      }
    } else {
      currentLocationStock = parseFloat(locationResult.rows[0].current_stock);
    }

    let newLocationStock: number;
    switch (params.adjustment_type) {
      case "increase":
        newLocationStock = currentLocationStock + params.quantity;
        break;
      case "decrease":
        newLocationStock = currentLocationStock - params.quantity;
        if (newLocationStock < 0) {
          throw new Error("Cannot decrease stock below zero at this location");
        }
        break;
      case "set":
        newLocationStock = params.quantity;
        break;
      default:
        throw new Error("Invalid adjustment type");
    }

    await client.query(
      "UPDATE product_locations SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND distribution_center_id = $3",
      [newLocationStock, params.product_id, params.distributionCenterId]
    );

    const productResult = await client.query(
      "SELECT name, sku, current_stock FROM products WHERE id = $1",
      [params.product_id]
    );
    if (productResult.rows.length === 0) {
      throw new Error("Product not found");
    }
    const product = productResult.rows[0];
    const currentGlobalStock = parseFloat(product.current_stock);

    let quantityChange = 0;
    if (params.adjustment_type === "set") {
      quantityChange = newLocationStock - currentLocationStock;
    } else if (params.adjustment_type === "increase") {
      quantityChange = params.quantity;
    } else if (params.adjustment_type === "decrease") {
      quantityChange = -params.quantity;
    }
    const newGlobalStock = currentGlobalStock + quantityChange;

    const adjustmentResult = await client.query(
      `INSERT INTO stock_adjustments (
        product_id, adjustment_type, quantity, previous_stock, new_stock,
        reason, reference, notes, adjusted_by, distribution_center_id, batch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        params.product_id,
        params.adjustment_type,
        params.quantity,
        currentGlobalStock,
        newGlobalStock,
        params.reason,
        params.reference || null,
        params.notes || null,
        params.adjusted_by || null,
        params.distributionCenterId,
        params.batchId,
      ]
    );

    // products.current_stock is derived from product_locations by the V163
    // trigger (fired by the location UPDATE above) — no direct global write.

    const adjustment = adjustmentResult.rows[0] as StockAdjustment;

    return {
      adjustment,
      adjustmentData: {
        adjustmentId: adjustment.id,
        productId: params.product_id,
        productName: product.name || "Unknown Product",
        productSku: product.sku || "UNKNOWN",
        adjustmentType: params.adjustment_type,
        quantity: params.quantity,
        previousStock: currentGlobalStock,
        newStock: newGlobalStock,
        reason: params.reason,
        reference: params.reference || `ADJ-${adjustment.id}`,
        notes: params.notes ?? null,
        adjustmentDate: new Date().toISOString().split("T")[0],
        distributionCenterId: params.distributionCenterId,
      },
    };
  }

  /**
   * Create a bulk multi-product stock adjustment: one stock_adjustment_batches
   * header row + one stock_adjustments row per line, posted in a single
   * transaction. The accounting voucher per line is posted after commit so a
   * voucher failure doesn't roll back the inventory move (matches the
   * single-product flow's behavior).
   */
  static async createStockAdjustmentBatch(
    data: CreateStockAdjustmentBatchRequest,
    userId: string
  ): Promise<StockAdjustmentBatch> {
    const action = "Create Stock Adjustment Batch";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, {
        lineCount: data.lines.length,
        distributionCenterId: data.distribution_center_id,
      });

      const distributionCenterId = await StockAdjustmentMediator.resolveDistributionCenterId(
        client,
        data.distribution_center_id
      );

      const batchInsert = await client.query(
        `INSERT INTO stock_adjustment_batches (
          reason, reference, notes, adjusted_by, distribution_center_id, line_count
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.reason,
          data.reference || null,
          data.notes || null,
          data.adjusted_by || userId,
          distributionCenterId,
          data.lines.length,
        ]
      );
      const batch = batchInsert.rows[0] as StockAdjustmentBatch;

      const perLineResults: UnitsLineResult[] = [];
      for (const line of data.lines) {
        const result = await StockAdjustmentMediator.applyUnitsLine(client, {
          product_id: line.product_id,
          adjustment_type: line.adjustment_type,
          quantity: line.quantity,
          reason: data.reason,
          reference: data.reference || batch.batch_number,
          notes: line.notes ?? data.notes ?? null,
          adjusted_by: data.adjusted_by || userId,
          distributionCenterId,
          batchId: batch.id,
          syncGlobalStock: data.sync_global_stock,
        });
        perLineResults.push(result);
      }

      await client.query("COMMIT");

      // Per-line accounting voucher posting (mirrors single-product flow).
      for (const { adjustment, adjustmentData } of perLineResults) {
        try {
          eventBus.emit(EVENT_NAMES.STOCK_ADJUSTMENT_CREATED, {
            adjustmentData,
            userId,
          });
          await interModuleConnector.accModule.addStockAdjustmentVoucher(adjustmentData, userId);
        } catch (eventError: any) {
          MyLogger.error("Failed to post voucher for batch line", eventError, {
            batchId: batch.id,
            adjustmentId: adjustment.id,
          });
        }
      }

      MyLogger.success(action, {
        batchId: batch.id,
        batchNumber: batch.batch_number,
        lineCount: perLineResults.length,
      });

      return {
        ...batch,
        lines: perLineResults.map((r) => r.adjustment),
      };
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, {
        lineCount: data.lines.length,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getStockAdjustmentBatches(
    params: StockAdjustmentBatchQueryParams
  ): Promise<StockAdjustmentBatch[]> {
    const action = "Get Stock Adjustment Batches";
    try {
      MyLogger.info(action, { params });

      let query = `
        SELECT sab.*
        FROM stock_adjustment_batches sab
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.distribution_center_id) {
        query += ` AND sab.distribution_center_id = $${paramIndex}`;
        queryParams.push(params.distribution_center_id);
        paramIndex++;
      }
      if (params.start_date) {
        query += ` AND sab.created_at >= $${paramIndex}`;
        queryParams.push(params.start_date);
        paramIndex++;
      }
      if (params.end_date) {
        query += ` AND sab.created_at <= $${paramIndex}`;
        queryParams.push(params.end_date);
        paramIndex++;
      }

      query += ` ORDER BY sab.created_at DESC`;
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

  static async getStockAdjustmentBatchById(id: number): Promise<StockAdjustmentBatch> {
    const action = "Get Stock Adjustment Batch By ID";
    try {
      MyLogger.info(action, { batchId: id });

      const batchResult = await pool.query(
        `SELECT * FROM stock_adjustment_batches WHERE id = $1`,
        [id]
      );
      if (batchResult.rows.length === 0) {
        throw new Error("Stock adjustment batch not found");
      }
      const batch = batchResult.rows[0] as StockAdjustmentBatch;

      const linesResult = await pool.query(
        `SELECT sa.*, p.name as product_name, p.sku as product_sku
         FROM stock_adjustments sa
         JOIN products p ON sa.product_id = p.id
         WHERE sa.batch_id = $1
         ORDER BY sa.id ASC`,
        [id]
      );

      MyLogger.success(action, { batchId: id, lineCount: linesResult.rows.length });
      return { ...batch, lines: linesResult.rows };
    } catch (error: any) {
      MyLogger.error(action, error, { batchId: id });
      throw error;
    }
  }

  /**
   * Handle a 'uses' mode adjustment for a reusable product: decrement the
   * active unit's remaining uses, depleting physical units as their remaining
   * uses reach zero. Only the 'decrease' adjustment_type is supported. When a
   * unit is physically depleted, a parallel stock_adjustments row is written so
   * the existing accounting integration runs.
   */
  private static async consumeReusableUses(
    data: CreateStockAdjustmentRequest & { distribution_center_id?: number }
  ): Promise<StockAdjustment> {
    const action = "Create Stock Adjustment (uses)";
    if (data.adjustment_type !== "decrease") {
      throw new Error("Only 'decrease' is supported when adjustment_mode='uses'");
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      MyLogger.info(action, {
        productId: data.product_id,
        quantity: data.quantity,
        distributionCenterId: data.distribution_center_id,
      });

      const productRes = await client.query(
        `SELECT id, name, sku, uses_per_unit, current_stock FROM products WHERE id = $1`,
        [data.product_id]
      );
      if (productRes.rows.length === 0) {
        throw new Error("Product not found");
      }
      const product = productRes.rows[0];
      if (!ReusableStockService.isReusable(product)) {
        throw new Error(
          "adjustment_mode='uses' is only valid for reusable products (uses_per_unit > 1)"
        );
      }

      let distributionCenterId = data.distribution_center_id;
      if (!distributionCenterId) {
        const primaryDcResult = await client.query(
          "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1"
        );
        if (primaryDcResult.rows.length === 0) {
          throw new Error(
            "No distribution center specified and no primary distribution center found."
          );
        }
        distributionCenterId = primaryDcResult.rows[0].id;
      }

      const previousGlobalStock = parseFloat(product.current_stock);
      const { unitsDepleted, newActiveRemaining, newCurrentStock } =
        await ReusableStockService.consumeUses(
          data.product_id,
          distributionCenterId!,
          data.quantity,
          client
        );

      let stockAdjustmentRow: StockAdjustment | null = null;

      if (unitsDepleted > 0) {
        // products.current_stock is derived from product_locations by trigger
        // (ReusableStockService.consumeUses moved the location above); this value
        // is only used for the audit record below.
        const newGlobalStock = previousGlobalStock - unitsDepleted;

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
            "decrease",
            unitsDepleted,
            previousGlobalStock,
            newGlobalStock,
            data.reason,
            data.reference || null,
            `[uses-mode] consumed ${data.quantity} uses; ${unitsDepleted} unit(s) depleted${data.notes ? `. ${data.notes}` : ""}`,
            data.adjusted_by || null,
            distributionCenterId,
          ]
        );
        stockAdjustmentRow = adjustmentResult.rows[0];
      }

      await ReusableStockService.logConsumption(
        {
          productId: data.product_id,
          distributionCenterId: distributionCenterId!,
          usesConsumed: data.quantity,
          unitsDepleted,
          source: "manual_adjustment",
          sourceReferenceId: stockAdjustmentRow ? stockAdjustmentRow.id : null,
          reason: data.reason,
          createdBy:
            data.adjusted_by && !Number.isNaN(parseInt(String(data.adjusted_by), 10))
              ? parseInt(String(data.adjusted_by), 10)
              : null,
        },
        client
      );

      await client.query("COMMIT");

      if (stockAdjustmentRow) {
        // Mirror the units-flow accounting integration so vouchers/events fire
        // only for actual physical movement.
        try {
          const adjustmentData = {
            adjustmentId: stockAdjustmentRow.id,
            productId: data.product_id,
            productName: product.name || "Unknown Product",
            productSku: product.sku || "UNKNOWN",
            adjustmentType: "decrease" as const,
            quantity: unitsDepleted,
            previousStock: previousGlobalStock,
            newStock: previousGlobalStock - unitsDepleted,
            reason: data.reason,
            reference: data.reference || `ADJ-${stockAdjustmentRow.id}`,
            notes: stockAdjustmentRow.notes,
            adjustmentDate: new Date().toISOString().split("T")[0],
            distributionCenterId,
          };
          eventBus.emit(EVENT_NAMES.STOCK_ADJUSTMENT_CREATED, {
            adjustmentData,
            userId: data.adjusted_by || "System User",
          });
          await interModuleConnector.accModule.addStockAdjustmentVoucher(
            adjustmentData,
            data.adjusted_by || "System User"
          );
        } catch (eventError: any) {
          MyLogger.error(
            "Failed to emit stock adjustment accounting event (uses mode)",
            eventError,
            { adjustmentId: stockAdjustmentRow.id }
          );
        }

        MyLogger.success(action, {
          adjustmentId: stockAdjustmentRow.id,
          productId: data.product_id,
          usesConsumed: data.quantity,
          unitsDepleted,
          newActiveRemaining,
          newCurrentStock,
        });
        return stockAdjustmentRow;
      }

      // No physical movement — return a synthetic adjustment record reflecting
      // the use-only consumption, so callers can still display it.
      MyLogger.success(action, {
        productId: data.product_id,
        usesConsumed: data.quantity,
        unitsDepleted: 0,
        newActiveRemaining,
        newCurrentStock,
      });
      return {
        id: 0,
        product_id: data.product_id,
        adjustment_type: "decrease",
        quantity: data.quantity,
        previous_stock: previousGlobalStock,
        new_stock: previousGlobalStock,
        reason: data.reason,
        reference: data.reference,
        notes: `[uses-mode] consumed ${data.quantity} uses; no physical unit depleted`,
        adjusted_by: data.adjusted_by,
        created_at: new Date().toISOString(),
      };
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, {
        productId: data.product_id,
        quantity: data.quantity,
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
