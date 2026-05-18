-- V132: Per-delivery VAT number and per-line bundles count
--
-- Two additive columns to support the New Delivery dialog tweaks:
--   * factory_customer_order_deliveries.vat_number — per-shipment VAT override,
--     default-populated from factory_customers.vat_number (V139) by the UI.
--   * factory_customer_order_delivery_items.bundles — # of bundles (packing
--     units) shipped on this line. Nullable for non-bundled goods.

BEGIN;

ALTER TABLE factory_customer_order_deliveries
    ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50);

ALTER TABLE factory_customer_order_delivery_items
    ADD COLUMN IF NOT EXISTS bundles INTEGER;

ALTER TABLE factory_customer_order_delivery_items
    DROP CONSTRAINT IF EXISTS chk_delivery_items_bundles_nonneg;
ALTER TABLE factory_customer_order_delivery_items
    ADD CONSTRAINT chk_delivery_items_bundles_nonneg
    CHECK (bundles IS NULL OR bundles >= 0);

COMMENT ON COLUMN factory_customer_order_deliveries.vat_number IS
    'Per-shipment VAT registration override. Defaults from factory_customers.vat_number at create time.';
COMMENT ON COLUMN factory_customer_order_delivery_items.bundles IS
    'Number of bundles (packing units) shipped for this delivery line. Nullable for non-bundled goods.';

COMMIT;
