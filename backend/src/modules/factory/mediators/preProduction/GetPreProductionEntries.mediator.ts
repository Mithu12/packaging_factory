import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import {
  PreProductionManualEntry,
  PreProductionEntryQueryParams,
} from "@/types/preProduction";

// Shared SELECT: aggregates the consumed raw materials into a JSON array so
// each entry carries its full raw_materials list.
const ENTRY_SELECT = `
  SELECT
    e.id, e.entry_number, e.production_type,
    e.finished_product_id, fp.name AS finished_product_name, fp.sku AS finished_product_sku,
    e.finished_produced_quantity,
    e.distribution_center_id, dc.name AS distribution_center_name,
    e.stock_adjustment_batch_id, e.notes, e.created_by, u.full_name AS created_by_name,
    e.created_at, e.updated_at,
    COALESCE(
      (
        SELECT json_agg(json_build_object(
          'raw_material_id', m.raw_material_id,
          'raw_material_name', rp.name,
          'raw_material_sku', rp.sku,
          'consumed_quantity', m.consumed_quantity,
          'consumed_rolls', m.consumed_rolls
        ) ORDER BY m.id)
        FROM pre_production_manual_entry_materials m
        JOIN products rp ON rp.id = m.raw_material_id
        WHERE m.entry_id = e.id
      ),
      '[]'::json
    ) AS raw_materials
  FROM pre_production_manual_entries e
  JOIN products fp ON fp.id = e.finished_product_id
  LEFT JOIN distribution_centers dc ON dc.id = e.distribution_center_id
  LEFT JOIN users u ON u.id = e.created_by
`;

function mapEntry(row: any): PreProductionManualEntry {
  return {
    ...row,
    finished_produced_quantity: parseFloat(row.finished_produced_quantity),
    raw_materials: (row.raw_materials || []).map((m: any) => ({
      ...m,
      consumed_quantity: parseFloat(m.consumed_quantity),
      consumed_rolls: parseFloat(m.consumed_rolls),
    })),
  };
}

export class GetPreProductionEntriesMediator {
  static async getById(id: number): Promise<PreProductionManualEntry | null> {
    const res = await pool.query(`${ENTRY_SELECT} WHERE e.id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return mapEntry(res.rows[0]);
  }

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
      `${ENTRY_SELECT} ${where} ORDER BY e.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset]
    );

    const entries = listRes.rows.map(mapEntry);

    MyLogger.success(action, { total, count: entries.length });

    return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
