-- Add cost_center_id to distribution_centers table
ALTER TABLE distribution_centers ADD COLUMN IF NOT EXISTS cost_center_id INTEGER;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_distribution_centers_cost_center'
    ) THEN
        ALTER TABLE distribution_centers 
        ADD CONSTRAINT fk_distribution_centers_cost_center 
        FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Comment for the new column
COMMENT ON COLUMN distribution_centers.cost_center_id IS 'Link to the accounting cost center for financial tracking.';
