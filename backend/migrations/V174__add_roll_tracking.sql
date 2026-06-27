-- V174: Track physical paper rolls (reels) alongside continuous quantity stock.
--
-- Raw-material paper arrives and is consumed as whole rolls. This adds a roll
-- counter that runs parallel to product_locations.current_stock (it does NOT
-- drive current_stock). Rolls are replenished via purchase-order receiving and
-- consumed during manual pre-production; "rolls left" is shown per DC on the
-- inventory stock overview.

BEGIN;

-- DC-scoped physical roll count, mirrors current_stock.
ALTER TABLE product_locations
    ADD COLUMN IF NOT EXISTS current_rolls DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN product_locations.current_rolls IS
    'Physical paper rolls on hand at this DC. Parallel counter to current_stock; does not drive it.';

-- Rolls consumed per raw-material line of a pre-production entry (audit/history).
ALTER TABLE pre_production_manual_entry_materials
    ADD COLUMN IF NOT EXISTS consumed_rolls DECIMAL(15,4) NOT NULL DEFAULT 0;

-- Rolls received in a given GRN line (audit/history).
ALTER TABLE purchase_order_receipt_line_items
    ADD COLUMN IF NOT EXISTS rolls_received NUMERIC(15,3) NOT NULL DEFAULT 0;

COMMIT;
