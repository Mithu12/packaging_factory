-- V162: Pre-Production Manual Entries
--
-- Operators record in-house production by hand: pick a production type
-- (Printing, or Corrugation -> Media/Liner), a raw paper material consumed,
-- and a finished Ready Raw Material produced. Submitting moves stock at a
-- chosen distribution center (decrease raw, increase finished) via the
-- existing stock-adjustment batch engine, and writes one record here for
-- history/reporting linking back to that batch.
--
-- Stock writes for this feature are DC-scoped (product_locations only); the
-- global products.current_stock is derived by a separate trigger.

BEGIN;

-- =============================================================
-- Part 1: Sub-categories under "Ready Raw Materials" so finished
-- products can be tagged/filtered by production type in the form.
-- =============================================================
INSERT INTO subcategories (name, category_id)
SELECT v.name, c.id
FROM (VALUES ('Printing'), ('Media'), ('Liner')) AS v(name)
JOIN categories c ON c.name = 'Ready Raw Materials'
ON CONFLICT (name, category_id) DO NOTHING;

-- =============================================================
-- Part 2: Entry-number generator (e.g. PPE-2026-000001)
-- =============================================================
CREATE SEQUENCE IF NOT EXISTS pre_production_entry_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_pre_production_entry_number()
RETURNS VARCHAR(30) AS $$
DECLARE
    next_val BIGINT;
    year_str VARCHAR(4);
BEGIN
    next_val := nextval('pre_production_entry_number_seq');
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    RETURN 'PPE-' || year_str || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_pre_production_entry_number IS
    'Generates unique pre-production manual entry number (e.g., PPE-2026-000001)';

-- =============================================================
-- Part 3: pre_production_manual_entries
-- =============================================================
CREATE TABLE IF NOT EXISTS pre_production_manual_entries (
    id BIGSERIAL PRIMARY KEY,
    entry_number VARCHAR(30) NOT NULL UNIQUE DEFAULT generate_pre_production_entry_number(),
    production_type VARCHAR(20) NOT NULL
        CHECK (production_type IN ('printing', 'corrugation_media', 'corrugation_liner')),
    raw_material_id BIGINT NOT NULL REFERENCES products(id),
    raw_consumed_quantity DECIMAL(15,4) NOT NULL CHECK (raw_consumed_quantity > 0),
    finished_product_id BIGINT NOT NULL REFERENCES products(id),
    finished_produced_quantity DECIMAL(15,4) NOT NULL CHECK (finished_produced_quantity > 0),
    distribution_center_id BIGINT REFERENCES distribution_centers(id),
    stock_adjustment_batch_id BIGINT REFERENCES stock_adjustment_batches(id) ON DELETE SET NULL,
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ppme_created_at ON pre_production_manual_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ppme_production_type ON pre_production_manual_entries(production_type);
CREATE INDEX IF NOT EXISTS idx_ppme_dc ON pre_production_manual_entries(distribution_center_id);

COMMENT ON TABLE pre_production_manual_entries IS
    'Manual record of in-house pre-production: raw paper consumed -> finished RRM produced, linked to the stock adjustment batch that moved the stock.';

COMMIT;
