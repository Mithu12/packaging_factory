# Accounting Setup Guide

## Overview

This guide provides the complete list of Chart of Accounts entries required for all ERP modules to function with proper accounting integration. These accounts are automatically created by the migration scripts but can also be set up manually.

**Last Updated:** October 15, 2025
**Migration Files:** V52_setup_sales_inventory_accounts.sql, V53_setup_factory_accounts.sql

---

## 📊 Complete Chart of Accounts Setup

### Sales & Inventory Modules (7 Accounts)

| Code | Name | Category | Type | Purpose |
|------|------|----------|------|---------|
| **1100** | Cash | Assets | Posting | Cash and cash equivalents for sales transactions |
| **1200** | Accounts Receivable | Assets | Posting | Amounts owed by customers for sales on credit |
| **1300** | Inventory | Assets | Posting | Merchandise and goods held for sale or production |
| **2100** | Tax Payable | Liabilities | Posting | Sales tax and other taxes payable to government |
| **2200** | Accounts Payable | Liabilities | Posting | Amounts owed to suppliers for purchases |
| **4100** | Sales Revenue | Revenue | Posting | Revenue from sales of goods and services |
| **4200** | Inventory Adjustment Income | Revenue | Posting | Income from inventory adjustments and corrections |

### Factory Module (13 Accounts)

| Code | Name | Category | Type | Purpose |
|------|------|----------|------|---------|
| **1100** | Cash | Assets | Posting | Cash and cash equivalents for factory operations |
| **1110** | Bank Account | Assets | Posting | Company bank accounts for factory operations |
| **1200** | Accounts Receivable | Assets | Posting | Amounts owed by customers for factory orders |
| **1310** | Raw Materials | Assets | Posting | Raw materials inventory used in production |
| **1320** | Finished Goods | Assets | Posting | Completed products ready for sale |
| **1400** | Work in Progress | Assets | Posting | Costs accumulated during production process |
| **2200** | Wages Payable | Liabilities | Posting | Wages and salaries owed to factory employees |
| **2250** | Factory Overhead Applied | Liabilities | Posting | Factory overhead costs applied to production |
| **2400** | Deferred Revenue | Liabilities | Posting | Revenue received in advance but not yet earned |
| **4100** | Sales Revenue | Revenue | Posting | Revenue from factory sales of manufactured goods |
| **5000** | Cost of Goods Sold | Expenses | Posting | Direct cost of products sold to customers |
| **5500** | Wastage Expense | Expenses | Posting | Cost of materials wasted during production |
| **5600** | Sales Returns | Expenses | Posting | Cost of goods returned by customers |

---

## 🏗️ Account Categories Summary

### Assets (8 accounts)
- 1100 Cash
- 1110 Bank Account
- 1200 Accounts Receivable
- 1300 Inventory
- 1310 Raw Materials
- 1320 Finished Goods
- 1400 Work in Progress

### Liabilities (4 accounts)
- 2100 Tax Payable
- 2200 Accounts Payable
- 2250 Factory Overhead Applied
- 2400 Deferred Revenue

### Revenue (2 accounts)
- 4100 Sales Revenue
- 4200 Inventory Adjustment Income

### Expenses (3 accounts)
- 5000 Cost of Goods Sold
- 5500 Wastage Expense
- 5600 Sales Returns

---

## 🔧 Manual Setup (Alternative)

If you prefer to set up accounts manually, use these SQL commands:

### Sales & Inventory Accounts Setup

```sql
-- Assets
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
VALUES
('1100', 'Cash', 'Posting', 'Assets', 'Cash and cash equivalents for sales transactions', 'Active'),
('1200', 'Accounts Receivable', 'Posting', 'Assets', 'Amounts owed to the company by customers for sales on credit', 'Active'),
('1300', 'Inventory', 'Posting', 'Assets', 'Merchandise and goods held for sale or production', 'Active');

-- Liabilities
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
VALUES
('2100', 'Tax Payable', 'Posting', 'Liabilities', 'Sales tax and other taxes payable to government', 'Active'),
('2200', 'Accounts Payable', 'Posting', 'Liabilities', 'Amounts owed to suppliers for purchases', 'Active');

-- Revenue
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
VALUES
('4100', 'Sales Revenue', 'Posting', 'Revenue', 'Revenue from sales of goods and services', 'Active'),
('4200', 'Inventory Adjustment Income', 'Posting', 'Revenue', 'Income from inventory adjustments and corrections', 'Active');
```

### Factory Accounts Setup

```sql
-- Assets
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
VALUES
('1110', 'Bank Account', 'Posting', 'Assets', 'Company bank accounts for factory operations', 'Active'),
('1310', 'Raw Materials', 'Posting', 'Assets', 'Raw materials inventory used in production', 'Active'),
('1320', 'Finished Goods', 'Posting', 'Assets', 'Completed products ready for sale', 'Active'),
('1400', 'Work in Progress', 'Posting', 'Assets', 'Costs accumulated during production process', 'Active');

-- Liabilities
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
VALUES
('2250', 'Factory Overhead Applied', 'Posting', 'Liabilities', 'Factory overhead costs applied to production', 'Active'),
('2400', 'Deferred Revenue', 'Posting', 'Liabilities', 'Revenue received in advance but not yet earned', 'Active');

-- Expenses
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
VALUES
('5000', 'Cost of Goods Sold', 'Posting', 'Expenses', 'Direct cost of products sold to customers', 'Active'),
('5500', 'Wastage Expense', 'Posting', 'Expenses', 'Cost of materials wasted during production', 'Active'),
('5600', 'Sales Returns', 'Posting', 'Expenses', 'Cost of goods returned by customers', 'Active');

-- Liabilities (Wages)
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
VALUES
('2200', 'Wages Payable', 'Posting', 'Liabilities', 'Wages and salaries owed to factory employees', 'Active');
```

---

## ✅ Verification Commands

### Check All Accounts Were Created

```sql
-- Verify sales and inventory accounts
SELECT code, name, category, type, status
FROM chart_of_accounts
WHERE code IN ('1100', '1200', '1300', '2100', '2200', '4100', '4200')
ORDER BY code;

-- Verify factory accounts
SELECT code, name, category, type, status
FROM chart_of_accounts
WHERE code IN ('1100', '1110', '1200', '1310', '1320', '1400', '2200', '2250', '2400', '4100', '5000', '5500', '5600')
ORDER BY code;

-- Count total accounts by category
SELECT category, COUNT(*) as account_count
FROM chart_of_accounts
WHERE status = 'Active'
GROUP BY category
ORDER BY category;
```

### Expected Results

**Sales & Inventory (7 accounts):**
- Assets: 3 accounts
- Liabilities: 2 accounts
- Revenue: 2 accounts

**Factory (13 accounts):**
- Assets: 7 accounts
- Liabilities: 4 accounts
- Revenue: 1 account
- Expenses: 3 accounts

---

## 🚨 Important Notes

### Account Code Conflicts
- If you already have accounts with these codes, the migration will skip them
- Review existing accounts before running migrations
- Consider updating codes if conflicts exist

### Account Categories
- All accounts are created as "Posting" type (not "Control")
- Categories follow standard accounting principles
- Status is set to "Active" by default

### Integration Dependencies
- **Sales Module**: Requires Cash, Accounts Receivable, Sales Revenue, Tax Payable
- **Inventory Module**: Requires Inventory, Accounts Payable, Inventory Adjustment Income
- **Factory Module**: Requires all 13 accounts for full functionality

---

## 🔍 Troubleshooting

### Missing Accounts
```sql
-- Check for missing accounts
SELECT '1100' as code, 'Cash' as name, 'Assets' as category
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1100')
UNION ALL
SELECT '1200', 'Accounts Receivable', 'Assets'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '1200')
-- Add more checks as needed
```

### Account Status Issues
```sql
-- Check inactive accounts that should be active
SELECT code, name, status
FROM chart_of_accounts
WHERE code IN ('1100', '1200', '1300', '2100', '2200', '4100', '4200')
AND status != 'Active';
```

---

## 📋 Integration Status

| Module | Required Accounts | Status | Migration |
|--------|------------------|---------|-----------|
| **Sales** | 4 accounts | ✅ Complete | V52 |
| **Inventory** | 3 accounts | ✅ Complete | V52 |
| **Factory** | 13 accounts | ✅ Complete | V53 |

**Total Accounts Created:** 20 unique accounts
**Migrations Applied:** V52, V53

---

## 🎯 Next Steps

1. **Verify Account Creation** - Run the verification commands above
2. **Test Integration** - Create sample transactions to verify voucher creation
3. **Monitor Logs** - Check backend logs for accounting integration messages
4. **Review Financial Reports** - Ensure accounts appear correctly in financial statements

---

## 📚 Related Documentation

- `INVENTORY_ACCOUNTING_INTEGRATION_IMPLEMENTATION.md` - Complete integration details
- `FACTORY_ACCOUNTS_CURRENT_STATUS.md` - Factory module integration status
- `SALES_INVOICE_IMPLEMENTATION.md` - Sales module integration details

---

**Document Version:** 1.0
**Last Updated:** October 15, 2025
**Prepared By:** Development Team
