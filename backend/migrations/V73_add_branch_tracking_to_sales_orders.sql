-- Migration V73: Add Branch Tracking to Sales Orders
-- Description: Add distribution_center_id to sales_orders table to track which branch/store made each sale

-- Add distribution_center_id column to sales_orders
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS distribution_center_id INTEGER REFERENCES distribution_centers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_distribution_center_id 
ON sales_orders(distribution_center_id);

-- Add comment
COMMENT ON COLUMN sales_orders.distribution_center_id IS 'Branch/store where the sale was made. Links to distribution_centers table.';

