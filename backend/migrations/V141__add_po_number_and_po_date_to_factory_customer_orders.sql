-- V141: Add po_number and po_date to factory_customer_orders
-- Customer's purchase order reference captured at order creation;
-- shown on the challan + bill. Separate from the legacy pr_no column.

BEGIN;

ALTER TABLE factory_customer_orders
    ADD COLUMN IF NOT EXISTS po_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS po_date DATE;

COMMENT ON COLUMN factory_customer_orders.po_number IS 'Customer PO number printed on challan + bill';
COMMENT ON COLUMN factory_customer_orders.po_date IS 'Customer PO date printed on bill';

COMMIT;
