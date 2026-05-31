import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { interModuleConnector } from "@/utils/InterModuleConnector";
import {
  isRawMaterialsCategory,
  isReadyRawMaterialsCategory,
} from "@/constants/inventoryProductCategories";
import {
  CreatePreProductionEntryRequest,
  PreProductionManualEntry,
} from "@/types/preProduction";

/**
 * Records a manual pre-production entry: consume raw paper and produce a
 * finished Ready Raw Material. The stock movement (decrease raw + increase
 * finished) is delegated to the inventory stock-adjustment batch engine in a
 * single transaction, scoped to the chosen distribution center, and writes
 * only product_locations (sync_global_stock=false) — the global
 * products.current_stock is derived from DC totals by a DB trigger.
 */
export class CreatePreProductionEntryMediator {
  static async create(
    data: CreatePreProductionEntryRequest,
    userId: string
  ): Promise<PreProductionManualEntry> {
    const action = "CreatePreProductionEntryMediator.create";
    MyLogger.info(action, { data, userId });

    // Validate both products exist and have the expected categories.
    const productsRes = await pool.query(
      `SELECT p.id, p.name, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ANY($1::bigint[])`,
      [[data.raw_material_id, data.finished_product_id]]
    );

    const rawRow = productsRes.rows.find((r) => String(r.id) === String(data.raw_material_id));
    const finishedRow = productsRes.rows.find(
      (r) => String(r.id) === String(data.finished_product_id)
    );

    if (!rawRow) {
      throw new Error("Raw material product not found");
    }
    if (!finishedRow) {
      throw new Error("Finished product not found");
    }
    if (!isRawMaterialsCategory(rawRow.category_name)) {
      throw new Error("Selected raw material must be a Raw Materials product");
    }
    if (!isReadyRawMaterialsCategory(finishedRow.category_name)) {
      throw new Error("Selected finished product must be a Ready Raw Materials product");
    }

    // Move stock atomically (DC-scoped, product_locations only).
    const batch = await interModuleConnector.invModule.createStockAdjustmentBatch(
      {
        reason: "Pre-Production Manual Entry",
        notes: data.notes || null,
        adjusted_by: userId,
        distribution_center_id: data.distribution_center_id,
        sync_global_stock: false,
        lines: [
          {
            product_id: data.finished_product_id,
            adjustment_type: "increase",
            quantity: data.finished_produced_quantity,
            notes: `Produced (${data.production_type})`,
          },
          {
            product_id: data.raw_material_id,
            adjustment_type: "decrease",
            quantity: data.raw_consumed_quantity,
            notes: `Consumed for ${data.production_type}`,
          },
        ],
      },
      userId
    );

    if (!batch || !batch.id) {
      throw new Error("Failed to record stock movement for pre-production entry");
    }

    // Persist the manual-entry record linking the stock batch.
    const insertRes = await pool.query(
      `INSERT INTO pre_production_manual_entries (
        production_type, raw_material_id, raw_consumed_quantity,
        finished_product_id, finished_produced_quantity,
        distribution_center_id, stock_adjustment_batch_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        data.production_type,
        data.raw_material_id,
        data.raw_consumed_quantity,
        data.finished_product_id,
        data.finished_produced_quantity,
        batch.distribution_center_id ?? data.distribution_center_id ?? null,
        batch.id,
        data.notes || null,
        parseInt(userId, 10),
      ]
    );

    const entryId = insertRes.rows[0].id;

    const entryRes = await pool.query(
      `SELECT
        e.id, e.entry_number, e.production_type,
        e.raw_material_id, rp.name AS raw_material_name, rp.sku AS raw_material_sku,
        e.raw_consumed_quantity,
        e.finished_product_id, fp.name AS finished_product_name, fp.sku AS finished_product_sku,
        e.finished_produced_quantity,
        e.distribution_center_id, dc.name AS distribution_center_name,
        e.stock_adjustment_batch_id, e.notes, e.created_by, u.full_name AS created_by_name,
        e.created_at, e.updated_at
      FROM pre_production_manual_entries e
      JOIN products rp ON rp.id = e.raw_material_id
      JOIN products fp ON fp.id = e.finished_product_id
      LEFT JOIN distribution_centers dc ON dc.id = e.distribution_center_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.id = $1`,
      [entryId]
    );

    const row = entryRes.rows[0];
    const entry: PreProductionManualEntry = {
      ...row,
      raw_consumed_quantity: parseFloat(row.raw_consumed_quantity),
      finished_produced_quantity: parseFloat(row.finished_produced_quantity),
    };

    MyLogger.success(action, {
      entryId: entry.id,
      entryNumber: entry.entry_number,
      batchId: batch.id,
    });

    return entry;
  }
}
