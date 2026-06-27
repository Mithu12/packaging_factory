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
import { GetPreProductionEntriesMediator } from "./GetPreProductionEntries.mediator";

/**
 * Records a manual pre-production entry: consume one or more raw papers and
 * produce a finished Ready Raw Material. The stock movement (one decrease per
 * raw material + one increase for the finished product) is delegated to the
 * inventory stock-adjustment batch engine in a single transaction, scoped to
 * the chosen distribution center, and writes only product_locations
 * (sync_global_stock=false) — the global products.current_stock is derived
 * from DC totals by a DB trigger.
 */
export class CreatePreProductionEntryMediator {
  static async create(
    data: CreatePreProductionEntryRequest,
    userId: string
  ): Promise<PreProductionManualEntry> {
    const action = "CreatePreProductionEntryMediator.create";
    MyLogger.info(action, { data, userId });

    const rawIds = data.raw_materials.map((m) => m.raw_material_id);
    const allIds = Array.from(new Set([...rawIds, data.finished_product_id]));

    // Validate all referenced products exist and have the expected categories.
    const productsRes = await pool.query(
      `SELECT p.id, p.name, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ANY($1::bigint[])`,
      [allIds]
    );
    const byId = new Map(productsRes.rows.map((r) => [String(r.id), r]));

    const finishedRow = byId.get(String(data.finished_product_id));
    if (!finishedRow) {
      throw new Error("Finished product not found");
    }
    if (!isReadyRawMaterialsCategory(finishedRow.category_name)) {
      throw new Error("Selected finished product must be a Ready Raw Materials product");
    }

    for (const material of data.raw_materials) {
      const row = byId.get(String(material.raw_material_id));
      if (!row) {
        throw new Error(`Raw material product ${material.raw_material_id} not found`);
      }
      if (!isRawMaterialsCategory(row.category_name)) {
        throw new Error(`${row.name} must be a Raw Materials product`);
      }
    }

    // Move stock atomically (DC-scoped, product_locations only):
    // one increase for the finished product + one decrease per raw material.
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
          ...data.raw_materials.map((m) => ({
            product_id: m.raw_material_id,
            adjustment_type: "decrease" as const,
            quantity: m.consumed_quantity,
            notes: `Consumed for ${data.production_type}`,
          })),
        ],
      },
      userId
    );

    if (!batch || !batch.id) {
      throw new Error("Failed to record stock movement for pre-production entry");
    }

    // Persist the manual-entry record + its consumed raw materials.
    const client = await pool.connect();
    let entryId: number;
    try {
      await client.query("BEGIN");

      const insertRes = await client.query(
        `INSERT INTO pre_production_manual_entries (
          production_type, finished_product_id, finished_produced_quantity,
          distribution_center_id, stock_adjustment_batch_id, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          data.production_type,
          data.finished_product_id,
          data.finished_produced_quantity,
          batch.distribution_center_id ?? data.distribution_center_id ?? null,
          batch.id,
          data.notes || null,
          parseInt(userId, 10),
        ]
      );
      entryId = insertRes.rows[0].id;

      const dcId = batch.distribution_center_id ?? data.distribution_center_id ?? null;
      for (const m of data.raw_materials) {
        const consumedRolls = m.consumed_rolls ?? 0;
        await client.query(
          `INSERT INTO pre_production_manual_entry_materials (entry_id, raw_material_id, consumed_quantity, consumed_rolls)
           VALUES ($1, $2, $3, $4)`,
          [entryId, m.raw_material_id, m.consumed_quantity, consumedRolls]
        );

        // Roll counter runs parallel to current_stock (which the batch engine
        // already moved). Decrement the DC's physical rolls, clamped at zero.
        if (consumedRolls > 0 && dcId !== null) {
          await client.query(
            `UPDATE product_locations
               SET current_rolls = GREATEST(current_rolls - $1, 0),
                   updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $2 AND distribution_center_id = $3`,
            [consumedRolls, m.raw_material_id, dcId]
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const entry = await GetPreProductionEntriesMediator.getById(entryId);
    if (!entry) {
      throw new Error("Failed to load created pre-production entry");
    }

    MyLogger.success(action, {
      entryId: entry.id,
      entryNumber: entry.entry_number,
      batchId: batch.id,
      rawMaterialCount: data.raw_materials.length,
    });

    return entry;
  }
}
