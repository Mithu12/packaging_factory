-- V133: Per-line item_code override on delivery items
--
-- The New Delivery dialog defaults the row's item code from
-- products.customer_item_code (V142). This column captures any per-shipment
-- override the user types into the row. Nullable -> when null, the product's
-- customer_item_code remains authoritative.

BEGIN;

ALTER TABLE factory_customer_order_delivery_items
    ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);

COMMENT ON COLUMN factory_customer_order_delivery_items.item_code IS
    'Per-shipment item code override. Defaults to products.customer_item_code on the UI side; persisted as typed.';

COMMIT;
