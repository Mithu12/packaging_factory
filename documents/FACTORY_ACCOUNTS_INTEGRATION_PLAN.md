# Factory-Accounts Module Integration Plan

**Date:** October 8, 2025  
**Status:** Analysis Complete - Ready for Implementation  
**Priority:** HIGH - Critical for accurate financial tracking

---

## Executive Summary

**Current State:** The Factory and Accounts modules operate **completely independently** with ZERO integration. Factory operations (customer orders, production, material consumption, wastage) do not create any accounting entries (vouchers/journal entries).

**Impact:** 
- No automatic financial tracking of factory operations
- Manual reconciliation required between factory data and accounting records
- Inability to track true production costs, WIP (Work in Progress), or cost of goods sold
- No integration between factory cost centers and chart of accounts
- Missing critical financial reports for manufacturing operations

**Integration Status:** 0% - No accounting entries are created for any factory transactions

**Recommendation:** Implement comprehensive integration following the expenses module pattern (event-driven architecture with optional accounts module integration)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Integration Requirements by Module](#2-integration-requirements-by-module)
3. [Detailed Implementation Plan](#3-detailed-implementation-plan)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Testing Strategy](#7-testing-strategy)
8. [Rollout Plan](#8-rollout-plan)

---

## 1. Current State Analysis

### 1.1 Factory Module - Existing Functionality

#### ✅ Fully Implemented (No Accounting Integration):

| Feature | Frontend Page | Backend API | Accounting Impact | Current Status |
|---------|--------------|-------------|-------------------|----------------|
| **Customer Orders** | `CustomerOrderManagement.tsx` | `/api/factory/customer-orders/*` | Should create Accounts Receivable | ❌ No integration |
| **Order Acceptance** | `OrderAcceptance.tsx` | Uses customer orders API | Should record revenue recognition | ❌ No integration |
| **Work Orders** | `WorkOrderPlanning.tsx` | `/api/factory/work-orders/*` | Should track WIP (Work in Progress) | ❌ No integration |
| **BOM Management** | `BOMList.tsx`, `BOMEditor.tsx` | `/api/factory/boms/*` | Should impact cost estimates | ❌ No integration |
| **Material Requirements** | `MaterialRequirementsPlanning.tsx` | Material requirements API | Should track material costs | ❌ No integration |
| **Material Allocation** | `MaterialAllocation.tsx` | ⚠️ Partial API | Should reserve inventory value | ❌ No integration |
| **Material Consumption** | ⚠️ Missing page | ⚠️ Partial API | Should record COGS, update WIP | ❌ No integration |
| **Material Wastage** | `WastageTracking.tsx` | ⚠️ Missing API | Should record wastage expense | ❌ No integration |
| **Production Execution** | `ProductionExecution.tsx` | ⚠️ Partial API | Should track labor costs | ❌ No integration |
| **Factory Expenses** | `FactoryExpenses.tsx` | ❌ No API | Should create expense vouchers | ❌ No integration |
| **Cost Analysis** | `MaterialCostAnalysis.tsx` | ❌ No API | Should pull from accounts | ❌ No integration |
| **Factory Dashboard** | `FactoryDashboard.tsx` | Partial API | Should show financial metrics | ❌ No integration |

### 1.2 Accounts Module - Existing Functionality

#### ✅ Available for Integration:

| Feature | Backend Mediator | Purpose | Integration Ready? |
|---------|-----------------|---------|-------------------|
| **Vouchers** | `AddVoucher.mediator.ts` | Create journal entries | ✅ Yes |
| **Chart of Accounts** | `GetChartOfAccountInfo.mediator.ts` | Query accounts | ✅ Yes |
| **Cost Centers** | `GetCostCenterInfo.mediator.ts` | Track by department/factory | ✅ Yes |
| **Ledger** | `GetLedgerInfo.mediator.ts` | Query transactions | ✅ Yes |

#### Module Registry Pattern (Expenses Integration Reference):
```typescript
// backend/src/services/accountsIntegrationService.ts
- accountsIntegrationService.createExpenseVoucher()
- Event-driven: eventBus.on(EVENT_NAMES.EXPENSE_APPROVED, ...)
- Optional integration (works if accounts module available)
```

### 1.3 Integration Gaps - What's Missing

| Factory Operation | Required Accounting Entry | Current Status | Priority |
|------------------|--------------------------|----------------|----------|
| Customer Order Approved | Create Accounts Receivable (Debit) | ❌ Missing | HIGH |
| Customer Payment Received | Record Cash Receipt | ❌ Missing | HIGH |
| Material Consumption | Debit WIP, Credit Raw Materials Inventory | ❌ Missing | CRITICAL |
| Material Wastage | Debit Wastage Expense, Credit Inventory | ❌ Missing | HIGH |
| Production Complete | Transfer WIP to Finished Goods | ❌ Missing | CRITICAL |
| Finished Goods Shipped | Debit COGS, Credit Finished Goods | ❌ Missing | CRITICAL |
| Factory Overhead | Allocate to Cost Centers, WIP | ❌ Missing | MEDIUM |
| Labor Costs | Debit WIP, Credit Wages Payable | ❌ Missing | MEDIUM |
| Production Downtime | Record as overhead/inefficiency | ❌ Missing | LOW |

---

## 2. Integration Requirements by Module

### 2.1 Customer Orders → Accounts Receivable

**Business Flow:**
1. Customer order created (status: `draft`)
2. Order approved (status: `approved`) → **CREATE INVOICE/RECEIVABLE**
3. Production completed → goods ready to ship
4. Order shipped (status: `shipped`) → **RECOGNIZE REVENUE**
5. Payment received → **RECORD CASH RECEIPT**

**Accounting Entries Required:**

#### Entry 1: On Order Approval (Create Receivable)
```
Debit:  Accounts Receivable (Customer) - $10,000
Credit: Deferred Revenue               - $10,000
Narration: "Customer Order #CO-000123 - ABC Manufacturing Ltd"
```

#### Entry 2: On Order Shipment (Revenue Recognition)
```
Debit:  Deferred Revenue              - $10,000
Credit: Sales Revenue                 - $10,000
Narration: "Revenue recognition for Customer Order #CO-000123"
```

#### Entry 3: On Payment Receipt
```
Debit:  Cash/Bank                     - $10,000
Credit: Accounts Receivable (Customer)- $10,000
Narration: "Payment received for Order #CO-000123"
```

**Data Required:**
- Customer ID → Map to Chart of Accounts (A/R sub-accounts per customer)
- Order total value
- Payment terms
- Factory ID → Cost Center mapping

---

### 2.2 Material Consumption → Work in Progress (WIP)

**Business Flow:**
1. BOM created → defines material requirements
2. Work order created → links to BOM
3. Materials allocated → reserve inventory
4. Materials consumed during production → **MOVE COST TO WIP**
5. Wastage recorded → **EXPENSE WASTAGE**

**Accounting Entries Required:**

#### Entry 1: Material Consumption (Normal)
```
Debit:  Work in Progress (WIP)        - $500
Credit: Raw Materials Inventory       - $500
Narration: "Material consumption for Work Order #WO-000456"
Cost Center: "Factory A - Production Line 1"
```

#### Entry 2: Material Wastage
```
Debit:  Manufacturing Wastage Expense - $50
Credit: Raw Materials Inventory       - $50
Narration: "Material wastage for Work Order #WO-000456 - Reason: Quality defect"
Cost Center: "Factory A - Production Line 1"
```

**Data Required:**
- Material ID → Chart of Accounts mapping (Raw Materials Inventory)
- Consumption quantity × unit cost
- Work Order ID → Cost Center
- Factory ID → Cost Center
- Production Line ID → Sub-cost center

---

### 2.3 Production Runs → Labor & Overhead Costs

**Business Flow:**
1. Production run started
2. Operators clock in → track labor hours
3. Production run completed → **ALLOCATE LABOR COST TO WIP**
4. Downtime recorded → **TRACK OVERHEAD**

**Accounting Entries Required:**

#### Entry 1: Labor Cost Allocation
```
Debit:  Work in Progress (WIP)        - $200
Credit: Wages Payable                 - $200
Narration: "Labor cost for Production Run #PR-001234 - 8 hours @ $25/hr"
Cost Center: "Factory A - Production Line 1"
```

#### Entry 2: Factory Overhead Allocation
```
Debit:  Work in Progress (WIP)        - $150
Credit: Factory Overhead Applied      - $150
Narration: "Overhead allocation for Production Run #PR-001234"
Cost Center: "Factory A - Production Line 1"
```

**Data Required:**
- Operator ID → hourly rate
- Actual hours worked
- Overhead allocation rate (predefined per factory/line)
- Production run ID → Work Order → Cost Center

---

### 2.4 Production Completion → Finished Goods

**Business Flow:**
1. Production run completed
2. Goods inspected and accepted
3. Transfer from WIP to Finished Goods Inventory

**Accounting Entries Required:**

#### Entry: Transfer to Finished Goods
```
Debit:  Finished Goods Inventory      - $850
Credit: Work in Progress (WIP)        - $850
Narration: "Completion of Work Order #WO-000456 - 100 units of Product XYZ"
Cost Center: "Factory A - Production Line 1"
```

**Data Required:**
- Work Order ID → Total accumulated WIP cost
- Product ID → Finished Goods account
- Quantity produced
- Total production cost (materials + labor + overhead)

---

### 2.5 Order Shipment → Cost of Goods Sold (COGS)

**Business Flow:**
1. Customer order shipped
2. Transfer cost from Finished Goods to COGS

**Accounting Entries Required:**

#### Entry: Record COGS
```
Debit:  Cost of Goods Sold            - $850
Credit: Finished Goods Inventory      - $850
Narration: "COGS for Customer Order #CO-000123 - 100 units shipped"
```

**Data Required:**
- Order line items → quantities shipped
- Product costs (from finished goods inventory)
- Customer order ID

---

### 2.6 Factory Expenses → Overhead Accounts

**Business Flow:**
1. Factory expense recorded (rent, utilities, maintenance, etc.)
2. Create expense voucher → **SAME PATTERN AS EXPENSES MODULE**
3. Allocate to cost center

**Accounting Entries Required:**

#### Entry: Factory Expense
```
Debit:  Factory Rent Expense          - $5,000
Credit: Cash/Bank                     - $5,000
Narration: "Monthly rent for Factory A - October 2025"
Cost Center: "Factory A - Overhead"
```

**Data Required:**
- Expense category → Chart of Accounts
- Factory ID → Cost Center
- Amount, date, vendor

---

## 3. Detailed Implementation Plan

### Phase 1: Foundation & Customer Orders Integration (Week 1-2)

#### 3.1.1 Create Factory Accounts Integration Service

**File:** `backend/src/services/factoryAccountsIntegrationService.ts`

**Purpose:** Mirror the expenses integration pattern

**Key Functions:**
```typescript
class FactoryAccountsIntegrationService {
  // Customer Order Integration
  async createCustomerOrderReceivable(orderData: OrderAccountingData, userId: number): Promise<VoucherCreationResult | null>
  async recognizeRevenue(orderData: OrderAccountingData, userId: number): Promise<VoucherCreationResult | null>
  async recordCustomerPayment(paymentData: PaymentAccountingData, userId: number): Promise<VoucherCreationResult | null>
  
  // Material Integration
  async recordMaterialConsumption(consumptionData: MaterialConsumptionAccountingData, userId: number): Promise<VoucherCreationResult | null>
  async recordMaterialWastage(wastageData: WastageAccountingData, userId: number): Promise<VoucherCreationResult | null>
  
  // Production Integration
  async allocateLaborCost(laborData: LaborCostAccountingData, userId: number): Promise<VoucherCreationResult | null>
  async allocateOverhead(overheadData: OverheadAccountingData, userId: number): Promise<VoucherCreationResult | null>
  async transferToFinishedGoods(transferData: FinishedGoodsTransferData, userId: number): Promise<VoucherCreationResult | null>
  async recordCOGS(cogsData: COGSAccountingData, userId: number): Promise<VoucherCreationResult | null>
  
  // Factory Expenses
  async createFactoryExpenseVoucher(expenseData: FactoryExpenseData, userId: number): Promise<VoucherCreationResult | null>
  
  // Helper Functions
  private async getAccountForCustomer(customerId: string): Promise<ChartOfAccount | null>
  private async getAccountForMaterial(materialId: string): Promise<ChartOfAccount | null>
  private async getAccountForProduct(productId: string): Promise<ChartOfAccount | null>
  private async getCostCenterForFactory(factoryId: string): Promise<CostCenter | null>
  private async getCostCenterForWorkOrder(workOrderId: string): Promise<CostCenter | null>
}
```

#### 3.1.2 Create Event Definitions

**File:** `backend/src/utils/eventBus.ts` (update)

**New Events:**
```typescript
export const EVENT_NAMES = {
  // ... existing events ...
  
  // Factory Customer Order Events
  FACTORY_ORDER_APPROVED: 'factory.order.approved',
  FACTORY_ORDER_SHIPPED: 'factory.order.shipped',
  FACTORY_PAYMENT_RECEIVED: 'factory.payment.received',
  
  // Factory Production Events
  MATERIAL_CONSUMED: 'factory.material.consumed',
  MATERIAL_WASTAGE_APPROVED: 'factory.wastage.approved',
  PRODUCTION_RUN_COMPLETED: 'factory.production.completed',
  WORK_ORDER_COMPLETED: 'factory.workorder.completed',
  
  // Factory Expenses
  FACTORY_EXPENSE_APPROVED: 'factory.expense.approved'
};
```

#### 3.1.3 Register Event Listeners

**File:** `backend/src/modules/factory/moduleInit.ts` (update)

**Implementation:**
```typescript
import { registerFactoryAccountingListeners } from '@/services/factoryAccountsIntegrationService';

export const initializeFactoryModule = (): void => {
  try {
    // ... existing factory module registration ...
    
    // Set up optional accounts integration
    registerFactoryAccountingListeners();
    
    MyLogger.success('Factory Module Initialization', {
      module: MODULE_NAMES.FACTORY,
      services: Object.keys(factoryServices),
      accountsIntegration: moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS),
      message: 'Factory module initialized successfully'
    });
  } catch (error) {
    MyLogger.error('Factory Module Initialization', error);
    throw error;
  }
};
```

#### 3.1.4 Update Customer Order Mediator

**File:** `backend/src/modules/factory/mediators/customerOrders/UpdateCustomerOrderInfo.mediator.ts`

**Changes:**
- Add event emission when order status changes to `approved`
- Add event emission when order status changes to `shipped`
- Include all necessary data in event payload

**Example:**
```typescript
// After updating order status to 'approved'
if (newStatus === 'approved' && oldStatus !== 'approved') {
  eventBus.emit(EVENT_NAMES.FACTORY_ORDER_APPROVED, {
    orderData: {
      orderId: order.id,
      orderNumber: order.order_number,
      customerId: order.factory_customer_id,
      customerName: order.factory_customer_name,
      totalValue: order.total_value,
      currency: order.currency,
      orderDate: order.order_date,
      factoryId: order.factory_id,
      lineItems: lineItems // for detailed accounting
    },
    userId: userId
  });
}
```

#### 3.1.5 Frontend - Customer Order Page Updates

**File:** `frontend/src/modules/factory/pages/CustomerOrderManagement.tsx`

**Changes:**
- Add UI indicator showing accounting integration status
- Display voucher number if created
- Add link to view related voucher in accounts module
- Show accounting status badge (e.g., "Voucher Created", "Revenue Recognized")

---

### Phase 2: Material Consumption & Wastage Integration (Week 3-4)

#### 3.2.1 Complete Material Consumption Backend

**Files:**
- `backend/src/modules/factory/mediators/materialConsumptions/AddMaterialConsumption.mediator.ts`
- `backend/src/modules/factory/controllers/materialConsumptions.controller.ts`
- `backend/src/modules/factory/routes/materialConsumptions.routes.ts`

**Key Logic:**
```typescript
// In AddMaterialConsumption.mediator.ts
async recordConsumption(data: MaterialConsumptionRequest): Promise<MaterialConsumption> {
  // 1. Validate work order, material, allocation
  // 2. Insert consumption record
  // 3. Update inventory (current_stock, reserved_stock)
  // 4. Update work order material requirements
  // 5. Emit event for accounting integration
  
  eventBus.emit(EVENT_NAMES.MATERIAL_CONSUMED, {
    consumptionData: {
      consumptionId: consumption.id,
      workOrderId: data.work_order_id,
      materialId: data.material_id,
      materialName: data.material_name,
      quantity: data.consumed_quantity,
      unitCost: materialUnitCost,
      totalCost: data.consumed_quantity * materialUnitCost,
      factoryId: workOrder.factory_id,
      productionLineId: data.production_line_id,
      consumptionDate: new Date()
    },
    userId: userId
  });
  
  return consumption;
}
```

#### 3.2.2 Complete Wastage Backend

**Files:**
- `backend/src/modules/factory/mediators/wastage/MaterialWastageMediator.ts`
- `backend/src/modules/factory/controllers/wastage.controller.ts`
- `backend/src/modules/factory/routes/wastage.routes.ts`

**Key Logic:**
```typescript
// In MaterialWastageMediator.ts
async approveWastage(wastageId: string, userId: number): Promise<MaterialWastage> {
  // 1. Update wastage status to 'approved'
  // 2. Update inventory (reduce current_stock)
  // 3. Emit event for accounting
  
  eventBus.emit(EVENT_NAMES.MATERIAL_WASTAGE_APPROVED, {
    wastageData: {
      wastageId: wastage.id,
      workOrderId: wastage.work_order_id,
      materialId: wastage.material_id,
      materialName: wastage.material_name,
      quantity: wastage.quantity,
      unitCost: materialUnitCost,
      totalCost: wastage.cost,
      reason: wastage.wastage_reason,
      factoryId: workOrder.factory_id,
      approvedBy: userId,
      approvedDate: new Date()
    },
    userId: userId
  });
  
  return wastage;
}
```

#### 3.2.3 Frontend - Material Consumption Page

**Create:** `frontend/src/modules/factory/pages/MaterialConsumption.tsx`

**Features:**
- Record material consumption during production
- Link to work orders and material allocations
- Show real-time inventory updates
- Display accounting voucher status
- Integrate with barcode scanning (future)

#### 3.2.4 Frontend - Wastage Tracking Updates

**File:** `frontend/src/modules/factory/pages/WastageTracking.tsx`

**Changes:**
- Connect to backend API (remove mock data)
- Add approval workflow UI
- Show accounting voucher created on approval
- Link to voucher details

---

### Phase 3: Production Execution & WIP Tracking (Week 5-6)

#### 3.3.1 Complete Production Runs Backend

**Files:**
- `backend/src/modules/factory/mediators/productionExecution/UpdateProductionRunStatus.mediator.ts`
- `backend/src/modules/factory/controllers/productionExecution.controller.ts`

**Key Logic:**
```typescript
// When production run is completed
async completeProductionRun(runId: string, userId: number): Promise<ProductionRun> {
  // 1. Update run status to 'completed'
  // 2. Calculate actual labor cost (hours × operator rate)
  // 3. Calculate overhead allocation
  // 4. Update work order progress
  // 5. Emit events for accounting
  
  // Event 1: Labor Cost
  eventBus.emit(EVENT_NAMES.PRODUCTION_RUN_COMPLETED, {
    laborData: {
      productionRunId: run.id,
      workOrderId: run.work_order_id,
      operatorId: run.operator_id,
      hoursWorked: actualHours,
      hourlyRate: operator.hourly_rate,
      totalLaborCost: actualHours * operator.hourly_rate,
      factoryId: workOrder.factory_id,
      productionLineId: run.production_line_id
    },
    overheadData: {
      productionRunId: run.id,
      workOrderId: run.work_order_id,
      overheadRate: factoryOverheadRate,
      totalOverhead: overheadAllocation,
      factoryId: workOrder.factory_id
    },
    userId: userId
  });
  
  return run;
}
```

#### 3.3.2 Work Order Completion → Finished Goods

**File:** `backend/src/modules/factory/mediators/workOrders/UpdateWorkOrder.mediator.ts`

**Key Logic:**
```typescript
// When work order status changes to 'completed'
async completeWorkOrder(workOrderId: string, userId: number): Promise<WorkOrder> {
  // 1. Validate all material consumed, production runs complete
  // 2. Calculate total WIP cost:
  //    - Sum of material consumption costs
  //    - Sum of labor costs
  //    - Sum of overhead allocations
  // 3. Update work order status to 'completed'
  // 4. Emit event to transfer to finished goods
  
  const totalWIPCost = await calculateTotalWIPCost(workOrderId);
  
  eventBus.emit(EVENT_NAMES.WORK_ORDER_COMPLETED, {
    finishedGoodsData: {
      workOrderId: workOrder.id,
      productId: workOrder.product_id,
      productName: workOrder.product_name,
      quantity: workOrder.quantity,
      totalCost: totalWIPCost,
      unitCost: totalWIPCost / workOrder.quantity,
      factoryId: workOrder.factory_id,
      completionDate: new Date()
    },
    userId: userId
  });
  
  return workOrder;
}
```

#### 3.3.3 Frontend - Production Execution Updates

**File:** `frontend/src/modules/factory/pages/ProductionExecution.tsx`

**Changes:**
- Connect to backend API
- Real-time production tracking
- Show accumulated WIP costs
- Display labor cost calculations
- Show overhead allocations
- Link to accounting vouchers

---

### Phase 4: Order Shipment & COGS Recognition (Week 7)

#### 3.4.1 Update Customer Order Shipment Logic

**File:** `backend/src/modules/factory/mediators/customerOrders/UpdateCustomerOrderInfo.mediator.ts`

**Key Logic:**
```typescript
// When order status changes to 'shipped'
if (newStatus === 'shipped' && oldStatus !== 'shipped') {
  // 1. Calculate COGS from line items
  const cogsData = await calculateCOGS(order.id);
  
  // Event 1: Revenue Recognition
  eventBus.emit(EVENT_NAMES.FACTORY_ORDER_SHIPPED, {
    revenueData: {
      orderId: order.id,
      orderNumber: order.order_number,
      customerId: order.factory_customer_id,
      totalRevenue: order.total_value,
      currency: order.currency,
      shipmentDate: new Date()
    },
    cogsData: {
      orderId: order.id,
      lineItems: cogsData.lineItems, // [{productId, quantity, unitCost, totalCost}]
      totalCOGS: cogsData.totalCOGS
    },
    userId: userId
  });
}
```

---

### Phase 5: Cost Center Integration & Reporting (Week 8)

#### 3.5.1 Cost Center Mapping

**Database Enhancement:**
```sql
-- Add cost_center_id to factory tables
ALTER TABLE factories ADD COLUMN cost_center_id INTEGER REFERENCES cost_centers(id);
ALTER TABLE production_lines ADD COLUMN cost_center_id INTEGER REFERENCES cost_centers(id);
```

**Mapping Logic:**
- Each factory → maps to a cost center
- Each production line → maps to a sub-cost center
- All vouchers tagged with appropriate cost center

#### 3.5.2 Create Account Mapping Tables

**Migration:** `V30_add_factory_account_mappings.sql`

```sql
-- Map factory entities to chart of accounts
CREATE TABLE factory_account_mappings (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'customer', 'material', 'product', 'factory', 'expense_category'
  )),
  entity_id VARCHAR(100) NOT NULL,
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  UNIQUE(entity_type, entity_id, account_id)
);

CREATE INDEX idx_factory_account_mappings_entity ON factory_account_mappings(entity_type, entity_id);
CREATE INDEX idx_factory_account_mappings_account ON factory_account_mappings(account_id);

-- Default account configurations
CREATE TABLE factory_default_accounts (
  id SERIAL PRIMARY KEY,
  account_type VARCHAR(50) NOT NULL UNIQUE CHECK (account_type IN (
    'accounts_receivable',
    'deferred_revenue',
    'sales_revenue',
    'raw_materials_inventory',
    'work_in_progress',
    'finished_goods_inventory',
    'cost_of_goods_sold',
    'wages_payable',
    'factory_overhead_applied',
    'wastage_expense',
    'factory_rent',
    'factory_utilities',
    'factory_maintenance'
  )),
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.5.3 Frontend - Account Mapping Configuration

**Create:** `frontend/src/modules/factory/pages/FactoryAccountingConfig.tsx`

**Features:**
- Configure default accounts for factory operations
- Map customers to A/R sub-accounts
- Map materials to inventory accounts
- Map products to finished goods accounts
- Map factories to cost centers
- Test voucher creation

---

### Phase 6: Factory Expenses Integration (Week 9)

#### 3.6.1 Create Factory Expense Backend

**Files:**
- `backend/src/modules/factory/mediators/expenses/FactoryExpenseMediator.ts`
- `backend/src/modules/factory/controllers/factoryExpenses.controller.ts`
- `backend/src/modules/factory/routes/factoryExpenses.routes.ts`

**Key Logic:** Follow exact same pattern as expenses module

#### 3.6.2 Frontend - Factory Expenses Updates

**File:** `frontend/src/modules/factory/pages/FactoryExpenses.tsx`

**Changes:**
- Connect to backend API
- Integrate with accounts voucher creation
- Show voucher status and links
- Filter by factory and cost center

---

### Phase 7: Reporting & Analytics (Week 10)

#### 3.7.1 Factory Cost Reports

**Backend:**
- Create cost analysis endpoints that query vouchers
- WIP report (sum of vouchers tagged to WIP account)
- COGS report (sum of vouchers tagged to COGS account)
- Variance analysis (planned vs actual costs)

**Frontend:**
- Update `MaterialCostAnalysis.tsx` to pull from accounts
- Add production cost variance reports
- Add profitability analysis per order/product

#### 3.7.2 Dashboard Integration

**File:** `frontend/src/modules/factory/pages/FactoryDashboard.tsx`

**New Metrics:**
- Total WIP value (from accounts)
- Total finished goods value
- Month-to-date COGS
- Month-to-date revenue
- Gross margin percentage
- Cost variance percentage

---

## 4. Database Schema Changes

### 4.1 Required Migrations

#### Migration V29: Add Cost Center to Factories
```sql
-- Link factories to cost centers
ALTER TABLE factories 
ADD COLUMN cost_center_id INTEGER REFERENCES cost_centers(id);

COMMENT ON COLUMN factories.cost_center_id IS 'Primary cost center for tracking factory expenses and overhead';
```

#### Migration V30: Factory Account Mappings
```sql
-- See section 3.5.2 above for full schema
```

#### Migration V31: Add Voucher Reference to Factory Tables
```sql
-- Track which vouchers were created for each transaction
ALTER TABLE factory_customer_orders
ADD COLUMN receivable_voucher_id INTEGER REFERENCES vouchers(id),
ADD COLUMN revenue_voucher_id INTEGER REFERENCES vouchers(id),
ADD COLUMN cogs_voucher_id INTEGER REFERENCES vouchers(id);

ALTER TABLE work_order_material_consumptions
ADD COLUMN voucher_id INTEGER REFERENCES vouchers(id);

ALTER TABLE material_wastage
ADD COLUMN voucher_id INTEGER REFERENCES vouchers(id);

ALTER TABLE production_runs
ADD COLUMN labor_voucher_id INTEGER REFERENCES vouchers(id),
ADD COLUMN overhead_voucher_id INTEGER REFERENCES vouchers(id);

ALTER TABLE work_orders
ADD COLUMN finished_goods_voucher_id INTEGER REFERENCES vouchers(id);
```

#### Migration V32: Add Cost Center to Production Lines
```sql
ALTER TABLE production_lines
ADD COLUMN cost_center_id INTEGER REFERENCES cost_centers(id);

COMMENT ON COLUMN production_lines.cost_center_id IS 'Sub-cost center for tracking line-specific costs';
```

---

## 5. Backend Implementation

### 5.1 File Structure

```
backend/src/
├── services/
│   └── factoryAccountsIntegrationService.ts  [NEW]
├── modules/
│   └── factory/
│       ├── mediators/
│       │   ├── materialConsumptions/
│       │   │   ├── AddMaterialConsumption.mediator.ts [UPDATE - Add events]
│       │   │   └── GetMaterialConsumptionInfo.mediator.ts
│       │   ├── wastage/
│       │   │   └── MaterialWastageMediator.ts [UPDATE - Add events]
│       │   ├── productionExecution/
│       │   │   ├── AddProductionRun.mediator.ts
│       │   │   └── UpdateProductionRunStatus.mediator.ts [UPDATE - Add events]
│       │   ├── customerOrders/
│       │   │   └── UpdateCustomerOrderInfo.mediator.ts [UPDATE - Add events]
│       │   ├── workOrders/
│       │   │   └── UpdateWorkOrder.mediator.ts [UPDATE - Add events]
│       │   ├── expenses/
│       │   │   └── FactoryExpenseMediator.ts [NEW]
│       │   └── accountMapping/
│       │       ├── FactoryAccountMappingMediator.ts [NEW]
│       │       └── GetFactoryAccountMappingInfo.mediator.ts [NEW]
│       ├── controllers/
│       │   ├── materialConsumptions.controller.ts [UPDATE]
│       │   ├── wastage.controller.ts [NEW]
│       │   ├── factoryExpenses.controller.ts [NEW]
│       │   └── accountMapping.controller.ts [NEW]
│       ├── routes/
│       │   ├── materialConsumptions.routes.ts [UPDATE]
│       │   ├── wastage.routes.ts [NEW]
│       │   ├── factoryExpenses.routes.ts [NEW]
│       │   └── accountMapping.routes.ts [NEW]
│       └── moduleInit.ts [UPDATE - Add event listeners]
└── utils/
    └── eventBus.ts [UPDATE - Add factory events]
```

### 5.2 Core Integration Service Implementation

**Key Responsibilities:**
1. Check if accounts module is available
2. Get appropriate chart of accounts for each transaction type
3. Get cost centers for factory/production line
4. Build voucher data with correct debit/credit entries
5. Create vouchers via accounts module mediators
6. Handle errors gracefully (optional integration)
7. Log all integration attempts

### 5.3 Event Listener Registration

**Pattern:** Mirror expenses module exactly
- Register listeners in factory module init
- Check accounts module availability
- Emit events from mediators after successful operations
- Handle events asynchronously to not block factory operations

---

## 6. Frontend Implementation

### 6.1 New Pages Required

| Page | Purpose | Priority | Estimated Effort |
|------|---------|----------|------------------|
| `MaterialConsumption.tsx` | Record material usage during production | HIGH | 2 days |
| `FactoryAccountingConfig.tsx` | Configure account mappings | HIGH | 3 days |
| Factory Expenses (update) | Complete expenses page | MEDIUM | 2 days |

### 6.2 Updates to Existing Pages

| Page | Changes Required | Estimated Effort |
|------|-----------------|------------------|
| `CustomerOrderManagement.tsx` | Add voucher status, links to accounting | 1 day |
| `WastageTracking.tsx` | Connect to API, show voucher info | 1 day |
| `ProductionExecution.tsx` | Show cost accumulation, voucher links | 2 days |
| `MaterialCostAnalysis.tsx` | Pull actual costs from accounts | 2 days |
| `FactoryDashboard.tsx` | Add financial metrics | 1 day |

### 6.3 Shared Components

**Create:** `frontend/src/modules/factory/components/AccountingStatusBadge.tsx`
```tsx
interface AccountingStatusBadgeProps {
  voucherId?: number;
  voucherNo?: string;
  status: 'pending' | 'created' | 'failed' | 'not_integrated';
}

// Shows accounting integration status with link to voucher
```

**Create:** `frontend/src/modules/factory/components/VoucherLink.tsx`
```tsx
// Component that links to voucher details in accounts module
```

### 6.4 API Services

**Update/Create:**
- `frontend/src/modules/factory/services/material-consumptions-api.ts` [NEW]
- `frontend/src/modules/factory/services/wastage-api.ts` [NEW]
- `frontend/src/modules/factory/services/factory-expenses-api.ts` [NEW]
- `frontend/src/modules/factory/services/account-mapping-api.ts` [NEW]

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Backend:**
- `factoryAccountsIntegrationService.test.ts` - All integration methods
- Material consumption mediator tests
- Wastage mediator tests
- Production run mediator tests
- Account mapping tests

**Frontend:**
- Component tests for new accounting-related components
- API service tests

### 7.2 Integration Tests

**Critical Flows:**
1. **Order to Revenue:**
   - Create order → Approve → Check voucher created
   - Ship order → Check revenue recognized
   - Record payment → Check cash receipt voucher

2. **Material to WIP:**
   - Consume material → Check WIP voucher created
   - Record wastage → Check expense voucher created
   - Complete production → Check finished goods transfer

3. **Full Order Lifecycle:**
   - Create order → Work order → Consume materials → Complete production → Ship order
   - Verify all vouchers created correctly
   - Verify account balances updated

### 7.3 E2E Tests

**Scenarios:**
1. Complete manufacturing cycle with accounting
2. Material shortage → Purchase → Consume → Verify costs
3. Multi-factory scenario with cost center segregation
4. Order with returns/cancellations

### 7.4 Manual Testing Checklist

- [ ] Configure default accounts
- [ ] Map factories to cost centers
- [ ] Create and approve customer order → Verify A/R voucher
- [ ] Consume materials → Verify WIP voucher
- [ ] Record wastage → Verify expense voucher
- [ ] Complete production → Verify finished goods transfer
- [ ] Ship order → Verify revenue and COGS vouchers
- [ ] View factory dashboard with financial metrics
- [ ] Run cost variance reports
- [ ] Test with accounts module disabled (optional integration)

---

## 8. Rollout Plan

### 8.1 Pre-Implementation (Week 0)

**Tasks:**
- Review and approve this implementation plan
- Set up development branches
- Create test factory environment
- Set up test chart of accounts structure
- Create test cost centers

**Deliverables:**
- Approved implementation plan
- Test environment ready
- Test data populated

### 8.2 Phase 1 Rollout: Customer Orders (Week 1-2)

**Implementation:**
1. Create factoryAccountsIntegrationService.ts
2. Add event definitions
3. Update customer order mediator
4. Register event listeners
5. Update frontend customer order page

**Testing:**
- Unit tests for integration service
- Integration tests for order approval → voucher creation
- Manual testing in development

**Success Criteria:**
- Vouchers created automatically on order approval
- Revenue recognized on shipment
- No errors in production-like environment

### 8.3 Phase 2 Rollout: Material Consumption (Week 3-4)

**Implementation:**
1. Complete material consumption backend
2. Complete wastage backend
3. Add event listeners
4. Create material consumption frontend page
5. Update wastage tracking page

**Testing:**
- Integration tests for consumption → WIP voucher
- Integration tests for wastage → expense voucher
- E2E test: Material requisition → Consumption

**Success Criteria:**
- Material consumption creates WIP vouchers
- Wastage approval creates expense vouchers
- Inventory correctly updated
- Cost tracking accurate

### 8.4 Phase 3 Rollout: Production Execution (Week 5-6)

**Implementation:**
1. Complete production runs backend
2. Add labor cost allocation
3. Add overhead allocation
4. Update work order completion logic
5. Update production execution frontend

**Testing:**
- Integration tests for production run completion
- Integration tests for work order → finished goods
- Cost accumulation tests

**Success Criteria:**
- Labor costs allocated to WIP
- Overhead allocated to WIP
- Finished goods transfer vouchers created
- Total WIP costs match sum of vouchers

### 8.5 Phase 4 Rollout: Order Shipment & COGS (Week 7)

**Implementation:**
1. Update order shipment logic
2. Add COGS calculation
3. Add revenue recognition
4. Update frontend order management

**Testing:**
- Integration tests for shipment → COGS
- Profitability calculation tests

**Success Criteria:**
- Revenue recognized on shipment
- COGS calculated and recorded
- Gross margin tracking works

### 8.6 Phase 5-7 Rollout: Cost Centers, Expenses, Reporting (Week 8-10)

**Implementation:**
1. Add cost center mappings
2. Create account mapping configuration
3. Complete factory expenses
4. Build cost reports
5. Update dashboard

**Testing:**
- Cost center segregation tests
- Reporting accuracy tests
- Dashboard performance tests

**Success Criteria:**
- Costs properly allocated to cost centers
- Reports show accurate data
- Dashboard loads < 2 seconds

### 8.7 Production Deployment (Week 11)

**Steps:**
1. **Code freeze** - No new features
2. **Final testing** - Run full test suite
3. **Database migration** - Run all new migrations in production
4. **Backend deployment** - Deploy factory module updates
5. **Frontend deployment** - Deploy UI updates
6. **Configuration** - Set up default accounts and mappings
7. **User training** - Train factory and finance staff
8. **Monitoring** - Watch for errors and performance issues
9. **Support** - Provide dedicated support for first week

**Rollback Plan:**
- Keep previous deployment ready
- Database migration rollback scripts
- Feature flag to disable accounting integration

### 8.8 Post-Deployment (Week 12+)

**Week 1:**
- Monitor error logs daily
- Collect user feedback
- Fix critical bugs immediately
- Document any issues

**Week 2-4:**
- Analyze data integrity
- Verify all vouchers created correctly
- Run financial reconciliation
- Optimize performance if needed

**Month 2:**
- Gather feedback from finance team
- Iterate on reports based on needs
- Add requested features
- Document best practices

---

## 9. Success Metrics

### 9.1 Technical Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Voucher creation success rate | > 99% | Count successful vs failed voucher creations |
| Integration latency | < 500ms | Time from event emission to voucher creation |
| API response times | < 500ms | Backend API monitoring |
| Zero accounting errors | 0 | Monitor error logs, validate double-entry |
| Test coverage | > 85% | Jest/testing framework reports |

### 9.2 Business Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Financial data accuracy | 100% | Manual reconciliation vs automated |
| Time saved on manual entry | > 20 hours/week | Finance team survey |
| Cost visibility | 100% of operations tracked | Audit factory vs accounts data |
| User adoption | > 90% | Usage analytics |
| Finance team satisfaction | > 8/10 | User survey |

### 9.3 Operational Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| WIP accuracy | ± 2% | Compare system WIP to physical count |
| Inventory accuracy | ± 1% | Compare system inventory to physical |
| Cost variance tracking | 100% of work orders | Audit work order costs |
| COGS accuracy | 100% | Compare system COGS to manual calculation |
| Revenue recognition timing | Same-day | Audit order shipment to revenue voucher |

---

## 10. Risks & Mitigation

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Double-entry errors** | Medium | CRITICAL | - Extensive testing<br>- Validation logic<br>- Audit trails |
| **Performance degradation** | Medium | HIGH | - Async event processing<br>- Database indexing<br>- Caching |
| **Data integrity issues** | Low | CRITICAL | - Transactions<br>- Constraints<br>- Validation |
| **Complex mapping logic** | High | MEDIUM | - Clear documentation<br>- Configuration UI<br>- Default mappings |
| **Event processing failures** | Medium | HIGH | - Retry mechanism<br>- Dead letter queue<br>- Monitoring |

### 10.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **User resistance** | Medium | MEDIUM | - Training<br>- Change management<br>- Clear benefits communication |
| **Incorrect cost allocation** | Medium | HIGH | - Finance team review<br>- Validation reports<br>- Iterative refinement |
| **Accounting policy conflicts** | Low | HIGH | - Early finance team involvement<br>- Flexible configuration |
| **Integration complexity** | High | MEDIUM | - Phased rollout<br>- Optional integration<br>- Fallback to manual |

### 10.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Incomplete data migration** | Low | HIGH | - Data validation scripts<br>- Test migrations<br>- Rollback plan |
| **Training gaps** | Medium | MEDIUM | - Comprehensive training<br>- Documentation<br>- Support team |
| **Process changes** | High | MEDIUM | - Process documentation<br>- Stakeholder involvement<br>- Gradual transition |

---

## 11. Dependencies & Prerequisites

### 11.1 Technical Dependencies

- ✅ Accounts module fully functional (vouchers, chart of accounts, cost centers)
- ✅ Factory module core features complete (customer orders, work orders, BOMs)
- ⚠️ Material consumption backend (partially complete)
- ⚠️ Material wastage backend (needs completion)
- ⚠️ Production execution backend (partially complete)
- ✅ Event bus system
- ✅ Module registry system

### 11.2 Data Prerequisites

- Chart of accounts properly configured with:
  - Accounts Receivable parent account
  - Revenue accounts (sales revenue, deferred revenue)
  - Inventory accounts (raw materials, WIP, finished goods)
  - Expense accounts (COGS, wastage, labor, overhead)
  - Asset accounts (cash/bank)
- Cost centers created for:
  - Each factory
  - Each production line (optional sub-cost centers)
  - Factory overhead
- Product costs configured (for COGS calculation)
- Operator hourly rates configured (for labor costing)
- Factory overhead rates defined

### 11.3 Team Prerequisites

- Backend developer (full-time, 10 weeks)
- Frontend developer (full-time, 10 weeks)
- QA engineer (part-time, testing each phase)
- Finance team liaison (part-time, configuration and validation)
- DevOps support (deployment and monitoring)

---

## 12. Documentation Requirements

### 12.1 Technical Documentation

- [ ] API documentation (OpenAPI/Swagger) for new endpoints
- [ ] Database schema documentation (migrations)
- [ ] Event system documentation (event names, payloads)
- [ ] Integration service documentation (methods, flows)
- [ ] Account mapping logic documentation
- [ ] Cost calculation algorithms documentation

### 12.2 User Documentation

- [ ] Factory accounting configuration guide
- [ ] Account mapping guide (how to map entities to accounts)
- [ ] Cost center setup guide
- [ ] Factory operations guide (with accounting implications)
- [ ] Troubleshooting guide (common issues)
- [ ] FAQ

### 12.3 Process Documentation

- [ ] Order-to-cash process with accounting
- [ ] Purchase-to-pay process (if applicable)
- [ ] Production costing process
- [ ] Month-end close process
- [ ] Reconciliation process
- [ ] Audit trail process

---

## 13. Training Plan

### 13.1 Finance Team Training (2 sessions, 2 hours each)

**Session 1: Overview & Configuration**
- Integration overview and benefits
- How factory operations create vouchers
- Configuring default accounts
- Mapping entities to chart of accounts
- Configuring cost centers

**Session 2: Operations & Reconciliation**
- Reviewing auto-generated vouchers
- Reconciliation process
- Variance analysis
- Troubleshooting common issues
- Month-end procedures

### 13.2 Factory Team Training (2 sessions, 1.5 hours each)

**Session 1: Understanding Accounting Impact**
- Overview of integration
- How their actions create accounting entries
- Understanding voucher status indicators
- When to check with finance team

**Session 2: New Features & Workflows**
- Recording material consumption
- Approving wastage (with accounting impact)
- Completing production runs
- Viewing cost information

### 13.3 Admin/IT Training (1 session, 3 hours)

**Session: System Administration**
- Architecture overview
- Event system operation
- Monitoring and troubleshooting
- Error handling and recovery
- Performance tuning
- Backup and disaster recovery

---

## 14. Cost-Benefit Analysis

### 14.1 Implementation Costs

| Item | Cost Estimate |
|------|--------------|
| Development (2 developers × 10 weeks) | ~$40,000 |
| QA/Testing | ~$8,000 |
| Project management | ~$5,000 |
| Training | ~$2,000 |
| Documentation | ~$3,000 |
| **Total Implementation Cost** | **~$58,000** |

### 14.2 Annual Benefits

| Benefit | Estimated Savings/Value |
|---------|------------------------|
| Reduced manual data entry (Finance team: 20 hrs/week × 52 weeks) | ~$52,000/year |
| Reduced errors and rework | ~$10,000/year |
| Faster month-end close (2 days saved × 12 months) | ~$15,000/year |
| Better cost visibility → improved pricing | ~$25,000/year (conservative) |
| Improved decision-making | Intangible |
| Audit readiness | Intangible |
| **Total Annual Benefit** | **~$102,000/year** |

### 14.3 ROI Calculation

- **Payback Period:** ~7 months
- **5-Year ROI:** ~780%
- **NPV (5 years, 10% discount):** ~$300,000+

### 14.4 Intangible Benefits

- Real-time financial visibility
- Improved financial controls
- Better compliance and audit trail
- Faster decision-making with accurate data
- Scalability for future growth
- Competitive advantage

---

## 15. Conclusion & Recommendations

### 15.1 Summary

The Factory-Accounts integration is **critical for accurate financial tracking** and represents a **significant gap** in the current ERP system. Without this integration:
- Financial data is incomplete and inaccurate
- Manual reconciliation is time-consuming and error-prone
- True production costs are unknown
- Decision-making is impaired

The integration follows **proven patterns** (expenses module) and can be implemented **incrementally with low risk** using an event-driven architecture.

### 15.2 Immediate Recommendations

1. **APPROVE implementation plan** - Begin Phase 1 immediately
2. **Assign development resources** - 2 full-stack developers for 10 weeks
3. **Engage finance team early** - Critical for configuration and validation
4. **Set up test environment** - Before any code changes
5. **Create rollback plan** - Ensure safe deployment

### 15.3 Critical Success Factors

1. **Finance team involvement** - Must be engaged throughout
2. **Phased rollout** - Don't try to do everything at once
3. **Thorough testing** - Especially integration tests
4. **Clear documentation** - Both technical and user-facing
5. **Adequate training** - Don't underestimate change management

### 15.4 Long-Term Vision

Once this integration is complete, the ERP system will have:
- **Complete financial visibility** - All operations automatically tracked
- **Real-time costing** - Know costs as they happen
- **Integrated reporting** - Factory and financial data unified
- **Audit-ready processes** - Full trail of all transactions
- **Scalability** - Foundation for advanced features (predictive costing, margin analysis, etc.)

### 15.5 Next Steps

1. Review and approve this plan with stakeholders
2. Secure development resources
3. Schedule kickoff meeting with all teams
4. Set up development and test environments
5. Begin Phase 1 implementation (Customer Orders Integration)

---

**Document Version:** 1.0  
**Last Updated:** October 8, 2025  
**Next Review:** After Phase 1 completion (estimated 2 weeks)  
**Document Owner:** Development Team  
**Reviewers:** Finance Team, Factory Operations Team, IT Leadership

**Status:** ✅ READY FOR IMPLEMENTATION

---

## Appendix A: Account Structure Recommendations

### Recommended Chart of Accounts Structure for Factory Operations

```
Assets
├── Current Assets
│   ├── Cash and Bank (1000-1099)
│   ├── Accounts Receivable (1100-1199)
│   │   ├── A/R - Customer A (1101)
│   │   ├── A/R - Customer B (1102)
│   │   └── ...
│   └── Inventory (1200-1299)
│       ├── Raw Materials Inventory (1210)
│       ├── Work in Progress (WIP) (1220)
│       └── Finished Goods Inventory (1230)

Liabilities
├── Current Liabilities
│   ├── Accounts Payable (2000-2099)
│   ├── Wages Payable (2100-2199)
│   └── Deferred Revenue (2200-2299)

Equity
├── Retained Earnings (3000-3099)

Revenue
├── Sales Revenue (4000-4099)
│   ├── Product Sales Revenue (4010)
│   └── Service Revenue (4020)

Expenses
├── Cost of Goods Sold (5000-5099)
│   ├── Direct Materials (5010)
│   ├── Direct Labor (5020)
│   └── Manufacturing Overhead (5030)
├── Manufacturing Expenses (5100-5199)
│   ├── Factory Rent (5110)
│   ├── Factory Utilities (5120)
│   ├── Factory Maintenance (5130)
│   ├── Material Wastage (5140)
│   └── Factory Overhead Applied (5150) [Contra account]
```

---

## Appendix B: Cost Center Structure Recommendations

```
Cost Centers
├── Factory A (CC-001)
│   ├── Factory A - Production Line 1 (CC-001-01)
│   ├── Factory A - Production Line 2 (CC-001-02)
│   ├── Factory A - Quality Control (CC-001-QC)
│   └── Factory A - Overhead (CC-001-OH)
├── Factory B (CC-002)
│   ├── Factory B - Production Line 1 (CC-002-01)
│   ├── Factory B - Production Line 2 (CC-002-02)
│   └── Factory B - Overhead (CC-002-OH)
└── Corporate Manufacturing (CC-999)
```

---

## Appendix C: Sample Voucher Formats

### Customer Order Approval Voucher

```
Voucher Type: Journal Entry
Date: 2025-10-08
Reference: CO-000123
Description: Customer Order Receivable - ABC Manufacturing Ltd

Line Items:
1. Accounts Receivable - ABC Manufacturing (1101)
   Debit: $10,000.00
   Credit: $0.00

2. Deferred Revenue (2200)
   Debit: $0.00
   Credit: $10,000.00

Total Debits: $10,000.00
Total Credits: $10,000.00
Balance: ✅ Balanced
```

### Material Consumption Voucher

```
Voucher Type: Journal Entry
Date: 2025-10-08
Reference: WO-000456 / MC-001789
Description: Material consumption for Work Order #WO-000456

Line Items:
1. Work in Progress - WIP (1220)
   Debit: $500.00
   Credit: $0.00
   Cost Center: Factory A - Production Line 1

2. Raw Materials Inventory (1210)
   Debit: $0.00
   Credit: $500.00

Total Debits: $500.00
Total Credits: $500.00
Balance: ✅ Balanced
```

---

## Appendix D: Event Payload Specifications

### FACTORY_ORDER_APPROVED Event Payload

```typescript
{
  event: 'factory.order.approved',
  timestamp: '2025-10-08T10:30:00Z',
  orderData: {
    orderId: '550e8400-e29b-41d4-a716-446655440000',
    orderNumber: 'CO-000123',
    customerId: '660e8400-e29b-41d4-a716-446655440001',
    customerName: 'ABC Manufacturing Ltd',
    customerEmail: 'orders@abcmanufacturing.com',
    totalValue: 10000.00,
    currency: 'BDT',
    orderDate: '2025-10-01T00:00:00Z',
    factoryId: 1,
    lineItems: [
      {
        productId: 101,
        productName: 'Widget A',
        quantity: 100,
        unitPrice: 100,
        lineTotal: 10000
      }
    ]
  },
  userId: 5
}
```

### MATERIAL_CONSUMED Event Payload

```typescript
{
  event: 'factory.material.consumed',
  timestamp: '2025-10-08T14:15:00Z',
  consumptionData: {
    consumptionId: 12345,
    workOrderId: 67890,
    workOrderNumber: 'WO-000456',
    materialId: 50,
    materialName: 'Steel Sheet',
    quantity: 25.5,
    unitCost: 19.61,
    totalCost: 500.00,
    factoryId: 1,
    productionLineId: 3,
    operatorId: 8,
    consumptionDate: '2025-10-08T14:15:00Z'
  },
  userId: 8
}
```

---

**END OF DOCUMENT**

