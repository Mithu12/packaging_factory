-- =========================================
-- Migration: V112_fix_production_run_sequence
-- Description: Ensure production_run_sequence is always ahead of existing run numbers
--              to prevent duplicate run_number when sequence was reset
-- =========================================

DO $$
DECLARE
  max_num BIGINT;
  curr_val BIGINT;
  new_val BIGINT;
BEGIN
  -- Extract max numeric part from run_number (format: PR-001000)
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(run_number, '^PR-', ''), '')::BIGINT
  ), 999) INTO max_num
  FROM production_runs
  WHERE run_number ~ '^PR-[0-9]+$';

  -- Get current sequence value (setval sets "last value", next nextval returns last+1)
  curr_val := (SELECT last_value FROM production_run_sequence);

  -- Set sequence so next nextval() returns max(max_num+1, curr_val+1)
  new_val := GREATEST(max_num, curr_val);
  PERFORM setval('production_run_sequence', new_val);

  RAISE NOTICE 'production_run_sequence set to % (max existing run_number: PR-%)', new_val, LPAD(max_num::TEXT, 6, '0');
END $$;
