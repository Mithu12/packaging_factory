# Factory Accounting - COGS Implementation

## Overview

This document describes the implementation of **Cost of Goods Sold (COGS)** accounting voucher creation for factory customer orders. This is a **critical fix** to ensure proper profit calculation and complete double-entry bookkeeping.

## Problem Statement

### Before Implementation

When a customer order was shipped, the system would:
1. ✅ Recognize revenue (Deferred Revenue → Sales Revenue)
2. ❌ **NOT record the cost of sold inventory**

**Result**: 
- Finished Goods inventory never decreased
- No expense recorded for sold goods
- **Profit calculations were incorrect** (100% margin appeared)
- Finished Goods account only received DEBITS, never CREDITS

### Accounting Issue

```
Without COGS:
-------------------
Assets:
  Finished Goods:  $10,000 DR (keeps growing, never decreases)
  
Revenue:
  Sales Revenue:   $15,000 CR
  
Expenses:
  COGS:            $0 (MISSING!)
  
Apparent Profit:   $15,000 (WRONG - should be $5,000)
```

## Solution Implemented

### New Method: `createCOGSVoucher`

**Location**: `backend/src/services/factoryAccountsIntegrationService.ts` (lines 1060-1159)

**Purpose**: Create accounting voucher to record the cost of inventory sold

**Journal Entry**:
```
DR  Cost of Goods Sold    XXX
    CR  Finished Goods          XXX
```

**When Triggered**: Automatically when `FACTORY_ORDER_SHIPPED` event is emitted

### Implementation Details

```typescript
async createCOGSVoucher(
  orderData: OrderAccountingData & { costOfGoodsSold?: number },
  userId: number
): Promise<VoucherCreationResult | null>
```

**Features**:
- ✅ Validates COGS amount is provided and > 0
- ✅ Graceful degradation if accounts module unavailable
- ✅ Auto-approves voucher for immediate effect
- ✅ Links to factory cost center for departmental tracking
- ✅ Attempts to store voucher reference in order (optional column)
- ✅ Comprehensive error handling and logging

**Account Types Added**:
```typescript
case 'cost_of_goods_sold':
case 'cogs':
  searchTerm = 'Cost of Goods Sold';
  category = 'Expenses';
  break;
```

## Event Listener Update

**Event**: `FACTORY_ORDER_SHIPPED`  
**Location**: `backend/src/services/factoryAccountsIntegrationService.ts` (lines 1650-1711)

**Enhanced Flow**:
```typescript
1. Check revenue recognition policy
   - If 'on_shipment': Create revenue recognition voucher
   
2. ALWAYS create COGS voucher (new!)
   - If orderData.costOfGoodsSold is provided
   - Regardless of revenue recognition policy
   - Creates expense entry for sold inventory
```

**Key Code**:
```typescript
// ALWAYS create COGS voucher when order is shipped (regardless of revenue policy)
if (orderData && orderData.costOfGoodsSold) {
  const cogsResult = await factoryAccountsIntegrationService.createCOGSVoucher(orderData, userId);
  
  if (cogsResult?.success) {
    MyLogger.success('Factory Accounting Integration', {
      event: 'ORDER_SHIPPED_COGS',
      orderId: orderData.orderId,
      voucherId: cogsResult.voucherId,
      voucherNo: cogsResult.voucherNo,
      cogsAmount: orderData.costOfGoodsSold
    });
  }
}
```

## Complete Transaction Flow

### Before (Incomplete):
```
1. Order Approved:
   DR  A/R              1000
       CR  Deferred Rev      1000

2. Order Shipped:
   DR  Deferred Rev    1000
       CR  Sales Rev         1000
   
   [MISSING COGS ENTRY!]

3. Payment Received:
   DR  Cash            1000
       CR  A/R               1000
```

### After (Complete):
```
1. Order Approved:
   DR  A/R              1000
       CR  Deferred Rev      1000

2. Order Shipped:
   a) Revenue Recognition:
      DR  Deferred Rev    1000
          CR  Sales Rev         1000
   
   b) COGS Recognition (NEW!):
      DR  COGS            600
          CR  Finished Goods     600

3. Payment Received:
   DR  Cash            1000
       CR  A/R               1000

---
Gross Profit: $1000 - $600 = $400 (CORRECT!)
```

## Account Balance Changes

### Finished Goods Account

**Before**:
```
Finished Goods (Asset)
---------------------
DR | Production    | 10,000
   |               |
   |               |
   |               |
---------------------
Balance:           10,000 DR
```
❌ **Problem**: Only receives debits, never credits. Grows indefinitely.

**After**:
```
Finished Goods (Asset)
---------------------
DR | Production    | 10,000 | CR | Sold       | 6,000
   |               |        |    |            |
   |               |        |    |            |
---------------------
Balance:           4,000 DR
```
✅ **Fixed**: Properly receives both debits and credits. Accurately reflects inventory on hand.

### Cost of Goods Sold Account

**Before**:
```
COGS (Expense)
---------------------
   | (no entries)  |
---------------------
Balance:           0
```
❌ **Problem**: No expense recorded for sold goods.

**After**:
```
COGS (Expense)
---------------------
DR | Order #101    | 600
DR | Order #102    | 800
DR | Order #103    | 500
---------------------
Balance:           1,900 DR
```
✅ **Fixed**: Properly accumulates cost of sold inventory as expense.

## Configuration Requirements

### Required Accounts in Chart of Accounts

| Account Name | Category | Type | Purpose |
|--------------|----------|------|---------|
| **Cost of Goods Sold** | Expenses | Expense | Records cost of inventory sold |
| **Finished Goods** | Assets | Current | Inventory of completed products |

**Setup Instructions**:
1. Navigate to Chart of Accounts
2. Create account "Cost of Goods Sold" under Expenses category
3. Ensure "Finished Goods" account exists under Assets

## Usage

### For Backend Developers

When emitting `FACTORY_ORDER_SHIPPED` event, include `costOfGoodsSold` in the payload:

```typescript
eventBus.emit(EVENT_NAMES.FACTORY_ORDER_SHIPPED, {
  orderData: {
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    totalValue: order.total_value,
    costOfGoodsSold: 600,  // <-- ADD THIS!
    currency: order.currency,
    orderDate: order.order_date,
    factoryId: order.factory_id,
    factoryName: order.factory_name,
    factoryCostCenterId: order.factory_cost_center_id
  },
  userId: currentUserId
});
```

### Calculating COGS

**Option 1: From Work Order**
```typescript
// If order is linked to work order
const workOrder = await getWorkOrderForOrder(orderId);
costOfGoodsSold = workOrder.total_wip_cost;
```

**Option 2: From Product Cost**
```typescript
// Sum of line item costs
let costOfGoodsSold = 0;
for (const item of order.line_items) {
  const product = await getProduct(item.product_id);
  costOfGoodsSold += product.unit_cost * item.quantity;
}
```

**Option 3: Fixed Margin**
```typescript
// E.g., 60% of selling price
costOfGoodsSold = order.total_value * 0.60;
```

## Migration (Optional)

To store voucher reference in orders:

```sql
-- Add column to track COGS voucher
ALTER TABLE factory_customer_orders
    ADD COLUMN IF NOT EXISTS cogs_voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_factory_customer_orders_cogs_voucher
    ON factory_customer_orders(cogs_voucher_id);

COMMENT ON COLUMN factory_customer_orders.cogs_voucher_id IS 'Voucher ID for COGS entry when order shipped';
```

## Testing

### Test Scenario

1. Create and approve customer order (total: $1000)
2. Complete work order (cost: $600)
3. Ship order with COGS data
4. Verify vouchers created:
   - Revenue voucher: DR Deferred Rev $1000, CR Sales Rev $1000
   - COGS voucher: DR COGS $600, CR Finished Goods $600

### Validation Queries

```sql
-- Check COGS vouchers created
SELECT v.voucher_no, v.amount, v.narration
FROM vouchers v
WHERE v.narration LIKE 'Cost of Goods Sold%'
ORDER BY v.created_at DESC;

-- Verify Finished Goods balance
SELECT 
    SUM(CASE WHEN debit > 0 THEN debit ELSE 0 END) AS total_debits,
    SUM(CASE WHEN credit > 0 THEN credit ELSE 0 END) AS total_credits,
    SUM(debit - credit) AS net_balance
FROM voucher_lines vl
JOIN chart_of_accounts coa ON vl.account_id = coa.id
WHERE coa.name LIKE '%Finished Goods%';

-- Calculate gross profit
SELECT 
    SUM(CASE WHEN coa.category = 'Revenue' THEN vl.credit - vl.debit ELSE 0 END) AS revenue,
    SUM(CASE WHEN coa.name LIKE '%Cost of Goods Sold%' THEN vl.debit - vl.credit ELSE 0 END) AS cogs,
    SUM(CASE WHEN coa.category = 'Revenue' THEN vl.credit - vl.debit ELSE 0 END) -
    SUM(CASE WHEN coa.name LIKE '%Cost of Goods Sold%' THEN vl.debit - vl.credit ELSE 0 END) AS gross_profit
FROM voucher_lines vl
JOIN chart_of_accounts coa ON vl.account_id = coa.id
WHERE coa.category IN ('Revenue', 'Expenses');
```

## Impact Analysis

### Financial Statements

**Income Statement (Before)**:
```
Revenue:
  Sales Revenue:        $15,000
  
Expenses:
  COGS:                 $0        ❌ MISSING
  Wages:                $2,000
  Overhead:             $1,000
  
Gross Profit:           $15,000   ❌ WRONG!
Operating Profit:       $12,000   ❌ WRONG!
```

**Income Statement (After)**:
```
Revenue:
  Sales Revenue:        $15,000
  
Cost of Goods Sold:     $9,000    ✅ NOW CORRECT
Gross Profit:           $6,000    ✅ NOW CORRECT
  
Operating Expenses:
  Wages:                $2,000
  Overhead:             $1,000
  
Operating Profit:       $3,000    ✅ NOW CORRECT
```

**Balance Sheet Impact**:
```
Before:
  Finished Goods:       $50,000   ❌ Overstated

After:
  Finished Goods:       $41,000   ✅ Accurate
  (Reduced by COGS)
```

## Monitoring

### Logs to Watch

```
2025-10-15 [success]: Factory Accounting Integration
Event: ORDER_SHIPPED_COGS
Order ID: 123
Voucher ID: 55
Voucher No: V2025-055
COGS Amount: 600
```

### Alerts to Set

1. **Missing COGS**: If order shipped without `costOfGoodsSold`
2. **Account Not Found**: If COGS or Finished Goods account missing
3. **Voucher Creation Failed**: If COGS voucher fails to create

## Future Enhancements

1. **Automatic COGS Calculation**
   - Pull from work order total cost automatically
   - No need to manually provide in event

2. **Inventory Valuation Methods**
   - FIFO (First In, First Out)
   - LIFO (Last In, First Out)
   - Weighted Average
   - Standard Cost

3. **Variance Analysis**
   - Standard cost vs. actual cost
   - Report variances to management

## Related Documentation

- `FACTORY_ACCOUNTING_FLOW_ANALYSIS.md` - Complete flow analysis
- `FACTORY_ACCOUNTS_INTEGRATION_COMPLETE.md` - Full integration overview
- `FACTORY_CUSTOMER_PAYMENTS_ACCOUNTING_INTEGRATION.md` - Payment integration

## Summary

✅ **Critical Fix Implemented**: COGS voucher creation  
✅ **Account Balance Fixed**: Finished Goods now receives credits  
✅ **Profit Calculation Fixed**: Expense properly recorded  
✅ **Double-Entry Complete**: All accounts properly balanced  
✅ **Flexible**: Supports multiple COGS calculation methods  
✅ **Production Ready**: Full error handling and logging  

The factory accounting module now has **complete and accurate double-entry bookkeeping** for the customer order lifecycle, ensuring financial statements accurately reflect business operations.

