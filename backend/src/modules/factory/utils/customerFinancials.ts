import { PoolClient } from "pg";
import { MyLogger } from "@/utils/new-logger";

export async function recalcFactoryCustomerFinancials(
  client: PoolClient,
  customerId: number | string
): Promise<void> {
  const action = "customerFinancials.recalc";
  const numericId = Number(customerId);

  if (!Number.isFinite(numericId)) {
    MyLogger.warn(action, { customerId, message: "Invalid customer id" });
    return;
  }

  const summaryQuery = `
    SELECT
      COALESCE(SUM(total_value), 0) AS total_order_value,
      COALESCE(SUM(paid_amount), 0) AS total_paid_amount,
      COALESCE(SUM(outstanding_amount), 0) AS total_outstanding_amount,
      COUNT(*) AS order_count
    FROM factory_customer_orders
    WHERE factory_customer_id = $1
  `;

  const summaryResult = await client.query(summaryQuery, [numericId]);
  const summary = summaryResult.rows[0] || {
    total_order_value: 0,
    total_paid_amount: 0,
    total_outstanding_amount: 0,
    order_count: 0,
  };

  await client.query(
    `
      UPDATE factory_customers
      SET
        total_order_value = $1,
        total_paid_amount = $2,
        total_outstanding_amount = $3,
        order_count = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `,
    [
      summary.total_order_value,
      summary.total_paid_amount,
      summary.total_outstanding_amount,
      Number(summary.order_count) || 0,
      numericId,
    ]
  );

  MyLogger.info(action, {
    customerId: numericId,
    total_order_value: summary.total_order_value,
    total_paid_amount: summary.total_paid_amount,
    total_outstanding_amount: summary.total_outstanding_amount,
    order_count: summary.order_count,
  });
}

