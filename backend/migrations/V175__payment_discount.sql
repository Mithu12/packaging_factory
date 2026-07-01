-- V175: Discount on supplier (PO) payments.
--
-- Suppliers may grant a discount so an invoice is fully settled while less cash
-- is disbursed. The per-allocation allocated_amount keeps its meaning (settles
-- the invoice in full); the new discount_amount records the reduction, and cash
-- for a line = allocated_amount - discount_amount. payments.amount stays the net
-- cash disbursed; payments.discount_amount holds the payment's total discount.

BEGIN;

ALTER TABLE payment_invoice_allocations
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN payments.discount_amount IS
    'Total supplier discount on this payment. Cash disbursed (amount) settles invoices by amount + discount_amount.';

COMMIT;
