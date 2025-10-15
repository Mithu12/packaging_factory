-- Migration V53: Setup Required Accounts for Factory Module
-- Creates all required Chart of Accounts entries for factory accounting integrations
-- These accounts are mandatory for the factory module accounting integrations to work properly

-- ================================================
-- FACTORY MODULE REQUIRED ACCOUNTS
-- ================================================

-- 1. Accounts Receivable (Assets) - For customer order receivables
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1200', 'Accounts Receivable', 'Posting', 'Assets', 'Amounts owed to the company by customers for factory orders', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1200');

-- 2. Deferred Revenue (Liabilities) - For unearned revenue from orders
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '2400', 'Deferred Revenue', 'Posting', 'Liabilities', 'Revenue received in advance but not yet earned', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '2400');

-- 3. Sales Revenue (Revenue) - For factory sales income
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '4100', 'Sales Revenue', 'Posting', 'Revenue', 'Revenue from factory sales of manufactured goods', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '4100');

-- 4. Cash (Assets) - For cash payments received
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1100', 'Cash', 'Posting', 'Assets', 'Cash and cash equivalents for factory operations', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1100');

-- 5. Bank Account (Assets) - For bank transfers and payments
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1110', 'Bank Account', 'Posting', 'Assets', 'Company bank accounts for factory operations', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1110');

-- 6. Work in Progress (Assets) - For production costs during manufacturing
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1400', 'Work in Progress', 'Posting', 'Assets', 'Costs accumulated during production process', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1400');

-- 7. Raw Materials (Assets) - For raw materials inventory
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1310', 'Raw Materials', 'Posting', 'Assets', 'Raw materials inventory used in production', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1310');

-- 8. Wastage Expense (Expenses) - For material wastage costs
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '5500', 'Wastage Expense', 'Posting', 'Expenses', 'Cost of materials wasted during production', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '5500');

-- 9. Wages Payable (Liabilities) - For labor costs owed to employees
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '2200', 'Wages Payable', 'Posting', 'Liabilities', 'Wages and salaries owed to factory employees', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '2200');

-- 10. Factory Overhead Applied (Liabilities) - For overhead costs allocated
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '2250', 'Factory Overhead Applied', 'Posting', 'Liabilities', 'Factory overhead costs applied to production', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '2250');

-- 11. Finished Goods (Assets) - For completed manufactured products
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '1320', 'Finished Goods', 'Posting', 'Assets', 'Completed products ready for sale', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1320');

-- 12. Sales Returns (Expenses) - For returned goods and credit notes
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '5600', 'Sales Returns', 'Posting', 'Expenses', 'Cost of goods returned by customers', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '5600');

-- 13. Cost of Goods Sold (Expenses) - For cost of products sold
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '5000', 'Cost of Goods Sold', 'Posting', 'Expenses', 'Direct cost of products sold to customers', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '5000');

-- ================================================
-- SETUP COMPLETE
-- ================================================

-- Verify all accounts were created
SELECT
    'Factory Accounts Setup Complete' as status,
    COUNT(*) as total_accounts_created
FROM chart_of_accounts
WHERE code IN ('1200', '2400', '4100', '1100', '1110', '1400', '1310', '5500', '2200', '2250', '1320', '5600', '5000')
AND status = 'Active';
