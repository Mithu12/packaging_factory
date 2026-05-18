-- V145: Multi-order shipments
--
-- Scope a delivery (and its invoice) to a customer rather than to a single
-- order. The customer_order_id stays on both tables as a "primary / opened-from"
-- pointer for UX continuity (the order the user clicked "New Delivery" from),
-- but it is no longer load-bearing — the authoritative scope is
-- factory_customer_id, and the touched orders are derived from
-- delivery_items -> order_line_items -> order_id.
--
-- All existing rows already have a customer_order_id, so the factory_customer_id
-- backfill is total and we can set the new column NOT NULL in the same txn.

BEGIN;

-- 1. Add factory_customer_id and backfill from the existing single-order link.
ALTER TABLE factory_customer_order_deliveries
    ADD COLUMN IF NOT EXISTS factory_customer_id BIGINT REFERENCES factory_customers(id) ON DELETE RESTRICT;

UPDATE factory_customer_order_deliveries d
   SET factory_customer_id = co.factory_customer_id
  FROM factory_customer_orders co
 WHERE co.id = d.customer_order_id
   AND d.factory_customer_id IS NULL;

ALTER TABLE factory_customer_order_deliveries
    ALTER COLUMN factory_customer_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_factory_customer
    ON factory_customer_order_deliveries(factory_customer_id);

-- 2. customer_order_id becomes the "primary/opened-from" order — optional.
ALTER TABLE factory_customer_order_deliveries
    ALTER COLUMN customer_order_id DROP NOT NULL;

-- 3. Invoices mirror the same shape: factory_customer_id is authoritative,
-- primary order optional. (factory_customer_id is already NOT NULL on invoices.)
ALTER TABLE factory_sales_invoices
    ALTER COLUMN customer_order_id DROP NOT NULL;

COMMENT ON COLUMN factory_customer_order_deliveries.factory_customer_id IS
    'Authoritative scope: the customer this delivery is for. All delivery_items must come from orders for this customer.';
COMMENT ON COLUMN factory_customer_order_deliveries.customer_order_id IS
    'Primary/opened-from order (optional). Touched orders are derived from delivery_items -> order_line_items.';
COMMENT ON COLUMN factory_sales_invoices.customer_order_id IS
    'Primary order for this invoice (optional). Customer billing context comes from factory_customer_id.';

COMMIT;
