-- Migration V75: Extend designations table with grade level and hierarchy
-- Adds grade_level and reports_to_id to support designation hierarchy in HRM

-- Add grade_level column
ALTER TABLE designations
  ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50);

-- Add reports_to_id column for self-referential hierarchy
ALTER TABLE designations
  ADD COLUMN IF NOT EXISTS reports_to_id BIGINT;

-- Add foreign key constraint to enforce hierarchy reference
ALTER TABLE designations
  ADD CONSTRAINT fk_designations_reports_to FOREIGN KEY (reports_to_id)
  REFERENCES designations(id) DEFERRABLE INITIALLY DEFERRED;

-- Index to speed up hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_designations_reports_to_id ON designations(reports_to_id);





