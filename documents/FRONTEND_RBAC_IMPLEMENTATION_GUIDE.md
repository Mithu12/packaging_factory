# 🔐 Frontend RBAC Implementation Guide

## ✅ **What Has Been Implemented**

I've created a complete frontend RBAC system that mirrors your backend implementation:

### 📁 **New Files Created:**

1. **`frontend/src/types/rbac.ts`** - Type definitions and permission constants
2. **`frontend/src/services/rbac-api.ts`** - API service for RBAC operations
3. **`frontend/src/contexts/RBACContext.tsx`** - React context for permission management
4. **`frontend/src/components/rbac/PermissionGuard.tsx`** - Conditional rendering components
5. **`frontend/src/components/rbac/ProtectedRoute.tsx`** - Route-level protection
6. **`frontend/src/components/rbac/PermissionButton.tsx`** - Permission-aware buttons
7. **`frontend/src/pages/AccessDenied.tsx`** - Access denied page
8. **`frontend/src/examples/RBACUsageExamples.tsx`** - Usage examples and patterns

### 🔧 **Modified Files:**
- **`frontend/src/App.tsx`** - Added RBACProvider and AccessDenied route

## 🚀 **How to Use the Frontend RBAC System**

### **1. Basic Setup (Already Done)**

The RBAC system is already integrated into your App.tsx:

```tsx
<AuthProvider>
  <RBACProvider>  {/* NEW: Provides permission context */}
    <TooltipProvider>
      {/* Your app content */}
    </TooltipProvider>
  </RBACProvider>
</AuthProvider>
```

### **2. Backend API Endpoints Needed**

You'll need to add these endpoints to your backend:

```typescript
// Add to your auth routes
GET  /auth/profile/permissions  // Get user with all permissions
POST /auth/check-permission     // Check single permission
POST /auth/check-any-permission // Check multiple permissions
```

### **3. Component Usage Patterns**

#### **A. Permission Guards (Conditional Rendering)**

```tsx
import { PermissionGuard, CreateGuard } from '@/components/rbac/PermissionGuard';
import { PERMISSIONS } from '@/types/rbac';

// Hide content if no permission
<PermissionGuard permission={PERMISSIONS.PRODUCTS_CREATE}>
  <CreateProductForm />
</PermissionGuard>

// Show fallback if no permission
<PermissionGuard 
  permission={PERMISSIONS.USERS_DELETE}
  fallback={<div>Access Denied</div>}
  showFallback
>
  <DeleteUserButton />
</PermissionGuard>

// Convenience components
<CreateGuard resource="products">
  <AddProductButton />
</CreateGuard>

<SystemAdminGuard>
  <SystemSettings />
</SystemAdminGuard>
```

#### **B. Permission Buttons**

```tsx
import { PermissionButton, CreateButton, DeleteButton } from '@/components/rbac/PermissionButton';

// Button hidden if no permission
<PermissionButton 
  permission={PERMISSIONS.PRODUCTS_CREATE}
  hideIfNoPermission
  onClick={handleCreate}
>
  Create Product
</PermissionButton>

// Button disabled if no permission
<PermissionButton 
  permission={PERMISSIONS.PRODUCTS_UPDATE}
  disableIfNoPermission
  onClick={handleUpdate}
>
  Update Product
</PermissionButton>

// Convenience components
<CreateButton resource="brands" hideIfNoPermission onClick={handleCreateBrand}>
  Add Brand
</CreateButton>

<DeleteButton resource="products" hideIfNoPermission onClick={handleDelete}>
  Delete Product
</DeleteButton>
```

#### **C. Route Protection**

```tsx
import { ProtectedRoute } from '@/components/rbac/ProtectedRoute';

// Single permission required
<ProtectedRoute permission={PERMISSIONS.PRODUCTS_READ}>
  <ProductsPage />
</ProtectedRoute>

// Multiple permissions - user needs ANY
<ProtectedRoute permissions={[PERMISSIONS.PRODUCTS_READ, PERMISSIONS.BRANDS_READ]}>
  <InventoryPage />
</ProtectedRoute>

// System admin only
<ProtectedRoute systemAdminOnly>
  <SystemSettingsPage />
</ProtectedRoute>
```

#### **D. Using Hooks**

```tsx
import { useRBAC, useProductPermissions, usePermission } from '@/contexts/RBACContext';

const MyComponent = () => {
  const { hasPermission, isSystemAdmin } = useRBAC();
  const productPerms = useProductPermissions();
  const canCreateProducts = usePermission(PERMISSIONS.PRODUCTS_CREATE);

  return (
    <div>
      {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
        <button>Create Product</button>
      )}
      
      {productPerms.canUpdateProducts && (
        <button>Update Product</button>
      )}
      
      {isSystemAdmin() && (
        <button>System Admin Action</button>
      )}
    </div>
  );
};
```

### **4. Navigation Menu Integration**

```tsx
// In your navigation component
import { PermissionGuard } from '@/components/rbac/PermissionGuard';

const Navigation = () => (
  <nav>
    <PermissionGuard permission={PERMISSIONS.PRODUCTS_READ}>
      <NavLink to="/products">Products</NavLink>
    </PermissionGuard>
    
    <PermissionGuard permission={PERMISSIONS.CUSTOMERS_READ}>
      <NavLink to="/customers">Customers</NavLink>
    </PermissionGuard>
    
    <PermissionGuard permission={PERMISSIONS.EXPENSES_READ}>
      <NavLink to="/expenses">Expenses</NavLink>
    </PermissionGuard>
    
    <SystemAdminGuard>
      <NavLink to="/system-settings">System Settings</NavLink>
    </SystemAdminGuard>
  </nav>
);
```

### **5. Form Field Protection**

```tsx
const ProductForm = () => {
  return (
    <form>
      <input name="name" placeholder="Product Name" />
      <input name="price" placeholder="Price" />
      
      {/* Only show advanced fields to users with update permission */}
      <UpdateGuard resource="products">
        <input name="cost" placeholder="Cost Price" />
        <input name="margin" placeholder="Profit Margin" />
      </UpdateGuard>
      
      {/* Only show admin fields to system admins */}
      <SystemAdminGuard>
        <input name="internal_notes" placeholder="Internal Notes" />
      </SystemAdminGuard>
    </form>
  );
};
```

## 🔧 **Backend Integration Required**

### **1. Add Permission Check Endpoints**

Add these to your `auth.routes.ts`:

```typescript
// Get user profile with permissions
router.get('/profile/permissions',
  authenticate,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user!.user_id;
    const userWithPermissions = await RoleMediator.getUserWithPermissions(userId);
    res.json({
      success: true,
      data: userWithPermissions
    });
  })
);

// Check single permission
router.post('/check-permission',
  authenticate,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user!.user_id;
    const { module, action, resource } = req.body;
    const hasPermission = await RoleMediator.hasPermission(userId, { module, action, resource });
    res.json({
      success: true,
      data: { hasPermission }
    });
  })
);

// Check multiple permissions
router.post('/check-any-permission',
  authenticate,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user!.user_id;
    const { permissions } = req.body;
    const hasPermission = await RoleMediator.hasAnyPermission(userId, permissions);
    res.json({
      success: true,
      data: { hasPermission }
    });
  })
);
```

### **2. Extend RoleMediator**

Add this method to your `RoleMediator.ts`:

```typescript
static async getUserWithPermissions(userId: number): Promise<UserWithPermissions> {
  // Get user details
  const user = await this.getUserById(userId);
  
  // Get user's role
  const userRole = await this.getUserRole(userId);
  
  // Get role permissions
  const rolePermissions = await this.getRolePermissions(userRole.id);
  
  // Get direct user permissions
  const directPermissions = await this.getUserDirectPermissions(userId);
  
  // Combine all permissions
  const allPermissions = [...rolePermissions, ...directPermissions];
  
  return {
    ...user,
    user_role: userRole,
    role_permissions: rolePermissions,
    direct_permissions: directPermissions,
    all_permissions: allPermissions
  };
}
```

## 🎯 **Migration Strategy**

### **Phase 1: Basic Integration**
1. ✅ Add RBAC types and context (Done)
2. ✅ Create permission components (Done)
3. 🔄 Add backend API endpoints
4. 🔄 Test basic permission checking

### **Phase 2: Component Migration**
1. Replace existing role checks with permission checks
2. Add permission guards to sensitive UI elements
3. Protect route access with permission requirements
4. Update navigation menus

### **Phase 3: Advanced Features**
1. Add resource-level permissions (own vs all resources)
2. Implement permission caching
3. Add permission audit logging
4. Create permission management UI

## 🔍 **Example: Migrating Existing Components**

### **Before (Role-based):**
```tsx
const ProductsList = () => {
  const { user } = useAuth();
  
  return (
    <div>
      <h1>Products</h1>
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <button>Create Product</button>
      )}
      {user?.role === 'admin' && (
        <button>Delete All</button>
      )}
    </div>
  );
};
```

### **After (Permission-based):**
```tsx
const ProductsList = () => {
  return (
    <div>
      <h1>Products</h1>
      <CreateButton resource="products" hideIfNoPermission>
        Create Product
      </CreateButton>
      <SystemAdminButton hideIfNoPermission variant="destructive">
        Delete All
      </SystemAdminButton>
    </div>
  );
};
```

## 🚀 **Benefits of Frontend RBAC**

### **1. Security**
- ✅ Granular permission control
- ✅ Consistent with backend permissions
- ✅ Prevents UI exposure of unauthorized actions

### **2. User Experience**
- ✅ Clean UI - users only see what they can access
- ✅ No confusing disabled buttons for missing permissions
- ✅ Clear access denied messages

### **3. Development**
- ✅ Reusable permission components
- ✅ Type-safe permission checking
- ✅ Easy to maintain and extend
- ✅ Consistent patterns across the app

### **4. Maintainability**
- ✅ Centralized permission definitions
- ✅ Easy to add new permissions
- ✅ Clear separation of concerns
- ✅ Testable permission logic

## 📝 **Next Steps**

1. **Add Backend Endpoints**: Implement the required API endpoints
2. **Test Integration**: Verify permission checking works
3. **Migrate Components**: Start replacing role checks with permission checks
4. **Update Routes**: Add permission requirements to sensitive routes
5. **Test Thoroughly**: Ensure all permission scenarios work correctly

The frontend RBAC system is now ready to use and provides the same level of security and flexibility as your backend implementation! 🎉
