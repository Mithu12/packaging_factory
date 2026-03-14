-- Migration V110: Advance Salary Enhancements
-- Add advance_number and disbursement_date columns to employee_loans table

ALTER TABLE employee_loans ADD COLUMN IF NOT EXISTS advance_number VARCHAR(20);
ALTER TABLE employee_loans ADD COLUMN IF NOT EXISTS disbursement_date DATE;

-- Create unique index for advance_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_loans_advance_number ON employee_loans(advance_number) WHERE advance_number IS NOT NULL;

-- Create a sequence for advance numbers
CREATE SEQUENCE IF NOT EXISTS advance_salary_seq START WITH 1 INCREMENT BY 1;
