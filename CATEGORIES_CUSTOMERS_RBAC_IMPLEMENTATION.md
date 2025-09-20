# Categories & Customers RBAC Implementation

This document summarizes the implementation of RBAC (Role-Based Access Control) for both categories and customers routes using Method 1 (Permission-Based).

## Changes Made

### 1. Updated Permission Middleware (`permission.ts`)

Added new permission constants for both modules:

#### Categories Permissions
```typescript
// Categories
CATEGORIES_CREATE: createPermissionCheck('Inventory', 'create', 'categories'),
CATEGORIES_READ: createPermissionCheck('Inventory', 'read', 'categories'),
CATEGORIES_UPDATE: createPermissionCheck('Inventory', 'update', 'categories'),
CATEGORIES_DELETE: createPermissionCheck('Inventory', 'delete', 'categories'),
```

#### Customers Permissions  
```typescript
// Customers
CUSTOMERS_CREATE: createPermissionCheck('Sales', 'create', 'customers'),
CUSTOMERS_READ: createPermissionCheck('Sales', 'read', 'customers'),
CUSTOMERS_UPDATE: createPermissionCheck('Sales', 'update', 'customers'),
CUSTOMERS_DELETE: createPermissionCheck('Sales', 'delete', 'customers'),
```

### 2. Categories Routes Implementation (`categories.routes.ts`)

#### Updated Imports
**Before:**
```typescript
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from "@/middleware/auth";
```

**After:**
```typescript
import { authenticate } from "@/middleware/auth";
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
```

#### Route Implementations

| Endpoint | Old Permission | New Permission | Description |
|----------|---------------|----------------|-------------|
| `GET /` | `employeeAndAbove` | `PERMISSIONS.CATEGORIES_READ` | Get all categories |
| `GET /stats` | `managerAndAbove` | `PERMISSIONS.CATEGORIES_READ` | Get category statistics |
| `GET /search` | No auth | `PERMISSIONS.CATEGORIES_READ` | Search categories |
| `GET /subcategories` | No auth | `PERMISSIONS.CATEGORIES_READ` | Get all subcategories |
| `GET /subcategories/search` | No auth | `PERMISSIONS.CATEGORIES_READ` | Search subcategories |
| `GET /subcategories/:id` | No auth | `PERMISSIONS.CATEGORIES_READ` | Get subcategory by ID |
| `GET /:id` | No auth | `PERMISSIONS.CATEGORIES_READ` | Get category by ID |
| `POST /` | `managerAndAbove` | `PERMISSIONS.CATEGORIES_CREATE` | Create category |
| `PUT /:id` | `managerAndAbove` | `PERMISSIONS.CATEGORIES_UPDATE` | Update category |
| `DELETE /:id` | `adminOnly` | `PERMISSIONS.CATEGORIES_DELETE` | Delete category |
| `GET /:categoryId/subcategories` | No auth | `PERMISSIONS.CATEGORIES_READ` | Get subcategories for category |
| `POST /subcategories` | `managerAndAbove` | `PERMISSIONS.CATEGORIES_CREATE` | Create subcategory |
| `PUT /subcategories/:id` | `managerAndAbove` | `PERMISSIONS.CATEGORIES_UPDATE` | Update subcategory |
| `DELETE /subcategories/:id` | `adminOnly` | `PERMISSIONS.CATEGORIES_DELETE` | Delete subcategory |

#### Example Implementation
```typescript
// GET /api/categories - Get all categories
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  validateQuery(getCategoriesQuerySchema), 
  expressAsyncHandler(CategoriesController.getAllCategories)
);

// POST /api/categories - Create new category
router.post('/', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  validateRequest(createCategorySchema), 
  expressAsyncHandler(CategoriesController.createCategory)
);
```

### 3. Customers Routes Implementation (`customers.routes.ts`)

#### Updated Imports
**Before:**
```typescript
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from "@/middleware/auth";
```

**After:**
```typescript
import { authenticate } from "@/middleware/auth";
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
```

#### Route Implementations

| Endpoint | Old Permission | New Permission | Description |
|----------|---------------|----------------|-------------|
| `GET /` | `employeeAndAbove` | `PERMISSIONS.CUSTOMERS_READ` | Get all customers |
| `GET /stats` | `managerAndAbove` | `PERMISSIONS.CUSTOMERS_READ` | Get customer statistics |
| `GET /search` | No auth | `PERMISSIONS.CUSTOMERS_READ` | Search customers |
| `GET /type/:type` | No auth | `PERMISSIONS.CUSTOMERS_READ` | Get customers by type |
| `GET /:id` | No auth | `PERMISSIONS.CUSTOMERS_READ` | Get customer by ID |
| `POST /` | `employeeAndAbove` | `PERMISSIONS.CUSTOMERS_CREATE` | Create customer |
| `PUT /:id` | `managerAndAbove` | `PERMISSIONS.CUSTOMERS_UPDATE` | Update customer |
| `PATCH /:id/toggle-status` | No auth | `PERMISSIONS.CUSTOMERS_UPDATE` | Toggle customer status |
| `PATCH /:id/loyalty-points` | No auth | `PERMISSIONS.CUSTOMERS_UPDATE` | Update loyalty points |
| `DELETE /:id` | `adminOnly` | `PERMISSIONS.CUSTOMERS_DELETE` | Soft delete customer |
| `DELETE /:id/hard` | No auth | `requireSystemAdmin()` | Hard delete customer |
| `GET /:id/references` | No auth | `PERMISSIONS.CUSTOMERS_READ` | Check customer references |

#### Example Implementation
```typescript
// GET /api/customers - Get all customers
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  validateQuery(customerQuerySchema), 
  expressAsyncHandler(CustomersController.getAllCustomers)
);

// POST /api/customers - Create new customer
router.post('/', 
  authenticate, 
  requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
  validateRequest(createCustomerSchema), 
  expressAsyncHandler(CustomersController.createCustomer)
);
```

## Database Permissions

### Categories Permissions (Already in Database)
```sql
-- From add-comprehensive-permissions.ts
{ name: 'categories.create', display_name: 'Create Product Categories', module: 'Inventory', action: 'create', resource: 'categories' }
{ name: 'categories.read', display_name: 'View Product Categories', module: 'Inventory', action: 'read', resource: 'categories' }
{ name: 'categories.update', display_name: 'Update Product Categories', module: 'Inventory', action: 'update', resource: 'categories' }
{ name: 'categories.delete', display_name: 'Delete Product Categories', module: 'Inventory', action: 'delete', resource: 'categories' }
```

### Customers Permissions (Already in Database)
```sql
-- From add-comprehensive-permissions.ts
{ name: 'customers.create', display_name: 'Create Customers', module: 'Sales', action: 'create', resource: 'customers' }
{ name: 'customers.read', display_name: 'View Customers', module: 'Sales', action: 'read', resource: 'customers' }
{ name: 'customers.update', display_name: 'Update Customers', module: 'Sales', action: 'update', resource: 'customers' }
{ name: 'customers.delete', display_name: 'Delete Customers', module: 'Sales', action: 'delete', resource: 'customers' }
{ name: 'customers.credit_limit', display_name: 'Manage Customer Credit Limits', module: 'Sales', action: 'update', resource: 'customer_credit' }
```

## Role Assignments

Based on the existing RBAC configuration:

### Categories Permissions by Role

#### System Admin
- ✅ All category permissions (full access)

#### Inventory Manager
- ✅ `categories.create` - Can create categories
- ✅ `categories.read` - Can view categories  
- ✅ `categories.update` - Can update categories
- ✅ `categories.delete` - Can delete categories

#### Warehouse Staff
- ✅ `categories.read` - Can view categories
- ❌ No create/update/delete permissions

#### Other Roles
- Sales/Purchase teams may have `categories.read` for product management
- Employee role typically has no category permissions

### Customers Permissions by Role

#### System Admin
- ✅ All customer permissions (full access)

#### Sales Manager
- ✅ `customers.create` - Can create customers
- ✅ `customers.read` - Can view customers
- ✅ `customers.update` - Can update customers
- ✅ `customers.delete` - Can delete customers (if assigned)

#### Sales Executive
- ✅ `customers.create` - Can create customers
- ✅ `customers.read` - Can view customers
- ✅ `customers.update` - Can update customers
- ❌ No delete permissions

#### Customer Service
- ✅ `customers.read` - Can view customers
- ✅ `customers.update` - Can update customer info
- ❌ No create/delete permissions

#### Other Roles
- Finance roles may have `customers.read` for payment processing
- Employee role typically has no customer permissions

## Security Improvements

### 1. **Granular Access Control**
- **Before**: Broad role-based access (employeeAndAbove, managerAndAbove)
- **After**: Specific permission-based access for each operation

### 2. **Module Separation**
- **Categories**: Under `Inventory` module for product management
- **Customers**: Under `Sales` module for sales operations

### 3. **Enhanced Security**
- **Authentication Required**: All protected endpoints now require authentication
- **Permission Validation**: Each operation validates specific permissions
- **Audit Trail**: All permission checks are logged

### 4. **Consistent Authorization**
- **Search Endpoints**: Now protected (were previously unprotected)
- **Reference Checks**: Now require read permissions
- **Status Updates**: Require update permissions

## Testing Implementation

### 1. Categories Testing
```bash
# Test category read permission
curl -H "Authorization: Bearer <inventory_manager_token>" \
     http://localhost:3000/api/categories

# Test category create permission
curl -X POST -H "Authorization: Bearer <inventory_manager_token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Category"}' \
     http://localhost:3000/api/categories

# Test insufficient permissions (should get 403)
curl -H "Authorization: Bearer <employee_token>" \
     http://localhost:3000/api/categories
```

### 2. Customers Testing
```bash
# Test customer read permission
curl -H "Authorization: Bearer <sales_manager_token>" \
     http://localhost:3000/api/customers

# Test customer create permission
curl -X POST -H "Authorization: Bearer <sales_executive_token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Customer","email":"test@example.com"}' \
     http://localhost:3000/api/customers

# Test insufficient permissions (should get 403)
curl -H "Authorization: Bearer <warehouse_staff_token>" \
     http://localhost:3000/api/customers
```

### 3. Expected Response Codes
- **200**: Permission granted, operation successful
- **403**: Permission denied, insufficient privileges
- **401**: No authentication token or invalid token

## Migration Benefits

### 1. **Security Enhancement**
- Removed overly permissive access to search endpoints
- Added authentication to previously unprotected routes
- Granular permission control instead of role-based blanket access

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

## Future Enhancements

### 1. **Resource-Level Permissions**
- Per-category access controls
- Customer territory-based permissions
- Hierarchical category permissions

### 2. **Advanced Features**
- Bulk operations permissions
- Import/export permissions
- Advanced search permissions

### 3. **Integration**
- Frontend permission-based UI controls
- Dynamic menu generation based on permissions
- Real-time permission updates

## Conclusion

Both categories and customers routes now implement modern RBAC with:

- ✅ **Fine-grained access control** - Specific permissions for each operation
- ✅ **Enhanced security** - All endpoints properly protected
- ✅ **Consistent implementation** - Following established patterns
- ✅ **Future-ready** - Easy to extend and modify
- ✅ **Audit-compliant** - Complete permission logging
- ✅ **Maintainable** - Clear, consistent codebase

The implementation provides enterprise-level security while maintaining flexibility and ease of use. All routes now follow the same permission-based pattern, making the system more secure and manageable.
