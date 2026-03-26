-- V118: Align payroll_runs with approval/payment workflow (UpdatePayrollMediator / payment processing)

ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS approved_by BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_status_check;

ALTER TABLE payroll_runs ADD CONSTRAINT payroll_runs_status_check CHECK (
  status IN (
    'draft',
    'processing',
    'completed',
    'calculated',
    'approved',
    'paid',
    'cancelled',
    'posted'
  )
);
