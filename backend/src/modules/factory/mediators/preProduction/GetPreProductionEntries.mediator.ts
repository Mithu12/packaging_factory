import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  PreProductionManualEntry,
  PreProductionEntryQueryParams,
} from "@/types/preProduction";

export class GetPreProductionEntriesMediator {
  static async list(params: PreProductionEntryQueryParams): Promise<{
    entries: PreProductionManualEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "GetPreProductionEntriesMediator.list";
    MyLogger.info(action, { params });

    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (params.production_type) {
      conditions.push(`e.production_type = $${i++}`);
      values.push(params.production_type);
    }
    if (params.distribution_center_id) {
      conditions.push(`e.distribution_center_id = $${i++}`);
      values.push(params.distribution_center_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM pre_production_manual_entries e ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const listRes = await pool.query(
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
      ${where}
      ORDER BY e.created_at DESC
      LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset]
    );

    const entries: PreProductionManualEntry[] = listRes.rows.map((row) => ({
      ...row,
      raw_consumed_quantity: parseFloat(row.raw_consumed_quantity),
      finished_produced_quantity: parseFloat(row.finished_produced_quantity),
    }));

    MyLogger.success(action, { total, count: entries.length });

    return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
