-- Per-employee payroll tax override (NULL = use company default from settings)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2);

-- Default income tax % for payroll (when employee.tax_rate IS NULL)
INSERT INTO settings (category, key, value, data_type, description, is_public, created_at, updated_at)
SELECT
  'payroll',
  'payroll_default_tax_rate',
  '10',
  'number',
  'Default payroll income tax rate as percentage of gross pay (0–100). Employees may override via employees.tax_rate.',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM settings WHERE category = 'payroll' AND key = 'payroll_default_tax_rate'
);
