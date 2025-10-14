# Cost Center & Chart of Accounts Integration Guide

## Overview
Cost Centers and Chart of Accounts work together to provide comprehensive financial tracking and reporting. This document outlines how they should integrate in the ERP system.

## 1. Conceptual Relationship

### Cost Centers (Where money is spent)
- **Purpose**: Track expenses by organizational unit, project, or location
- **Examples**: Manufacturing Department, Project Alpha, Warehouse A
- **Key Function**: Budget allocation and variance tracking

### Chart of Accounts (What money is spent on)
- **Purpose**: Categorize the nature of financial transactions
- **Examples**: Office Supplies, Equipment, Salaries, Utilities
- **Key Function**: Financial statement preparation and tax reporting

### Integration Point: **Expense Allocation**
Every expense transaction should be tagged with:
1. **Account Code** (from Chart of Accounts) - What was purchased
2. **Cost Center Code** (from Cost Centers) - Which department/project it belongs to

## 2. Database Schema Integration

### Current Tables
```sql
-- Chart of Accounts
chart_of_accounts (
  id, name, code, type, category, balance, ...
)

-- Cost Centers  
cost_centers (
  id, name, code, type, department, budget, actual_spend, variance, ...
)
```

### Required Integration Tables

#### A. Expense Transactions (Voucher Lines Enhancement)
```sql
-- Enhanced voucher_lines table
ALTER TABLE voucher_lines ADD COLUMN cost_center_id INTEGER REFERENCES cost_centers(id);
ALTER TABLE voucher_lines ADD COLUMN account_id INTEGER REFERENCES chart_of_accounts(id);

-- This allows each expense line to be tagged with both:
-- - What account it affects (chart_of_accounts)
-- - Which cost center it belongs to (cost_centers)
```

#### B. Cost Center Account Mapping (Optional - for budget planning)
```sql
-- Maps which accounts are typically used by each cost center
CREATE TABLE cost_center_account_mapping (
  id SERIAL PRIMARY KEY,
  cost_center_id INTEGER REFERENCES cost_centers(id),
  account_id INTEGER REFERENCES chart_of_accounts(id),
  budget_allocation DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cost_center_id, account_id)
);
```

## 3. Frontend Integration Points

### A. Expense Entry Forms
When creating expenses/vouchers:
```typescript
interface ExpenseLineItem {
  accountId: number;        // From Chart of Accounts
  costCenterId: number;     // From Cost Centers  
  amount: number;
  description: string;
}
```

### B. Cost Center Budget Planning
- Allow setting budgets per account category within each cost center
- Example: "Manufacturing Dept" might have budgets for:
  - Raw Materials: $100,000
  - Equipment: $50,000
  - Utilities: $25,000

### C. Reporting Integration
- **Cost Center Reports**: Show spending by account type
- **Account Reports**: Show spending by cost center
- **Variance Analysis**: Budget vs actual by cost center and account

## 4. Implementation Steps

### Phase 1: Database Enhancement
1. ✅ Create cost_centers table (DONE)
2. 🔄 Add cost_center_id to voucher_lines table
3. 🔄 Create cost_center_account_mapping table
4. 🔄 Add triggers to update cost center actual_spend when voucher_lines are inserted

### Phase 2: Backend API Enhancement
1. 🔄 Update voucher creation to accept cost center assignments
2. 🔄 Create cost center budget allocation endpoints
3. 🔄 Add reporting endpoints for integrated data

### Phase 3: Frontend Integration
1. ✅ Cost Centers management page (DONE)
2. 🔄 Add cost center selection to expense/voucher forms
3. 🔄 Create integrated reporting dashboards
4. 🔄 Budget planning interface

## 5. User Workflow Examples

### Example 1: Recording an Office Supply Purchase
1. **Transaction**: $500 office supplies for Marketing Department
2. **Voucher Line Entry**:
   - Account: "Office Supplies" (from Chart of Accounts)
   - Cost Center: "Marketing Department" (from Cost Centers)
   - Amount: $500
3. **Result**: 
   - Office Supplies account balance increases by $500
   - Marketing Department actual spend increases by $500
   - Variance calculated automatically

### Example 2: Budget Planning
1. **Setup**: Marketing Department has $50,000 annual budget
2. **Allocation**:
   - Office Supplies: $10,000
   - Advertising: $30,000
   - Equipment: $10,000
3. **Tracking**: Monitor spending against each allocation

## 6. Reporting Capabilities

### Cost Center Reports
- Budget vs Actual by account category
- Variance analysis with drill-down to transactions
- Department comparison reports

### Account Reports  
- Spending by cost center for each account
- Trend analysis over time
- Budget utilization rates

### Executive Dashboards
- Company-wide budget performance
- Cost center efficiency metrics
- Account-level spending patterns

## 7. Next Steps for Implementation

1. **Immediate**: Enhance voucher_lines table with cost_center_id
2. **Short-term**: Update expense entry forms to include cost center selection
3. **Medium-term**: Build integrated reporting dashboards
4. **Long-term**: Advanced budget planning and approval workflows

This integration provides the foundation for comprehensive financial management, combining the "what" (accounts) with the "where" (cost centers) for complete expense tracking and budgeting.
