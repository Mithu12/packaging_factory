-- V59: Add Sales Rep Workflow Tracking
-- This migration adds workflow tracking columns and history table for sales rep order workflow

-- Add workflow tracking columns to factory_customer_orders table
ALTER TABLE factory_customer_orders 
ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS routed_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS routed_at TIMESTAMP WITH TIME ZONE;

-- Create factory_order_workflow_history table for audit trail
CREATE TABLE IF NOT EXISTS factory_order_workflow_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES factory_customer_orders(id) ON DELETE CASCADE,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  metadata JSONB
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_factory_customer_orders_submitted_by ON factory_customer_orders(submitted_by);
CREATE INDEX IF NOT EXISTS idx_factory_customer_orders_submitted_at ON factory_customer_orders(submitted_at);
CREATE INDEX IF NOT EXISTS idx_factory_customer_orders_routed_by ON factory_customer_orders(routed_by);
CREATE INDEX IF NOT EXISTS idx_factory_customer_orders_routed_at ON factory_customer_orders(routed_at);

CREATE INDEX IF NOT EXISTS idx_factory_order_workflow_history_order_id ON factory_order_workflow_history(order_id);
CREATE INDEX IF NOT EXISTS idx_factory_order_workflow_history_changed_by ON factory_order_workflow_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_factory_order_workflow_history_changed_at ON factory_order_workflow_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_factory_order_workflow_history_status ON factory_order_workflow_history(from_status, to_status);

-- Add comments for documentation
COMMENT ON COLUMN factory_customer_orders.submitted_by IS 'User who submitted the order for approval (sales rep)';
COMMENT ON COLUMN factory_customer_orders.submitted_at IS 'Timestamp when order was submitted for approval';
COMMENT ON COLUMN factory_customer_orders.rejection_reason IS 'Reason provided when order is rejected';
COMMENT ON COLUMN factory_customer_orders.routed_by IS 'User who routed the order to a factory';
COMMENT ON COLUMN factory_customer_orders.routed_at IS 'Timestamp when order was routed to factory';

COMMENT ON TABLE factory_order_workflow_history IS 'Audit trail for order status changes in the sales rep workflow';
COMMENT ON COLUMN factory_order_workflow_history.from_status IS 'Previous order status';
COMMENT ON COLUMN factory_order_workflow_history.to_status IS 'New order status';
COMMENT ON COLUMN factory_order_workflow_history.changed_by IS 'User who made the status change';
COMMENT ON COLUMN factory_order_workflow_history.notes IS 'Optional notes about the status change';
COMMENT ON COLUMN factory_order_workflow_history.metadata IS 'Additional metadata about the status change';