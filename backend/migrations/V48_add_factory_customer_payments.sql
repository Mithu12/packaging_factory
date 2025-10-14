-- V48: Add Factory Customer Payments and Order Financial Tracking

BEGIN;

-- 1. Extend factory_customer_orders with financial tracking columns if they do not exist
ALTER TABLE factory_customer_orders
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS outstanding_amount DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Update outstanding_amount to match total_value - paid_amount BEFORE adding constraints
-- This ensures data consistency before constraint validation
UPDATE factory_customer_orders
SET outstanding_amount = COALESCE(total_value, 0) - COALESCE(paid_amount, 0)
WHERE outstanding_amount != COALESCE(total_value, 0) - COALESCE(paid_amount, 0);

-- Now add constraints after data is consistent
ALTER TABLE factory_customer_orders
    ADD CONSTRAINT chk_factory_customer_orders_paid_amount
        CHECK (paid_amount >= 0);

ALTER TABLE factory_customer_orders
    ADD CONSTRAINT  chk_factory_customer_orders_outstanding_amount
        CHECK (outstanding_amount >= 0);

ALTER TABLE factory_customer_orders
    DROP CONSTRAINT IF EXISTS chk_factory_customer_orders_paid_outstanding_total;

ALTER TABLE factory_customer_orders
    ADD CONSTRAINT chk_factory_customer_orders_paid_outstanding_total
        CHECK (paid_amount <= total_value AND outstanding_amount = total_value - paid_amount);

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS factory_customer_payments (
    id BIGSERIAL PRIMARY KEY,
    factory_customer_order_id BIGINT NOT NULL REFERENCES factory_customer_orders(id) ON DELETE CASCADE,
    factory_customer_id BIGINT NOT NULL REFERENCES factory_customers(id) ON DELETE RESTRICT,
    factory_id BIGINT REFERENCES factories(id) ON DELETE SET NULL,
    factory_sales_invoice_id BIGINT REFERENCES factory_sales_invoices(id) ON DELETE SET NULL,
    payment_amount DECIMAL(15,2) NOT NULL CHECK (payment_amount > 0),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    payment_reference VARCHAR(100),
    notes TEXT,
    recorded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    additional_metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_factory_customer_payments_order_id
    ON factory_customer_payments(factory_customer_order_id);

CREATE INDEX IF NOT EXISTS idx_factory_customer_payments_customer_id
    ON factory_customer_payments(factory_customer_id);

CREATE INDEX IF NOT EXISTS idx_factory_customer_payments_factory_id
    ON factory_customer_payments(factory_id);

CREATE INDEX IF NOT EXISTS idx_factory_customer_payments_payment_date
    ON factory_customer_payments(payment_date);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_factory_customer_payments_updated_at
    BEFORE UPDATE ON factory_customer_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_timestamp();

-- 3. Comments for documentation
COMMENT ON TABLE factory_customer_payments IS 'Payments received against factory customer orders';
COMMENT ON COLUMN factory_customer_payments.payment_amount IS 'Amount received from customer';
COMMENT ON COLUMN factory_customer_payments.payment_method IS 'Method: cash, bank_transfer, card, cheque, etc.';
COMMENT ON COLUMN factory_customer_payments.additional_metadata IS 'JSON object for gateway payload or attachments';

-- 4. Recalculate order balances to ensure consistency
WITH aggregates AS (
    SELECT factory_customer_order_id,
           COALESCE(SUM(payment_amount), 0) AS total_paid
    FROM factory_customer_payments
    GROUP BY factory_customer_order_id
)
UPDATE factory_customer_orders o
SET paid_amount = a.total_paid,
    outstanding_amount = o.total_value - a.total_paid
FROM aggregates a
WHERE o.id = a.factory_customer_order_id;

-- For orders without payments ensure outstanding = total_value
UPDATE factory_customer_orders
SET outstanding_amount = total_value, paid_amount = 0
WHERE id NOT IN (SELECT factory_customer_order_id FROM factory_customer_payments);

COMMIT;
