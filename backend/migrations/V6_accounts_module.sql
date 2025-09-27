-- =====================================================
-- Accounts Module Database Schema
-- Migration: V6_accounts_module.sql
-- Description: Create tables for accounts module
-- =====================================================

-- Account Groups Table (hierarchical structure)
CREATE TABLE public.account_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses')),
    parent_id INTEGER REFERENCES account_groups(id) ON DELETE CASCADE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts Table
CREATE TABLE public.chart_of_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Control', 'Posting')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses')),
    parent_id INTEGER REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES account_groups(id),
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cost Centers Table
CREATE TABLE public.cost_centers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    owner VARCHAR(255),
    department VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('Department', 'Project', 'Location')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    budget DECIMAL(15,2) DEFAULT 0,
    actual_spend DECIMAL(15,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers Table
CREATE TABLE public.vouchers (
    id SERIAL PRIMARY KEY,
    voucher_no VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Payment', 'Receipt', 'Journal', 'Balance Transfer')),
    date DATE NOT NULL,
    reference VARCHAR(255),
    payee VARCHAR(255),
    prepared_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Posted', 'Void')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    cost_center_id INTEGER REFERENCES cost_centers(id),
    narration TEXT NOT NULL,
    attachments INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Voucher Lines Table
CREATE TABLE public.voucher_lines (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    cost_center_id INTEGER REFERENCES cost_centers(id),
    narration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ledger Entries Table
CREATE TABLE public.ledger_entries (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    voucher_id INTEGER REFERENCES vouchers(id),
    voucher_no VARCHAR(50),
    type VARCHAR(30) NOT NULL,
    account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) NOT NULL,
    cost_center_id INTEGER REFERENCES cost_centers(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Account Groups indexes
CREATE INDEX idx_account_groups_category ON account_groups(category);
CREATE INDEX idx_account_groups_parent_id ON account_groups(parent_id);
CREATE INDEX idx_account_groups_status ON account_groups(status);

-- Chart of Accounts indexes
CREATE INDEX idx_chart_of_accounts_category ON chart_of_accounts(category);
CREATE INDEX idx_chart_of_accounts_type ON chart_of_accounts(type);
CREATE INDEX idx_chart_of_accounts_parent_id ON chart_of_accounts(parent_id);
CREATE INDEX idx_chart_of_accounts_group_id ON chart_of_accounts(group_id);

-- Vouchers indexes
CREATE INDEX idx_vouchers_date ON vouchers(date);
CREATE INDEX idx_vouchers_type ON vouchers(type);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_prepared_by ON vouchers(prepared_by);

-- Ledger entries indexes
CREATE INDEX idx_ledger_entries_account_date ON ledger_entries(account_id, date);
CREATE INDEX idx_ledger_entries_date ON ledger_entries(date);
CREATE INDEX idx_ledger_entries_voucher_id ON ledger_entries(voucher_id);

-- =====================================================
-- Sequences and Functions
-- =====================================================

-- Voucher number sequence
CREATE SEQUENCE public.voucher_number_seq START 1;

-- Function to generate voucher numbers
CREATE OR REPLACE FUNCTION generate_voucher_number(voucher_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(3);
    next_num INTEGER;
BEGIN
    -- Set prefix based on voucher type
    CASE voucher_type
        WHEN 'Payment' THEN prefix := 'PV-';
        WHEN 'Receipt' THEN prefix := 'RV-';
        WHEN 'Journal' THEN prefix := 'JV-';
        WHEN 'Balance Transfer' THEN prefix := 'BT-';
        ELSE prefix := 'VO-';
    END CASE;
    
    -- Get next number
    next_num := nextval('voucher_number_seq');
    
    -- Return formatted voucher number
    RETURN prefix || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account balance when ledger entry is added
    UPDATE chart_of_accounts 
    SET balance = (
        SELECT COALESCE(SUM(debit - credit), 0)
        FROM ledger_entries 
        WHERE account_id = NEW.account_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update account balance
CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER trigger_account_groups_updated_at
    BEFORE UPDATE ON account_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_chart_of_accounts_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_cost_centers_updated_at
    BEFORE UPDATE ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_vouchers_updated_at
    BEFORE UPDATE ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Data for Account Groups
-- =====================================================

-- Insert root account groups
INSERT INTO account_groups (name, code, category, description) VALUES
('Assets', '1000', 'Assets', 'Resources owned by the organization'),
('Liabilities', '2000', 'Liabilities', 'Obligations owed to external parties'),
('Equity', '3000', 'Equity', 'Owner''s equity and retained earnings'),
('Revenue', '4000', 'Revenue', 'Income from business operations'),
('Expenses', '5000', 'Expenses', 'Costs incurred in business operations');

-- Insert sub-groups for Assets
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Current Assets', '1100', 'Assets', 1, 'Assets expected to be converted to cash within one year'),
('Fixed Assets', '1200', 'Assets', 1, 'Long-term tangible assets'),
('Intangible Assets', '1300', 'Assets', 1, 'Non-physical assets with value');

-- Insert sub-groups for Current Assets
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Cash & Cash Equivalents', '1110', 'Assets', 6, 'Cash and short-term investments'),
('Accounts Receivable', '1120', 'Assets', 6, 'Money owed by customers'),
('Inventory', '1130', 'Assets', 6, 'Goods held for sale');

-- Insert sub-groups for Fixed Assets
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Machinery', '1210', 'Assets', 7, 'Manufacturing and production equipment'),
('Buildings', '1220', 'Assets', 7, 'Real estate and structures'),
('Vehicles', '1230', 'Assets', 7, 'Company vehicles and transportation');

-- Insert sub-groups for Liabilities
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Current Liabilities', '2100', 'Liabilities', 2, 'Short-term obligations due within one year'),
('Long-term Liabilities', '2200', 'Liabilities', 2, 'Long-term debt and obligations');

-- Insert sub-groups for Current Liabilities
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Accounts Payable', '2110', 'Liabilities', 13, 'Money owed to suppliers'),
('Accrued Expenses', '2120', 'Liabilities', 13, 'Expenses incurred but not yet paid'),
('Short-term Loans', '2130', 'Liabilities', 13, 'Loans due within one year');

-- Insert sub-groups for Equity
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Share Capital', '3100', 'Equity', 3, 'Capital contributed by shareholders'),
('Retained Earnings', '3200', 'Equity', 3, 'Accumulated profits retained in business');

-- Insert sub-groups for Revenue
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Sales Revenue', '4100', 'Revenue', 4, 'Revenue from product sales'),
('Service Revenue', '4200', 'Revenue', 4, 'Revenue from services provided'),
('Other Income', '4300', 'Revenue', 4, 'Miscellaneous income');

-- Insert sub-groups for Expenses
INSERT INTO account_groups (name, code, category, parent_id, description) VALUES
('Cost of Goods Sold', '5100', 'Expenses', 5, 'Direct costs of producing goods'),
('Operating Expenses', '5200', 'Expenses', 5, 'Day-to-day business expenses'),
('Administrative Expenses', '5300', 'Expenses', 5, 'Administrative and overhead costs');

-- =====================================================
-- Permissions Update
-- =====================================================

-- Note: Account permissions already exist in the database from V1_initial_setup.sql
-- These include:
-- - accounts.create, accounts.read, accounts.update, accounts.delete
-- - vouchers.create, vouchers.read, vouchers.update, vouchers.delete, vouchers.approve, vouchers.reject
-- - ledger.view

COMMENT ON TABLE account_groups IS 'Hierarchical structure for organizing chart of accounts';
COMMENT ON TABLE chart_of_accounts IS 'Individual accounts for recording transactions';
COMMENT ON TABLE cost_centers IS 'Cost centers for tracking departmental or project expenses';
COMMENT ON TABLE vouchers IS 'Financial vouchers for recording transactions';
COMMENT ON TABLE voucher_lines IS 'Individual line items within vouchers';
COMMENT ON TABLE ledger_entries IS 'General ledger entries for all financial transactions';
