# Factory Accounting Flow - Complete Analysis

## Overview

This document analyzes the complete accounting flow for factory operations to ensure proper double-entry bookkeeping where every account receives both debits and credits as appropriate.

## Transaction Flow Analysis

### 1. Customer Order Approved
**Event**: `FACTORY_ORDER_APPROVED`  
**Method**: `createCustomerOrderReceivable`

**Journal Entry**:
```
DR  Accounts Receivable    XXX
    CR  Deferred Revenue         XXX
```

**Account Movement**:
- ✅ **Accounts Receivable** (Asset): DEBIT (increases A/R)
- ✅ **Deferred Revenue** (Liability): CREDIT (increases liability)

**Analysis**: ✅ CORRECT - Creates receivable and deferred revenue obligation

---

### 2. Customer Payment Received
**Event**: `FACTORY_PAYMENT_RECEIVED`  
**Method**: `createCustomerPaymentVoucher`

**Journal Entry**:
```
DR  Cash/Bank              XXX
    CR  Accounts Receivable     XXX
```

**Account Movement**:
- ✅ **Cash/Bank** (Asset): DEBIT (increases cash)
- ✅ **Accounts Receivable** (Asset): CREDIT (decreases A/R)

**Analysis**: ✅ CORRECT - Receipt reduces receivable and increases cash

---

### 3. Material Consumption
**Event**: `MATERIAL_CONSUMED`  
**Method**: `createMaterialConsumptionVoucher`

**Journal Entry**:
```
DR  Work in Progress (WIP)  XXX
    CR  Raw Materials            XXX
```

**Account Movement**:
- ✅ **WIP** (Asset): DEBIT (increases WIP)
- ✅ **Raw Materials** (Asset): CREDIT (decreases inventory)

**Analysis**: ✅ CORRECT - Transfers material cost to WIP

---

### 4. Material Wastage Approved
**Event**: `MATERIAL_WASTAGE_APPROVED`  
**Method**: `createWastageVoucher`

**Journal Entry**:
```
DR  Wastage Expense        XXX
    CR  Raw Materials           XXX
```

**Account Movement**:
- ✅ **Wastage Expense** (Expense): DEBIT (increases expense)
- ✅ **Raw Materials** (Asset): CREDIT (decreases inventory)

**Analysis**: ✅ CORRECT - Recognizes wastage as expense

---

### 5. Production Run Completed - Labor
**Event**: `PRODUCTION_RUN_COMPLETED`  
**Method**: `createProductionRunLaborVoucher`

**Journal Entry**:
```
DR  Work in Progress (WIP)  XXX
    CR  Wages Payable            XXX
```

**Account Movement**:
- ✅ **WIP** (Asset): DEBIT (increases WIP)
- ✅ **Wages Payable** (Liability): CREDIT (increases liability)

**Analysis**: ✅ CORRECT - Accumulates labor cost in WIP

---

### 6. Production Run Completed - Overhead
**Event**: `PRODUCTION_RUN_COMPLETED`  
**Method**: `createProductionRunOverheadVoucher`

**Journal Entry**:
```
DR  Work in Progress (WIP)       XXX
    CR  Factory Overhead Applied      XXX
```

**Account Movement**:
- ✅ **WIP** (Asset): DEBIT (increases WIP)
- ✅ **Factory Overhead Applied** (Liability): CREDIT (increases applied overhead)

**Analysis**: ✅ CORRECT - Applies overhead to WIP

---

### 7. Work Order Completed (FG Transfer)
**Event**: `WORK_ORDER_COMPLETED`  
**Method**: `createWorkOrderFGTransferVoucher`

**Journal Entry**:
```
DR  Finished Goods         XXX
    CR  Work in Progress        XXX
```

**Account Movement**:
- ✅ **Finished Goods** (Asset): DEBIT (increases FG inventory)
- ✅ **WIP** (Asset): CREDIT (decreases WIP)

**Analysis**: ✅ CORRECT - Transfers completed goods from WIP to FG

---

### 8. Order Shipped (Revenue Recognition)
**Event**: `FACTORY_ORDER_SHIPPED`  
**Method**: `createRevenueRecognitionVoucher`  
**Condition**: Only if policy = 'on_shipment'

**Journal Entry**:
```
DR  Deferred Revenue       XXX
    CR  Sales Revenue           XXX
```

**Account Movement**:
- ✅ **Deferred Revenue** (Liability): DEBIT (decreases liability)
- ✅ **Sales Revenue** (Revenue): CREDIT (recognizes revenue)

**Analysis**: ✅ CORRECT - Recognizes revenue when earned

---

### 9. Customer Return - Credit Note
**Event**: `FACTORY_RETURN_APPROVED`  
**Method**: `createCreditNoteVoucher`

**Journal Entry**:
```
DR  Sales Returns          XXX
    CR  Accounts Receivable     XXX
```

**Account Movement**:
- ✅ **Sales Returns** (Contra-Revenue/Expense): DEBIT (increases returns)
- ✅ **Accounts Receivable** (Asset): CREDIT (decreases A/R)

**Analysis**: ✅ CORRECT - Reduces receivable for returned goods

---

### 10. Customer Return - Revenue Reversal
**Event**: `FACTORY_RETURN_APPROVED`  
**Method**: `createARReversalVoucher`

**Journal Entry**:
```
DR  Deferred Revenue       XXX
    CR  Sales Returns           XXX
```

**Account Movement**:
- ✅ **Deferred Revenue** (Liability): DEBIT (decreases liability)
- ✅ **Sales Returns** (Contra-Revenue/Expense): CREDIT (reverses returns)

**Analysis**: ⚠️ **NEEDS REVIEW** - This may be redundant with credit note

---

## Account Balance Analysis

### Asset Accounts

| Account | Receives Debits | Receives Credits | Balanced? |
|---------|----------------|------------------|-----------|
| **Cash/Bank** | ✅ Payment received | ⚠️ **MISSING**: Wage payments, overhead expenses | ⚠️ NO |
| **Accounts Receivable** | ✅ Order approved | ✅ Payment received, Returns | ✅ YES |
| **Raw Materials** | ⚠️ **MISSING**: Purchases | ✅ Consumption, Wastage | ⚠️ NO |
| **WIP** | ✅ Materials, Labor, Overhead | ✅ FG Transfer | ✅ YES |
| **Finished Goods** | ✅ FG Transfer | ⚠️ **MISSING**: Cost of goods sold | ⚠️ NO |

### Liability Accounts

| Account | Receives Debits | Receives Credits | Balanced? |
|---------|----------------|------------------|-----------|
| **Deferred Revenue** | ✅ Revenue recognition, Returns | ✅ Order approved | ✅ YES |
| **Wages Payable** | ⚠️ **MISSING**: Wage payments | ✅ Labor applied | ⚠️ NO |
| **Factory Overhead Applied** | ⚠️ **MISSING**: Overhead clearance | ✅ Overhead applied | ⚠️ NO |

### Revenue/Expense Accounts

| Account | Receives Debits | Receives Credits | Balanced? |
|---------|----------------|------------------|-----------|
| **Sales Revenue** | ⚠️ **MISSING**: Returns/adjustments | ✅ Revenue recognition | ⚠️ NO |
| **Wastage Expense** | ✅ Wastage | N/A (expense) | ✅ YES |
| **Sales Returns** | ✅ Returns | ✅ Revenue reversal (?) | ⚠️ REVIEW |

---

## Critical Missing Transactions

### 1. ⚠️ **MISSING: Cost of Goods Sold (COGS)**
**When**: Order shipped or revenue recognized  
**Currently**: NO ENTRY  
**Should be**:
```
DR  Cost of Goods Sold    XXX
    CR  Finished Goods          XXX
```

**Impact**: 
- Finished Goods never decreases
- No expense recorded for sold goods
- Profit calculation incorrect

---

### 2. ⚠️ **MISSING: Raw Material Purchases**
**When**: Materials received from suppliers  
**Currently**: NO ENTRY  
**Should be**:
```
DR  Raw Materials         XXX
    CR  Accounts Payable        XXX
    (or Cash if paid immediately)
```

**Impact**:
- Raw Materials only has credits (consumption/wastage)
- No way to track material purchases

---

### 3. ⚠️ **MISSING: Wage Payments**
**When**: Wages actually paid to workers  
**Currently**: Only accrual entry exists  
**Should be**:
```
DR  Wages Payable         XXX
    CR  Cash/Bank               XXX
```

**Impact**:
- Wages Payable accumulates indefinitely
- Cash never decreases for wage payments

---

### 4. ⚠️ **MISSING: Overhead Expense Recognition**
**When**: Actual overhead expenses incurred  
**Currently**: Only applied overhead exists  
**Should have**:
```
DR  Factory Overhead (Actual)  XXX
    CR  Various (Utilities, Rent, etc.)  XXX
```

**And periodic clearance**:
```
DR  Factory Overhead Applied   XXX
    CR  Factory Overhead (Actual)    XXX
```

**Impact**:
- Factory Overhead Applied accumulates indefinitely
- No tracking of actual vs. applied overhead variance

---

## Recommendations

### Priority 1: Critical (Breaks Accounting Integrity)

1. **Implement COGS Entry on Shipment**
   ```typescript
   async createCOGSVoucher(shipmentData: any, userId: number) {
     // DR: Cost of Goods Sold
     // CR: Finished Goods
   }
   ```

2. **Add Material Purchase Entry**
   ```typescript
   async createMaterialPurchaseVoucher(purchaseData: any, userId: number) {
     // DR: Raw Materials
     // CR: Accounts Payable or Cash
   }
   ```

### Priority 2: Important (Cash Flow Tracking)

3. **Add Wage Payment Entry**
   ```typescript
   async createWagePaymentVoucher(paymentData: any, userId: number) {
     // DR: Wages Payable
     // CR: Cash/Bank
   }
   ```

4. **Implement Overhead Clearing**
   ```typescript
   async createOverheadClearingVoucher(periodData: any, userId: number) {
     // DR: Factory Overhead Applied
     // CR: Factory Overhead (Actual)
     // DR/CR: Cost of Goods Sold (for variance)
   }
   ```

### Priority 3: Enhancements

5. **Review Sales Returns Logic**
   - Currently has two entries for returns
   - May need consolidation or clarification

6. **Add Payment Tracking for Suppliers**
   - Track payables reduction
   - Cash outflows for purchases

---

## Corrected Complete Flow

### Customer Order Lifecycle

```
1. Order Approved:
   DR  Accounts Receivable    1000
       CR  Deferred Revenue         1000

2. Payment Received:
   DR  Cash                   1000
       CR  Accounts Receivable     1000

3. Order Shipped:
   a) Revenue Recognition:
      DR  Deferred Revenue    1000
          CR  Sales Revenue         1000
   
   b) COGS Recognition (NEW):
      DR  Cost of Goods Sold  600
          CR  Finished Goods        600
```

### Production Lifecycle

```
1. Material Purchased (NEW):
   DR  Raw Materials         500
       CR  Accounts Payable        500

2. Material Consumed:
   DR  WIP                   400
       CR  Raw Materials           400

3. Labor Applied:
   DR  WIP                   150
       CR  Wages Payable           150

4. Overhead Applied:
   DR  WIP                   50
       CR  Factory Overhead Applied 50

5. Work Order Completed:
   DR  Finished Goods        600
       CR  WIP                     600

6. Wages Paid (NEW):
   DR  Wages Payable         150
       CR  Cash                    150
```

---

## Summary

### Current State:
- ✅ 10 transaction types implemented
- ✅ Basic double-entry maintained
- ⚠️ 4 critical missing transactions
- ⚠️ Some accounts only receive debits or credits

### Issues Found:
1. **COGS not recorded** - Profit calculation broken
2. **Material purchases not tracked** - Inventory source missing
3. **Wage payments not recorded** - Liability never clears
4. **Overhead never cleared** - Variance not tracked

### Action Required:
Implement 4 missing voucher types to complete the accounting cycle and ensure all accounts properly receive both debits and credits where applicable.

