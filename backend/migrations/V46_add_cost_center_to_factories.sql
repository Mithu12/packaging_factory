-- V46: Add Cost Center to Factories
-- Description: Add cost_center_id to factories table to track factory-level expenses and overhead
-- This enables better financial tracking and cost allocation for each factory

-- Add cost_center_id column to factories table
ALTER TABLE factories 
ADD COLUMN IF NOT EXISTS cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_factories_cost_center 
ON factories(cost_center_id);

-- Add comment to document the column
COMMENT ON COLUMN factories.cost_center_id 
IS 'Cost center for tracking factory-level expenses and overhead allocation';

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Migration V46 completed successfully';
    RAISE NOTICE '  - Added cost_center_id to factories table';
    RAISE NOTICE '  - Created index on cost_center_id';
    RAISE NOTICE '  - Factories can now be linked to cost centers for financial tracking';
END $$;

