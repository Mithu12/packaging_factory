-- V63: Remove Unused Shared Customers View
-- The shared_customers view was created but is not used in the application.
-- The SharedCustomerService handles the UNION logic directly.

BEGIN;

-- Drop the unused view
DROP VIEW IF EXISTS shared_customers;

-- Add comment explaining the decision
COMMENT ON TABLE factory_customers IS 'Factory customers table with shared customer support columns added in V62';
COMMENT ON TABLE sales_rep_customers IS 'Sales rep customers table with shared customer support columns added in V62';

COMMIT;
