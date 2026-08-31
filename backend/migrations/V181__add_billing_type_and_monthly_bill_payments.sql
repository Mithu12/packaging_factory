-- ============================================================
-- Add billing_type to factory_customers for per-delivery vs
-- monthly billing scheme selection.
-- ============================================================
ALTER TABLE factory_customers
    ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20)
        NOT NULL DEFAULT 'per_delivery'
        CHECK (billing_type IN ('per_delivery', 'monthly'));

COMMENT ON COLUMN factory_customers.billing_type IS
    'per_delivery = pay per delivery invoice; monthly = pay per consolidated monthly bill';

-- ============================================================
-- Add monthly_bill_id to factory_customer_payments so payments
-- can optionally reference a monthly bill instead of (or in
-- addition to) a single delivery invoice.
-- ============================================================
ALTER TABLE factory_customer_payments
    ADD COLUMN IF NOT EXISTS monthly_bill_id BIGINT
        REFERENCES monthly_bills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_monthly_bill
    ON factory_customer_payments(monthly_bill_id);

COMMENT ON COLUMN factory_customer_payments.monthly_bill_id IS
    'Optional link to a monthly bill payment; NULL for per-delivery payments';
