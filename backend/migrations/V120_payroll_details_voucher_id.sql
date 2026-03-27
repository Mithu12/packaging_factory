-- Link payroll detail lines to accounting vouchers when payroll payments are posted to Accounts

ALTER TABLE payroll_details
  ADD COLUMN IF NOT EXISTS voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_details_voucher_id ON payroll_details(voucher_id);
