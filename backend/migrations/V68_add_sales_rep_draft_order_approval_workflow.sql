-- V68: Add Sales Rep Draft Order Approval Workflow
-- This migration adds support for draft order submission, admin approval with factory selection, and factory manager acceptance for sales rep orders

-- Add new status values to sales_rep_orders
ALTER TABLE sales_rep_orders 
DROP CONSTRAINT IF EXISTS sales_rep_orders_status_check;

ALTER TABLE sales_rep_orders 
ADD CONSTRAINT sales_rep_orders_status_check 
CHECK (status IN ('draft', 'submitted_for_approval', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'approved', 'rejected', 'factory_accepted'));

-- Add new columns for approval workflow
ALTER TABLE sales_rep_orders 
ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitted_for_approval_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS assigned_factory_id BIGINT REFERENCES factories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS factory_manager_accepted_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS factory_manager_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS factory_manager_rejection_reason TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_submitted_for_approval 
ON sales_rep_orders(submitted_for_approval_at) 
WHERE status = 'submitted_for_approval';

CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_assigned_factory 
ON sales_rep_orders(assigned_factory_id) 
WHERE assigned_factory_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_admin_approved 
ON sales_rep_orders(admin_approved_at) 
WHERE status IN ('approved', 'rejected');

CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_factory_accepted 
ON sales_rep_orders(factory_manager_accepted_at) 
WHERE status = 'factory_accepted';

-- Add comments for documentation
COMMENT ON COLUMN sales_rep_orders.submitted_for_approval_at IS 'When the order was submitted for admin approval';
COMMENT ON COLUMN sales_rep_orders.submitted_for_approval_by IS 'User who submitted the order for approval';
COMMENT ON COLUMN sales_rep_orders.admin_approved_by IS 'Admin who approved/rejected the order';
COMMENT ON COLUMN sales_rep_orders.admin_approved_at IS 'When admin approved/rejected the order';
COMMENT ON COLUMN sales_rep_orders.admin_rejection_reason IS 'Reason for admin rejection if applicable';
COMMENT ON COLUMN sales_rep_orders.assigned_factory_id IS 'Factory assigned by admin during approval';
COMMENT ON COLUMN sales_rep_orders.factory_manager_accepted_by IS 'Factory manager who accepted the order';
COMMENT ON COLUMN sales_rep_orders.factory_manager_accepted_at IS 'When factory manager accepted the order';
COMMENT ON COLUMN sales_rep_orders.factory_manager_rejection_reason IS 'Reason for factory manager rejection if applicable';
