-- Allow factory customers without email (phone-only profiles).
-- Use NULL for missing email, not empty string, to avoid UNIQUE collisions.

ALTER TABLE factory_customers
    ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN factory_customers.email IS 'Optional when phone is provided; omit as NULL not empty string';
