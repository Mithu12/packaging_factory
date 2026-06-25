-- V173: AIT (advance income tax) and cheque date on customer payments.
--
-- AIT is tax the customer withholds at source: the invoice is settled by
-- (payment_amount + ait_amount), but only payment_amount is cash received.
-- cheque_date records the dated cheque when payment_method = 'cheque'.

BEGIN;

ALTER TABLE factory_customer_payments
    ADD COLUMN IF NOT EXISTS ait_amount  DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (ait_amount >= 0),
    ADD COLUMN IF NOT EXISTS cheque_date DATE;

COMMENT ON COLUMN factory_customer_payments.ait_amount IS
    'Advance income tax withheld by the customer; settles the invoice alongside payment_amount but is not cash received.';
COMMENT ON COLUMN factory_customer_payments.cheque_date IS
    'Cheque date for cheque payments (the printed date on the cheque).';

COMMIT;
