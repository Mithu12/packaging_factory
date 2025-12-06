import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PermissionGuard, 
  CreateGuard, 
  UpdateGuard, 
  DeleteGuard, 
  SystemAdminGuard 
} from '@/components/rbac/PermissionGuard';
import { 
  PermissionButton, 
  CreateButton, 
  UpdateButton, 
  DeleteButton, 
  SystemAdminButton 
} from '@/components/rbac/PermissionButton';
import { PERMISSIONS } from '@/types/rbac';
import { useRBAC, useProductPermissions, useFinancePermissions } from '@/contexts/RBACContext';

/**
 * This file demonstrates how to use the RBAC system in your components
 * Copy these patterns to your actual components
 */

export const RBACUsageExamples: React.FC = () => {
  const { hasPermission, isSystemAdmin } = useRBAC();
  const productPermissions = useProductPermissions();
  const financePermissions = useFinancePermissions();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">RBAC Usage Examples</h1>

      {/* Example 1: Basic Permission Guards */}
      <Card>
        <CardHeader>
          <CardTitle>1. Basic Permission Guards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show content only if user can create products */}
          <PermissionGuard permission={PERMISSIONS.PRODUCTS_CREATE}>
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              ✅ You can create products! This content is visible.
            </div>
          </PermissionGuard>

          {/* Show content only if user can delete products */}
          <PermissionGuard permission={PERMISSIONS.PRODUCTS_DELETE}>
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              🗑️ You can delete products! This content is visible.
            </div>
          </PermissionGuard>

          {/* Show fallback if no permission */}
          <PermissionGuard 
            permission={PERMISSIONS.SYSTEM_ADMIN}
            fallback={<div className="p-4 bg-gray-50 border border-gray-200 rounded">❌ You are not a system admin</div>}
            showFallback
          >
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              👑 You are a system admin!
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>

      {/* Example 2: Permission Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>2. Permission Buttons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {/* Button hidden if no permission */}
            <PermissionButton 
              permission={PERMISSIONS.PRODUCTS_CREATE}
              hideIfNoPermission
              onClick={() => alert('Creating product...')}
            >
              Create Product (Hidden if no permission)
            </PermissionButton>

            {/* Button disabled if no permission */}
            <PermissionButton 
              permission={PERMISSIONS.PRODUCTS_UPDATE}
              disableIfNoPermission
              onClick={() => alert('Updating product...')}
            >
              Update Product (Disabled if no permission)
            </PermissionButton>

            {/* Convenience components */}
            <CreateButton 
              resource="brands"
              hideIfNoPermission
              onClick={() => alert('Creating brand...')}
            >
              Create Brand
            </CreateButton>

            <DeleteButton 
              resource="products"
              hideIfNoPermission
              onClick={() => alert('Deleting product...')}
            >
              Delete Product
            </DeleteButton>

            <SystemAdminButton 
              hideIfNoPermission
              variant="destructive"
              onClick={() => alert('System admin action...')}
            >
              System Admin Only
            </SystemAdminButton>
          </div>
        </CardContent>
      </Card>

      {/* Example 3: Multiple Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>3. Multiple Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User needs ANY of these permissions */}
          <PermissionGuard 
            permissions={[PERMISSIONS.PRODUCTS_READ, PERMISSIONS.BRANDS_READ]}
            requireAll={false}
          >
            <div className="p-4 bg-purple-50 border border-purple-200 rounded">
              📦 You can read products OR brands (ANY permission)
            </div>
          </PermissionGuard>

          {/* User needs ALL of these permissions */}
          <PermissionGuard 
            permissions={[PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.BRANDS_CREATE]}
            requireAll={true}
          >
            <div className="p-4 bg-orange-50 border border-orange-200 rounded">
              🔥 You can create BOTH products AND brands (ALL permissions)
            </div>
          </PermissionGuard>

          {/* Button with multiple permissions */}
          <PermissionButton 
            permissions={[PERMISSIONS.EXPENSES_APPROVE, PERMISSIONS.PAYMENTS_APPROVE]}
            requireAll={false}
            hideIfNoPermission
            onClick={() => alert('Approving...')}
          >
            Approve (Expenses OR Payments)
          </PermissionButton>
        </CardContent>
      </Card>

      {/* Example 4: Using Hooks */}
      <Card>
        <CardHeader>
          <CardTitle>4. Using RBAC Hooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Product Permissions:</h4>
              <ul className="text-sm space-y-1">
                <li>Can Create: {productPermissions.canCreateProducts ? '✅' : '❌'}</li>
                <li>Can Read: {productPermissions.canReadProducts ? '✅' : '❌'}</li>
                <li>Can Update: {productPermissions.canUpdateProducts ? '✅' : '❌'}</li>
                <li>Can Delete: {productPermissions.canDeleteProducts ? '✅' : '❌'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Finance Permissions:</h4>
              <ul className="text-sm space-y-1">
                <li>Can Create Payments: {financePermissions.canCreatePayments ? '✅' : '❌'}</li>
                <li>Can Approve Payments: {financePermissions.canApprovePayments ? '✅' : '❌'}</li>
                <li>Can Create Expenses: {financePermissions.canCreateExpenses ? '✅' : '❌'}</li>
                <li>Can Approve Expenses: {financePermissions.canApproveExpenses ? '✅' : '❌'}</li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">System Status:</h4>
            <p className="text-sm">
              System Admin: {isSystemAdmin() ? '👑 Yes' : '👤 No'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Example 5: Conditional Rendering */}
      <Card>
        <CardHeader>
          <CardTitle>5. Conditional Rendering in Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Traditional if statement */}
            {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
              <Button onClick={() => alert('Creating product...')}>
                Create Product (Traditional If)
              </Button>
            )}

            {/* Using convenience guards */}
            <CreateGuard resource="categories">
              <Button onClick={() => alert('Creating category...')}>
                Create Category (Guard Component)
              </Button>
            </CreateGuard>

            <UpdateGuard resource="suppliers" module="Purchase">
              <Button variant="outline" onClick={() => alert('Updating supplier...')}>
                Update Supplier
              </Button>
            </UpdateGuard>

            <DeleteGuard resource="expenses" module="Finance">
              <Button variant="destructive" onClick={() => alert('Deleting expense...')}>
                Delete Expense
              </Button>
            </DeleteGuard>
          </div>
        </CardContent>
      </Card>

      {/* Example 6: Navigation Menu Items */}
      <Card>
        <CardHeader>
          <CardTitle>6. Navigation Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            <PermissionGuard permission={PERMISSIONS.PRODUCTS_READ}>
              <a href="/products" className="block p-2 hover:bg-gray-100 rounded">
                📦 Products
              </a>
            </PermissionGuard>

            <PermissionGuard permission={PERMISSIONS.CUSTOMERS_READ}>
              <a href="/customers" className="block p-2 hover:bg-gray-100 rounded">
                👥 Customers
              </a>
            </PermissionGuard>

            <PermissionGuard permission={PERMISSIONS.EXPENSES_READ}>
              <a href="/expenses" className="block p-2 hover:bg-gray-100 rounded">
                💰 Expenses
              </a>
            </PermissionGuard>

            <SystemAdminGuard>
              <a href="/system-settings" className="block p-2 hover:bg-gray-100 rounded text-red-600">
                ⚙️ System Settings (Admin Only)
              </a>
            </SystemAdminGuard>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
};

// Example of how to protect a page component
export const ExampleProtectedPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products Management</h1>
      
      {/* Action buttons with permissions */}
      <div className="flex gap-2 mb-6">
        <CreateButton 
          resource="products"
          onClick={() => alert('Navigate to create product')}
        >
          Add New Product
        </CreateButton>
        
        <PermissionButton 
          permission={PERMISSIONS.INVENTORY_ADJUST}
          hideIfNoPermission
          variant="outline"
          onClick={() => alert('Navigate to stock adjustment')}
        >
          Adjust Stock
        </PermissionButton>
        
        <SystemAdminButton 
          hideIfNoPermission
          variant="destructive"
          onClick={() => alert('Bulk operations')}
        >
          Bulk Operations
        </SystemAdminButton>
      </div>

      {/* Content sections with permissions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PermissionGuard permission={PERMISSIONS.PRODUCTS_READ}>
          <Card>
            <CardHeader>
              <CardTitle>Products List</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Product list would go here...</p>
            </CardContent>
          </Card>
        </PermissionGuard>

        <PermissionGuard permission={PERMISSIONS.INVENTORY_TRACK}>
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Inventory tracking would go here...</p>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>
    </div>
  );
};
