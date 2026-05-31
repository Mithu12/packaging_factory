-- V161: BOM variant attributes (cutting + reel size/number)
--
-- Ready Goods cartons are produced in several variations that share the same
-- product (same name): they differ by the cutting and the reel size/number.
-- Previously a second BOM for the same parent product was rejected by
-- UNIQUE(parent_product_id, version), so these variants could not coexist.
--
-- We tag cutting/reel onto the BOM itself (products already carry free-text
-- cutting_size/reel_size from V142) and fold them into the uniqueness key so
-- same-name variants no longer collide. The columns are NOT NULL DEFAULT ''
-- on purpose: Postgres treats NULLs as distinct in a unique index, which would
-- defeat the constraint, so empty string is the canonical "no value".

BEGIN;

ALTER TABLE bill_of_materials
    ADD COLUMN IF NOT EXISTS cutting_size VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS reel_size    VARCHAR(100) NOT NULL DEFAULT '';

COMMENT ON COLUMN bill_of_materials.cutting_size IS
    'Free-text cutting that distinguishes this BOM variant of the parent product.';
COMMENT ON COLUMN bill_of_materials.reel_size IS
    'Free-text reel size/number that distinguishes this BOM variant of the parent product.';

-- Replace the old (parent_product_id, version) uniqueness with one that also
-- keys on the variant attributes, scoped to active BOMs to match the
-- application-level dedupe check (is_active = true).
ALTER TABLE bill_of_materials
    DROP CONSTRAINT IF EXISTS bill_of_materials_parent_product_id_version_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bom_parent_version_variant
    ON bill_of_materials (parent_product_id, version, cutting_size, reel_size)
    WHERE is_active = true;

COMMIT;
