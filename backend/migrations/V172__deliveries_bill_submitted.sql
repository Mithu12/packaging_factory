-- V172: Track whether a delivery's bill has been submitted to the customer.
--
-- Operators tick this once the physical/printed bill is handed to the company.
-- Manual per-delivery flag (no automatic derivation). Used by the Deliveries list.

BEGIN;

ALTER TABLE factory_customer_order_deliveries
    ADD COLUMN IF NOT EXISTS bill_submitted    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS bill_submitted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS bill_submitted_by BIGINT REFERENCES users(id);

COMMENT ON COLUMN factory_customer_order_deliveries.bill_submitted IS
    'Set true when the bill for this delivery has been submitted to the customer.';

COMMIT;
