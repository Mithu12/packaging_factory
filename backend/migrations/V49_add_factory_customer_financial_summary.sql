-- V49: Persisted financial summary columns on factory_customers

BEGIN;

ALTER TABLE factory_customers
  ADD COLUMN IF NOT EXISTS total_order_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_outstanding_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_count INTEGER NOT NULL DEFAULT 0;

-- Backfill existing data
WITH summary AS (
  SELECT
    factory_customer_id AS customer_id,
    COALESCE(SUM(total_value), 0) AS total_order_value,
    COALESCE(SUM(paid_amount), 0) AS total_paid_amount,
    COALESCE(SUM(outstanding_amount), 0) AS total_outstanding_amount,
    COUNT(id) AS order_count
  FROM factory_customer_orders
  GROUP BY factory_customer_id
)
UPDATE factory_customers fc
SET
  total_order_value = s.total_order_value,
  total_paid_amount = s.total_paid_amount,
  total_outstanding_amount = s.total_outstanding_amount,
  order_count = s.order_count
FROM summary s
WHERE fc.id = s.customer_id;

-- Ensure customers without orders have zeroed summaries
UPDATE factory_customers
SET
  total_order_value = 0,
  total_paid_amount = 0,
  total_outstanding_amount = 0,
  order_count = 0
WHERE id NOT IN (SELECT DISTINCT factory_customer_id FROM factory_customer_orders);

COMMIT;

