-- Customer payments are recorded per sales invoice. Cheque / bank-transfer
-- receipts capture the originating bank; store it on the payment so it can be
-- shown in payment history and on the receipt voucher. Mirrors the supplier-side
-- bank fields added in V157.
ALTER TABLE factory_customer_payments ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
