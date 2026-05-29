-- Migration V153: Link machine parts to inventory for stock traceability
-- Description: A machine part may optionally reference an inventory product, so
-- that logging a replacement issues a real stock movement through the existing
-- stock_adjustments ledger. The replacement row back-links to the stock
-- adjustment it created, giving full traceability between maintenance and stock.

-- =======================
-- 1. machine_parts -> products (optional link)
-- =======================
ALTER TABLE machine_parts
    ADD COLUMN IF NOT EXISTS product_id BIGINT;

ALTER TABLE machine_parts
    DROP CONSTRAINT IF EXISTS fk_machine_parts_product;
ALTER TABLE machine_parts
    ADD CONSTRAINT fk_machine_parts_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_machine_parts_product_id ON machine_parts(product_id);

-- =======================
-- 2. machine_part_replacements -> stock consumption
-- =======================
ALTER TABLE machine_part_replacements
    ADD COLUMN IF NOT EXISTS product_id BIGINT,
    ADD COLUMN IF NOT EXISTS quantity NUMERIC(12, 3) CHECK (quantity IS NULL OR quantity > 0),
    ADD COLUMN IF NOT EXISTS distribution_center_id BIGINT,
    ADD COLUMN IF NOT EXISTS stock_adjustment_id BIGINT;

ALTER TABLE machine_part_replacements
    DROP CONSTRAINT IF EXISTS fk_machine_part_replacements_product;
ALTER TABLE machine_part_replacements
    ADD CONSTRAINT fk_machine_part_replacements_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE machine_part_replacements
    DROP CONSTRAINT IF EXISTS fk_machine_part_replacements_distribution_center;
ALTER TABLE machine_part_replacements
    ADD CONSTRAINT fk_machine_part_replacements_distribution_center
        FOREIGN KEY (distribution_center_id) REFERENCES distribution_centers(id) ON DELETE SET NULL;

ALTER TABLE machine_part_replacements
    DROP CONSTRAINT IF EXISTS fk_machine_part_replacements_stock_adjustment;
ALTER TABLE machine_part_replacements
    ADD CONSTRAINT fk_machine_part_replacements_stock_adjustment
        FOREIGN KEY (stock_adjustment_id) REFERENCES stock_adjustments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_machine_part_replacements_product_id ON machine_part_replacements(product_id);
CREATE INDEX IF NOT EXISTS idx_machine_part_replacements_stock_adjustment_id ON machine_part_replacements(stock_adjustment_id);
