-- V69: Add Per-Product Factory Assignment Support
-- This migration adds support for assigning different products to different factories within the same order

-- Add factory_id column to sales_rep_order_items for per-product factory assignment
ALTER TABLE sales_rep_order_items 
ADD COLUMN IF NOT EXISTS assigned_factory_id BIGINT REFERENCES factories(id) ON DELETE SET NULL;

-- Add assigned_by and assigned_at columns for tracking who assigned the factory and when
ALTER TABLE sales_rep_order_items 
ADD COLUMN IF NOT EXISTS factory_assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS factory_assigned_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on factory assignments
CREATE INDEX IF NOT EXISTS idx_sales_rep_order_items_assigned_factory 
ON sales_rep_order_items(assigned_factory_id) 
WHERE assigned_factory_id IS NOT NULL;

-- Create index for factory assignment tracking
CREATE INDEX IF NOT EXISTS idx_sales_rep_order_items_factory_assigned_by 
ON sales_rep_order_items(factory_assigned_by) 
WHERE factory_assigned_by IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN sales_rep_order_items.assigned_factory_id IS 'Factory assigned to this specific product line item';
COMMENT ON COLUMN sales_rep_order_items.factory_assigned_by IS 'User who assigned the factory to this product';
COMMENT ON COLUMN sales_rep_order_items.factory_assigned_at IS 'When the factory was assigned to this product';
