-- V148: Carton labelling on deliveries + free-text bundles.
--
-- Operators need to write packing-layout values like "20 x 50" in the bundles
-- column, and to attach two challan-only labels per delivery: a "Master Carton
-- For" customer/brand line and an optional sub-label (e.g. "Hanicom"). The
-- invoice PDF deliberately omits these — they're internal packing notes.

BEGIN;

ALTER TABLE factory_customer_order_delivery_items
    DROP CONSTRAINT IF EXISTS chk_delivery_items_bundles_nonneg;

ALTER TABLE factory_customer_order_delivery_items
    ALTER COLUMN bundles TYPE VARCHAR(50)
    USING CASE WHEN bundles IS NULL THEN NULL ELSE bundles::text END;

COMMENT ON COLUMN factory_customer_order_delivery_items.bundles IS
    'Free-text bundle layout (e.g. "20 x 50"). Printed on the challan only.';

ALTER TABLE factory_customer_order_deliveries
    ADD COLUMN IF NOT EXISTS master_carton_for       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS master_carton_sub_label VARCHAR(255);

COMMENT ON COLUMN factory_customer_order_deliveries.master_carton_for IS
    'Carton-label text appearing after "Master Carton For:" on the challan. Not on the invoice.';
COMMENT ON COLUMN factory_customer_order_deliveries.master_carton_sub_label IS
    'Sub-label (e.g. brand "Hanicom") rendered below the carton-for line on the challan.';

COMMIT;
