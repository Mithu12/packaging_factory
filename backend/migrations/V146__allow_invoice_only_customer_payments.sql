-- Make factory_customer_payments.factory_customer_order_id nullable so the
-- invoice-side recordPayment path can store payments for multi-order delivery
-- invoices (V145+), which have no single parent order.

ALTER TABLE factory_customer_payments
    ALTER COLUMN factory_customer_order_id DROP NOT NULL;
