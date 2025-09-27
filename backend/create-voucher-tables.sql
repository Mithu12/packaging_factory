-- Manual script to create voucher tables
-- Run this if the migration V9 fails

-- Drop tables if they exist (to start fresh)
DROP TABLE IF EXISTS voucher_lines CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP SEQUENCE IF EXISTS voucher_number_seq CASCADE;

-- Create vouchers table
CREATE TABLE vouchers (
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
CREATE TABLE voucher_lines (
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

-- Create indexes
CREATE INDEX idx_vouchers_voucher_no ON vouchers(voucher_no);
CREATE INDEX idx_vouchers_type ON vouchers(type);
CREATE INDEX idx_vouchers_date ON vouchers(date);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_cost_center_id ON vouchers(cost_center_id);
CREATE INDEX idx_vouchers_created_by ON vouchers(created_by);
CREATE INDEX idx_vouchers_created_at ON vouchers(created_at);

CREATE INDEX idx_voucher_lines_voucher_id ON voucher_lines(voucher_id);
CREATE INDEX idx_voucher_lines_account_id ON voucher_lines(account_id);
CREATE INDEX idx_voucher_lines_cost_center_id ON voucher_lines(cost_center_id);

-- Create triggers
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

-- Insert sample data for testing (using existing account and cost center IDs)
INSERT INTO vouchers (voucher_no, type, date, payee, amount, narration, created_by) VALUES
('PAY20240001', 'Payment', '2024-01-15', 'Office Supplies Inc', 1500.00, 'Purchase of office supplies for Q1', 1),
('REC20240001', 'Receipt', '2024-01-16', 'ABC Customer', 5000.00, 'Payment received for Invoice #INV-001', 1),
('JOU20240001', 'Journal', '2024-01-17', NULL, 2000.00, 'Monthly depreciation entry', 1);

-- Note: You'll need to add voucher_lines with proper account_id values from your chart_of_accounts table
