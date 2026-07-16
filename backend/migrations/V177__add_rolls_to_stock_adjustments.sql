-- V177: Add rolls column to stock_adjustments for audit trail
--
-- When a bulk stock adjustment includes a rolls adjustment, the rolls value
-- is stored here for audit purposes, mirroring how roll tracking is stored
-- in purchase_order_receipt_line_items.rolls_received and
-- pre_production_manual_entry_materials.consumed_rolls.

BEGIN;

ALTER TABLE stock_adjustments
    ADD COLUMN IF NOT EXISTS rolls DECIMAL(10,2);

COMMENT ON COLUMN stock_adjustments.rolls IS
    'Physical rolls adjusted alongside stock quantity (parallel counter on product_locations.current_rolls). NULL when no roll adjustment was made.';

COMMIT;
