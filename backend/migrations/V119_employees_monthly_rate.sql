-- Monthly rate stored alongside hourly_rate; conversion uses 8h × 22 working days (aligned with payroll).

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(12, 2);

UPDATE employees
SET monthly_rate = ROUND((hourly_rate * 8 * 22)::numeric, 2)
WHERE hourly_rate IS NOT NULL
  AND (monthly_rate IS NULL OR monthly_rate = 0);
