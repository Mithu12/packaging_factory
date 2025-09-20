# RBAC Implementation Guide for API Endpoints

This guide explains how to implement Role-Based Access Control (RBAC) in your ERP system's API endpoints.

## Current RBAC System Overview

### 1. Database Structure

Your RBAC system uses the following tables:

```sql
-- Roles table
roles (id, name, display_name, description, level, department, is_active)

-- Permissions table  
permissions (id, name, display_name, description, module, action, resource)

-- Role-Permission junction
role_permissions (role_id, permission_id, granted_at, granted_by)

-- User-Permission direct assignments
user_permissions (user_id, permission_id, granted_at, granted_by, expires_at)

-- Users table (updated)
users (id, username, email, role_id, ...)
```

### 2. Available Roles

```typescript
export const ROLE_NAMES = {
  SYSTEM_ADMIN: 'system_admin',
  EXECUTIVE: 'executive', 
  FINANCE_MANAGER: 'finance_manager',
  FINANCE_STAFF: 'finance_staff',
  HR_MANAGER: 'hr_manager',
  EMPLOYEE: 'employee',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
  PURCHASE_MANAGER: 'purchase_manager',
  PURCHASE_STAFF: 'purchase_staff',
  INVENTORY_MANAGER: 'inventory_manager',
  WAREHOUSE_STAFF: 'warehouse_staff',
  TECHNICIAN_SUPERVISOR: 'technician_supervisor',
  TECHNICIAN: 'technician',
  CALL_CENTER_MANAGER: 'call_center_manager',
  CALL_CENTER_OPERATOR: 'call_center_operator',
  CUSTOMER_SERVICE: 'customer_service',
  MARKETING: 'marketing',
  AUDITOR: 'auditor'
};
```

### 3. Permission Structure

Permissions follow the pattern: `module.action.resource`

**Modules**: Finance, Sales, Purchase, Inventory, User Management, HR, Dashboard, etc.
**Actions**: create, read, update, delete, approve, reject, manage
**Resources**: users, payments, sales_orders, products, customers, etc.

## Implementation Methods

### Method 1: Using Permission Middleware (Recommended)

#### Import Required Middleware
```typescript
import { authenticate } from '@/middleware/auth';
import { 
  requirePermission, 
  requireAnyPermission, 
  requireSystemAdmin,
  PERMISSIONS 
} from '@/middleware/permission';
```

#### Basic Permission Check
```typescript
// Single permission required
router.get('/products', 
  authenticate,
  requirePermission({
    module: 'Inventory',
    action: 'read', 
    resource: 'products'
  }),
  ProductsController.getAllProducts
);

// Using predefined permissions
router.post('/products',
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  ProductsController.createProduct
);
```

#### Multiple Permission Options
```typescript
// User needs ANY of these permissions
router.get('/dashboard',
  authenticate,
  requireAnyPermission([
    PERMISSIONS.DASHBOARD_EXECUTIVE,
    PERMISSIONS.DASHBOARD_DEPARTMENTAL
  ]),
  DashboardController.getDashboard
);
```

#### System Admin Only
```typescript
router.delete('/users/:id',
  authenticate,
  requireSystemAdmin(),
  UsersController.deleteUser
);
```

### Method 2: Using Legacy Role-Based Middleware

#### Import Legacy Middleware
```typescript
import { 
  authenticate, 
  adminOnly, 
  managerAndAbove, 
  employeeAndAbove 
} from '@/middleware/auth';
```

#### Usage Examples
```typescript
// Admin only
router.delete('/products/:id',
  authenticate,
  adminOnly,
  ProductsController.deleteProduct
);

// Manager and above
router.get('/reports/financial',
  authenticate, 
  managerAndAbove,
  ReportsController.getFinancialReports
);

// Employee and above (all authenticated users)
router.get('/products',
  authenticate,
  employeeAndAbove,
  ProductsController.getAllProducts
);
```

### Method 3: Resource Ownership + Permissions

```typescript
import { requirePermissionOrOwnership } from '@/middleware/permission';

// Allow access if user has permission OR owns the resource
router.get('/expenses/:id',
  authenticate,
  requirePermissionOrOwnership(
    PERMISSIONS.EXPENSES_READ,
    async (req) => {
      // Function to get resource owner ID
      const expense = await ExpenseMediator.getExpense(req.params.id);
      return expense.created_by;
    }
  ),
  ExpensesController.getExpense
);
```

### Method 4: Manual Permission Checking

```typescript
import { RoleMediator } from '@/mediators/rbac/RoleMediator';

router.post('/custom-endpoint',
  authenticate,
  async (req, res, next) => {
    const userId = req.user.user_id;
    
    // Check specific permission
    const hasPermission = await RoleMediator.hasPermission(userId, {
      module: 'Finance',
      action: 'approve', 
      resource: 'payments'
    });
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }
    
    next();
  },
  CustomController.handleRequest
);
```

## Complete Implementation Examples

### Example 1: Products API with Full RBAC

```typescript
import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import ProductsController from '@/controllers/products/products.controller';

const router = express.Router();

// Read products - Inventory read permission
router.get('/', 
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  ProductsController.getAllProducts
);

// Create product - Inventory create permission  
router.post('/',
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  ProductsController.createProduct
);

// Update product - Inventory update permission
router.put('/:id',
  authenticate, 
  requirePermission({
    module: 'Inventory',
    action: 'update',
    resource: 'products'
  }),
  ProductsController.updateProduct
);

// Delete product - System admin only
router.delete('/:id',
  authenticate,
  requireSystemAdmin(),
  ProductsController.deleteProduct
);

export default router;
```

### Example 2: Sales Orders with Multiple Permission Levels

```typescript
import express from 'express';
import { authenticate } from '@/middleware/auth';
import { 
  requirePermission, 
  requireAnyPermission, 
  PERMISSIONS 
} from '@/middleware/permission';

const router = express.Router();

// View sales orders - Sales read OR executive dashboard
router.get('/',
  authenticate,
  requireAnyPermission([
    PERMISSIONS.SALES_ORDERS_READ,
    PERMISSIONS.DASHBOARD_EXECUTIVE
  ]),
  SalesOrdersController.getAllSalesOrders
);

// Create sales order - Sales create permission
router.post('/',
  authenticate,
  requirePermission(PERMISSIONS.SALES_ORDERS_CREATE),
  SalesOrdersController.createSalesOrder
);

// Approve sales order - Sales approve permission
router.patch('/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.SALES_ORDERS_APPROVE),
  SalesOrdersController.approveSalesOrder
);

export default router;
```

### Example 3: User Management with Hierarchical Permissions

```typescript
import express from 'express';
import { authenticate } from '@/middleware/auth';
import { 
  requirePermission, 
  requireSystemAdmin,
  PERMISSIONS 
} from '@/middleware/permission';

const router = express.Router();

// View users - User Management read
router.get('/',
  authenticate,
  requirePermission(PERMISSIONS.USERS_READ),
  UsersController.getAllUsers
);

// Create user - User Management create
router.post('/',
  authenticate,
  requirePermission(PERMISSIONS.USERS_CREATE),
  UsersController.createUser
);

// Update user - User Management update
router.put('/:id',
  authenticate,
  requirePermission(PERMISSIONS.USERS_UPDATE),
  UsersController.updateUser
);

// Delete user - System admin only
router.delete('/:id',
  authenticate,
  requireSystemAdmin(),
  UsersController.deleteUser
);

// Manage roles - Role management permission
router.post('/:id/assign-role',
  authenticate,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  UsersController.assignRole
);

export default router;
```

## Available Predefined Permissions

```typescript
// User Management
PERMISSIONS.USERS_CREATE
PERMISSIONS.USERS_READ  
PERMISSIONS.USERS_UPDATE
PERMISSIONS.USERS_DELETE
PERMISSIONS.ROLES_MANAGE

// Finance
PERMISSIONS.PAYMENTS_CREATE
PERMISSIONS.PAYMENTS_READ
PERMISSIONS.PAYMENTS_APPROVE
PERMISSIONS.VOUCHERS_CREATE
PERMISSIONS.VOUCHERS_APPROVE

// Sales  
PERMISSIONS.SALES_ORDERS_CREATE
PERMISSIONS.SALES_ORDERS_READ
PERMISSIONS.SALES_ORDERS_APPROVE
PERMISSIONS.CUSTOMERS_CREATE
PERMISSIONS.CUSTOMERS_READ

// Purchase
PERMISSIONS.PURCHASE_ORDERS_CREATE
PERMISSIONS.PURCHASE_ORDERS_READ
PERMISSIONS.PURCHASE_ORDERS_APPROVE
PERMISSIONS.SUPPLIERS_CREATE
PERMISSIONS.SUPPLIERS_READ

// Inventory
PERMISSIONS.PRODUCTS_CREATE
PERMISSIONS.PRODUCTS_READ
PERMISSIONS.INVENTORY_TRACK
PERMISSIONS.INVENTORY_ADJUST

// Dashboard & Reports
PERMISSIONS.DASHBOARD_EXECUTIVE
PERMISSIONS.DASHBOARD_DEPARTMENTAL
PERMISSIONS.REPORTS_FINANCIAL
PERMISSIONS.REPORTS_SALES

// Self Service
PERMISSIONS.PROFILE_READ
PERMISSIONS.PROFILE_UPDATE
PERMISSIONS.PAYSLIP_READ
```

## Best Practices

### 1. Always Use Authentication First
```typescript
// ✅ Correct
router.get('/endpoint', authenticate, requirePermission(...), handler);

// ❌ Wrong - no authentication
router.get('/endpoint', requirePermission(...), handler);
```

### 2. Use Specific Permissions Over Role Checks
```typescript
// ✅ Preferred - Permission-based
router.post('/products', 
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  handler
);

// ❌ Less flexible - Role-based  
router.post('/products', 
  authenticate,
  managerAndAbove,
  handler
);
```

### 3. Combine Permissions for Complex Logic
```typescript
// Multiple options
router.get('/dashboard',
  authenticate,
  requireAnyPermission([
    PERMISSIONS.DASHBOARD_EXECUTIVE,
    PERMISSIONS.DASHBOARD_DEPARTMENTAL
  ]),
  handler
);
```

### 4. Use System Admin for Destructive Operations
```typescript
// Destructive operations
router.delete('/users/:id',
  authenticate,
  requireSystemAdmin(),
  handler
);
```

### 5. Handle Permission Errors Gracefully
```typescript
// The middleware automatically returns 403 with proper error messages
// No additional error handling needed in most cases
```

## Migration from Legacy to RBAC

### Step 1: Identify Current Role Usage
```bash
# Find all role-based middleware usage
grep -r "adminOnly\|managerAndAbove\|employeeAndAbove" backend/src/routes/
```

### Step 2: Map Roles to Permissions
```typescript
// Old way
router.get('/products', authenticate, managerAndAbove, handler);

// New way  
router.get('/products', authenticate, requirePermission(PERMISSIONS.PRODUCTS_READ), handler);
```

### Step 3: Update Gradually
- Start with new endpoints using RBAC
- Gradually migrate existing endpoints
- Keep legacy middleware for backward compatibility

## Testing RBAC Implementation

### 1. Test with Different User Roles
```typescript
// Test user with different roles
const testUsers = {
  admin: { role_id: 1 }, // system_admin
  manager: { role_id: 2 }, // sales_manager  
  employee: { role_id: 3 } // employee
};
```

### 2. Test Permission Combinations
```typescript
// Test user with specific permissions
await RoleMediator.assignPermissionsToUser({
  user_id: testUserId,
  permission_ids: [1, 2, 3] // specific permissions
}, adminUserId);
```

### 3. Test Ownership Logic
```typescript
// Test resource ownership
const expense = await createExpense({ created_by: userId });
// Test access with owner vs non-owner
```

## Troubleshooting

### Common Issues

1. **403 Forbidden Errors**
   - Check if user has required permission
   - Verify permission exists in database
   - Check role assignments

2. **Permission Not Found**
   - Ensure permission exists in `permissions` table
   - Check spelling of module/action/resource

3. **Role Assignment Issues**
   - Verify user has `role_id` set
   - Check role has required permissions in `role_permissions`

### Debug Permission Checks
```typescript
// Check user permissions
const userPermissions = await RoleMediator.getUserPermissions(userId);
console.log('User permissions:', userPermissions);

// Check specific permission
const hasPermission = await RoleMediator.hasPermission(userId, {
  module: 'Inventory',
  action: 'read', 
  resource: 'products'
});
console.log('Has permission:', hasPermission);
```

This RBAC system provides fine-grained access control while maintaining flexibility and ease of use. Choose the implementation method that best fits your specific use case and security requirements.
