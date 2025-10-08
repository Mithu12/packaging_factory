# Factory-Accounts Integration - Transaction Flows

**Date:** October 8, 2025  
**Purpose:** Visual reference for accounting entries created by factory operations

---

## 1. Customer Order Lifecycle

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CUSTOMER ORDER LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: Order Creation (draft)
┌──────────────────┐
│ Factory Module   │
│ Create Order     │
└──────────────────┘
        ↓
   No accounting impact yet


Step 2: Order Approval
┌──────────────────┐        Event: FACTORY_ORDER_APPROVED
│ Factory Module   │──────────────────────────────────────┐
│ Approve Order    │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
        ↓                                       │ Integration Service  │
Factory Status: approved                        │ Create Voucher       │
                                                └──────────────────────┘
                                                           ↓
                                               ┌──────────────────────┐
                                               │ Accounts Module      │
                                               │ Journal Voucher      │
                                               └──────────────────────┘
                                                           ↓
                                        Accounting Entry Created:
                                        ┌───────────────────────────┐
                                        │ Debit:  A/R        $10,000│
                                        │ Credit: Def. Rev.  $10,000│
                                        │ Cost Center: Factory A    │
                                        └───────────────────────────┘


Step 3: Production (in_production)
┌──────────────────┐
│ Factory Module   │
│ Produce Goods    │  ← See "Production Flow" section
└──────────────────┘


Step 4: Order Shipment
┌──────────────────┐        Event: FACTORY_ORDER_SHIPPED
│ Factory Module   │──────────────────────────────────────┐
│ Ship Order       │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
        ↓                                       │ Integration Service  │
Factory Status: shipped                         │ Create 2 Vouchers    │
                                                └──────────────────────┘
                                                           ↓
                                        ┌──────────────────────────────┐
                                        │ Revenue Recognition Voucher  │
                                        ├──────────────────────────────┤
                                        │ Debit:  Def. Rev.    $10,000│
                                        │ Credit: Sales Rev.   $10,000│
                                        └──────────────────────────────┘
                                                           +
                                        ┌──────────────────────────────┐
                                        │ COGS Recognition Voucher     │
                                        ├──────────────────────────────┤
                                        │ Debit:  COGS          $6,500│
                                        │ Credit: Finished Gds  $6,500│
                                        └──────────────────────────────┘


Step 5: Payment Receipt (external/manual)
┌──────────────────┐        Event: FACTORY_PAYMENT_RECEIVED
│ Payment Entry    │──────────────────────────────────────┐
│ (Manual/Import)  │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
                                                │ Integration Service  │
                                                │ Create Voucher       │
                                                └──────────────────────┘
                                                           ↓
                                        ┌──────────────────────────────┐
                                        │ Cash Receipt Voucher         │
                                        ├──────────────────────────────┤
                                        │ Debit:  Cash/Bank    $10,000│
                                        │ Credit: A/R          $10,000│
                                        └──────────────────────────────┘
```

---

## 2. Production Flow (Material → WIP → Finished Goods)

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: Work Order Created
┌──────────────────┐
│ Work Order       │
│ Created          │
└──────────────────┘
        ↓
   Links to BOM, calculates material requirements
   No accounting impact yet


Step 2: Material Allocated
┌──────────────────┐
│ Allocate         │
│ Materials        │  Reserve inventory, no cost movement yet
└──────────────────┘


Step 3: Material Consumed
┌──────────────────┐        Event: MATERIAL_CONSUMED
│ Record Material  │──────────────────────────────────────┐
│ Consumption      │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
        ↓                                       │ Integration Service  │
Updates inventory                               │ Create Voucher       │
                                                └──────────────────────┘
                                                           ↓
                                        ┌──────────────────────────────┐
                                        │ Material Consumption Voucher │
                                        ├──────────────────────────────┤
                                        │ Debit:  WIP           $2,500│
                                        │ Credit: Raw Mat. Inv. $2,500│
                                        │ Cost Center: Factory A - L1  │
                                        └──────────────────────────────┘
                                        
                                                    WIP Account
                                        ┌──────────────────────────────┐
                                        │ Opening Balance:         $0  │
                                        │ + Material Cost:     $2,500  │
                                        │ = Current WIP:       $2,500  │
                                        └──────────────────────────────┘


Step 4: Material Wastage (if any)
┌──────────────────┐        Event: MATERIAL_WASTAGE_APPROVED
│ Approve Wastage  │──────────────────────────────────────┐
│ Record           │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
                                                │ Integration Service  │
                                                │ Create Voucher       │
                                                └──────────────────────┘
                                                           ↓
                                        ┌──────────────────────────────┐
                                        │ Wastage Expense Voucher      │
                                        ├──────────────────────────────┤
                                        │ Debit:  Wastage Exp.    $250│
                                        │ Credit: Raw Mat. Inv.   $250│
                                        │ Cost Center: Factory A - L1  │
                                        └──────────────────────────────┘


Step 5: Production Run Completed
┌──────────────────┐        Event: PRODUCTION_RUN_COMPLETED
│ Complete         │──────────────────────────────────────┐
│ Production Run   │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
        ↓                                       │ Integration Service  │
Record actual hours, efficiency                 │ Create 2 Vouchers    │
                                                └──────────────────────┘
                                                           ↓
                                        ┌──────────────────────────────┐
                                        │ Labor Cost Voucher           │
                                        ├──────────────────────────────┤
                                        │ Debit:  WIP          $1,200│
                                        │ Credit: Wages Pay.   $1,200│
                                        │ (48 hrs @ $25/hr)            │
                                        │ Cost Center: Factory A - L1  │
                                        └──────────────────────────────┘
                                                           +
                                        ┌──────────────────────────────┐
                                        │ Overhead Allocation Voucher  │
                                        ├──────────────────────────────┤
                                        │ Debit:  WIP            $800│
                                        │ Credit: Factory OH Appl $800│
                                        │ Cost Center: Factory A - L1  │
                                        └──────────────────────────────┘

                                                    WIP Account
                                        ┌──────────────────────────────┐
                                        │ Previous Balance:    $2,500  │
                                        │ + Labor Cost:        $1,200  │
                                        │ + Overhead:            $800  │
                                        │ = Current WIP:       $4,500  │
                                        └──────────────────────────────┘


Step 6: Work Order Completed
┌──────────────────┐        Event: WORK_ORDER_COMPLETED
│ Complete         │──────────────────────────────────────┐
│ Work Order       │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
        ↓                                       │ Integration Service  │
All production runs done                        │ Create Voucher       │
Calculate total WIP cost                        └──────────────────────┘
                                                           ↓
                                        ┌──────────────────────────────┐
                                        │ Finished Goods Transfer      │
                                        ├──────────────────────────────┤
                                        │ Debit:  Finished Gds  $4,500│
                                        │ Credit: WIP           $4,500│
                                        │ (100 units @ $45/unit)       │
                                        │ Cost Center: Factory A - L1  │
                                        └──────────────────────────────┘

                                                    WIP Account
                                        ┌──────────────────────────────┐
                                        │ Previous Balance:    $4,500  │
                                        │ - Transfer to FG:   ($4,500) │
                                        │ = Current WIP:           $0  │
                                        └──────────────────────────────┘
```

---

## 3. Factory Expenses Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FACTORY EXPENSES FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: Record Factory Expense
┌──────────────────┐
│ Factory Expenses │
│ Page             │
│ Record Expense   │
└──────────────────┘
        ↓
Examples: Rent, Utilities, Maintenance, Supplies


Step 2: Approve Expense
┌──────────────────┐        Event: FACTORY_EXPENSE_APPROVED
│ Approve          │──────────────────────────────────────┐
│ Expense          │                                       ↓
└──────────────────┘                            ┌──────────────────────┐
                                                │ Integration Service  │
                                                │ Create Voucher       │
                                                └──────────────────────┘
                                                           ↓
                                        ┌──────────────────────────────┐
                                        │ Factory Expense Voucher      │
                                        ├──────────────────────────────┤
                                        │ Example: Factory Rent        │
                                        │ Debit:  Factory Rent  $5,000│
                                        │ Credit: Cash/Bank     $5,000│
                                        │ Cost Center: Factory A - OH  │
                                        └──────────────────────────────┘

Note: Same pattern as general expenses module
```

---

## 4. Complete Order-to-Revenue Flow (End-to-End)

### Comprehensive Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE ORDER-TO-REVENUE CYCLE                       │
└─────────────────────────────────────────────────────────────────────────┘

Timeline:         Accounting Impact:                   Account Balances:

Day 1:
Order Approved    ┌─────────────────────────┐          A/R: +$10,000
                  │ Dr. A/R      $10,000   │          Def. Rev: +$10,000
                  │ Cr. Def.Rev  $10,000   │
                  └─────────────────────────┘

Day 2-5:
Materials Used    ┌─────────────────────────┐          Raw Mat: -$2,500
(Day 2)          │ Dr. WIP       $2,500    │          WIP: +$2,500
                  │ Cr. Raw Mat   $2,500    │
                  └─────────────────────────┘

Production        ┌─────────────────────────┐          WIP: +$1,200
Labor (Day 3-4)   │ Dr. WIP       $1,200    │          Wages Pay: +$1,200
                  │ Cr. Wages Pay $1,200    │
                  └─────────────────────────┘

Overhead          ┌─────────────────────────┐          WIP: +$800
(Day 4)          │ Dr. WIP         $800    │          OH Applied: +$800
                  │ Cr. OH Applied  $800    │
                  └─────────────────────────┘

Day 5:
Production Done   ┌─────────────────────────┐          WIP: -$4,500
                  │ Dr. Fin.Gds   $4,500    │          Fin. Goods: +$4,500
                  │ Cr. WIP       $4,500    │
                  └─────────────────────────┘
                             
                             Total WIP Cost:
                             Material: $2,500
                             Labor:    $1,200
                             Overhead:   $800
                             Total:    $4,500

Day 6:
Order Shipped     ┌─────────────────────────┐          Def. Rev: -$10,000
                  │ Dr. Def.Rev  $10,000   │          Revenue: +$10,000
                  │ Cr. Revenue  $10,000   │
                  └─────────────────────────┘
                           +
                  ┌─────────────────────────┐          COGS: +$4,500
                  │ Dr. COGS      $4,500    │          Fin. Goods: -$4,500
                  │ Cr. Fin.Gds   $4,500    │
                  └─────────────────────────┘

Day 30:
Payment Received  ┌─────────────────────────┐          Cash: +$10,000
                  │ Dr. Cash     $10,000   │          A/R: -$10,000
                  │ Cr. A/R      $10,000   │
                  └─────────────────────────┘


═══════════════════════════════════════════════════════════════════════════

FINAL RESULT (Income Statement Impact):

    Revenue:                      $10,000
    Less: Cost of Goods Sold:    ($4,500)
    ────────────────────────────────────
    Gross Profit:                  $5,500    (55% margin)
    
    COGS Breakdown:
      Material Cost:  $2,500  (55.6%)
      Labor Cost:     $1,200  (26.7%)
      Overhead:         $800  (17.7%)
      ──────────────────────
      Total COGS:     $4,500

BALANCE SHEET IMPACT:

    Assets:
      Cash:               +$10,000
      A/R:                     $0  (created then collected)
      Inventory (Raw):    -$2,500
      Inventory (FG):          $0  (created then sold)
      ──────────────────────────
      Net Asset Change:   +$7,500

    Liabilities:
      Wages Payable:      +$1,200  (assuming not yet paid)
      Deferred Revenue:        $0  (created then recognized)
      ──────────────────────────
      Net Liability:      +$1,200

    Equity:
      Retained Earnings:  +$6,300  (Revenue - COGS = $10,000 - $4,500 - OH adj)
      ──────────────────────────

    Balance Check: $7,500 assets = $1,200 liabilities + $6,300 equity ✓
```

---

## 5. Cost Center Allocation

### Cost Center Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COST CENTER ALLOCATION                            │
└─────────────────────────────────────────────────────────────────────────┘

Organization Structure:
┌─────────────────────────────────────────────────────────────────────────┐
│                           ERP SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Factory Module                         Accounts Module                  │
│  ───────────────                        ───────────────                  │
│                                                                           │
│  Factory A (ID: 1)                      Cost Center: CC-001             │
│  ├─ Production Line 1         ────────→ Cost Center: CC-001-L1         │
│  ├─ Production Line 2         ────────→ Cost Center: CC-001-L2         │
│  ├─ Quality Control           ────────→ Cost Center: CC-001-QC         │
│  └─ Factory Overhead          ────────→ Cost Center: CC-001-OH         │
│                                                                           │
│  Factory B (ID: 2)                      Cost Center: CC-002             │
│  ├─ Production Line 1         ────────→ Cost Center: CC-002-L1         │
│  ├─ Production Line 2         ────────→ Cost Center: CC-002-L2         │
│  └─ Factory Overhead          ────────→ Cost Center: CC-002-OH         │
└─────────────────────────────────────────────────────────────────────────┘


Example: Material Consumption on Factory A, Line 1

Factory Module:                          Accounts Module:
┌────────────────────────┐              ┌────────────────────────┐
│ Work Order: WO-000456  │              │ Voucher: JV-005678     │
│ Factory: Factory A     │──maps to───→ │ Cost Center: CC-001-L1 │
│ Production Line: L1    │              │                        │
│                        │              │ Dr. WIP       $2,500   │
│ Material Consumed:     │              │ Cr. Raw Mat   $2,500   │
│ - Steel: $2,500        │              │                        │
└────────────────────────┘              └────────────────────────┘

Cost Center Ledger (CC-001-L1) will show:
┌──────────────────────────────────────────────────────────────┐
│ Date       │ Voucher   │ Description      │ Debit  │ Credit  │
├────────────┼───────────┼──────────────────┼────────┼─────────┤
│ 2025-10-08 │ JV-005678 │ Material - Steel │ $2,500 │   -     │
│ 2025-10-08 │ JV-005679 │ Labor Cost       │ $1,200 │   -     │
│ 2025-10-08 │ JV-005680 │ Overhead Alloc   │   $800 │   -     │
├────────────┴───────────┴──────────────────┼────────┼─────────┤
│ Total Cost for Production Line 1          │ $4,500 │   $0    │
└────────────────────────────────────────────┴────────┴─────────┘
```

---

## 6. Account Mapping Configuration

### Mapping Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ACCOUNT MAPPING SYSTEM                            │
└─────────────────────────────────────────────────────────────────────────┘

Default Accounts (factory_default_accounts table):
┌──────────────────────────────┬─────────────┬─────────────────────────┐
│ Account Type                 │ Account Code│ Account Name            │
├──────────────────────────────┼─────────────┼─────────────────────────┤
│ accounts_receivable          │ 1100        │ Accounts Receivable     │
│ deferred_revenue             │ 2200        │ Deferred Revenue        │
│ sales_revenue                │ 4010        │ Sales Revenue           │
│ raw_materials_inventory      │ 1210        │ Raw Materials Inventory │
│ work_in_progress             │ 1220        │ Work in Progress (WIP)  │
│ finished_goods_inventory     │ 1230        │ Finished Goods Inv.     │
│ cost_of_goods_sold           │ 5010        │ Cost of Goods Sold      │
│ wages_payable                │ 2110        │ Wages Payable           │
│ factory_overhead_applied     │ 5150        │ Factory Overhead Applied│
│ wastage_expense              │ 5140        │ Material Wastage Expense│
│ factory_rent                 │ 5110        │ Factory Rent Expense    │
│ factory_utilities            │ 5120        │ Factory Utilities       │
│ factory_maintenance          │ 5130        │ Factory Maintenance     │
└──────────────────────────────┴─────────────┴─────────────────────────┘

Entity-Specific Mappings (factory_account_mappings table):
┌──────────────┬────────────────────┬─────────────┬──────────────────────┐
│ Entity Type  │ Entity ID          │ Account Code│ Account Name         │
├──────────────┼────────────────────┼─────────────┼──────────────────────┤
│ customer     │ CUST-001           │ 1101        │ A/R - ABC Mfg Ltd    │
│ customer     │ CUST-002           │ 1102        │ A/R - XYZ Industries │
│ material     │ MAT-STEEL-001      │ 1211        │ Inv - Steel Sheets   │
│ material     │ MAT-PLASTIC-001    │ 1212        │ Inv - Plastic Parts  │
│ product      │ PROD-WIDGET-A      │ 1231        │ FG - Widget A        │
│ product      │ PROD-GADGET-B      │ 1232        │ FG - Gadget B        │
│ factory      │ 1                  │ CC-001      │ Factory A (Cost Ctr) │
│ factory      │ 2                  │ CC-002      │ Factory B (Cost Ctr) │
└──────────────┴────────────────────┴─────────────┴──────────────────────┘

Lookup Logic:
┌─────────────────────────────────────────────────────────────────────────┐
│ When creating voucher for material consumption:                         │
│                                                                          │
│ 1. Look for specific mapping: material #50 → account ?                 │
│    → If found: Use mapped account (e.g., 1211)                         │
│    → If not found: Use default (raw_materials_inventory → 1210)        │
│                                                                          │
│ 2. Look for cost center: work_order.factory_id #1 → cost center ?      │
│    → If found: Use mapped cost center (e.g., CC-001)                   │
│    → If not found: Use factory default cost center                      │
│                                                                          │
│ 3. Create voucher with:                                                 │
│    - Debit: WIP (1220)                                                  │
│    - Credit: Found account (1211 or 1210)                               │
│    - Cost Center: CC-001                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Event System Architecture

### Event Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EVENT-DRIVEN ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐         ┌────────────────────┐         ┌──────────────────┐
│ FACTORY MODULE     │         │ EVENT BUS          │         │ ACCOUNTS MODULE  │
│ (Producer)         │         │ (Middleware)       │         │ (Consumer)       │
└────────────────────┘         └────────────────────┘         └──────────────────┘

Step 1: Factory Operation
┌────────────────────────────────────────────────────────────────────────┐
│ UpdateCustomerOrderInfo.mediator.ts                                    │
│                                                                         │
│ async updateOrder(orderId, data, userId) {                            │
│   // ... update order logic ...                                       │
│                                                                         │
│   if (newStatus === 'approved') {                                     │
│     // Emit event                                                      │
│     eventBus.emit(EVENT_NAMES.FACTORY_ORDER_APPROVED, {              │
│       orderData: { ... },                                             │
│       userId: userId                                                   │
│     });                                                                │
│   }                                                                     │
│                                                                         │
│   return order; // Factory operation continues                        │
│ }                                                                       │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Event emitted
                                     ↓
Step 2: Event Bus (Asynchronous)
┌────────────────────────────────────────────────────────────────────────┐
│ utils/eventBus.ts                                                      │
│                                                                         │
│ emit(eventName, payload) {                                            │
│   // Find all registered listeners                                    │
│   this.listeners[eventName].forEach(listener => {                     │
│     // Call listener asynchronously                                   │
│     setImmediate(() => listener(payload));                            │
│   });                                                                   │
│ }                                                                       │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Async call
                                     ↓
Step 3: Integration Service (Listener)
┌────────────────────────────────────────────────────────────────────────┐
│ services/factoryAccountsIntegrationService.ts                         │
│                                                                         │
│ // Registered during module initialization                            │
│ eventBus.on(EVENT_NAMES.FACTORY_ORDER_APPROVED, async (payload) => {  │
│   try {                                                                │
│     if (!isAccountsAvailable()) return; // Optional integration       │
│                                                                         │
│     const result = await createCustomerOrderReceivable(               │
│       payload.orderData,                                              │
│       payload.userId                                                   │
│     );                                                                  │
│                                                                         │
│     if (result.success) {                                             │
│       // Update factory order with voucher ID                         │
│       await updateOrderVoucherReference(result.voucherId);            │
│     }                                                                   │
│   } catch (error) {                                                    │
│     logger.error('Failed to create voucher', error);                  │
│     // Error logged but factory operation already succeeded           │
│   }                                                                     │
│ });                                                                     │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Create voucher
                                     ↓
Step 4: Accounts Module (Voucher Creation)
┌────────────────────────────────────────────────────────────────────────┐
│ modules/accounts/mediators/vouchers/AddVoucher.mediator.ts            │
│                                                                         │
│ async createVoucher(voucherData, userId) {                            │
│   // Validate double-entry (debits = credits)                         │
│   // Insert voucher                                                    │
│   // Insert voucher lines                                              │
│   // Update account balances                                           │
│   // Create audit log                                                  │
│   return voucher;                                                      │
│ }                                                                       │
└────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════

Key Benefits:
✓ Factory operations don't wait for voucher creation
✓ Accounts module is optional (loose coupling)
✓ Errors in voucher creation don't break factory operations
✓ Easy to add new integrations
✓ Clear separation of concerns
```

---

## 8. Error Handling & Retry

### Error Scenarios

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ERROR HANDLING FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

Scenario 1: Accounts Module Not Available
┌────────────────────────────────────────────────────────────────────────┐
│ Factory Operation → Event Emitted → Integration Service                │
│                                         ↓                               │
│                              Check: isAccountsAvailable()?              │
│                                         ↓                               │
│                                        NO                               │
│                                         ↓                               │
│                       Log: "Accounts module not available"             │
│                       Factory operation: ✅ Success                     │
│                       Voucher created: ❌ No                            │
│                       Impact: Manual entry required                     │
└────────────────────────────────────────────────────────────────────────┘


Scenario 2: Account Mapping Not Found
┌────────────────────────────────────────────────────────────────────────┐
│ Integration Service → Get Account for Customer                         │
│                                         ↓                               │
│                       Account mapping not found                         │
│                                         ↓                               │
│                       Try: Get default account                          │
│                                         ↓                               │
│                     Default account exists?                             │
│                                         ↓                               │
│                            YES          │          NO                   │
│                             ↓           │           ↓                   │
│                  Use default account    │   Log error, notify admin     │
│                  Create voucher ✅      │   Voucher not created ❌      │
└────────────────────────────────────────────────────────────────────────┘


Scenario 3: Voucher Creation Fails (Database Error)
┌────────────────────────────────────────────────────────────────────────┐
│ Integration Service → Create Voucher → Database Error                  │
│                                         ↓                               │
│                         Catch error, log details                        │
│                                         ↓                               │
│                       Notify: Finance team (email/alert)                │
│                                         ↓                               │
│                       Store: Failed voucher data in queue               │
│                                         ↓                               │
│                       Retry: Automatic retry (3 attempts)               │
│                                         ↓                               │
│                   Still failing after retries?                          │
│                                         ↓                               │
│                                        YES                              │
│                                         ↓                               │
│               Manual intervention required (finance team)               │
│               Factory operation: ✅ Already succeeded                   │
└────────────────────────────────────────────────────────────────────────┘


Scenario 4: Invalid Accounting Data
┌────────────────────────────────────────────────────────────────────────┐
│ Integration Service → Build Voucher Data                               │
│                                         ↓                               │
│                       Validation: Debits = Credits?                     │
│                                         ↓                               │
│                                        NO                               │
│                                         ↓                               │
│                         Log error with full details                     │
│                                         ↓                               │
│                     Notify: Development team (bug)                      │
│                                         ↓                               │
│               Voucher not created ❌ (prevents bad data)                │
│               Factory operation: ✅ Already succeeded                   │
└────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════

Monitoring & Alerts:
┌────────────────────────────────────────────────────────────────────────┐
│ Daily Report (Finance Team):                                           │
│ ─────────────────────────────────────────────────────────────────────  │
│ • Total factory operations: 150                                        │
│ • Vouchers created successfully: 147 (98%)                             │
│ • Vouchers failed: 3 (2%)                                              │
│   - Mapping not found: 2                                               │
│   - Database error: 1                                                  │
│ • Pending manual intervention: 3                                       │
│                                                                         │
│ Action Required:                                                        │
│ 1. Configure mapping for Customer XYZ (2 orders)                       │
│ 2. Retry failed voucher #12345 (database was down)                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Reconciliation Process

### Daily Reconciliation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DAILY RECONCILIATION PROCESS                      │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: Generate Factory Operations Report
┌────────────────────────────────────────────────────────────────────────┐
│ SELECT FROM factory tables:                                            │
│ - Customer orders approved today                                       │
│ - Material consumptions recorded today                                 │
│ - Material wastage approved today                                      │
│ - Production runs completed today                                      │
│ - Work orders completed today                                          │
│ - Orders shipped today                                                 │
└────────────────────────────────────────────────────────────────────────┘
                                     ↓
Step 2: Generate Vouchers Report
┌────────────────────────────────────────────────────────────────────────┐
│ SELECT FROM vouchers WHERE:                                            │
│ - reference LIKE 'CO-%' (customer orders)                              │
│ - reference LIKE 'WO-%' (work orders)                                  │
│ - reference LIKE 'MC-%' (material consumption)                         │
│ - reference LIKE 'MW-%' (material wastage)                             │
│ - date = today                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                     ↓
Step 3: Match & Compare
┌────────────────────────────────────────────────────────────────────────┐
│ JOIN factory operations with vouchers ON reference                     │
│                                                                         │
│ Check:                                                                  │
│ 1. Every approved order has receivable voucher?                        │
│ 2. Every shipped order has revenue + COGS voucher?                     │
│ 3. Every material consumption has WIP voucher?                         │
│ 4. Every approved wastage has expense voucher?                         │
│ 5. Every completed production run has labor + overhead voucher?        │
│ 6. Every completed work order has finished goods voucher?              │
└────────────────────────────────────────────────────────────────────────┘
                                     ↓
Step 4: Identify Discrepancies
┌────────────────────────────────────────────────────────────────────────┐
│ Missing Vouchers:                                                       │
│ • Order CO-000789: Approved but no A/R voucher                         │
│ • Consumption MC-003456: Recorded but no WIP voucher                   │
│                                                                         │
│ Amount Mismatches:                                                      │
│ • Order CO-000123: Order value $10,000, A/R voucher $9,500 ⚠️         │
│                                                                         │
│ Extra Vouchers:                                                         │
│ • Voucher JV-007890: References WO-999999 (order not found) ⚠️        │
└────────────────────────────────────────────────────────────────────────┘
                                     ↓
Step 5: Investigation & Resolution
┌────────────────────────────────────────────────────────────────────────┐
│ For each discrepancy:                                                   │
│ 1. Check error logs for that transaction                               │
│ 2. Verify data in factory module                                       │
│ 3. Check accounts module for orphaned vouchers                         │
│ 4. Resolve:                                                             │
│    - Retry automatic voucher creation                                   │
│    - Create voucher manually with note                                  │
│    - Correct data entry error                                           │
│    - Investigate system issue                                           │
└────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════

Reconciliation Frequency:
• Daily: Quick check for missing vouchers
• Weekly: Detailed reconciliation with amounts
• Monthly: Full audit before month-end close
```

---

## 10. Performance Considerations

### Optimization Strategies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PERFORMANCE OPTIMIZATION                          │
└─────────────────────────────────────────────────────────────────────────┘

1. Asynchronous Processing
┌────────────────────────────────────────────────────────────────────────┐
│ Factory API Response Time: < 200ms                                     │
│ ├─ Database operations: 150ms                                          │
│ ├─ Event emission: 5ms (non-blocking)                                  │
│ └─ Return to user: 200ms ✅                                            │
│                                                                         │
│ Voucher Creation (background): 300ms                                   │
│ ├─ Account lookup: 50ms                                                │
│ ├─ Cost center lookup: 30ms                                            │
│ ├─ Voucher creation: 200ms                                             │
│ └─ Total: 280ms (user doesn't wait)                                    │
└────────────────────────────────────────────────────────────────────────┘

2. Database Indexing
┌────────────────────────────────────────────────────────────────────────┐
│ Key Indexes:                                                            │
│ • factory_customer_orders(receivable_voucher_id)                       │
│ • work_order_material_consumptions(voucher_id)                         │
│ • vouchers(reference) - for reconciliation                             │
│ • factory_account_mappings(entity_type, entity_id) - for lookups       │
│ • voucher_lines(account_id, cost_center_id) - for reports              │
└────────────────────────────────────────────────────────────────────────┘

3. Caching Strategy
┌────────────────────────────────────────────────────────────────────────┐
│ Cache (Redis):                                                          │
│ • Default account mappings (TTL: 1 hour)                               │
│ • Cost center mappings (TTL: 1 hour)                                   │
│ • Factory configurations (TTL: 1 hour)                                 │
│                                                                         │
│ Cache Invalidation:                                                     │
│ • On account mapping changes                                           │
│ • On cost center changes                                               │
│ • On factory configuration changes                                     │
└────────────────────────────────────────────────────────────────────────┘

4. Batch Processing (Optional)
┌────────────────────────────────────────────────────────────────────────┐
│ For high-volume operations:                                             │
│ • Queue events (Redis Queue)                                           │
│ • Process in batches (e.g., 50 vouchers at once)                       │
│ • Use database transactions for consistency                             │
│ • Reduces database connection overhead                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

**END OF FLOWS DOCUMENT**

---

**Related Documents:**
- `FACTORY_ACCOUNTS_INTEGRATION_PLAN.md` - Full implementation plan
- `FACTORY_ACCOUNTS_INTEGRATION_SUMMARY.md` - Executive summary
- `COST_CENTER_CHART_OF_ACCOUNTS_INTEGRATION.md` - Cost center guidelines

**Version:** 1.0  
**Last Updated:** October 8, 2025  
**Purpose:** Visual reference for developers and finance team

