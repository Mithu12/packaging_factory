-- V139: Add opening_balance and vat_number to factory_customers
-- opening_balance captures the customer's starting financial balance at onboarding.
-- vat_number stores the customer's VAT/tax identifier (optional).

BEGIN;

ALTER TABLE factory_customers
    ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50);

COMMENT ON COLUMN factory_customers.opening_balance IS 'Starting balance carried over when the customer was onboarded';
COMMENT ON COLUMN factory_customers.vat_number IS 'Customer VAT / tax registration identifier';

COMMIT;
