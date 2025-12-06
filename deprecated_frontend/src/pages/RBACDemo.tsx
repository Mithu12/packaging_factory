import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useAuth } from '@/contexts/AuthContext';

export default function RBACDemo() {
  const { user } = useAuth();
  const { 
    userPermissions, 
    permissions, 
    hasPermission, 
    isSystemAdmin, 
    isLoading 
  } = useRBAC();
  const productPermissions = useProductPermissions();
  const financePermissions = useFinancePermissions();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RBAC System Demo</h1>
        <p className="text-muted-foreground mt-2">
          This page demonstrates the Role-Based Access Control system in action.
        </p>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>Current User Information</CardTitle>
          <CardDescription>Your role and permission details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Username:</p>
              <p>{user?.username || 'Unknown'}</p>
            </div>
            <div>
              <p className="font-semibold">Role:</p>
              <Badge variant="outline" className="capitalize">
                {user?.role || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="font-semibold">System Admin:</p>
              <Badge variant={isSystemAdmin() ? "default" : "secondary"}>
                {isSystemAdmin() ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <p className="font-semibold">Total Permissions:</p>
              <Badge variant="outline">
                {permissions.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Guards Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Guards</CardTitle>
          <CardDescription>Content shown/hidden based on permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PermissionGuard permission={PERMISSIONS.PRODUCTS_CREATE}>
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                ✅ <strong>Products Create:</strong> You can create products!
              </div>
            </PermissionGuard>

            <PermissionGuard permission={PERMISSIONS.PRODUCTS_DELETE}>
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                🗑️ <strong>Products Delete:</strong> You can delete products!
              </div>
            </PermissionGuard>

            <PermissionGuard permission={PERMISSIONS.EXPENSES_APPROVE}>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                💰 <strong>Expenses Approve:</strong> You can approve expenses!
              </div>
            </PermissionGuard>

            <SystemAdminGuard>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                👑 <strong>System Admin:</strong> You have admin privileges!
              </div>
            </SystemAdminGuard>

            <PermissionGuard 
              permission={PERMISSIONS.SYSTEM_ADMIN}
              fallback={
                <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                  ❌ <strong>System Admin:</strong> You are not a system admin
                </div>
              }
              showFallback
            >
              <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                👑 <strong>System Admin:</strong> You have admin privileges!
              </div>
            </PermissionGuard>
          </div>
        </CardContent>
      </Card>

      {/* Permission Buttons Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Buttons</CardTitle>
          <CardDescription>Buttons that are hidden or disabled based on permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Product Management:</h4>
              <div className="flex gap-2 flex-wrap">
                <CreateButton 
                  resource="products"
                  hideIfNoPermission
                  onClick={() => alert('Creating product...')}
                >
                  Create Product (Hidden)
                </CreateButton>

                <UpdateButton 
                  resource="products"
                  disableIfNoPermission
                  onClick={() => alert('Updating product...')}
                >
                  Update Product (Disabled)
                </UpdateButton>

                <DeleteButton 
                  resource="products"
                  hideIfNoPermission
                  onClick={() => alert('Deleting product...')}
                >
                  Delete Product
                </DeleteButton>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Finance Management:</h4>
              <div className="flex gap-2 flex-wrap">
                <PermissionButton 
                  permission={PERMISSIONS.EXPENSES_CREATE}
                  hideIfNoPermission
                  onClick={() => alert('Creating expense...')}
                >
                  Create Expense
                </PermissionButton>

                <PermissionButton 
                  permission={PERMISSIONS.EXPENSES_APPROVE}
                  hideIfNoPermission
                  variant="default"
                  onClick={() => alert('Approving expense...')}
                >
                  Approve Expense
                </PermissionButton>

                <PermissionButton 
                  permission={PERMISSIONS.PAYMENTS_CREATE}
                  disableIfNoPermission
                  onClick={() => alert('Creating payment...')}
                >
                  Create Payment
                </PermissionButton>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">System Administration:</h4>
              <div className="flex gap-2 flex-wrap">
                <SystemAdminButton 
                  hideIfNoPermission
                  variant="destructive"
                  onClick={() => alert('System admin action...')}
                >
                  System Reset (Admin Only)
                </SystemAdminButton>

                <PermissionButton 
                  permission={PERMISSIONS.USERS_CREATE}
                  hideIfNoPermission
                  onClick={() => alert('Creating user...')}
                >
                  Create User
                </PermissionButton>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
          <CardDescription>Your current permissions breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Product Permissions:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Can Create Products:</span>
                  <Badge variant={productPermissions.canCreateProducts ? "default" : "secondary"}>
                    {productPermissions.canCreateProducts ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Can Read Products:</span>
                  <Badge variant={productPermissions.canReadProducts ? "default" : "secondary"}>
                    {productPermissions.canReadProducts ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Can Update Products:</span>
                  <Badge variant={productPermissions.canUpdateProducts ? "default" : "secondary"}>
                    {productPermissions.canUpdateProducts ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Can Delete Products:</span>
                  <Badge variant={productPermissions.canDeleteProducts ? "default" : "secondary"}>
                    {productPermissions.canDeleteProducts ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Finance Permissions:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Can Create Payments:</span>
                  <Badge variant={financePermissions.canCreatePayments ? "default" : "secondary"}>
                    {financePermissions.canCreatePayments ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Can Approve Payments:</span>
                  <Badge variant={financePermissions.canApprovePayments ? "default" : "secondary"}>
                    {financePermissions.canApprovePayments ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Can Create Expenses:</span>
                  <Badge variant={financePermissions.canCreateExpenses ? "default" : "secondary"}>
                    {financePermissions.canCreateExpenses ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Can Approve Expenses:</span>
                  <Badge variant={financePermissions.canApproveExpenses ? "default" : "secondary"}>
                    {financePermissions.canApproveExpenses ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-3">All Your Permissions:</h4>
            <div className="flex flex-wrap gap-2">
              {permissions.length > 0 ? (
                permissions.map((permission) => (
                  <Badge key={permission.id} variant="outline" className="text-xs">
                    {permission.module}.{permission.action}.{permission.resource}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">No permissions assigned</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
