import { PoolClient } from "pg";
import { MyLogger } from "@/utils/new-logger";
import { creditLocationStock, resolvePrimaryDcId } from "@/utils/stockLocations";

/**
 * Credits the produced FG/RRM into stock when a work order is completed.
 *
 * Quantity rule:
 *   - If completed production runs exist for the WO, credit the SUM of their good_quantity
 *     (the actually-good production output, excluding rejects).
 *   - Otherwise (no formal production tracking), credit the WO's planned quantity as a fallback.
 *
 * Idempotency: each WO transitions to 'completed' exactly once (the status machine forbids
 * leaving 'completed'), so each of the three completion paths calls this helper once and only once.
 *
 * Must run inside the same transaction as the status flip so a rollback unwinds the stock change.
 */
export async function creditWorkOrderProductStock(
  client: PoolClient,
  workOrderId: string | number
): Promise<void> {
  const action = "creditWorkOrderProductStock";

  const result = await client.query<{
    product_id: string | null;
    planned: string;
    good_total: string;
    distribution_center_id: string | null;
  }>(
    `SELECT
       wo.product_id,
       wo.quantity AS planned,
       wo.distribution_center_id,
       (
         SELECT COALESCE(SUM(good_quantity), 0)
         FROM production_runs
         WHERE work_order_id = wo.id AND status = 'completed'
       ) AS good_total
     FROM work_orders wo
     WHERE wo.id = $1`,
    [workOrderId]
  );

  if (result.rows.length === 0) {
    MyLogger.warn(action, { workOrderId, message: "Work order not found" });
    return;
  }

  const row = result.rows[0];
  if (!row.product_id) {
    MyLogger.warn(action, { workOrderId, message: "Work order has no product_id" });
    return;
  }

  const goodTotal = parseFloat(row.good_total) || 0;
  const planned = parseFloat(row.planned) || 0;
  const credit = goodTotal > 0 ? goodTotal : planned;

  if (credit <= 0) {
    MyLogger.info(action, {
      workOrderId,
      productId: row.product_id,
      message: "Nothing to credit (good_total and planned are both 0)",
    });
    return;
  }

  // Credit the work order's target DC; products.current_stock follows by trigger.
  const dcId = row.distribution_center_id
    ? Number(row.distribution_center_id)
    : await resolvePrimaryDcId(client);
  await creditLocationStock(client, Number(row.product_id), dcId, credit);

  MyLogger.success(action, {
    workOrderId,
    productId: row.product_id,
    distributionCenterId: dcId,
    credit,
    source: goodTotal > 0 ? "production_runs.good_quantity" : "work_orders.quantity (fallback)",
  });
}
