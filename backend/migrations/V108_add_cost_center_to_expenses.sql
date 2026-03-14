-- V108: Add cost_center_id to expenses for cost center wise tracking
-- Enables expense allocation by organizational unit/project/location

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_cost_center_id ON expenses(cost_center_id);

COMMENT ON COLUMN expenses.cost_center_id IS 'Cost center for tracking expense allocation by department, project, or location';
