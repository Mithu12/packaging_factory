import { PoolClient } from "pg";

export interface RmBreakdownEntry {
  material_id: string;
  material_name: string;
  material_sku: string;
  unit_of_measure: string;
  required_quantity: number;
  current_stock: number;
  available_stock: number;
  shortfall_quantity: number;
  is_short: boolean;
  unit_cost: number;
  total_cost: number;
}

interface ShortageInput {
  material_id: string | number;
  shortfall_quantity: number;
}

/**
 * For each shortage whose material is a Ready Raw Material with an active BOM,
 * compute the underlying Raw Material requirements needed to produce the shortfall.
 *
 * Visibility-only: returns derived data; does not write requirements/shortages rows.
 *
 * Returns a Map keyed by material_id (as string) → ordered list of RM breakdown entries.
 * Materials not in the map are not RRM or have no active BOM, and should not be expanded.
 */
export async function buildRrmRmBreakdownMap(
  client: PoolClient,
  shortages: ShortageInput[]
): Promise<Map<string, RmBreakdownEntry[]>> {
  const breakdownMap = new Map<string, RmBreakdownEntry[]>();
  if (shortages.length === 0) return breakdownMap;

  const materialIds = Array.from(
    new Set(shortages.map((s) => Number(s.material_id)).filter((n) => Number.isFinite(n)))
  );
  if (materialIds.length === 0) return breakdownMap;

  // Pull RM components of the latest active BOM for each RRM material.
  const rrmComponentsResult = await client.query<{
    rrm_id: string;
    rm_id: string;
    rm_name: string;
    rm_sku: string;
    rm_uom: string;
    rm_current_stock: string;
    rm_reserved_stock: string;
    rm_cost_price: string;
    qty_per_unit: string;
    scrap_factor: string;
  }>(
    `
    WITH rrm_materials AS (
      SELECT p.id
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.id = ANY($1::int[]) AND c.name = 'Ready Raw Materials'
    ),
    latest_active_bom AS (
      SELECT DISTINCT ON (parent_product_id) id, parent_product_id
      FROM bill_of_materials
      WHERE parent_product_id IN (SELECT id FROM rrm_materials) AND is_active = true
      ORDER BY parent_product_id, effective_date DESC, id DESC
    )
    SELECT
      lab.parent_product_id::text AS rrm_id,
      bc.component_product_id::text AS rm_id,
      rm.name AS rm_name,
      rm.sku AS rm_sku,
      rm.unit_of_measure AS rm_uom,
      COALESCE(rm.current_stock, 0)::text AS rm_current_stock,
      COALESCE(rm.reserved_stock, 0)::text AS rm_reserved_stock,
      COALESCE(rm.cost_price, 0)::text AS rm_cost_price,
      bc.quantity_required::text AS qty_per_unit,
      COALESCE(bc.scrap_factor, 0)::text AS scrap_factor
    FROM latest_active_bom lab
    JOIN bom_components bc ON bc.bom_id = lab.id
    JOIN products rm ON rm.id = bc.component_product_id
    `,
    [materialIds]
  );

  // Group raw rows by RRM id.
  const componentsByRrm = new Map<string, typeof rrmComponentsResult.rows>();
  for (const row of rrmComponentsResult.rows) {
    const list = componentsByRrm.get(row.rrm_id) ?? [];
    list.push(row);
    componentsByRrm.set(row.rrm_id, list);
  }

  // For each shortage with components, materialize the RM breakdown.
  for (const shortage of shortages) {
    const rrmIdStr = String(shortage.material_id);
    const components = componentsByRrm.get(rrmIdStr);
    if (!components || components.length === 0) continue;

    const rrmShortfall = Number(shortage.shortfall_quantity) || 0;
    if (rrmShortfall <= 0) {
      breakdownMap.set(rrmIdStr, []);
      continue;
    }

    const breakdown: RmBreakdownEntry[] = components.map((c) => {
      const qtyPerUnit = parseFloat(c.qty_per_unit) || 0;
      const scrapFactor = parseFloat(c.scrap_factor) || 0;
      const requiredQuantity = qtyPerUnit * (1 + scrapFactor / 100) * rrmShortfall;
      const currentStock = parseFloat(c.rm_current_stock) || 0;
      const reservedStock = parseFloat(c.rm_reserved_stock) || 0;
      const availableStock = Math.max(0, currentStock - reservedStock);
      const shortfallQuantity = Math.max(0, requiredQuantity - availableStock);
      const unitCost = parseFloat(c.rm_cost_price) || 0;

      return {
        material_id: c.rm_id,
        material_name: c.rm_name,
        material_sku: c.rm_sku,
        unit_of_measure: c.rm_uom,
        required_quantity: requiredQuantity,
        current_stock: currentStock,
        available_stock: availableStock,
        shortfall_quantity: shortfallQuantity,
        is_short: shortfallQuantity > 0,
        unit_cost: unitCost,
        total_cost: unitCost * requiredQuantity,
      };
    });

    breakdownMap.set(rrmIdStr, breakdown);
  }

  return breakdownMap;
}
