-- Add opening_balance column to suppliers table
ALTER TABLE suppliers ADD COLUMN opening_balance DECIMAL(15, 2) DEFAULT 0.00;

-- Drop sequence if exists to be safe
DROP SEQUENCE IF EXISTS invoice_ob_number_sequence;
CREATE SEQUENCE invoice_ob_number_sequence START WITH 1;
