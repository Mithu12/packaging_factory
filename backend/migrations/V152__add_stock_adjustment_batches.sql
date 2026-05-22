-- V152: Stock Adjustment Batches
--
-- Adds a header record so a single bulk-adjustment transaction (one user
-- session adjusting many products at once, e.g. a cycle count) can be
-- queried as a group while preserving the per-product stock_adjustments
-- rows that the existing accounting integration and reusable-stock
-- service depend on.

-- =============================================================
-- Part 1: Sequence + batch-number generator
-- =============================================================

CREATE SEQUENCE IF NOT EXISTS stock_adjustment_batch_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_stock_adjustment_batch_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val BIGINT;
    year_str VARCHAR(4);
    batch_no VARCHAR(50);
BEGIN
    next_val := nextval('stock_adjustment_batch_number_seq');
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    batch_no := 'SAB-' || year_str || '-' || LPAD(next_val::TEXT, 6, '0');
    RETURN batch_no;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_stock_adjustment_batch_number IS 'Generates unique stock adjustment batch number (e.g., SAB-2026-000001)';

-- =============================================================
-- Part 2: Header table stock_adjustment_batches
-- =============================================================

CREATE TABLE IF NOT EXISTS stock_adjustment_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_number VARCHAR(50) NOT NULL UNIQUE DEFAULT generate_stock_adjustment_batch_number(),
    reason VARCHAR(255) NOT NULL,
    reference VARCHAR(100),
    notes TEXT,
    adjusted_by VARCHAR(100),
    distribution_center_id BIGINT REFERENCES distribution_centers(id),
    line_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_sab_line_count_nonneg CHECK (line_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sab_dc ON stock_adjustment_batches(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_sab_created_at ON stock_adjustment_batches(created_at DESC);

COMMENT ON TABLE stock_adjustment_batches IS 'Header record grouping one bulk multi-product stock adjustment transaction';

-- =============================================================
-- Part 3: batch_id FK on stock_adjustments (nullable; old single-product rows stay NULL)
-- =============================================================

ALTER TABLE stock_adjustments
    ADD COLUMN IF NOT EXISTS batch_id BIGINT REFERENCES stock_adjustment_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_batch_id ON stock_adjustments(batch_id);

COMMENT ON COLUMN stock_adjustments.batch_id IS 'When set, this row is one line of a bulk stock_adjustment_batches entry; NULL for single-product adjustments';

-- =============================================================
-- Part 4: updated_at trigger
-- =============================================================

CREATE OR REPLACE FUNCTION update_stock_adjustment_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_adjustment_batches_updated_at ON stock_adjustment_batches;
CREATE TRIGGER trigger_stock_adjustment_batches_updated_at
    BEFORE UPDATE ON stock_adjustment_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_adjustment_batches_updated_at();

-- =============================================================
-- Part 5: Log completion
-- =============================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration V152 completed: Stock adjustment batches';
    RAISE NOTICE '  - Created stock_adjustment_batches header table';
    RAISE NOTICE '  - Added stock_adjustments.batch_id FK column';
END $$;
