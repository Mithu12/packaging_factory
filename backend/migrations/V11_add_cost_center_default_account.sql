-- =====================================================
-- Migration: V11 - Add Default Account to Cost Centers
-- Description: Add default_account_id field to cost_centers table for direct Chart of Accounts connection
-- Author: System
-- Date: 2024-01-01
-- =====================================================

-- Add default_account_id column to cost_centers table
ALTER TABLE cost_centers 
ADD COLUMN default_account_id INTEGER REFERENCES chart_of_accounts(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cost_centers_default_account_id ON cost_centers(default_account_id);

-- Add comment for documentation
COMMENT ON COLUMN cost_centers.default_account_id IS 'Default expense account for this cost center (optional)';

-- Example: Update existing cost centers with default accounts (optional)
-- You can run these manually to set up default accounts for existing cost centers

-- UPDATE cost_centers 
-- SET default_account_id = (SELECT id FROM chart_of_accounts WHERE code = '5200' LIMIT 1)
-- WHERE type = 'Department' AND default_account_id IS NULL;

-- UPDATE cost_centers 
-- SET default_account_id = (SELECT id FROM chart_of_accounts WHERE code = '5300' LIMIT 1)
-- WHERE type = 'Project' AND default_account_id IS NULL;
