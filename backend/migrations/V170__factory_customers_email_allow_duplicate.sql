-- V170: Allow the same email across multiple factory customers.
--
-- Two related companies (or branches) can legitimately share one contact email.
-- The UNIQUE constraint from V16 (factory_customers.email) blocked that; drop it.
-- Email stays nullable (V124). No data change.

BEGIN;

ALTER TABLE factory_customers
    DROP CONSTRAINT IF EXISTS factory_customers_email_key;

COMMIT;
