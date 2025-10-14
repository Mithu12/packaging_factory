-- V50: Add voucher_id reference to factory_customer_payments table
-- This enables linking payment records to their accounting vouchers

BEGIN;

-- Add voucher_id column to track accounting integration
ALTER TABLE factory_customer_payments
    ADD COLUMN IF NOT EXISTS voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL;

-- Add index for quick voucher lookups
CREATE INDEX IF NOT EXISTS idx_factory_customer_payments_voucher_id
    ON factory_customer_payments(voucher_id);

-- Add comment for documentation
COMMENT ON COLUMN factory_customer_payments.voucher_id IS 'Reference to accounting voucher created for this payment (if accounts module integrated)';

COMMIT;

