-- Default country for new employee rows.

ALTER TABLE employees
    ALTER COLUMN country SET DEFAULT 'Bangladesh';
