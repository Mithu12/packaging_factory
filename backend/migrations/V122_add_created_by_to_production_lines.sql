-- Add created_by audit column to production_lines
ALTER TABLE production_lines
  ADD COLUMN IF NOT EXISTS created_by BIGINT;

ALTER TABLE production_lines
  DROP CONSTRAINT IF EXISTS fk_production_lines_created_by;

ALTER TABLE production_lines
  ADD CONSTRAINT fk_production_lines_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE production_lines
  VALIDATE CONSTRAINT fk_production_lines_created_by;

CREATE INDEX IF NOT EXISTS idx_production_lines_created_by
  ON production_lines(created_by);

COMMENT ON COLUMN production_lines.created_by
  IS 'User who created the production line';
