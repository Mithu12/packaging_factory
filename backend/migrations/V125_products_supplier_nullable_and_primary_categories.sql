-- Optional supplier on products (UI: Supplier optional).
-- Ensure the two fixed inventory primary categories exist (idempotent).

ALTER TABLE products
    ALTER COLUMN supplier_id DROP NOT NULL;

COMMENT ON COLUMN products.supplier_id IS 'Optional; NULL when no supplier is assigned';

INSERT INTO categories (name, description)
VALUES
    ('Ready Goods', 'Finished products ready for sale'),
    ('Raw Materials', 'Materials used for production')
ON CONFLICT (name) DO NOTHING;
