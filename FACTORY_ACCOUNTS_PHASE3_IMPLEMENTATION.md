# Factory-Accounts Integration: Phase 3 Implementation Notes

**Date:** October 8, 2025  
**Status:** 🚧 In Progress

## Phase 3: Production Execution & Work Order Completion

### Events Added

1. **PRODUCTION_RUN_COMPLETED** - Emitted when a production run is marked as completed
   - Location: `UpdateProductionRunStatusMediator.completeProductionRun()`
   - Payload includes: labor cost, overhead cost, runtime, quantities produced

2. **WORK_ORDER_COMPLETED** - Emitted when a work order status changes to 'completed'
   - Location: `UpdateWorkOrderMediator.updateWorkOrderStatus()`
   - Payload includes: WIP costs (material, labor, overhead), finished goods quantity

### Accounting Entries Required

#### 1. Production Run Labor Allocation
```
Debit:  Work in Progress (WIP)    $laborCost
Credit: Wages Payable               $laborCost
```

#### 2. Production Run Overhead Allocation
```
Debit:  Work in Progress (WIP)    $overheadCost
Credit: Factory Overhead Applied    $overheadCost
```

#### 3. Work Order Completion - FG Transfer
```
Debit:  Finished Goods Inventory   $totalWipCost
Credit: Work in Progress (WIP)      $totalWipCost
```

### Cost Calculation Notes

**Labor Cost (Current Implementation):**
- Based on production run runtime: `(runtimeMinutes / 60) * $15/hour`
- TODO: Replace with actual operator rates from production_lines or operators table
- TODO: Support multiple operators with different rates

**Overhead Cost (Current Implementation):**
- Based on production run runtime: `(runtimeMinutes / 60) * $10/hour`
- TODO: Replace with actual overhead rate from cost_centers table
- TODO: Support different overhead rates per production line

**WIP Transfer:**
- Uses accumulated costs from work_orders table:
  - `total_material_cost` - Sum of all material consumptions
  - `total_labor_cost` - Sum of all production run labor
  - `total_overhead_cost` - Sum of all production run overhead
  - `total_wip_cost` - Total of all above

### Database Updates Already Applied (V32)

- `production_runs.labor_voucher_id`
- `production_runs.overhead_voucher_id`
- `production_runs.labor_cost`
- `production_runs.overhead_cost`
- `production_lines.cost_center_id`
- `work_orders.finished_goods_voucher_id`

### Implementation Status

✅ Event emissions added to mediators  
🚧 Voucher creation methods (next step)  
🚧 Event listeners registration (next step)  
⏳ Chart of accounts mappings (needs accounts setup)  
⏳ Testing

### Next Implementation Steps

1. Add Phase 3 voucher creation methods to `factoryAccountsIntegrationService.ts`:
   - `createProductionRunLaborVoucher()`
   - `createProductionRunOverheadVoucher()`
   - `createWorkOrderFGTransferVoucher()`

2. Add event listeners in `registerFactoryAccountingListeners()`:
   - Listen for `PRODUCTION_RUN_COMPLETED` → create labor & overhead vouchers
   - Listen for `WORK_ORDER_COMPLETED` → create FG transfer voucher

3. Add account search patterns in `getDefaultAccount()`:
   - 'wages_payable' → Wages Payable (Liabilities)
   - 'factory_overhead_applied' → Factory Overhead Applied (Liabilities)
   - 'finished_goods' → Finished Goods Inventory (Assets)

4. Update production run table with cost references after voucher creation

5. Test end-to-end flow:
   - Material consumption → WIP increases
   - Production run completion → Labor & overhead vouchers, WIP increases
   - Work order completion → FG transfer voucher, WIP decreases, FG increases

### Future Enhancements

1. **Cost Center Integration:**
   - Link production_lines to cost_centers
   - Use cost center overhead rates instead of fixed $10/hour

2. **Operator Rate Tracking:**
   - Add hourly_rate column to operators table
   - Calculate labor cost based on actual operator rates

3. **Standard Costing:**
   - Define standard costs for products
   - Calculate variances between standard and actual costs
   - Create variance adjustment vouchers

4. **Detailed Labor Tracking:**
   - Track individual operator time per production run
   - Support overtime rates
   - Track indirect labor separately from direct labor

5. **Overhead Absorption:**
   - Multiple overhead pools (e.g., machine overhead, facility overhead)
   - Different absorption bases (labor hours, machine hours, units produced)
   - Under/over-applied overhead tracking and adjustment

### Testing Scenarios

**Scenario 1: Simple Work Order**
1. Approve customer order → AR voucher
2. Create work order
3. Consume materials → WIP voucher
4. Complete production run → Labor & overhead vouchers
5. Complete work order → FG transfer voucher
6. Verify all vouchers created and WIP costs tracked correctly

**Scenario 2: Multiple Production Runs**
1. Create work order
2. Run 1: Consume materials, complete run → WIP += materials + labor + overhead
3. Run 2: Consume more materials, complete run → WIP += materials + labor + overhead
4. Complete work order → FG transfer = total WIP

**Scenario 3: Work Order with Wastage**
1. Create work order
2. Consume materials
3. Approve wastage → Wastage expense voucher (doesn't affect WIP)
4. Complete production run → Labor & overhead to WIP
5. Complete work order → FG transfer

**Expected Results:**
- All vouchers auto-approved
- Voucher IDs stored in respective tables
- Reconciliation views show correct status
- WIP balance = 0 after work order completion
- FG inventory increased by WIP cost

