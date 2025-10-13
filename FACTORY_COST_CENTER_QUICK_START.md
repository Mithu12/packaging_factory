# Factory Cost Center Integration - Quick Start Guide

**Date:** October 13, 2025  
**Status:** ✅ Ready for Production  
**Time to Complete:** ~30 minutes

---

## Overview

This guide walks you through setting up and using the factory-to-cost-center integration with the factory accounts system.

---

## Prerequisites

✅ Database migrations V30-V33, V46 applied  
✅ 8 accounting accounts created (see `FACTORY_ACCOUNTS_CHART_OF_ACCOUNTS_SETUP.md`)  
✅ At least one factory exists in the system  
✅ Accounts module is active

---

## Step 1: Create Cost Centers for Factories (10 minutes)

### 1.1 Navigate to Cost Centers
```
Accounts → Cost Centers → Create New
```

### 1.2 Create Factory-Level Cost Centers

**Example 1: Main Factory**
```
Name: Main Factory Operations
Code: MF-OPS
Type: Department
Department: Production
Budget: $500,000
Status: Active
Description: Overall cost tracking for Main Factory
```

**Example 2: North Plant**
```
Name: North Plant Operations
Code: NP-OPS
Type: Department
Department: Production
Budget: $300,000
Status: Active
Description: Overall cost tracking for North Plant
```

### 1.3 (Optional) Create Production Line Cost Centers

For more granular tracking:

```
Name: Main Factory - Assembly Line
Code: MF-ASM
Type: Department
Department: Production - Assembly
Budget: $200,000
Status: Active
Parent: MF-OPS (if hierarchy supported)
```

```
Name: Main Factory - Packaging Line
Code: MF-PKG
Type: Department
Department: Production - Packaging
Budget: $150,000
Status: Active
Parent: MF-OPS (if hierarchy supported)
```

---

## Step 2: Link Factories to Cost Centers (5 minutes)

### 2.1 Navigate to Factory Management
```
Factory → Factory Management → Factories Tab
```

### 2.2 Edit Each Factory

1. Click the ⋮ menu for a factory
2. Select "Edit"
3. Find the "Cost Center" dropdown
4. Select the appropriate cost center (e.g., "MF-OPS - Main Factory Operations")
5. Save the factory

### 2.3 Verify Assignment

The factory list should now show the assigned cost center in the "Cost Center" column:

| Name | Code | Cost Center | Status |
|------|------|-------------|--------|
| Main Factory | MF001 | Main Factory Operations | Active |
| North Plant | NP001 | North Plant Operations | Active |

---

## Step 3: (Optional) Link Production Lines to Cost Centers (5 minutes)

If you have production lines and want line-level tracking:

### 3.1 Navigate to Production Lines
```
Factory → Production → Production Lines
```

### 3.2 Edit Each Production Line

1. Select a production line
2. Edit and assign a cost center (e.g., "MF-ASM - Main Factory - Assembly Line")
3. Save

**Cost Center Priority:**
- If production line has a cost center → use it
- Otherwise, use factory's cost center
- Otherwise, no cost center tracking

---

## Step 4: Test the Integration (10 minutes)

### 4.1 Test Customer Order → AR Voucher

**Action:**
1. Create a customer order for Factory "MF001"
2. Approve the order

**Expected Result:**
```sql
-- Check the voucher was created with cost center
SELECT 
  v.id,
  v.voucher_no,
  v.voucher_type,
  v.cost_center_id,
  cc.name as cost_center_name
FROM vouchers v
LEFT JOIN cost_centers cc ON v.cost_center_id = cc.id
WHERE v.voucher_type = 'Customer Order - AR'
ORDER BY v.created_at DESC
LIMIT 1;
```

**Expected Output:**
```
id | voucher_no | voucher_type           | cost_center_id | cost_center_name
---+------------+-----------------------+----------------+----------------------
45 | VO-000045  | Customer Order - AR   | 15             | Main Factory Operations
```

### 4.2 Test Material Consumption → WIP Voucher

**Action:**
1. Create a work order on a production line
2. Consume materials for the work order

**Expected Result:**
```sql
-- Check the material consumption voucher
SELECT 
  v.id,
  v.voucher_no,
  v.voucher_type,
  v.cost_center_id,
  cc.name as cost_center_name
FROM vouchers v
LEFT JOIN cost_centers cc ON v.cost_center_id = cc.id
WHERE v.voucher_type = 'Material Consumption'
ORDER BY v.created_at DESC
LIMIT 1;
```

**Expected Output:**
```
id | voucher_no | voucher_type         | cost_center_id | cost_center_name
---+------------+---------------------+----------------+---------------------------
48 | VO-000048  | Material Consumption | 16             | Main Factory - Assembly Line
```
*(Or factory cost center if line doesn't have one)*

### 4.3 Check Cost Center Actual Spend

**Query:**
```sql
-- Verify cost center actual_spend is being updated
SELECT 
  id,
  name,
  code,
  budget,
  actual_spend,
  variance,
  (actual_spend / budget * 100) as utilization_pct
FROM cost_centers
WHERE status = 'Active'
ORDER BY name;
```

**Expected Output:**
```
id | name                    | code   | budget  | actual_spend | variance | utilization_pct
---+-------------------------+--------+---------+--------------+----------+-----------------
15 | Main Factory Operations | MF-OPS | 500000  | 12500.00     | 487500   | 2.5%
16 | MF - Assembly Line      | MF-ASM | 200000  | 8300.00      | 191700   | 4.2%
```

---

## Step 5: Review Reporting (5 minutes)

### 5.1 Cost Center Report by Factory

```sql
-- Factory-level cost summary
SELECT 
  f.name as factory,
  cc.name as cost_center,
  cc.budget,
  cc.actual_spend,
  cc.variance,
  ROUND(cc.actual_spend / cc.budget * 100, 2) as utilization_pct
FROM factories f
JOIN cost_centers cc ON f.cost_center_id = cc.id
WHERE cc.status = 'Active'
ORDER BY f.name;
```

### 5.2 Voucher Breakdown by Cost Center

```sql
-- See all vouchers for a factory's cost center
SELECT 
  v.voucher_no,
  v.voucher_type,
  v.amount,
  v.created_at,
  v.status
FROM vouchers v
JOIN factories f ON v.cost_center_id = f.cost_center_id
WHERE f.code = 'MF001'
ORDER BY v.created_at DESC;
```

### 5.3 Factory P&L (via Cost Center)

```sql
-- Simple P&L for a factory
WITH factory_transactions AS (
  SELECT 
    vl.debit,
    vl.credit,
    coa.category
  FROM voucher_lines vl
  JOIN chart_of_accounts coa ON vl.account_id = coa.id
  JOIN factories f ON vl.cost_center_id = f.cost_center_id
  WHERE f.code = 'MF001'
)
SELECT 
  category,
  SUM(debit) as total_debit,
  SUM(credit) as total_credit,
  SUM(debit) - SUM(credit) as net_amount
FROM factory_transactions
GROUP BY category
ORDER BY category;
```

---

## Common Scenarios

### Scenario 1: Single Cost Center per Factory

**Setup:**
- Each factory has one cost center
- All factory operations use that cost center
- Simple, straightforward tracking

**Configuration:**
- Factory → Cost Center: ✅
- Production Lines → Cost Center: ❌ (not assigned)

**Result:**
- All vouchers use factory's cost center
- Easy consolidated reporting

### Scenario 2: Cost Center per Production Line

**Setup:**
- Factory has a general cost center for overhead
- Each production line has its own cost center
- Detailed line-level tracking

**Configuration:**
- Factory → Cost Center: ✅ (overhead)
- Production Lines → Cost Center: ✅ (each line)

**Result:**
- Material/labor vouchers use line cost center
- Customer orders use factory cost center
- Detailed variance analysis by line

### Scenario 3: Mixed Approach

**Setup:**
- Some production lines have dedicated cost centers
- Other lines share the factory cost center
- Flexible based on importance

**Configuration:**
- Factory → Cost Center: ✅
- Line 1 (High Volume) → Cost Center: ✅
- Line 2 (Low Volume) → Cost Center: ❌ (uses factory)

**Result:**
- High-volume line tracked separately
- Low-volume lines consolidated under factory
- Optimized tracking granularity

---

## Verification Checklist

After setup, verify:

- [ ] All factories have cost centers assigned (or explicitly none)
- [ ] Cost center budgets are set appropriately
- [ ] Customer order approval creates voucher with cost center
- [ ] Material consumption voucher includes cost center
- [ ] Production run vouchers (labor/overhead) have cost center
- [ ] Work order completion voucher includes cost center
- [ ] Cost center `actual_spend` updates when vouchers created
- [ ] Cost center variance calculations are correct
- [ ] Reconciliation views show cost center information

---

## Troubleshooting

### Voucher Created Without Cost Center

**Symptom:** Voucher has `cost_center_id = NULL`

**Possible Causes:**
1. Factory has no cost center assigned
2. Production line has no cost center (and factory has none)
3. Integration service not updated to use getCostCenterForFactory

**Solution:**
```sql
-- Check factory cost center assignment
SELECT id, name, code, cost_center_id 
FROM factories 
WHERE code = 'MF001';

-- If NULL, assign a cost center via UI or:
UPDATE factories 
SET cost_center_id = (SELECT id FROM cost_centers WHERE code = 'MF-OPS')
WHERE code = 'MF001';
```

### Cost Center Actual Spend Not Updating

**Symptom:** `actual_spend` remains 0 despite vouchers

**Possible Cause:** Vouchers not auto-approved

**Solution:**
```sql
-- Check voucher status
SELECT id, voucher_no, status, amount, cost_center_id
FROM vouchers
WHERE cost_center_id IS NOT NULL
ORDER BY created_at DESC;

-- If status is 'Draft', the trigger hasn't run yet
-- Factory integration vouchers should auto-approve
```

### Multiple Cost Centers for Same Factory

**Symptom:** Want different cost centers for different purposes

**Solution:** Use production line cost centers:
- Factory cost center: General overhead and revenue
- Line cost centers: Direct production costs
- Both tracked independently

---

## Best Practices

### 1. Naming Conventions

Use consistent naming:
```
Factory: "Main Factory"
Cost Center: "Main Factory Operations"
Code: "MF-OPS"

Production Line: "Main Factory - Assembly Line"
Cost Center: "Main Factory - Assembly"
Code: "MF-ASM"
```

### 2. Budget Setting

Set realistic budgets:
- Review historical costs
- Account for seasonality
- Add buffer for variability
- Review quarterly

### 3. Monitoring

Regular checks:
- Weekly: Cost center utilization
- Monthly: Budget vs. actual variance
- Quarterly: Cost center performance review
- Annually: Budget adjustments

### 4. Reporting

Create regular reports:
- Daily: Voucher creation log
- Weekly: Cost center utilization dashboard
- Monthly: Factory P&L via cost centers
- Quarterly: Variance analysis and trends

---

## Next Steps

After completing this quick start:

1. **Configure All Factories** - Assign cost centers to all active factories
2. **Set Budgets** - Review and adjust cost center budgets
3. **Monitor Performance** - Track actual vs. budget weekly
4. **Train Users** - Educate factory managers on cost center tracking
5. **Build Dashboards** - Create cost center performance dashboards
6. **Optimize Allocation** - Refine overhead allocation rules

---

## Related Documentation

- `FACTORIES_COST_CENTERS_INTEGRATION.md` - Technical implementation details
- `FACTORY_ACCOUNTS_COST_CENTER_UPDATE.md` - Comprehensive enhancement guide
- `FACTORY_ACCOUNTS_CURRENT_STATUS.md` - Current integration status
- `FACTORY_ACCOUNTS_CHART_OF_ACCOUNTS_SETUP.md` - Account setup guide
- `COST_CENTER_CHART_OF_ACCOUNTS_INTEGRATION.md` - Cost center concepts

---

## Support

**Questions?** Check the documentation files above or review:
- Backend logs for integration errors
- Reconciliation views for voucher status
- Cost center reports for budget tracking

**Need Help?** 
- Review `FACTORY_ACCOUNTS_COST_CENTER_UPDATE.md` for detailed examples
- Check database views for data validation
- Monitor backend logs for integration events

---

**Status:** ✅ **Complete and Ready to Use**  
**Estimated Setup Time:** 30 minutes  
**Benefits:** Comprehensive factory-level cost tracking and budgeting

*Start tracking your factory costs by cost center today!* 🎉

