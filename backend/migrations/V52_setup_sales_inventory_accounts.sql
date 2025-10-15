-- Migration V52: Setup Required Accounts for Sales and Inventory Modules
-- Creates all required Chart of Accounts entries for sales and inventory accounting integrations
-- These accounts are mandatory for the accounting integrations to work properly

-- ================================================
-- SALES MODULE REQUIRED ACCOUNTS
-- ================================================

-- 1. Cash Account (Assets) - For cash sales transactions
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1100', 'Cash', 'Posting', 'Assets', 'Cash and cash equivalents for sales transactions', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1100');

-- 2. Accounts Receivable (Assets) - For credit sales transactions
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1200', 'Accounts Receivable', 'Posting', 'Assets', 'Amounts owed to the company by customers for sales on credit', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1200');

-- 3. Sales Revenue (Revenue) - For recording sales income
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '4100', 'Sales Revenue', 'Posting', 'Revenue', 'Revenue from sales of goods and services', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '4100');

-- 4. Tax Payable (Liabilities) - For sales tax collected
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '2100', 'Tax Payable', 'Posting', 'Liabilities', 'Sales tax and other taxes payable to government', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '2100');

-- ================================================
-- INVENTORY MODULE REQUIRED ACCOUNTS
-- ================================================

-- 5. Inventory (Assets) - For inventory asset tracking
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1300', 'Inventory', 'Posting', 'Assets', 'Merchandise and goods held for sale or production', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1300');

-- 6. Accounts Payable (Liabilities) - For supplier payments
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '2200', 'Accounts Payable', 'Posting', 'Liabilities', 'Amounts owed to suppliers for purchases', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '2200');

-- 7. Inventory Adjustment Income (Revenue) - For inventory adjustment gains
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '4200', 'Inventory Adjustment Income', 'Posting', 'Revenue', 'Income from inventory adjustments and corrections', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '4200');

-- ================================================
-- SETUP COMPLETE
-- ================================================

-- Verify all accounts were created
SELECT
    'Sales & Inventory Accounts Setup Complete' as status,
    COUNT(*) as total_accounts_created
FROM chart_of_accounts
WHERE code IN ('1100', '1200', '4100', '2100', '1300', '2200', '4200')
AND status = 'Active';
