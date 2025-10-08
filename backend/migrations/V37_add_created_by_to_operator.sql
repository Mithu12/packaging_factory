-- Add columns (no-op if they already exist)
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS created_by BIGINT,
  ADD COLUMN IF NOT EXISTS updated_by BIGINT;

-- Drop existing FK constraints if present
ALTER TABLE operators
  DROP CONSTRAINT IF EXISTS fk_operators_created_by,
  DROP CONSTRAINT IF EXISTS fk_operators_updated_by;

-- Recreate FKs; consider ON DELETE SET NULL for audit-style columns
-- For large tables, use NOT VALID to avoid scanning existing rows immediately,
-- then VALIDATE afterward to enforce on new and existing rows.
ALTER TABLE operators
  ADD CONSTRAINT fk_operators_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID,
  ADD CONSTRAINT fk_operators_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE operators VALIDATE CONSTRAINT fk_operators_created_by;
ALTER TABLE operators VALIDATE CONSTRAINT fk_operators_updated_by;