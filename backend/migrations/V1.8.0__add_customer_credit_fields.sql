-- Customer Credit and Gift Features
-- Version: 1.8.0
-- Description: Adds credit fields to customers and gift features to sales

-- Add credit_limit and due_amount fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0 CHECK (credit_limit >= 0),
ADD COLUMN IF NOT EXISTS due_amount DECIMAL(12,2) DEFAULT 0 CHECK (due_amount >= 0),
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;

-- Add due_amount field to sales_orders table
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS due_amount DECIMAL(12,2) DEFAULT 0 CHECK (due_amount >= 0);

-- Add is_gift field to sales_order_line_items table
ALTER TABLE sales_order_line_items 
ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;

-- Add gift count to sales_orders for quick reporting
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS gift_count INTEGER DEFAULT 0;

-- Create customer due transactions table for audit trail
CREATE TABLE IF NOT EXISTS customer_due_transactions (
  id BIGSERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE SET NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('charge', 'payment', 'adjustment')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  balance_before DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for customer due transactions
CREATE INDEX IF NOT EXISTS idx_customer_due_transactions_customer_id ON customer_due_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_due_transactions_sales_order_id ON customer_due_transactions(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_due_transactions_created_at ON customer_due_transactions(created_at);

-- Set default credit limit for existing customers (except walk-in)
UPDATE customers 
SET credit_limit = 1000.00 
WHERE credit_limit IS NULL 
AND customer_type != 'walk_in';
