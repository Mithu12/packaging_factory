-- Description: Link Chart of Accounts with Cost Centers and enforce 1:1 mapping for DCs
-- Migration: V97_add_cost_center_to_accounts

-- 1. Add cost_center_id to chart_of_accounts
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL;

-- 2. Add description to identify the mapping
COMMENT ON COLUMN chart_of_accounts.cost_center_id IS 'Cost center this specific account belongs to. Used for DC-wise accounting.';

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_coa_cost_center_id ON chart_of_accounts(cost_center_id);

-- 4. Enforce 1:1 mapping between Distribution Centers and Cost Centers
-- First, ensure there are no duplicate cost_center_ids in distribution_centers
-- (In a real system you'd handle cleanup here, but for migration we assume data is clean or will fail validation)
ALTER TABLE distribution_centers 
ADD CONSTRAINT unique_dc_cost_center_id UNIQUE (cost_center_id);

-- 5. Add unique constraint on (parent_id, cost_center_id) in chart_of_accounts
-- This prevents duplicate CC-specific accounts under the same parent Control account
ALTER TABLE chart_of_accounts
ADD CONSTRAINT unique_coa_parent_cost_center UNIQUE (parent_id, cost_center_id);
