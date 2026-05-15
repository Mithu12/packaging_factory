-- V133: Rename bill_of_materials.category values
-- media -> corrugation, liner -> printing, both -> ready_goods.
-- Widens the column to accommodate longer values, swaps the CHECK constraint,
-- backfills existing rows, and updates the default.

BEGIN;

ALTER TABLE bill_of_materials
    DROP CONSTRAINT IF EXISTS bill_of_materials_category_check;

ALTER TABLE bill_of_materials
    ALTER COLUMN category DROP DEFAULT;

ALTER TABLE bill_of_materials
    ALTER COLUMN category TYPE VARCHAR(20);

UPDATE bill_of_materials
SET category = CASE category
    WHEN 'media' THEN 'corrugation'
    WHEN 'liner' THEN 'printing'
    WHEN 'both'  THEN 'ready_goods'
    ELSE category
END
WHERE category IN ('media', 'liner', 'both');

ALTER TABLE bill_of_materials
    ALTER COLUMN category SET DEFAULT 'ready_goods';

ALTER TABLE bill_of_materials
    ADD CONSTRAINT bill_of_materials_category_check
    CHECK (category IN ('corrugation', 'printing', 'ready_goods'));

COMMENT ON COLUMN bill_of_materials.category IS 'BOM output classification: corrugation, printing, or ready_goods';

COMMIT;
