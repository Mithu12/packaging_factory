-- Migration V126: Add Machines and Machine Maintenance Logs
-- Description: Adds the machines registry and per-machine maintenance log history.

-- =======================
-- 1. machines
-- =======================
CREATE TABLE IF NOT EXISTS machines (
    id BIGSERIAL PRIMARY KEY,
    factory_id BIGINT,
    production_line_id BIGINT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255),
    manufacturer VARCHAR(255),
    purchase_date DATE,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_maintenance')),
    next_service_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_machines_production_line
        FOREIGN KEY (production_line_id) REFERENCES production_lines(id) ON DELETE SET NULL,
    CONSTRAINT fk_machines_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_machines_factory_id ON machines(factory_id);
CREATE INDEX IF NOT EXISTS idx_machines_production_line_id ON machines(production_line_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_is_active ON machines(is_active);
CREATE INDEX IF NOT EXISTS idx_machines_next_service_date ON machines(next_service_date);
CREATE INDEX IF NOT EXISTS idx_machines_code ON machines(code);

CREATE OR REPLACE FUNCTION update_machines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_machines_updated_at ON machines;
CREATE TRIGGER trigger_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW
    EXECUTE FUNCTION update_machines_updated_at();

-- =======================
-- 2. machine_maintenance_logs
-- =======================
CREATE TABLE IF NOT EXISTS machine_maintenance_logs (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL,
    maintenance_type VARCHAR(20) NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective')),
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    technician VARCHAR(255),
    cost NUMERIC(12, 2) DEFAULT 0 CHECK (cost >= 0),
    next_service_date DATE,
    notes TEXT,
    created_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_logs_machine
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_logs_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_machine_id ON machine_maintenance_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_performed_at ON machine_maintenance_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_type ON machine_maintenance_logs(maintenance_type);

DROP TRIGGER IF EXISTS trigger_maintenance_logs_updated_at ON machine_maintenance_logs;
CREATE TRIGGER trigger_maintenance_logs_updated_at
    BEFORE UPDATE ON machine_maintenance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_machines_updated_at();
