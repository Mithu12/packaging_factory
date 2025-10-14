# Recent Changes Summary

**Date:** October 14, 2025

## 1. Work Order Status Update Loading Indicators

### Issue
Users could accidentally click status update buttons multiple times because there was no clear indication that the update was in progress.

### Solution
- Added per-work-order loading state tracking with `updatingWorkOrderId`
- Each button now shows a spinning clock icon while that specific work order is being updated
- Buttons are disabled and show reduced opacity during updates
- Only the specific work order being updated is affected, not all buttons globally

### Changes
**File:** `frontend/src/modules/factory/pages/WorkOrderPlanning.tsx`
- Added state: `updatingWorkOrderId` to track which work order is being updated
- Updated `statusChangeMutation` to set/clear the updating ID
- Modified status buttons (Release, Start, Complete) to:
  - Show spinner when updating
  - Disable only for the specific work order being updated
  - Add visual feedback with opacity

### User Experience
✅ Clear visual feedback when updating status  
✅ Prevents accidental double-clicks  
✅ Other work orders remain interactive  
✅ Better UX with per-item loading states

---

## 2. Documentation Organization

### Issue
Root directory was cluttered with 39+ documentation files, making it hard to find and manage documentation.

### Solution
Created a `documents/` folder and moved all `.md` files except `README.md` into it.

### Changes
- Created `/documents` folder
- Moved 40 documentation files to `/documents`
- Created `/documents/README.md` with documentation index and categories
- Kept project `README.md` in root as required

### Structure
```
/
├── README.md                    (main project readme)
├── documents/
│   ├── README.md               (documentation index)
│   ├── AUDIT_SYSTEM_*.md
│   ├── FACTORY_*.md
│   ├── RBAC_*.md
│   └── ... (39 other docs)
└── ... (other project files)
```

### Benefits
✅ Cleaner root directory  
✅ Better documentation organization  
✅ Easier to find specific docs  
✅ Documentation index for quick reference

---

## Previous Fixes (October 14, 2025)

### Cost Center Voucher Tagging
- Fixed vouchers not being tagged with factory cost centers
- Updated `FactoryCustomerOrder` interface with cost center fields
- Fixed cost center validation to handle duplicate IDs
- **Details:** See `documents/WORK_ORDER_LIST_REFRESH_FIX.md`

### Work Order List Refresh
- Fixed work order list not updating after status changes
- Changed query invalidation from `lists()` to `all`
- Added manual invalidation for `planWorkOrder` API call
- **Details:** See `documents/WORK_ORDER_LIST_REFRESH_FIX.md`

---

## Testing

### Loading Indicators
1. Go to Work Order Planning page
2. Change a work order status (e.g., Draft → Planned)
3. Verify button shows spinner and is disabled during update
4. Verify other work orders remain interactive
5. Verify list updates after status change completes

### Documentation
1. Navigate to `/documents` folder
2. Verify all documentation files are present
3. Check `documents/README.md` for organization

