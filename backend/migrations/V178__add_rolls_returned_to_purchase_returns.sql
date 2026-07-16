-- V178: Add rolls_returned to purchase_return_line_items
--
-- When returning goods that were received with roll tracking, capture how
-- many physical rolls are being returned so product_locations.current_rolls
-- can be decremented alongside current_stock on approval.

BEGIN;

ALTER TABLE purchase_return_line_items
    ADD COLUMN IF NOT EXISTS rolls_returned DECIMAL(10,2);

COMMENT ON COLUMN purchase_return_line_items.rolls_returned IS
    'Physical rolls returned alongside the quantity. NULL when no roll adjustment was specified.';

COMMIT;
