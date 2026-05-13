-- V135: Add customer PR (Purchase Request) reference number to factory customer orders.
-- Printed in the upper-right "Invoice Details" box on the redesigned Bill/Invoice PDF.

ALTER TABLE factory_customer_orders
    ADD COLUMN IF NOT EXISTS pr_no VARCHAR(50);

COMMENT ON COLUMN factory_customer_orders.pr_no IS
    'Customer Purchase Request / Reference number printed on invoice.';
