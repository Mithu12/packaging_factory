-- V109: Add voucher_id reference to payments table (PO/supplier payments)
-- Enables linking supplier payment records to their accounting vouchers

BEGIN;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_voucher_id
    ON payments(voucher_id);

COMMENT ON COLUMN payments.voucher_id IS 'Reference to accounting voucher created for this payment (if accounts module integrated)';

COMMIT;
