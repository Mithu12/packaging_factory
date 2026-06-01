-- V163: Allow multiple raw materials per pre-production manual entry
--
-- A single in-house production run can consume several raw papers (e.g. a
-- liner + a media reel) to produce one finished Ready Raw Material. The
-- consumed raw materials move from the header to a child table; the header
-- keeps the single finished product it produces.

BEGIN;

CREATE TABLE IF NOT EXISTS pre_production_manual_entry_materials (
    id BIGSERIAL PRIMARY KEY,
    entry_id BIGINT NOT NULL REFERENCES pre_production_manual_entries(id) ON DELETE CASCADE,
    raw_material_id BIGINT NOT NULL REFERENCES products(id),
    consumed_quantity DECIMAL(15,4) NOT NULL CHECK (consumed_quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ppmem_entry ON pre_production_manual_entry_materials(entry_id);

COMMENT ON TABLE pre_production_manual_entry_materials IS
    'Raw materials consumed by a pre-production manual entry (one row per raw paper).';

-- Backfill any existing header-level raw material into the child table.
INSERT INTO pre_production_manual_entry_materials (entry_id, raw_material_id, consumed_quantity)
SELECT id, raw_material_id, raw_consumed_quantity
FROM pre_production_manual_entries
WHERE raw_material_id IS NOT NULL;

-- Header no longer carries a single raw material.
ALTER TABLE pre_production_manual_entries
    DROP COLUMN IF EXISTS raw_material_id,
    DROP COLUMN IF EXISTS raw_consumed_quantity;

COMMIT;
