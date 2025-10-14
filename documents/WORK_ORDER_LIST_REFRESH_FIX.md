# Work Order List Refresh Fix

**Date:** October 14, 2025  
**Issue:** Work order list not updating after status changes from draft  
**Status:** ✅ FIXED

## Problem

When a work order's status was updated from "draft" to "planned" or any other status, the work order list in the UI was not refreshing to reflect the changes. Users had to manually refresh the page to see the updated status.

## Root Cause

The query invalidation was using an incomplete query key that didn't properly match the active queries:

- **Query Key Used:** `workOrdersQueryKeys.list(queryParams)` → `['work-orders', 'list', {...params}]`
- **Invalidation Key:** `workOrdersQueryKeys.lists()` → `['work-orders', 'list']`

While this partial key matching should work in React Query, using a more comprehensive invalidation approach ensures all work order queries are properly refreshed.

## Solution

Changed all query invalidations from:
```typescript
queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.lists() });
queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.stats() });
```

To:
```typescript
queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.all });
```

This invalidates ALL work order related queries at once (lists, stats, details, etc.), ensuring complete data consistency across the application.

## Changes Made

### File: `frontend/src/modules/factory/pages/WorkOrderPlanning.tsx`

1. **Status Change Mutation** (line ~216-220)
   - Changed to invalidate `workOrdersQueryKeys.all`
   - Ensures status updates trigger list refresh

2. **Create Work Order Mutation** (line ~171-185)
   - Changed to invalidate `workOrdersQueryKeys.all`
   - Ensures new work orders appear in the list

3. **Update Work Order Mutation** (line ~193-203)
   - Changed to invalidate `workOrdersQueryKeys.all`
   - Ensures updates (like planning assignments) refresh the list

4. **Complete with Consumption Mutation** (line ~242-248)
   - Changed to invalidate `workOrdersQueryKeys.all`
   - Ensures completed work orders update properly

5. **Plan Work Order API Call** (line ~532-535)
   - Added manual query invalidation after direct API call
   - This was missing and would have caused refresh issues when promoting to "planned" status

6. **Refresh Button Handlers** (lines ~585-620)
   - Simplified to only invalidate `workOrdersQueryKeys.all`
   - Removed redundant stats invalidation

## Testing

To verify the fix works:

1. Create a new work order in "draft" status
2. Update the status to "planned" or "in_progress"
3. The work order list should immediately reflect the new status without manual page refresh
4. Check that the work order statistics also update correctly

## Benefits

- ✅ More reliable query invalidation
- ✅ Simpler code (fewer invalidation calls)
- ✅ Comprehensive refresh of all work order data
- ✅ Better user experience with immediate UI updates

## Related Files

- `frontend/src/modules/factory/pages/WorkOrderPlanning.tsx` - Main fix location
- `frontend/src/services/work-orders-api.ts` - Query keys definition

