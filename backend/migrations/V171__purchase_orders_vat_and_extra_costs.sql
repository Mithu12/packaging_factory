-- V171: VAT + extra cost breakdown on purchase orders.
--
-- POs previously stored only total_amount. Capture the subtotal, a VAT rate/amount
-- (rate entered, amount computed), and two optional cost lines (transport / others)
-- that each carry a flag for whether they are rolled into the grand total or just
-- recorded. Mirrors the tax_rate/tax_amount/subtotal pattern on factory orders.

BEGIN;

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_rate          NUMERIC(5,2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transport_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transport_in_total BOOLEAN      NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS others_payment    NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS others_in_total   BOOLEAN       NOT NULL DEFAULT false;

COMMENT ON COLUMN purchase_orders.subtotal IS 'Sum of line items (qty * unit_price), before VAT and extra costs';
COMMENT ON COLUMN purchase_orders.tax_rate IS 'VAT % applied to subtotal';
COMMENT ON COLUMN purchase_orders.tax_amount IS 'VAT amount in currency (subtotal * tax_rate / 100)';
COMMENT ON COLUMN purchase_orders.transport_payment IS 'Transport cost; added to total only when transport_in_total';
COMMENT ON COLUMN purchase_orders.others_payment IS 'Other cost; added to total only when others_in_total';

COMMIT;
