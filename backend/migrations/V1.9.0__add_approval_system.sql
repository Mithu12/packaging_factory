-- Approval System
-- Version: 1.9.0
-- Description: Adds approval workflow fields and tables to the system

-- Update users table role constraint to include 'accounts'
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'accounts', 'employee', 'viewer'));

-- Add approval fields to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'draft' 
  CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add approval fields to payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'draft' 
  CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add approval fields to expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'draft' 
  CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Create approval history table for audit trail
CREATE TABLE IF NOT EXISTS approval_history (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('purchase_order', 'payment', 'expense')),
  entity_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'revised')),
  performed_by INTEGER NOT NULL REFERENCES users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_approval_history_entity ON approval_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_performed_by ON approval_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approval_status ON purchase_orders(approval_status);
CREATE INDEX IF NOT EXISTS idx_payments_approval_status ON payments(approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_approval_status ON expenses(approval_status);

-- Update existing records to have draft status
UPDATE purchase_orders SET approval_status = 'draft' WHERE approval_status IS NULL;
UPDATE payments SET approval_status = 'draft' WHERE approval_status IS NULL;
UPDATE expenses SET approval_status = 'draft' WHERE approval_status IS NULL;
