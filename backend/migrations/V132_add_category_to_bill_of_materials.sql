-- V132: Add category to bill_of_materials
-- Description: Classifies each BOM as 'media', 'liner', or 'both'.
-- Existing rows are backfilled to 'both' via the column DEFAULT.

BEGIN;

ALTER TABLE bill_of_materials
    ADD COLUMN IF NOT EXISTS category VARCHAR(10) NOT NULL DEFAULT 'both'
    CHECK (category IN ('media', 'liner', 'both'));

CREATE INDEX IF NOT EXISTS idx_bill_of_materials_category
    ON bill_of_materials(category);

COMMENT ON COLUMN bill_of_materials.category IS 'BOM output classification: media, liner, or both';

COMMIT;
