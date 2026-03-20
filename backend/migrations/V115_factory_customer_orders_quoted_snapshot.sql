-- Persist line-level quotation history when a quoted order is converted (view-only reference).

ALTER TABLE factory_customer_orders
    ADD COLUMN IF NOT EXISTS quoted_snapshot JSONB NULL;

COMMENT ON COLUMN factory_customer_orders.quoted_snapshot IS
    'Frozen quotation line items and totals before convert-to-order line replace; for display only.';
