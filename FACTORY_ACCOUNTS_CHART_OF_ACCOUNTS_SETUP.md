# Factory-Accounts Integration: Chart of Accounts Setup Guide

**Date:** October 8, 2025  
**Purpose:** Required accounts for testing factory-accounts integration

## 📋 Required Accounts for Testing

Create these accounts in your Chart of Accounts **before** testing the factory-accounts integration. The system will search for these accounts by name and category when creating vouchers.

---

## 1. Accounts Receivable (Assets)

**Account Name:** `Accounts Receivable` or `Receivable`  
**Account Code:** `1200` (or your numbering scheme)  
**Category:** `Assets`  
**Sub-Category:** `Current Assets`  
**Type:** `Asset`  
**Status:** `Active`

**Description:** Customer receivables from factory orders

**Used For:**
- Phase 1: Customer order approval (Debit side)
- Entry: Debit A/R when order is approved

**Search Pattern:** System searches for "Receivable" in Assets category

---

## 2. Deferred Revenue (Liabilities)

**Account Name:** `Deferred Revenue`  
**Account Code:** `2400` (or your numbering scheme)  
**Category:** `Liabilities`  
**Sub-Category:** `Current Liabilities`  
**Type:** `Liability`  
**Status:** `Active`

**Description:** Revenue received but not yet earned from factory orders

**Used For:**
- Phase 1: Customer order approval (Credit side)
- Entry: Credit Deferred Revenue when order is approved
- Future: Will be reversed when order is shipped

**Search Pattern:** System searches for "Deferred Revenue" in Liabilities category

---

## 3. Work in Progress - WIP (Assets)

**Account Name:** `Work in Progress` or `Work in Progress - WIP`  
**Account Code:** `1400` (or your numbering scheme)  
**Category:** `Assets`  
**Sub-Category:** `Current Assets` or `Inventory`  
**Type:** `Asset`  
**Status:** `Active`

**Description:** Cost of partially completed production

**Used For:**
- Phase 2: Material consumption (Debit side)
- Phase 3: Labor allocation (Debit side)
- Phase 3: Overhead allocation (Debit side)
- Phase 3: Work order completion (Credit side - transferred to FG)

---

## 4. Sales Integration (POS) Required Accounts

For Sales→Accounts (POS) integration to post vouchers on completed orders, ensure the following accounts exist and are Active:

- Cash (Assets)
  - Name includes: `Cash` (or your specific cash/bank account name)
  - Category: `Assets`
  - Type: Posting
- Accounts Receivable (Assets)
  - Name includes: `Receivable`
  - Category: `Assets`
  - Type: Posting
- Sales Revenue (Revenue)
  - Name includes: `Sales Revenue`
  - Category: `Revenue`
  - Type: Posting
- Tax Payable (Liabilities)
  - Name includes: `Tax Payable`
  - Category: `Liabilities`
  - Type: Posting

The integration service searches by category and the indicated name fragments. If your naming differs, update names accordingly or extend the search logic.

**Entries:**
- Debit WIP when materials consumed
- Debit WIP when labor applied
- Debit WIP when overhead allocated
- Credit WIP when work order completed (transfer to FG)

**Search Pattern:** System searches for "Work in Progress" in Assets category

---

## 4. Raw Materials Inventory (Assets)

**Account Name:** `Raw Materials` or `Raw Materials Inventory`  
**Account Code:** `1310` (or your numbering scheme)  
**Category:** `Assets`  
**Sub-Category:** `Current Assets` or `Inventory`  
**Type:** `Asset`  
**Status:** `Active`

**Description:** Cost of raw materials held in inventory

**Used For:**
- Phase 2: Material consumption (Credit side)
- Phase 2: Wastage approval (Credit side)

**Entries:**
- Credit Raw Materials when materials consumed
- Credit Raw Materials when wastage approved

**Search Pattern:** System searches for "Raw Materials" in Assets category

---

## 5. Wastage Expense (Expenses)

**Account Name:** `Wastage Expense` or `Material Wastage` or `Wastage`  
**Account Code:** `5500` (or your numbering scheme)  
**Category:** `Expenses`  
**Sub-Category:** `Operating Expenses` or `Manufacturing Expenses`  
**Type:** `Expense`  
**Status:** `Active`

**Description:** Cost of materials wasted during production

**Used For:**
- Phase 2: Wastage approval (Debit side)

**Entries:**
- Debit Wastage Expense when wastage is approved

**Search Pattern:** System searches for "Wastage" in Expenses category

---

## 6. Wages Payable (Liabilities)

**Account Name:** `Wages Payable` or `Salaries Payable`  
**Account Code:** `2200` (or your numbering scheme)  
**Category:** `Liabilities`  
**Sub-Category:** `Current Liabilities`  
**Type:** `Liability`  
**Status:** `Active`

**Description:** Accrued labor costs for production

**Used For:**
- Phase 3: Production run completion - labor (Credit side)

**Entries:**
- Credit Wages Payable when labor cost is allocated to WIP

**Search Pattern:** System searches for "Wages Payable" in Liabilities category

---

## 7. Factory Overhead Applied (Liabilities)

**Account Name:** `Factory Overhead Applied` or `Factory Overhead` or `Manufacturing Overhead Applied`  
**Account Code:** `2250` (or your numbering scheme)  
**Category:** `Liabilities`  
**Sub-Category:** `Current Liabilities`  
**Type:** `Liability`  
**Status:** `Active`

**Description:** Overhead costs allocated to production

**Used For:**
- Phase 3: Production run completion - overhead (Credit side)

**Entries:**
- Credit Factory Overhead Applied when overhead is allocated to WIP

**Search Pattern:** System searches for "Factory Overhead" in Liabilities category

---

## 8. Finished Goods Inventory (Assets)

**Account Name:** `Finished Goods` or `Finished Goods Inventory`  
**Account Code:** `1320` (or your numbering scheme)  
**Category:** `Assets`  
**Sub-Category:** `Current Assets` or `Inventory`  
**Type:** `Asset`  
**Status:** `Active`

**Description:** Cost of completed products ready for sale

**Used For:**
- Phase 3: Work order completion (Debit side)

**Entries:**
- Debit Finished Goods when work order is completed (transfer from WIP)

**Search Pattern:** System searches for "Finished Goods" in Assets category

---

## 📝 Quick Setup Checklist

Create these 8 accounts in your Chart of Accounts:

- [ ] 1200 - Accounts Receivable (Assets)
- [ ] 2400 - Deferred Revenue (Liabilities)
- [ ] 1400 - Work in Progress (Assets)
- [ ] 1310 - Raw Materials Inventory (Assets)
- [ ] 5500 - Wastage Expense (Expenses)
- [ ] 2200 - Wages Payable (Liabilities)
- [ ] 2250 - Factory Overhead Applied (Liabilities)
- [ ] 1320 - Finished Goods Inventory (Assets)

---

## 🔍 Account Lookup Logic

The integration service uses this logic to find accounts:

```typescript
// Example: Finding WIP account
const wipAccount = await getDefaultAccount('wip');

// Search logic:
// 1. Search for accounts in category "Assets"
// 2. Filter by status = "Active"
// 3. Search for "Work in Progress" in account name
// 4. Return first matching account
```

**Important Notes:**
1. Account names must contain the search term (case-insensitive)
2. Accounts must be marked as "Active"
3. Accounts must be in the correct category
4. System uses first match if multiple accounts found

---

## 🧪 Verification Steps

After creating the accounts:

1. **Check Account Search:**
   ```sql
   -- Verify Accounts Receivable
   SELECT * FROM chart_of_accounts 
   WHERE LOWER(name) LIKE '%receivable%' 
   AND category = 'Assets' 
   AND status = 'Active';

   -- Verify WIP
   SELECT * FROM chart_of_accounts 
   WHERE LOWER(name) LIKE '%work in progress%' 
   AND category = 'Assets' 
   AND status = 'Active';

   -- Verify Wages Payable
   SELECT * FROM chart_of_accounts 
   WHERE LOWER(name) LIKE '%wages payable%' 
   AND category = 'Liabilities' 
   AND status = 'Active';

   -- Repeat for all 8 accounts
   ```

2. **Test Voucher Creation:**
   - Approve a customer order → Check for AR voucher
   - Consume materials → Check for WIP voucher
   - Complete production run → Check for labor & overhead vouchers
   - Complete work order → Check for FG transfer voucher

3. **Check Logs:**
   - Look for "Accounts module not available" → Means accounts module not loaded
   - Look for "Required accounts not configured" → Means accounts not found
   - Look for "Success: Applied..." → Means voucher created successfully

---

## 💡 Troubleshooting

### Voucher Not Created

**Problem:** No voucher created when expected

**Possible Causes:**
1. ❌ Accounts module not enabled/loaded
   - **Solution:** Check `moduleRegistry` initialization

2. ❌ Account not found in Chart of Accounts
   - **Solution:** Verify account exists with correct name and category
   - **Check logs:** Look for "Required accounts not configured"

3. ❌ Account not active
   - **Solution:** Set account status to "Active"

4. ❌ Account name doesn't match search pattern
   - **Solution:** Ensure account name contains the search term
   - Example: "A/R" won't match "Receivable" search

### Voucher Created But Not Visible

**Problem:** Voucher created but can't see in UI

**Possible Causes:**
1. ❌ Voucher not auto-approved
   - **Solution:** Check `updateVoucherMediator` availability

2. ❌ Wrong voucher type/date filter
   - **Solution:** Check voucher list filters

---

## 🚀 Sample Chart of Accounts Structure

```
Assets (Category)
├── Current Assets
│   ├── 1100 - Cash
│   ├── 1200 - Accounts Receivable ✅
│   ├── 1310 - Raw Materials Inventory ✅
│   ├── 1320 - Finished Goods Inventory ✅
│   └── 1400 - Work in Progress (WIP) ✅
└── Fixed Assets
    └── ...

Liabilities (Category)
├── Current Liabilities
│   ├── 2100 - Accounts Payable
│   ├── 2200 - Wages Payable ✅
│   ├── 2250 - Factory Overhead Applied ✅
│   └── 2400 - Deferred Revenue ✅
└── Long-term Liabilities
    └── ...

Expenses (Category)
├── Operating Expenses
│   ├── 5100 - Salaries Expense
│   ├── 5500 - Wastage Expense ✅
│   └── ...
└── ...
```

---

## 📊 Expected Account Balances After Test Run

After a complete production cycle:

| Account | Debit | Credit | Balance |
|---------|-------|--------|---------|
| Accounts Receivable | $1000 | - | +$1000 DR |
| Deferred Revenue | - | $1000 | +$1000 CR |
| Raw Materials | - | $350 | -$350 CR |
| Work in Progress | $550 | $550 | $0 |
| Finished Goods | $550 | - | +$550 DR |
| Wages Payable | - | $150 | +$150 CR |
| Factory Overhead Applied | - | $100 | +$100 CR |
| Wastage Expense | $50 | - | +$50 DR |

**Notes:**
- WIP should be $0 after work order completion (all transferred to FG)
- Finished Goods balance = Total production cost (Materials + Labor + Overhead)
- Wastage Expense separate from production cost

---

**Next Step:** Once these accounts are created, you can begin testing the integration!

