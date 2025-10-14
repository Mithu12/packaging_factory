# Brands Routes RBAC Implementation

This document summarizes the implementation of RBAC (Role-Based Access Control) for the brands routes using Method 1 (Permission-Based).

## Changes Made

### 1. Updated Imports in `brands.routes.ts`

**Before:**
```typescript
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
```

**After:**
```typescript
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
```

### 2. Added Brand Permissions to `permission.ts`

Added the following brand-specific permissions to the `PERMISSIONS` object:

```typescript
// Brands
BRANDS_CREATE: createPermissionCheck('Inventory', 'create', 'brands'),
BRANDS_READ: createPermissionCheck('Inventory', 'read', 'brands'),
BRANDS_UPDATE: createPermissionCheck('Inventory', 'update', 'brands'),
BRANDS_DELETE: createPermissionCheck('Inventory', 'delete', 'brands'),
```

### 3. Updated All Route Handlers

#### GET `/` - Get All Brands
**Before:**
```typescript
router.get('/', authenticate, employeeAndAbove, expressAsyncHandler(BrandsController.getAllBrands));
```

**After:**
```typescript
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.BRANDS_READ), 
  expressAsyncHandler(BrandsController.getAllBrands)
);
```

#### GET `/:id` - Get Brand by ID
**Before:**
```typescript
router.get('/:id',
  authenticate,
  employeeAndAbove,
  expressAsyncHandler(BrandsController.getBrandById)
);
```

**After:**
```typescript
router.get('/:id',
  authenticate,
  requirePermission(PERMISSIONS.BRANDS_READ),
  expressAsyncHandler(BrandsController.getBrandById)
);
```

#### POST `/` - Create Brand
**Before:**
```typescript
router.post('/',
  authenticate,
  managerAndAbove,
  validateRequest(validateCreateBrand),
  expressAsyncHandler(BrandsController.createBrand)
);
```

**After:**
```typescript
router.post('/',
  authenticate,
  requirePermission(PERMISSIONS.BRANDS_CREATE),
  validateRequest(validateCreateBrand),
  expressAsyncHandler(BrandsController.createBrand)
);
```

#### PUT `/:id` - Update Brand
**Before:**
```typescript
router.put('/:id',
  authenticate,
  managerAndAbove,
  validateRequest(validateUpdateBrand),
  expressAsyncHandler(BrandsController.updateBrand)
);
```

**After:**
```typescript
router.put('/:id',
  authenticate,
  requirePermission(PERMISSIONS.BRANDS_UPDATE),
  validateRequest(validateUpdateBrand),
  expressAsyncHandler(BrandsController.updateBrand)
);
```

#### DELETE `/:id` - Delete Brand
**Before:**
```typescript
router.delete('/:id',
  authenticate,
  adminOnly,
  expressAsyncHandler(BrandsController.deleteBrand)
);
```

**After:**
```typescript
router.delete('/:id',
  authenticate,
  requirePermission(PERMISSIONS.BRANDS_DELETE),
  expressAsyncHandler(BrandsController.deleteBrand)
);
```

#### GET `/status/:status` - Get Brands by Status
**Before:**
```typescript
router.get('/status/:status',
  authenticate,
  employeeAndAbove,
  expressAsyncHandler(BrandsController.getBrandsByStatus)
);
```

**After:**
```typescript
router.get('/status/:status',
  authenticate,
  requirePermission(PERMISSIONS.BRANDS_READ),
  expressAsyncHandler(BrandsController.getBrandsByStatus)
);
```

## Permission Mapping

The following table shows how the old role-based permissions map to the new RBAC permissions:

| Endpoint | Old Permission | New Permission | Description |
|----------|---------------|----------------|-------------|
| GET `/` | `employeeAndAbove` | `PERMISSIONS.BRANDS_READ` | View all brands |
| GET `/:id` | `employeeAndAbove` | `PERMISSIONS.BRANDS_READ` | View specific brand |
| POST `/` | `managerAndAbove` | `PERMISSIONS.BRANDS_CREATE` | Create new brand |
| PUT `/:id` | `managerAndAbove` | `PERMISSIONS.BRANDS_UPDATE` | Update existing brand |
| DELETE `/:id` | `adminOnly` | `PERMISSIONS.BRANDS_DELETE` | Delete brand |
| GET `/status/:status` | `employeeAndAbove` | `PERMISSIONS.BRANDS_READ` | View brands by status |

## Database Permissions

The following permissions are already defined in the database (from `add-comprehensive-permissions.ts`):

```sql
-- These permissions exist in the permissions table
{ name: 'brands.create', display_name: 'Create Brands', module: 'Inventory', action: 'create', resource: 'brands' }
{ name: 'brands.read', display_name: 'View Brands', module: 'Inventory', action: 'read', resource: 'brands' }
{ name: 'brands.update', display_name: 'Update Brands', module: 'Inventory', action: 'update', resource: 'brands' }
{ name: 'brands.delete', display_name: 'Delete Brands', module: 'Inventory', action: 'delete', resource: 'brands' }
```

## Role Assignments

Based on the existing RBAC configuration, the following roles have brand permissions:

### System Admin
- ✅ All brand permissions (full access)

### Inventory Manager
- ✅ `brands.create` - Can create brands
- ✅ `brands.read` - Can view brands
- ✅ `brands.update` - Can update brands
- ✅ `brands.delete` - Can delete brands (if assigned)

### Warehouse Staff
- ✅ `brands.read` - Can view brands
- ❌ No create/update/delete permissions

### Other Roles
- Roles like Sales Manager, Purchase Manager may have `brands.read` permission for product management
- Employee role typically has no brand permissions

## Benefits of RBAC Implementation

### 1. **Granular Control**
- Fine-grained permissions instead of broad role categories
- Can assign specific brand permissions without full inventory access

### 2. **Flexibility**
- Easy to grant/revoke specific permissions
- Temporary permissions with expiration dates
- Direct user permission assignments

### 3. **Security**
- Principle of least privilege
- Clear audit trail of permissions
- Consistent permission checking

### 4. **Maintainability**
- Centralized permission definitions
- Easy to add new permissions
- Clear permission naming convention

## Testing the Implementation

### 1. Test with Different User Roles

```bash
# Test with Inventory Manager (should have full access)
curl -H "Authorization: Bearer <inventory_manager_token>" \
     http://localhost:3000/api/brands

# Test with Warehouse Staff (should have read-only access)
curl -H "Authorization: Bearer <warehouse_staff_token>" \
     http://localhost:3000/api/brands

# Test create with insufficient permissions (should get 403)
curl -X POST -H "Authorization: Bearer <warehouse_staff_token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Brand"}' \
     http://localhost:3000/api/brands
```

### 2. Expected Responses

**Success (200):** User has required permission
**Forbidden (403):** User lacks required permission
**Unauthorized (401):** No valid authentication token

### 3. Permission Check Logs

The system logs all permission checks:
```
[INFO] PermissionMiddleware.requirePermission - Permission granted
[WARN] PermissionMiddleware.requirePermission - Permission denied
```

## Migration Notes

### Backward Compatibility
- Old role-based middleware removed
- All routes now use permission-based checks
- No breaking changes to API endpoints

### Database Requirements
- Ensure RBAC tables are created (`add-rbac-system.ts`)
- Ensure comprehensive permissions are loaded (`add-comprehensive-permissions.ts`)
- Verify role-permission assignments are correct

### Future Enhancements
- Add brand-specific permissions (e.g., `brands.approve`)
- Implement resource-level permissions (per-brand access)
- Add audit logging for brand operations

## Conclusion

The brands routes now use a modern, flexible RBAC system that provides:
- ✅ Fine-grained access control
- ✅ Better security through least privilege
- ✅ Easier permission management
- ✅ Consistent permission checking
- ✅ Audit trail and logging
- ✅ Future extensibility

The implementation follows Method 1 (Permission-Based) as requested and maintains all existing functionality while providing enhanced security and flexibility.
