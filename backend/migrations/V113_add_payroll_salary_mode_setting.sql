-- Add payroll salary mode setting (hourly | monthly)
-- hourly: salary = hourly_rate * hours_worked from attendance
-- monthly: salary = monthly_amount * (days_present / working_days) - deducts for absent days
INSERT INTO settings (category, key, value, data_type, description, is_public, created_at, updated_at)
SELECT 'payroll', 'payroll_salary_mode', 'hourly', 'string', 'Salary calculation mode: hourly (by hours worked) or monthly (by days present, deducting absent days)', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE category = 'payroll' AND key = 'payroll_salary_mode');

-- Add payroll overtime enabled setting
INSERT INTO settings (category, key, value, data_type, description, is_public, created_at, updated_at)
SELECT 'payroll', 'payroll_overtime_enabled', 'true', 'boolean', 'Include overtime hours in payroll calculation (1.5x rate)', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE category = 'payroll' AND key = 'payroll_overtime_enabled');
