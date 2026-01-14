-- V78: Add Wholesale Price Column to Products
-- Description: Adds wholesale_price column to products table to support different pricing for wholesale vs normal customers

BEGIN;

-- 1. Ensure column exists
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10, 2);

-- 2. Create or Replace a Function to handle the logic
CREATE OR REPLACE FUNCTION sync_wholesale_price()
    RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wholesale_price IS NULL THEN
        NEW.wholesale_price := NEW.selling_price;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the Trigger
-- This fires before any INSERT or UPDATE to fill in the missing value
DROP TRIGGER IF EXISTS trg_sync_wholesale_price ON products;
CREATE TRIGGER trg_sync_wholesale_price
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
EXECUTE FUNCTION sync_wholesale_price();

-- 4. Backfill existing NULLs
UPDATE products
SET wholesale_price = selling_price
WHERE wholesale_price IS NULL;

COMMIT;