-- V100: Consolidate Quotations into Customer Orders
-- This migration adds quotation-specific fields to factory_customer_orders and migrates data from the legacy quotations table

-- 1. Add quotation-related columns to factory_customer_orders
ALTER TABLE factory_customer_orders 
ADD COLUMN IF NOT EXISTS valid_until DATE,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount_total DECIMAL(15,2) DEFAULT 0.00;

-- 2. Relax NOT NULL constraints on shipping_address and billing_address
-- Quotations may not have these details yet
ALTER TABLE factory_customer_orders ALTER COLUMN shipping_address DROP NOT NULL;
ALTER TABLE factory_customer_orders ALTER COLUMN billing_address DROP NOT NULL;
ALTER TABLE factory_customer_orders ALTER COLUMN sales_person DROP NOT NULL;


-- 5. Add comments for documentation
COMMENT ON COLUMN factory_customer_orders.valid_until IS 'Quotation validity date';
COMMENT ON COLUMN factory_customer_orders.tax_rate IS 'Applied tax rate for the quotation/order';
