-- V88: Add opening_due column to customers table
ALTER TABLE customers ADD COLUMN opening_due DECIMAL(15, 2) DEFAULT 0.00;

-- Comment for documentation
COMMENT ON COLUMN customers.opening_due IS 'Initial due amount at the time of customer onboarding';
