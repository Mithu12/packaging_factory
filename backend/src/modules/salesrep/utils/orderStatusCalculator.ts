import pool from "@/database/connection";

export async function calculateOrderStatus(orderId: number): Promise<string> {
  // Get all items for the order with their statuses
  const itemsQuery = `
    SELECT item_status, assigned_factory_id
    FROM sales_rep_order_items
    WHERE order_id = $1
  `;

  const result = await pool.query(itemsQuery, [orderId]);
  const items = result.rows;

  if (items.length === 0) {
    return "approved"; // No items yet
  }

  const statuses = items.map((item) => item.item_status || "pending");
  const acceptedCount = statuses.filter((s) => s === "factory_accepted").length;
  const rejectedCount = statuses.filter((s) => s === "factory_rejected").length;
  const pendingCount = statuses.filter((s) => s === "pending").length;

  // All items accepted
  if (acceptedCount === items.length) {
    return "factory_accepted";
  }

  // All items rejected
  if (rejectedCount === items.length) {
    return "rejected";
  }

  // Mix of accepted and rejected (no pending)
  if (pendingCount === 0 && acceptedCount > 0 && rejectedCount > 0) {
    return "partially_rejected";
  }

  // Some accepted, some pending
  if (acceptedCount > 0 && pendingCount > 0) {
    return "partially_accepted";
  }

  // Some rejected, some pending
  if (rejectedCount > 0 && pendingCount > 0) {
    return "partially_rejected";
  }

  // All pending (default after admin approval)
  return "approved";
}
