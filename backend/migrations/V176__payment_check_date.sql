-- V176: Check date on supplier (PO) payments.
--
-- The `reference` field is used as the check number (labelled "Check no" in the
-- UI); this adds the printed date on that check for cheque/check payments.

BEGIN;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS check_date DATE;

COMMENT ON COLUMN payments.check_date IS
    'Printed date on the check (reference = check number) for check payments.';

COMMIT;
