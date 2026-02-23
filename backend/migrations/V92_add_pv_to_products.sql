-- V92: Add PV Column to Products
-- Description: Adds pv (Personal Volume) column to products table to support loyalty/points calculation

BEGIN;

-- 1. Add pv column if it doesn't exist
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS pv NUMERIC(10, 2) DEFAULT 0.00;

-- 2. Backfill existing products (though default handles new ones, explicit backfill is good practice)
UPDATE products
SET pv = 0.00
WHERE pv IS NULL;

-- 3. Add comment
COMMENT ON COLUMN products.pv IS 'Personal Volume (loyalty points) for the product';

COMMIT;
