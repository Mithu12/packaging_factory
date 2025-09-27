-- =====================================================
-- Migration: V9 - Add Vouchers Tables
-- Description: Create vouchers and voucher_lines tables for financial voucher management
-- Author: System
-- Date: 2024-01-01
-- =====================================================

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    voucher_no VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Payment', 'Receipt', 'Journal', 'Contra')),
    date DATE NOT NULL,
    reference VARCHAR(255),
    payee VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Posted', 'Void')),
    narration TEXT NOT NULL,
    cost_center_id INTEGER REFERENCES cost_centers(id),
    attachments INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    approved_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create voucher_lines table
CREATE TABLE IF NOT EXISTS voucher_lines (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
    debit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    cost_center_id INTEGER REFERENCES cost_centers(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either debit or credit is non-zero, but not both
    CONSTRAINT check_debit_credit CHECK (
        (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
    )
);

-- Create voucher number sequence
CREATE SEQUENCE IF NOT EXISTS voucher_number_seq START 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_no ON vouchers(voucher_no);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_cost_center_id ON vouchers(cost_center_id);
-- CREATE INDEX IF NOT EXISTS idx_vouchers_created_by ON vouchers(created_by);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_at ON vouchers(created_at);

CREATE INDEX IF NOT EXISTS idx_voucher_lines_voucher_id ON voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_lines_account_id ON voucher_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_voucher_lines_cost_center_id ON voucher_lines(cost_center_id);

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vouchers_updated_at
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_vouchers_updated_at();

CREATE OR REPLACE FUNCTION update_voucher_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_voucher_lines_updated_at
    BEFORE UPDATE ON voucher_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_voucher_lines_updated_at();

-- Add comments for documentation
COMMENT ON TABLE vouchers IS 'Financial vouchers for recording transactions (payments, receipts, journals)';
COMMENT ON COLUMN vouchers.id IS 'Primary key for voucher';
COMMENT ON COLUMN vouchers.voucher_no IS 'Unique voucher number (auto-generated)';
COMMENT ON COLUMN vouchers.type IS 'Type of voucher: Payment, Receipt, Journal, or Contra';
COMMENT ON COLUMN vouchers.date IS 'Date of the voucher transaction';
COMMENT ON COLUMN vouchers.reference IS 'External reference number or memo';
COMMENT ON COLUMN vouchers.payee IS 'Person or entity receiving/providing payment';
COMMENT ON COLUMN vouchers.amount IS 'Total amount of the voucher';
COMMENT ON COLUMN vouchers.currency IS 'Currency code (default USD)';
COMMENT ON COLUMN vouchers.status IS 'Status: Draft, Pending Approval, Posted, or Void';
COMMENT ON COLUMN vouchers.narration IS 'Description of the voucher purpose';
COMMENT ON COLUMN vouchers.cost_center_id IS 'Optional cost center for expense tracking';
COMMENT ON COLUMN vouchers.attachments IS 'Number of attached documents';
COMMENT ON COLUMN vouchers.created_by IS 'User who created the voucher';
COMMENT ON COLUMN vouchers.approved_by IS 'User who approved the voucher';

COMMENT ON TABLE voucher_lines IS 'Individual line items within vouchers for double-entry bookkeeping';
COMMENT ON COLUMN voucher_lines.id IS 'Primary key for voucher line';
COMMENT ON COLUMN voucher_lines.voucher_id IS 'Reference to parent voucher';
COMMENT ON COLUMN voucher_lines.account_id IS 'Chart of accounts entry being affected';
COMMENT ON COLUMN voucher_lines.debit IS 'Debit amount (asset/expense increase)';
COMMENT ON COLUMN voucher_lines.credit IS 'Credit amount (liability/revenue increase)';
COMMENT ON COLUMN voucher_lines.cost_center_id IS 'Optional cost center for this line';
COMMENT ON COLUMN voucher_lines.description IS 'Optional description for this line item';
