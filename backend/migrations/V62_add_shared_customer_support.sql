-- V62: Add Shared Customer Support
-- This migration adds support for shared customers between factory and sales-rep modules
-- When both modules are available, customers are shared between them

BEGIN;

-- Add columns to factory_customers to support sales-rep specific fields
ALTER TABLE factory_customers
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_rep_id INTEGER REFERENCES users(id);

-- Add columns to sales_rep_customers to support factory specific fields
ALTER TABLE sales_rep_customers
  ADD COLUMN IF NOT EXISTS company VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'net_30',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_order_value DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_outstanding_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0;

-- Create indexes for better performance on shared customer queries
CREATE INDEX IF NOT EXISTS idx_factory_customers_sales_rep_id ON factory_customers(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_factory_customers_email_name ON factory_customers(email, name);
CREATE INDEX IF NOT EXISTS idx_sales_rep_customers_email_name ON sales_rep_customers(email, name);

-- Add comments for documentation
COMMENT ON COLUMN factory_customers.city IS 'City for shared customer support with sales-rep module';
COMMENT ON COLUMN factory_customers.state IS 'State for shared customer support with sales-rep module';
COMMENT ON COLUMN factory_customers.postal_code IS 'Postal code for shared customer support with sales-rep module';
COMMENT ON COLUMN factory_customers.current_balance IS 'Current balance for shared customer support with sales-rep module';
COMMENT ON COLUMN factory_customers.sales_rep_id IS 'Sales rep assigned to this customer for shared support';

COMMENT ON COLUMN sales_rep_customers.company IS 'Company name for shared customer support with factory module';
COMMENT ON COLUMN sales_rep_customers.payment_terms IS 'Payment terms for shared customer support with factory module';
COMMENT ON COLUMN sales_rep_customers.is_active IS 'Active status for shared customer support with factory module';
COMMENT ON COLUMN sales_rep_customers.total_order_value IS 'Total order value for shared customer support with factory module';
COMMENT ON COLUMN sales_rep_customers.total_paid_amount IS 'Total paid amount for shared customer support with factory module';
COMMENT ON COLUMN sales_rep_customers.total_outstanding_amount IS 'Total outstanding amount for shared customer support with factory module';
COMMENT ON COLUMN sales_rep_customers.order_count IS 'Order count for shared customer support with factory module';

-- Create a view for shared customers that combines data from both tables
CREATE OR REPLACE VIEW shared_customers AS
SELECT 
  fc.id,
  fc.name,
  fc.email,
  fc.phone,
  fc.company,
  fc.address::text as address,
  fc.city,
  fc.state,
  fc.postal_code,
  fc.credit_limit,
  fc.current_balance,
  fc.payment_terms,
  fc.is_active,
  fc.sales_rep_id,
  fc.total_order_value,
  fc.total_paid_amount,
  fc.total_outstanding_amount,
  fc.order_count,
  fc.created_at,
  fc.updated_at,
  'factory' as primary_source
FROM factory_customers fc
WHERE fc.is_active = true

UNION ALL

SELECT 
  src.id,
  src.name,
  src.email,
  src.phone,
  COALESCE(src.company, '') as company,
  src.address,
  COALESCE(src.city, '') as city,
  COALESCE(src.state, '') as state,
  COALESCE(src.postal_code, '') as postal_code,
  src.credit_limit,
  COALESCE(src.current_balance, 0) as current_balance,
  COALESCE(src.payment_terms, 'net_30') as payment_terms,
  COALESCE(src.is_active, true) as is_active,
  src.sales_rep_id,
  COALESCE(src.total_order_value, 0) as total_order_value,
  COALESCE(src.total_paid_amount, 0) as total_paid_amount,
  COALESCE(src.total_outstanding_amount, 0) as total_outstanding_amount,
  COALESCE(src.order_count, 0) as order_count,
  src.created_at,
  src.updated_at,
  'sales_rep' as primary_source
FROM sales_rep_customers src
WHERE NOT EXISTS (
  SELECT 1 FROM factory_customers fc 
  WHERE fc.email = src.email AND fc.name = src.name
);

-- Add comment for the view
COMMENT ON VIEW shared_customers IS 'Unified view of customers from both factory and sales-rep modules for shared customer support';

COMMIT;
