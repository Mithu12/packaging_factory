-- Migration V129: Maintenance logs — start/end timestamps
-- Description: Rename performed_at to start_at and add end_at so a maintenance
-- event can capture both when the work began and when it was completed.

-- Rename the column (preserves existing data)
ALTER TABLE machine_maintenance_logs
    RENAME COLUMN performed_at TO start_at;

-- Add the new end timestamp (nullable; optional to fill for past logs)
ALTER TABLE machine_maintenance_logs
    ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE;

-- Guard: end must not be before start when both are present
ALTER TABLE machine_maintenance_logs
    DROP CONSTRAINT IF EXISTS maintenance_logs_end_after_start_check;

ALTER TABLE machine_maintenance_logs
    ADD CONSTRAINT maintenance_logs_end_after_start_check
    CHECK (end_at IS NULL OR end_at >= start_at);

-- Rebuild the performed_at index under the new name
DROP INDEX IF EXISTS idx_maintenance_logs_performed_at;
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_start_at
    ON machine_maintenance_logs(start_at);
