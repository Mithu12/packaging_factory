# Factories and Cost Centers Integration

## Overview
This document describes the implementation of the connection between factories and cost centers in the ERP system, enabling better financial tracking and cost allocation for each factory.

## Date Implemented
October 13, 2025

## Problem Statement
Factories were not previously connected to cost centers, which limited the ability to:
- Track factory-level expenses and overhead
- Allocate budgets to specific factories
- Generate cost center reports filtered by factory
- Integrate factory operations with financial accounting

## Solution

### 1. Database Changes

#### Migration: V46_add_cost_center_to_factories.sql
Added `cost_center_id` column to the `factories` table:

```sql
ALTER TABLE factories 
ADD COLUMN IF NOT EXISTS cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_factories_cost_center 
ON factories(cost_center_id);
```

**Key Features:**
- Foreign key relationship to `cost_centers` table
- Nullable field (factories can exist without a cost center)
- ON DELETE SET NULL to prevent cascade deletion
- Indexed for query performance

### 2. Backend Changes

#### Type Definitions (backend/src/types/factory.ts)
Updated Factory interfaces to include cost center fields:

```typescript
export interface Factory {
  // ... existing fields
  cost_center_id?: number;
  cost_center_name?: string;  // Populated from JOIN
  // ...
}

export interface CreateFactoryRequest {
  // ... existing fields
  cost_center_id?: number;
}

export interface UpdateFactoryRequest {
  // ... existing fields
  cost_center_id?: number;
}
```

#### FactoryMediator Updates (backend/src/modules/factory/mediators/factories/FactoryMediator.ts)

**getAllFactories:** 
- Added LEFT JOIN with cost_centers table
- Returns cost_center_name along with factory data

**getFactoryById:**
- Added LEFT JOIN with cost_centers table
- Returns cost center information

**createFactory:**
- Accepts cost_center_id in the request
- Persists cost_center_id to database

**updateFactory:**
- Allows updating cost_center_id
- Validates and updates the relationship

### 3. Frontend Changes

#### Type Definitions (frontend/src/modules/factory/types.ts)
Updated Factory, CreateFactoryRequest, and UpdateFactoryRequest interfaces to mirror backend types.

#### FactoryForm Component (frontend/src/modules/factory/components/FactoryForm.tsx)

**New Features:**
- Loads available cost centers when form opens
- Dropdown selector for cost center assignment
- Displays cost center code and name in dropdown
- Includes cost_center_id in form submission

**Implementation Details:**
```typescript
// Load cost centers from API
useEffect(() => {
  const loadCostCenters = async () => {
    if (open) {
      const response = await CostCentersApiService.getCostCenters({ 
        status: 'Active', 
        limit: 1000 
      });
      setCostCenters(response.data);
    }
  };
  loadCostCenters();
}, [open]);

// Form field for cost center selection
<FormField
  control={form.control}
  name="cost_center_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Cost Center</FormLabel>
      <Select
        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
        value={field.value?.toString() || ''}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a cost center" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="">None</SelectItem>
          {costCenters.map((cc) => (
            <SelectItem key={cc.id} value={cc.id.toString()}>
              {cc.code} - {cc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription>
        Link this factory to a cost center for expense tracking and budget allocation
      </FormDescription>
    </FormItem>
  )}
/>
```

#### FactoryList Component (frontend/src/modules/factory/components/FactoryList.tsx)

**New Features:**
- Added "Cost Center" column to the factory table
- Displays cost center name if assigned
- Shows "Not assigned" placeholder if no cost center linked

```typescript
<TableCell>
  {factory.cost_center_name ? (
    <span className="text-sm">{factory.cost_center_name}</span>
  ) : (
    <span className="text-sm text-gray-400">Not assigned</span>
  )}
</TableCell>
```

### 4. Additional Updates

#### factory-api.ts Service
Updated Factory interface in the service file to include cost_center_id and cost_center_name.

## Benefits

### Financial Tracking
- Each factory can now be associated with a dedicated cost center
- Factory-level expenses can be tracked and budgeted accurately
- Better cost allocation for overhead and operational expenses

### Reporting
- Cost center reports can be filtered by factory
- Factory managers can view their cost center performance
- Integrated financial and operational reporting

### Budget Management
- Budgets can be allocated to factories through cost centers
- Variance tracking at the factory level
- Better financial planning and forecasting

### Integration
- Seamless connection between factory operations and accounting
- Production costs can be linked to cost centers
- Vouchers and ledger entries can reference factory cost centers

## Usage

### Creating a Factory with Cost Center
1. Navigate to Factory Management
2. Click "Add Factory"
3. Fill in factory details
4. Select a cost center from the dropdown (optional)
5. Save the factory

### Updating Factory Cost Center
1. Navigate to Factory Management
2. Click the actions menu for a factory
3. Select "Edit"
4. Change the cost center selection
5. Save changes

### Viewing Factory Cost Centers
- The factory list displays the assigned cost center in a dedicated column
- Cost center information appears in factory details

## Migration Strategy

### For Existing Factories
- Existing factories will have `cost_center_id` as NULL initially
- Administrators can update factories to assign cost centers
- No data loss or disruption to existing operations

### Recommended Steps
1. Run the V46 migration to add the column
2. Review existing factories
3. Create cost centers for each factory if needed
4. Assign cost centers to factories through the UI
5. Begin using cost center tracking for new expenses

## Related Systems

### Production Lines
- Production lines already have `cost_center_id` (added in V32)
- Factory and production line cost centers can be different
- Enables sub-cost center tracking within factories

### Vouchers and Ledger
- Vouchers can reference cost centers
- Factory expenses can be tracked through voucher cost centers
- Integrated with general ledger reporting

### Chart of Accounts
- Cost centers work with chart of accounts for complete expense tracking
- Each transaction can be tagged with account code (what) and cost center (where)

## Testing Checklist

- [ ] Run migration V46 successfully
- [ ] Create a new factory with cost center assignment
- [ ] Update an existing factory to add cost center
- [ ] Update a factory to remove cost center
- [ ] View factory list with cost center column
- [ ] Verify cost center dropdown loads active cost centers
- [ ] Test with factories that have no cost center assigned
- [ ] Verify database constraints and indexes

## Future Enhancements

1. **Cost Center Analytics Dashboard**
   - Factory-specific cost center performance metrics
   - Comparative analysis across factories

2. **Automatic Cost Allocation**
   - Auto-assign factory expenses to factory cost center
   - Production run costs linked to factory cost center

3. **Budget vs Actual Reporting**
   - Factory-level budget tracking
   - Variance alerts for factory managers

4. **Multi-Cost Center Support**
   - Allow factories to have multiple cost centers
   - Department-specific cost tracking within factories

## Files Modified

### Backend
- `backend/migrations/V46_add_cost_center_to_factories.sql` (new)
- `backend/src/types/factory.ts`
- `backend/src/modules/factory/mediators/factories/FactoryMediator.ts`

### Frontend
- `frontend/src/modules/factory/types.ts`
- `frontend/src/modules/factory/components/FactoryForm.tsx`
- `frontend/src/modules/factory/components/FactoryList.tsx`
- `frontend/src/services/factory-api.ts`

## Conclusion

The integration of factories with cost centers provides a robust foundation for financial tracking and cost management at the factory level. This enhancement aligns factory operations with accounting practices and enables better financial visibility and control.

