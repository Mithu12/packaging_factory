-- Migration V72: Add Per-Item Status Tracking for Sales Rep Orders
-- Description: Add item-level status tracking to handle partial acceptance/rejection by multiple factory managers

-- Add status column to sales_rep_order_items
ALTER TABLE sales_rep_order_items 
ADD COLUMN IF NOT EXISTS item_status VARCHAR(50) DEFAULT 'pending' CHECK (
  item_status IN ('pending', 'factory_accepted', 'factory_rejected')
);

-- Add factory acceptance/rejection tracking fields for items
ALTER TABLE sales_rep_order_items 
ADD COLUMN IF NOT EXISTS item_factory_accepted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS item_factory_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS item_factory_rejection_reason TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_rep_order_items_status 
ON sales_rep_order_items(item_status);

-- Add new order-level statuses for partial acceptance
-- Update the CHECK constraint on sales_rep_orders.status to include:
-- 'partially_accepted', 'partially_rejected'

ALTER TABLE sales_rep_orders 
DROP CONSTRAINT IF EXISTS sales_rep_orders_status_check;

ALTER TABLE sales_rep_orders
ADD CONSTRAINT sales_rep_orders_status_check CHECK (
  status IN (
    'draft',
    'submitted_for_approval',
    'approved',
    'rejected',
    'factory_accepted',
    'partially_accepted',
    'partially_rejected',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  )
);

-- Add comments
COMMENT ON COLUMN sales_rep_order_items.item_status IS 'Status of this specific item at the factory level';
COMMENT ON COLUMN sales_rep_order_items.item_factory_accepted_by IS 'Factory manager who accepted/rejected this item';
COMMENT ON COLUMN sales_rep_order_items.item_factory_accepted_at IS 'When this item was accepted/rejected';
COMMENT ON COLUMN sales_rep_order_items.item_factory_rejection_reason IS 'Reason for rejecting this item';
