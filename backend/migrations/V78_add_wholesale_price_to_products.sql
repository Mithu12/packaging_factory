-- V78: Add Wholesale Price Column to Products
-- Description: Adds wholesale_price column to products table to support different pricing for wholesale vs normal customers

BEGIN;

-- Add wholesale_price column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10,2);

-- Add constraint to ensure wholesale_price is non-negative if provided
ALTER TABLE products
ADD CONSTRAINT IF NOT EXISTS products_wholesale_price_check 
CHECK (wholesale_price IS NULL OR wholesale_price >= 0);

-- Add comment for documentation
COMMENT ON COLUMN products.wholesale_price IS 'Wholesale price for bulk/wholesale customers. If NULL, uses selling_price.';

-- Update existing products: set wholesale_price to selling_price if not already set
-- This ensures backward compatibility - existing products will have wholesale_price = selling_price
UPDATE products
SET wholesale_price = selling_price
WHERE wholesale_price IS NULL;

COMMIT;
