-- Migration V136: Add Machine Parts and Replacement History
-- Description: Adds a per-machine parts catalog (BOM-like) and a replacement
-- history table. Parts belong to a single machine; replacements may optionally
-- be linked to an existing maintenance log.

-- =======================
-- 1. machine_parts
-- =======================
CREATE TABLE IF NOT EXISTS machine_parts (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    part_code VARCHAR(100),
    position VARCHAR(255),
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    manufacturer VARCHAR(255),
    model_number VARCHAR(255),
    installed_at DATE,
    expected_lifespan_days INTEGER CHECK (expected_lifespan_days IS NULL OR expected_lifespan_days > 0),
    last_replaced_at DATE,
    next_replacement_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'replaced', 'retired')),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_machine_parts_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
    CONSTRAINT fk_machine_parts_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_machine_parts_machine_id ON machine_parts(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_parts_status ON machine_parts(status);
CREATE INDEX IF NOT EXISTS idx_machine_parts_next_replacement_date ON machine_parts(next_replacement_date);
CREATE INDEX IF NOT EXISTS idx_machine_parts_is_active ON machine_parts(is_active);

-- Allow duplicate NULL part_code values, but enforce uniqueness per machine
-- when a code is provided.
CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_parts_machine_id_part_code
    ON machine_parts(machine_id, part_code)
    WHERE part_code IS NOT NULL;

DROP TRIGGER IF EXISTS trigger_machine_parts_updated_at ON machine_parts;
CREATE TRIGGER trigger_machine_parts_updated_at
    BEFORE UPDATE ON machine_parts
    FOR EACH ROW
    EXECUTE FUNCTION update_machines_updated_at();

-- =======================
-- 2. machine_part_replacements
-- =======================
CREATE TABLE IF NOT EXISTS machine_part_replacements (
    id BIGSERIAL PRIMARY KEY,
    machine_part_id BIGINT NOT NULL,
    maintenance_log_id BIGINT,
    replaced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(20) NOT NULL DEFAULT 'preventive' CHECK (reason IN ('preventive', 'failure', 'upgrade', 'other')),
    technician VARCHAR(255),
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    next_replacement_date DATE,
    notes TEXT,
    created_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_machine_part_replacements_part
        FOREIGN KEY (machine_part_id) REFERENCES machine_parts(id) ON DELETE CASCADE,
    CONSTRAINT fk_machine_part_replacements_maintenance_log
        FOREIGN KEY (maintenance_log_id) REFERENCES machine_maintenance_logs(id) ON DELETE SET NULL,
    CONSTRAINT fk_machine_part_replacements_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_machine_part_replacements_part_id ON machine_part_replacements(machine_part_id);
CREATE INDEX IF NOT EXISTS idx_machine_part_replacements_replaced_at ON machine_part_replacements(replaced_at);
CREATE INDEX IF NOT EXISTS idx_machine_part_replacements_maintenance_log_id ON machine_part_replacements(maintenance_log_id);

DROP TRIGGER IF EXISTS trigger_machine_part_replacements_updated_at ON machine_part_replacements;
CREATE TRIGGER trigger_machine_part_replacements_updated_at
    BEFORE UPDATE ON machine_part_replacements
    FOR EACH ROW
    EXECUTE FUNCTION update_machines_updated_at();
