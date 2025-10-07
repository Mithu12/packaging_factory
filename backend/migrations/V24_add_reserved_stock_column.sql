ALTER TABLE products
  ADD COLUMN IF NOT EXISTS reserved_stock DECIMAL(15,4) NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0);

UPDATE products
SET reserved_stock = 0
WHERE reserved_stock IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_reserved_stock ON products(reserved_stock);
