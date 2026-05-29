-- Migration V153: Printing-plate usage and breakage tracking
--
-- A physical plate is mounted and reused across many production runs. It breaks
-- unpredictably (its 10th use or its 100th), so unlike the reusable-inventory
-- model (V134) there is no fixed uses-per-unit cap and we must track each
-- physical plate individually. This mirrors the machine_parts pattern (V136):
-- one row per physical asset, a status lifecycle, and a history table linking
-- each use to the production run that consumed it.

BEGIN;

-- =======================
-- 1. plate_types  (the "multiple types of plate" lookup)
-- =======================
CREATE TABLE IF NOT EXISTS plate_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    expected_lifespan_uses INTEGER CHECK (expected_lifespan_uses IS NULL OR expected_lifespan_uses > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN plate_types.expected_lifespan_uses IS
    'Advisory expected number of uses before failure for this type. NULL = unknown.';

-- Allow duplicate NULL codes, enforce uniqueness when a code is provided.
CREATE UNIQUE INDEX IF NOT EXISTS idx_plate_types_code
    ON plate_types(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plate_types_is_active ON plate_types(is_active);

DROP TRIGGER IF EXISTS trigger_plate_types_updated_at ON plate_types;
CREATE TRIGGER trigger_plate_types_updated_at
    BEFORE UPDATE ON plate_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =======================
-- 2. plates  (one row per physical plate)
-- =======================
CREATE TABLE IF NOT EXISTS plates (
    id BIGSERIAL PRIMARY KEY,
    plate_type_id BIGINT NOT NULL REFERENCES plate_types(id),
    plate_code VARCHAR(100),
    total_uses INTEGER NOT NULL DEFAULT 0 CHECK (total_uses >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'broken', 'retired')),
    broke_at_use_count INTEGER CHECK (broke_at_use_count IS NULL OR broke_at_use_count >= 0),
    broken_at TIMESTAMP WITH TIME ZONE,
    broken_reason TEXT,
    expected_lifespan_uses INTEGER CHECK (expected_lifespan_uses IS NULL OR expected_lifespan_uses > 0),
    factory_id BIGINT REFERENCES factories(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN plates.total_uses IS
    'Running count of production runs that have used this plate. A break counts as a use.';
COMMENT ON COLUMN plates.broke_at_use_count IS
    'The total_uses value at which this plate broke. NULL while still active.';
COMMENT ON COLUMN plates.expected_lifespan_uses IS
    'Per-plate override of the type-level expected lifespan. NULL = inherit from type.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_plates_plate_code
    ON plates(plate_code) WHERE plate_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plates_plate_type_id ON plates(plate_type_id);
CREATE INDEX IF NOT EXISTS idx_plates_status ON plates(status);
CREATE INDEX IF NOT EXISTS idx_plates_factory_id ON plates(factory_id);

DROP TRIGGER IF EXISTS trigger_plates_updated_at ON plates;
CREATE TRIGGER trigger_plates_updated_at
    BEFORE UPDATE ON plates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =======================
-- 3. production_run_plates  (junction: which plates a run used + outcome)
-- =======================
CREATE TABLE IF NOT EXISTS production_run_plates (
    id BIGSERIAL PRIMARY KEY,
    production_run_id BIGINT NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
    plate_id BIGINT NOT NULL REFERENCES plates(id),
    outcome VARCHAR(20) NOT NULL DEFAULT 'used' CHECK (outcome IN ('used', 'broke')),
    use_number INTEGER CHECK (use_number IS NULL OR use_number >= 0),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_production_run_plates UNIQUE (production_run_id, plate_id)
);

COMMENT ON COLUMN production_run_plates.use_number IS
    'The total_uses value the plate reached on this run; lets analytics reconstruct "broke on its Nth use".';

CREATE INDEX IF NOT EXISTS idx_production_run_plates_plate_id ON production_run_plates(plate_id);
CREATE INDEX IF NOT EXISTS idx_production_run_plates_run_id ON production_run_plates(production_run_id);

COMMIT;
