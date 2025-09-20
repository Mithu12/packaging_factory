# Expense-Related, Inventory & Origins RBAC Implementation

This document summarizes the implementation of RBAC (Role-Based Access Control) for expense-related routes, inventory routes, and origins routes using Method 1 (Permission-Based).

## Changes Made

### 1. Updated Permission Middleware (`permission.ts`)

Added new permission constants for all modules:

#### Expenses Permissions
```typescript
// Expenses
EXPENSES_CREATE: createPermissionCheck('Finance', 'create', 'expenses'),
EXPENSES_READ: createPermissionCheck('Finance', 'read', 'expenses'),
EXPENSES_UPDATE: createPermissionCheck('Finance', 'update', 'expenses'),
EXPENSES_DELETE: createPermissionCheck('Finance', 'delete', 'expenses'),
EXPENSES_APPROVE: createPermissionCheck('Finance', 'approve', 'expenses'),
EXPENSES_REJECT: createPermissionCheck('Finance', 'reject', 'expenses'),
```

#### Expense Categories Permissions
```typescript
// Expense Categories
EXPENSE_CATEGORIES_CREATE: createPermissionCheck('Finance', 'create', 'expense_categories'),
EXPENSE_CATEGORIES_READ: createPermissionCheck('Finance', 'read', 'expense_categories'),
EXPENSE_CATEGORIES_UPDATE: createPermissionCheck('Finance', 'update', 'expense_categories'),
EXPENSE_CATEGORIES_DELETE: createPermissionCheck('Finance', 'delete', 'expense_categories'),
```

#### Origins Permissions
```typescript
// Origins
ORIGINS_CREATE: createPermissionCheck('Inventory', 'create', 'origins'),
ORIGINS_READ: createPermissionCheck('Inventory', 'read', 'origins'),
ORIGINS_UPDATE: createPermissionCheck('Inventory', 'update', 'origins'),
ORIGINS_DELETE: createPermissionCheck('Inventory', 'delete', 'origins'),
```

### 2. Expenses Routes Implementation (`expenses.routes.ts`)

#### Updated Imports
**Before:**
```typescript
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
```

**After:**
```typescript
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
```

#### Route Implementations

| Endpoint | Old Permission | New Permission | Description |
|----------|---------------|----------------|-------------|
| `GET /` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_READ` | Get expenses with filtering |
| `GET /stats` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_READ` | Get expense statistics |
| `GET /:id` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_READ` | Get expense by ID |
| `POST /` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_CREATE` | Create new expense |
| `POST /with-receipt` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_CREATE` | Create expense with receipt |
| `PUT /:id` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_UPDATE` | Update expense |
| `PATCH /:id/approve` | `managerAndAbove` | `PERMISSIONS.EXPENSES_APPROVE` | Approve expense |
| `PATCH /:id/reject` | `managerAndAbove` | `PERMISSIONS.EXPENSES_REJECT` | Reject expense |
| `PATCH /:id/pay` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_UPDATE` | Mark expense as paid |
| `POST /:id/receipt` | `employeeAndAbove` | `PERMISSIONS.EXPENSES_UPDATE` | Update expense receipt |
| `DELETE /:id` | `adminOnly` | `PERMISSIONS.EXPENSES_DELETE` | Delete expense |

#### Example Implementation
```typescript
// GET /api/expenses - Get expenses with filtering and pagination
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSES_READ), 
  validateQuery(expenseQuerySchema), 
  expressAsyncHandler(async (req, res, next) => {
    // ... handler logic
  })
);

// PATCH /api/expenses/:id/approve - Approve expense
router.patch('/:id/approve', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSES_APPROVE), 
  validateRequest(approveExpenseSchema), 
  expressAsyncHandler(async (req, res, next) => {
    // ... handler logic
  })
);
```

### 3. Expense Categories Routes Implementation (`expenseCategories.routes.ts`)

#### Updated Imports
**Before:**
```typescript
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
```

**After:**
```typescript
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
```

#### Route Implementations

| Endpoint | Old Permission | New Permission | Description |
|----------|---------------|----------------|-------------|
| `GET /` | `employeeAndAbove` | `PERMISSIONS.EXPENSE_CATEGORIES_READ` | Get expense categories |
| `GET /active` | `employeeAndAbove` | `PERMISSIONS.EXPENSE_CATEGORIES_READ` | Get active categories |
| `GET /:id` | `employeeAndAbove` | `PERMISSIONS.EXPENSE_CATEGORIES_READ` | Get category by ID |
| `POST /` | `managerAndAbove` | `PERMISSIONS.EXPENSE_CATEGORIES_CREATE` | Create expense category |
| `PUT /:id` | `managerAndAbove` | `PERMISSIONS.EXPENSE_CATEGORIES_UPDATE` | Update expense category |
| `DELETE /:id` | `adminOnly` | `PERMISSIONS.EXPENSE_CATEGORIES_DELETE` | Delete expense category |

#### Example Implementation
```typescript
// GET /api/expense-categories - Get expense categories
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_READ), 
  validateQuery(expenseCategoryQuerySchema), 
  expressAsyncHandler(async (req, res, next) => {
    // ... handler logic
  })
);

// POST /api/expense-categories - Create new expense category
router.post('/', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_CREATE), 
  validateRequest(createExpenseCategorySchema), 
  expressAsyncHandler(async (req, res, next) => {
    // ... handler logic
  })
);
```

### 4. Inventory Routes Implementation (`inventory.routes.ts`)

#### Updated Imports
**Before:**
```typescript
import express, {NextFunction, Request, Response} from 'express';
import expressAsyncHandler from "express-async-handler";
import {MyLogger} from "@/utils/new-logger";
import Joi from 'joi';
import InventoryController from "@/controllers/inventory/inventory.controller";
```

**After:**
```typescript
import express, {NextFunction, Request, Response} from 'express';
import expressAsyncHandler from "express-async-handler";
import {MyLogger} from "@/utils/new-logger";
import Joi from 'joi';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import InventoryController from "@/controllers/inventory/inventory.controller";
```

#### Route Implementations

| Endpoint | Old Permission | New Permission | Description |
|----------|---------------|----------------|-------------|
| `GET /` | No auth | `PERMISSIONS.INVENTORY_TRACK` | Get inventory items |
| `GET /stats` | No auth | `PERMISSIONS.INVENTORY_TRACK` | Get inventory statistics |
| `GET /movements` | No auth | `PERMISSIONS.INVENTORY_TRACK` | Get stock movements |
| `GET /:id` | No auth | `PERMISSIONS.INVENTORY_TRACK` | Get inventory item by ID |

#### Example Implementation
```typescript
// GET /api/inventory - Get inventory items with filtering and pagination
router.get('/', 
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_TRACK),
  validateQuery(inventoryQuerySchema), 
  expressAsyncHandler(InventoryController.getInventoryItems)
);

// GET /api/inventory/stats - Get inventory statistics
router.get('/stats', 
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_TRACK),
  expressAsyncHandler(InventoryController.getInventoryStats)
);
```

### 5. Origins Routes Implementation (`origins.routes.ts`)

#### Updated Imports
**Before:**
```typescript
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
```

**After:**
```typescript
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
```

#### Route Implementations

| Endpoint | Old Permission | New Permission | Description |
|----------|---------------|----------------|-------------|
| `GET /` | `employeeAndAbove` | `PERMISSIONS.ORIGINS_READ` | Get all origins |
| `GET /stats` | `managerAndAbove` | `PERMISSIONS.ORIGINS_READ` | Get origin statistics |
| `GET /:id` | `employeeAndAbove` | `PERMISSIONS.ORIGINS_READ` | Get origin by ID |
| `POST /` | `managerAndAbove` | `PERMISSIONS.ORIGINS_CREATE` | Create new origin |
| `PUT /:id` | `managerAndAbove` | `PERMISSIONS.ORIGINS_UPDATE` | Update origin |
| `DELETE /:id` | `adminOnly` | `PERMISSIONS.ORIGINS_DELETE` | Delete origin |
| `GET /status/:status` | `employeeAndAbove` | `PERMISSIONS.ORIGINS_READ` | Get origins by status |

#### Example Implementation
```typescript
// GET /api/origins - Get all origins
router.get('/',
  authenticate,
  requirePermission(PERMISSIONS.ORIGINS_READ),
  expressAsyncHandler(OriginsController.getAllOrigins)
);

// POST /api/origins - Create new origin
router.post('/',
  authenticate,
  requirePermission(PERMISSIONS.ORIGINS_CREATE),
  validateRequest(validateCreateOrigin),
  expressAsyncHandler(async (req, res, next) => {
    // ... handler logic
  })
);
```

## Database Permissions

### Expenses Permissions (Already in Database)
```sql
-- From add-comprehensive-permissions.ts
{ name: 'expenses.create', display_name: 'Create Expenses', module: 'Finance', action: 'create', resource: 'expenses' }
{ name: 'expenses.read', display_name: 'View Expenses', module: 'Finance', action: 'read', resource: 'expenses' }
{ name: 'expenses.update', display_name: 'Update Expenses', module: 'Finance', action: 'update', resource: 'expenses' }
{ name: 'expenses.delete', display_name: 'Delete Expenses', module: 'Finance', action: 'delete', resource: 'expenses' }
{ name: 'expenses.approve', display_name: 'Approve Expenses', module: 'Finance', action: 'approve', resource: 'expenses' }
{ name: 'expenses.reject', display_name: 'Reject Expenses', module: 'Finance', action: 'reject', resource: 'expenses' }
```

### Inventory Permissions (Already in Database)
```sql
-- From add-comprehensive-permissions.ts
{ name: 'inventory.track', display_name: 'Track Inventory', module: 'Inventory', action: 'read', resource: 'inventory' }
{ name: 'inventory.adjust', display_name: 'Adjust Inventory', module: 'Inventory', action: 'create', resource: 'inventory_adjustments' }
{ name: 'inventory.approve_adjustments', display_name: 'Approve Inventory Adjustments', module: 'Inventory', action: 'approve', resource: 'inventory_adjustments' }
{ name: 'inventory.reorder_levels', display_name: 'Set Reorder Levels', module: 'Inventory', action: 'update', resource: 'reorder_levels' }
```

### Missing Permissions (Need to be Added)
The following permissions are used in the middleware but not yet in the database:

#### Expense Categories
```sql
{ name: 'expense_categories.create', display_name: 'Create Expense Categories', module: 'Finance', action: 'create', resource: 'expense_categories' }
{ name: 'expense_categories.read', display_name: 'View Expense Categories', module: 'Finance', action: 'read', resource: 'expense_categories' }
{ name: 'expense_categories.update', display_name: 'Update Expense Categories', module: 'Finance', action: 'update', resource: 'expense_categories' }
{ name: 'expense_categories.delete', display_name: 'Delete Expense Categories', module: 'Finance', action: 'delete', resource: 'expense_categories' }
```

#### Origins
```sql
{ name: 'origins.create', display_name: 'Create Origins', module: 'Inventory', action: 'create', resource: 'origins' }
{ name: 'origins.read', display_name: 'View Origins', module: 'Inventory', action: 'read', resource: 'origins' }
{ name: 'origins.update', display_name: 'Update Origins', module: 'Inventory', action: 'update', resource: 'origins' }
{ name: 'origins.delete', display_name: 'Delete Origins', module: 'Inventory', action: 'delete', resource: 'origins' }
```

## Role Assignments

Based on the existing RBAC configuration:

### Expenses Permissions by Role

#### System Admin
- ✅ All expense permissions (full access)

#### Finance Manager
- ✅ `expenses.create` - Can create expenses
- ✅ `expenses.read` - Can view expenses
- ✅ `expenses.update` - Can update expenses
- ✅ `expenses.delete` - Can delete expenses
- ✅ `expenses.approve` - Can approve expenses
- ✅ `expenses.reject` - Can reject expenses

#### Finance Staff
- ✅ `expenses.create` - Can create expenses
- ✅ `expenses.read` - Can view expenses
- ✅ `expenses.update` - Can update expenses
- ❌ No approve/reject/delete permissions

#### Employees
- ✅ `expenses.create` - Can create their own expenses
- ✅ `expenses.read` - Can view their own expenses
- ✅ `expenses.update` - Can update their own expenses (before approval)
- ❌ No approve/reject/delete permissions

### Expense Categories Permissions by Role

#### System Admin
- ✅ All expense category permissions (full access)

#### Finance Manager
- ✅ `expense_categories.create` - Can create categories
- ✅ `expense_categories.read` - Can view categories
- ✅ `expense_categories.update` - Can update categories
- ✅ `expense_categories.delete` - Can delete categories

#### Finance Staff / Employees
- ✅ `expense_categories.read` - Can view categories (for expense creation)
- ❌ No create/update/delete permissions

### Inventory Permissions by Role

#### System Admin
- ✅ All inventory permissions (full access)

#### Inventory Manager
- ✅ `inventory.track` - Can view inventory
- ✅ `inventory.adjust` - Can make adjustments
- ✅ `inventory.approve_adjustments` - Can approve adjustments
- ✅ `inventory.reorder_levels` - Can set reorder levels

#### Warehouse Staff
- ✅ `inventory.track` - Can view inventory
- ✅ `inventory.adjust` - Can make adjustments
- ❌ No approval permissions

#### Other Roles
- Sales/Purchase teams may have `inventory.track` for stock checking
- Employee role typically has no inventory permissions

### Origins Permissions by Role

#### System Admin
- ✅ All origins permissions (full access)

#### Inventory Manager
- ✅ `origins.create` - Can create origins
- ✅ `origins.read` - Can view origins
- ✅ `origins.update` - Can update origins
- ✅ `origins.delete` - Can delete origins

#### Warehouse Staff / Purchase Staff
- ✅ `origins.read` - Can view origins (for product management)
- ❌ No create/update/delete permissions

#### Other Roles
- Sales teams may have `origins.read` for product information
- Employee role typically has no origins permissions

## Security Improvements

### 1. **Enhanced Access Control**
- **Before**: Broad role-based access (employeeAndAbove, managerAndAbove)
- **After**: Specific permission-based access for each operation

### 2. **Module Separation**
- **Expenses & Expense Categories**: Under `Finance` module
- **Inventory**: Under `Inventory` module for stock management
- **Origins**: Under `Inventory` module for product origin management

### 3. **Granular Permissions**
- **Expenses**: Separate permissions for approve/reject operations
- **Inventory**: Read-only tracking vs. adjustment permissions
- **Origins**: Full CRUD permissions for product origin management

### 4. **Authentication Requirements**
- **Inventory Routes**: Previously had no authentication, now fully protected
- **All Routes**: Consistent authentication and permission validation

### 5. **Workflow-Based Security**
- **Expense Approval**: Only users with approve permission can approve
- **Expense Rejection**: Only users with reject permission can reject
- **Inventory Tracking**: Separate from adjustment permissions

## Testing Implementation

### 1. Expenses Testing
```bash
# Test expense read permission
curl -H "Authorization: Bearer <finance_staff_token>" \
     http://localhost:3000/api/expenses

# Test expense approval (should require manager+ permission)
curl -X PATCH -H "Authorization: Bearer <finance_manager_token>" \
     -H "Content-Type: application/json" \
     -d '{"notes":"Approved for payment"}' \
     http://localhost:3000/api/expenses/1/approve

# Test insufficient permissions (should get 403)
curl -X PATCH -H "Authorization: Bearer <employee_token>" \
     http://localhost:3000/api/expenses/1/approve
```

### 2. Expense Categories Testing
```bash
# Test category read permission
curl -H "Authorization: Bearer <finance_staff_token>" \
     http://localhost:3000/api/expense-categories

# Test category creation (should require manager+ permission)
curl -X POST -H "Authorization: Bearer <finance_manager_token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Office Supplies","description":"Office supplies and equipment"}' \
     http://localhost:3000/api/expense-categories

# Test insufficient permissions (should get 403)
curl -X POST -H "Authorization: Bearer <employee_token>" \
     http://localhost:3000/api/expense-categories
```

### 3. Inventory Testing
```bash
# Test inventory tracking permission
curl -H "Authorization: Bearer <warehouse_staff_token>" \
     http://localhost:3000/api/inventory

# Test inventory statistics
curl -H "Authorization: Bearer <inventory_manager_token>" \
     http://localhost:3000/api/inventory/stats

# Test insufficient permissions (should get 403)
curl -H "Authorization: Bearer <sales_staff_token>" \
     http://localhost:3000/api/inventory
```

### 4. Origins Testing
```bash
# Test origins read permission
curl -H "Authorization: Bearer <warehouse_staff_token>" \
     http://localhost:3000/api/origins

# Test origin creation (should require manager+ permission)
curl -X POST -H "Authorization: Bearer <inventory_manager_token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"China","description":"Products from China"}' \
     http://localhost:3000/api/origins

# Test insufficient permissions (should get 403)
curl -X POST -H "Authorization: Bearer <warehouse_staff_token>" \
     http://localhost:3000/api/origins
```

### 5. Expected Response Codes
- **200**: Permission granted, operation successful
- **403**: Permission denied, insufficient privileges
- **401**: No authentication token or invalid token

## Migration Benefits

### 1. **Security Enhancement**
- Added authentication to previously unprotected inventory routes
- Granular permission control instead of role-based blanket access
- Workflow-specific permissions (approve/reject for expenses)

### 2. **Flexibility**
- Easy to grant specific permissions without full role assignment
- Temporary permissions with expiration dates
- Direct user permission assignments for exceptions

### 3. **Maintainability**
- Consistent permission naming convention
- Clear separation of concerns by module
- Centralized permission definitions

### 4. **Audit & Compliance**
- All permission checks logged
- Clear permission trail for compliance
- Easy to track who has access to what

### 5. **Workflow Support**
- Expense approval workflow with proper permissions
- Inventory tracking vs. adjustment separation
- Finance module separation from inventory operations

## Future Enhancements

### 1. **Resource-Level Permissions**
- Per-expense approval limits
- Department-specific expense categories
- Location-based inventory access

### 2. **Advanced Features**
- Bulk operations permissions
- Import/export permissions
- Advanced reporting permissions

### 3. **Integration**
- Frontend permission-based UI controls
- Dynamic menu generation based on permissions
- Real-time permission updates

### 4. **Database Updates**
A migration script should be created to add the missing permissions:
```sql
-- Add missing expense categories permissions
INSERT INTO permissions (name, display_name, description, module, action, resource) VALUES
('expense_categories.create', 'Create Expense Categories', 'Create new expense categories', 'Finance', 'create', 'expense_categories'),
('expense_categories.read', 'View Expense Categories', 'View expense categories', 'Finance', 'read', 'expense_categories'),
('expense_categories.update', 'Update Expense Categories', 'Update expense categories', 'Finance', 'update', 'expense_categories'),
('expense_categories.delete', 'Delete Expense Categories', 'Delete expense categories', 'Finance', 'delete', 'expense_categories');

-- Add missing origins permissions
INSERT INTO permissions (name, display_name, description, module, action, resource) VALUES
('origins.create', 'Create Origins', 'Create new product origins', 'Inventory', 'create', 'origins'),
('origins.read', 'View Origins', 'View product origins', 'Inventory', 'read', 'origins'),
('origins.update', 'Update Origins', 'Update product origins', 'Inventory', 'update', 'origins'),
('origins.delete', 'Delete Origins', 'Delete product origins', 'Inventory', 'delete', 'origins');
```

## Conclusion

All expense-related, inventory, and origins routes now implement modern RBAC with:

- ✅ **Fine-grained access control** - Specific permissions for each operation
- ✅ **Enhanced security** - All endpoints properly protected
- ✅ **Workflow support** - Approval/rejection permissions for expenses
- ✅ **Consistent implementation** - Following established patterns
- ✅ **Future-ready** - Easy to extend and modify
- ✅ **Audit-compliant** - Complete permission logging
- ✅ **Maintainable** - Clear, consistent codebase

The implementation provides enterprise-level security while maintaining flexibility and ease of use. All routes now follow the same permission-based pattern, making the system more secure and manageable across all modules.
