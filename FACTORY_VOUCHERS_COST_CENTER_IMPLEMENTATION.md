# Factory Vouchers Cost Center Implementation

**Date:** October 13, 2025  
**Status:** ✅ **COMPLETE**  
**Impact:** HIGH - Enables factory-wise accounting reports  
**Related:** `FACTORY_ACCOUNTS_COST_CENTER_UPDATE.md`, `FACTORY_ACCOUNTS_INTEGRATION_COMPLETE.md`

---

## Problem Statement

Previously, all factory-related vouchers were created **without factory cost center information**. This caused several issues:

❌ **Problem:**
- All factory vouchers went to the same accounts
- No way to track which vouchers belong to which factory
- Cannot generate factory-wise accounting reports
- Cannot analyze costs or revenue by factory
- Budget tracking and variance analysis impossible at factory level

---

## Solution Overview

The implementation now **automatically tags all factory-related vouchers with the factory's cost center**. This enables:

✅ **Benefits:**
- Factory-wise profit & loss reports via cost center filtering
- Factory-level budget tracking and variance analysis
- Clear cost allocation per factory
- Revenue attribution to specific factories
- Multi-factory operations can be tracked independently
- Seamless integration with existing cost center reporting

---

## Technical Implementation

### 1. Updated Data Interfaces

#### `OrderAccountingData` (factoryAccountsIntegrationService.ts)
```typescript
export interface OrderAccountingData {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  totalValue: number;
  currency: string;
  orderDate: string;
  factoryId?: number;
  factoryName?: string;           // ✅ NEW
  factoryCostCenterId?: number;   // ✅ NEW
  lineItems?: any[];
  notes?: string;
}
```

#### `ReturnAccountingData` (factoryAccountsIntegrationService.ts)
```typescript
export interface ReturnAccountingData {
  returnId: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  totalReturnValue: number;
  currency: string;
  returnDate: string;
  returnReason: string;
  factoryId?: number;
  factoryName?: string;           // ✅ NEW
  factoryCostCenterId?: number;   // ✅ NEW
  lineItems?: any[];
  notes?: string;
  originalReceivableVoucherId?: number;
  originalRevenueVoucherId?: number;
  originalCogsVoucherId?: number;
}
```

---

### 2. Updated Voucher Creation Methods

All voucher creation methods in `factoryAccountsIntegrationService.ts` now include:

#### Header-Level Cost Center
```typescript
const voucherData = {
  type: VoucherType.JOURNAL,
  date: new Date(orderData.orderDate),
  reference: orderData.orderNumber,
  payee: orderData.customerName,
  amount: orderData.totalValue,
  currency: orderData.currency,
  narration: `Customer Order Approved - ${orderData.orderNumber} - ${orderData.customerName}${orderData.factoryName ? ` - Factory: ${orderData.factoryName}` : ''}...`,
  costCenterId: orderData.factoryCostCenterId, // ✅ Factory cost center
  lines: [...]
};
```

#### Line-Level Cost Center
```typescript
lines: [
  {
    accountId: receivableAccount.id,
    debit: orderData.totalValue,
    credit: 0,
    description: `Accounts Receivable for Order ${orderData.orderNumber}`,
    costCenterId: orderData.factoryCostCenterId  // ✅ Factory cost center
  },
  // ... other lines also tagged
]
```

#### Updated Methods:
1. ✅ `createCustomerOrderReceivable()` - Customer order approval vouchers
2. ✅ `createMaterialConsumptionVoucher()` - Material consumption vouchers
3. ✅ `createWastageVoucher()` - Wastage expense vouchers
4. ✅ `createProductionRunLaborVoucher()` - Production labor vouchers
5. ✅ `createProductionRunOverheadVoucher()` - Production overhead vouchers
6. ✅ `createWorkOrderFGTransferVoucher()` - Finished goods transfer vouchers
7. ✅ `createRevenueRecognitionVoucher()` - Revenue recognition vouchers
8. ✅ `createCreditNoteVoucher()` - Credit note for returns
9. ✅ `createARReversalVoucher()` - AR reversal for returns

---

### 3. Updated Event Emissions

#### Customer Order Approval (UpdateCustomerOrderInfo.mediator.ts)

**Before:**
```typescript
eventBus.emit(EVENT_NAMES.FACTORY_ORDER_APPROVED, {
  orderData: {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.order_number,
    // ... other fields
    factoryId: updatedOrder.factory_id,
    lineItems: updatedOrder.line_items
  },
  userId: parseInt(userId)
});
```

**After:**
```typescript
eventBus.emit(EVENT_NAMES.FACTORY_ORDER_APPROVED, {
  orderData: {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.order_number,
    // ... other fields
    factoryId: updatedOrder.factory_id,
    factoryName: (updatedOrder as any).factory_name,              // ✅ NEW
    factoryCostCenterId: (updatedOrder as any).factory_cost_center_id,  // ✅ NEW
    lineItems: updatedOrder.line_items
  },
  userId: parseInt(userId)
});
```

#### Work Order Completion (UpdateWorkOrder.mediator.ts)

Now fetches factory info before emitting event:
```typescript
// Fetch factory information for accounts integration
let factoryInfo: { factory_id: number; factory_name: string; factory_cost_center_id: number | null } | null = null;
if (updatedWorkOrder.customer_order_id) {
  const factoryResult = await pool.query(
    `SELECT f.id as factory_id, f.name as factory_name, f.cost_center_id as factory_cost_center_id
     FROM factory_customer_orders co
     JOIN factories f ON co.factory_id = f.id
     WHERE co.id = $1`,
    [updatedWorkOrder.customer_order_id]
  );
  if (factoryResult.rows.length > 0) {
    factoryInfo = factoryResult.rows[0];
  }
}

// Then includes in event
eventBus.emit(EVENT_NAMES.WORK_ORDER_COMPLETED, {
  workOrderData: {
    // ... other fields
    factoryId: factoryInfo?.factory_id,
    factoryName: factoryInfo?.factory_name,
    factoryCostCenterId: factoryInfo?.factory_cost_center_id
  },
  userId: parseInt(userId)
});
```

**Similar changes made to:**
- ✅ Material Consumption (AddMaterialConsumption.mediator.ts)
- ✅ Wastage Approval (MaterialWastageMediator.ts)
- ✅ Production Run Completion (UpdateProductionRunStatus.mediator.ts)

---

### 4. Updated Database Query

#### GetCustomerOrderInfo.mediator.ts

**Before:**
```sql
SELECT
  co.*,
  f.id as factory_id,
  f.name as factory_name,
  ...
FROM factory_customer_orders co
LEFT JOIN factory_customer_order_line_items li ON co.id = li.order_id
JOIN factories f ON co.factory_id = f.id
WHERE co.id = $1
GROUP BY co.id, f.id, f.name
```

**After:**
```sql
SELECT
  co.*,
  f.id as factory_id,
  f.name as factory_name,
  f.cost_center_id as factory_cost_center_id,      -- ✅ NEW
  cc.name as factory_cost_center_name,             -- ✅ NEW
  ...
FROM factory_customer_orders co
LEFT JOIN factory_customer_order_line_items li ON co.id = li.order_id
JOIN factories f ON co.factory_id = f.id
LEFT JOIN cost_centers cc ON f.cost_center_id = cc.id  -- ✅ NEW JOIN
WHERE co.id = $1
GROUP BY co.id, f.id, f.name, f.cost_center_id, cc.name  -- ✅ UPDATED GROUP BY
```

---

## How It Works - End-to-End Flow

### Example: Customer Order Approval

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. User Approves Customer Order                                  │
│    Order #CO-001 → Assigned to "Main Factory"                   │
│    Main Factory → Linked to Cost Center "MF-OPS"                │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. UpdateCustomerOrderInfo.mediator.approveOrder()              │
│    - Approves order                                              │
│    - Fetches updated order (now includes factory_cost_center_id) │
│    - Emits FACTORY_ORDER_APPROVED event with:                    │
│      • factoryId: 1                                              │
│      • factoryName: "Main Factory"                               │
│      • factoryCostCenterId: 5 (MF-OPS)                          │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. factoryAccountsIntegrationService.createCustomerOrderReceivable() │
│    Creates voucher with:                                         │
│                                                                  │
│    Header:                                                       │
│      • voucher_no: "JOU-2025-001"                               │
│      • type: "Journal"                                          │
│      • costCenterId: 5 (MF-OPS) ← ✅ Factory cost center       │
│      • narration: "Customer Order Approved - CO-001 -           │
│                    Customer ABC - Factory: Main Factory"        │
│                                                                  │
│    Lines:                                                        │
│      • Debit: Accounts Receivable $10,000                       │
│        costCenterId: 5 (MF-OPS) ← ✅ Factory cost center       │
│      • Credit: Deferred Revenue $10,000                         │
│        costCenterId: 5 (MF-OPS) ← ✅ Factory cost center       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. Result: Voucher Saved to Database                            │
│                                                                  │
│    vouchers table:                                               │
│      id: 123                                                     │
│      voucher_no: "JOU-2025-001"                                 │
│      cost_center_id: 5  ← ✅ Can now filter by factory!        │
│                                                                  │
│    voucher_lines table:                                          │
│      Line 1: account_id=10, debit=10000, cost_center_id=5      │
│      Line 2: account_id=20, credit=10000, cost_center_id=5     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Reporting Capabilities Now Available

### 1. Factory-Wise Profit & Loss Report

```sql
-- Get all revenue and expenses for "Main Factory" (Cost Center MF-OPS)
SELECT 
  coa.name as account_name,
  coa.category,
  SUM(vl.debit) as total_debits,
  SUM(vl.credit) as total_credits
FROM voucher_lines vl
JOIN chart_of_accounts coa ON vl.account_id = coa.id
JOIN cost_centers cc ON vl.cost_center_id = cc.id
WHERE cc.code = 'MF-OPS'
  AND coa.category IN ('Revenue', 'Expenses')
  AND v.date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY coa.name, coa.category
ORDER BY coa.category, coa.name;
```

### 2. Factory Cost Center Budget vs. Actual

```sql
-- Compare budget vs. actual for Main Factory
SELECT 
  cc.name as cost_center,
  cc.budget as budgeted_amount,
  SUM(vl.debit) - SUM(vl.credit) as actual_expenses,
  cc.budget - (SUM(vl.debit) - SUM(vl.credit)) as variance
FROM cost_centers cc
LEFT JOIN voucher_lines vl ON cc.id = vl.cost_center_id
WHERE cc.code = 'MF-OPS'
  AND EXTRACT(YEAR FROM v.date) = 2025
GROUP BY cc.id, cc.name, cc.budget;
```

### 3. Multi-Factory Comparison

```sql
-- Compare revenue across all factories
SELECT 
  f.name as factory_name,
  cc.name as cost_center_name,
  SUM(vl.credit) as total_revenue
FROM factories f
JOIN cost_centers cc ON f.cost_center_id = cc.id
JOIN voucher_lines vl ON cc.id = vl.cost_center_id
JOIN chart_of_accounts coa ON vl.account_id = coa.id
WHERE coa.category = 'Revenue'
  AND v.date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY f.name, cc.name
ORDER BY total_revenue DESC;
```

---

## Files Modified

### Backend Services
- ✅ `backend/src/services/factoryAccountsIntegrationService.ts`
  - Updated `OrderAccountingData` interface
  - Updated `ReturnAccountingData` interface
  - Added `costCenterId` to all voucher creation methods

### Backend Mediators
- ✅ `backend/src/modules/factory/mediators/customerOrders/GetCustomerOrderInfo.mediator.ts`
  - Updated SQL query to fetch factory cost center
  
- ✅ `backend/src/modules/factory/mediators/customerOrders/UpdateCustomerOrderInfo.mediator.ts`
  - Updated event emission to include factory cost center
  
- ✅ `backend/src/modules/factory/mediators/workOrders/UpdateWorkOrder.mediator.ts`
  - Added factory info fetch before event emission
  - Updated WORK_ORDER_COMPLETED event
  
- ✅ `backend/src/modules/factory/mediators/materialConsumptions/AddMaterialConsumption.mediator.ts`
  - Added factory info fetch before event emission
  - Updated MATERIAL_CONSUMED event
  
- ✅ `backend/src/modules/factory/mediators/wastage/MaterialWastageMediator.ts`
  - Added factory info fetch before event emission
  - Updated MATERIAL_WASTAGE_APPROVED event
  
- ✅ `backend/src/modules/factory/mediators/productionExecution/UpdateProductionRunStatus.mediator.ts`
  - Added factory info fetch (including production line cost center)
  - Updated PRODUCTION_RUN_COMPLETED event

---

## Backward Compatibility

✅ **Fully backward compatible:**
- All new fields are optional (`factoryCostCenterId?`)
- Existing vouchers without cost centers remain valid
- Factories without assigned cost centers will create vouchers without cost center
- System gracefully handles missing factory information

---

## Usage Instructions

### For Administrators

1. **Assign Cost Centers to Factories**
   ```
   Factory Management → Edit Factory → Select Cost Center
   ```

2. **View Factory-Wise Reports**
   ```
   Accounts → Reports → Cost Center Report → Filter by Factory Cost Center
   ```

3. **Track Factory Performance**
   - All new vouchers automatically tagged with factory cost center
   - Filter vouchers by cost center to see factory-specific transactions
   - Compare budgets vs. actuals per factory

### For Developers

When creating new voucher types, ensure you:

1. Include factory information in event data:
   ```typescript
   factoryId: order.factoryId,
   factoryName: order.factoryName,
   factoryCostCenterId: order.factoryCostCenterId
   ```

2. Pass cost center to voucher creation:
   ```typescript
   const voucherData = {
     // ... other fields
     costCenterId: data.factoryCostCenterId,
     lines: [
       {
         accountId: account.id,
         debit: amount,
         credit: 0,
         costCenterId: data.factoryCostCenterId  // Line-level too
       }
     ]
   };
   ```

---

## Testing Checklist

✅ **Verify the following:**

1. **Customer Order Approval**
   - [ ] Approve an order assigned to a factory with a cost center
   - [ ] Check voucher has `cost_center_id` in `vouchers` table
   - [ ] Check voucher lines have `cost_center_id` in `voucher_lines` table

2. **Material Consumption**
   - [ ] Record material consumption for a work order
   - [ ] Verify consumption voucher has factory cost center

3. **Wastage Approval**
   - [ ] Approve material wastage
   - [ ] Verify wastage voucher has factory cost center

4. **Production Run Completion**
   - [ ] Complete a production run
   - [ ] Verify labor and overhead vouchers have factory cost center

5. **Work Order Completion**
   - [ ] Complete a work order
   - [ ] Verify finished goods transfer voucher has factory cost center

6. **Reports**
   - [ ] Filter vouchers by cost center
   - [ ] Generate cost center report grouped by factory
   - [ ] Verify factory-wise P&L shows correct data

---

## Related Documentation

- `FACTORY_ACCOUNTS_COST_CENTER_UPDATE.md` - V46 migration details
- `FACTORY_ACCOUNTS_INTEGRATION_COMPLETE.md` - Original factory accounts integration
- `FACTORIES_COST_CENTERS_INTEGRATION.md` - Factory-cost center connection
- `FACTORY_COST_CENTER_QUICK_START.md` - Quick setup guide
- `COST_CENTER_CHART_OF_ACCOUNTS_INTEGRATION.md` - Cost center accounting setup

---

## Summary

✅ **Implementation Complete**

All factory-related vouchers now automatically include the factory's cost center, enabling:

- 📊 Factory-wise accounting reports
- 💰 Factory-level budget tracking
- 🎯 Accurate cost allocation
- 📈 Performance comparison across factories
- 🔍 Detailed financial analysis per factory

**Next Steps:**
1. Assign cost centers to all factories
2. Train users on new reporting capabilities
3. Set up factory-level budgets in cost centers
4. Generate factory-wise financial reports

---

**Questions or Issues?**
Contact the development team or refer to the related documentation above.

