import React, { ReactNode } from 'react';
import { PermissionCheck } from '@/types/rbac';
import { useRBAC } from '@/contexts/RBACContext';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: PermissionCheck;
  permissions?: PermissionCheck[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: ReactNode;
  showFallback?: boolean;
  systemAdminOnly?: boolean;
}

/**
 * PermissionGuard - Conditionally renders children based on user permissions
 * 
 * Usage examples:
 * 
 * // Single permission check
 * <PermissionGuard permission={PERMISSIONS.PRODUCTS_CREATE}>
 *   <CreateProductButton />
 * </PermissionGuard>
 * 
 * // Multiple permissions - user needs ANY
 * <PermissionGuard permissions={[PERMISSIONS.PRODUCTS_READ, PERMISSIONS.PRODUCTS_UPDATE]}>
 *   <ProductsList />
 * </PermissionGuard>
 * 
 * // Multiple permissions - user needs ALL
 * <PermissionGuard permissions={[PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.BRANDS_CREATE]} requireAll>
 *   <AdvancedProductForm />
 * </PermissionGuard>
 * 
 * // System admin only
 * <PermissionGuard systemAdminOnly>
 *   <SystemSettings />
 * </PermissionGuard>
 * 
 * // With fallback content
 * <PermissionGuard permission={PERMISSIONS.USERS_READ} fallback={<div>Access Denied</div>} showFallback>
 *   <UsersList />
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  showFallback = false,
  systemAdminOnly = false,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSystemAdmin, isLoading } = useRBAC();

  // Show loading state if permissions are still loading
  if (isLoading) {
    return null; // or a loading spinner
  }

  // System admin check
  if (systemAdminOnly) {
    if (isSystemAdmin()) {
      return <>{children}</>;
    }
    return showFallback ? <>{fallback}</> : null;
  }

  // Single permission check
  if (permission) {
    if (hasPermission(permission)) {
      return <>{children}</>;
    }
    return showFallback ? <>{fallback}</> : null;
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (hasRequiredPermissions) {
      return <>{children}</>;
    }
    return showFallback ? <>{fallback}</> : null;
  }

  // No permission requirements specified - render children
  return <>{children}</>;
};

// Convenience components for common permission patterns

interface CreateGuardProps {
  resource: string;
  module?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export const CreateGuard: React.FC<CreateGuardProps> = ({ 
  resource, 
  module = 'Inventory', 
  children, 
  fallback, 
  showFallback = false 
}) => (
  <PermissionGuard 
    permission={{ module, action: 'create', resource }}
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const ReadGuard: React.FC<CreateGuardProps> = ({ 
  resource, 
  module = 'Inventory', 
  children, 
  fallback, 
  showFallback = false 
}) => (
  <PermissionGuard 
    permission={{ module, action: 'read', resource }}
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const UpdateGuard: React.FC<CreateGuardProps> = ({ 
  resource, 
  module = 'Inventory', 
  children, 
  fallback, 
  showFallback = false 
}) => (
  <PermissionGuard 
    permission={{ module, action: 'update', resource }}
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const DeleteGuard: React.FC<CreateGuardProps> = ({ 
  resource, 
  module = 'Inventory', 
  children, 
  fallback, 
  showFallback = false 
}) => (
  <PermissionGuard 
    permission={{ module, action: 'delete', resource }}
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const ApproveGuard: React.FC<CreateGuardProps> = ({ 
  resource, 
  module = 'Finance', 
  children, 
  fallback, 
  showFallback = false 
}) => (
  <PermissionGuard 
    permission={{ module, action: 'approve', resource }}
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);

export const SystemAdminGuard: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = false }) => (
  <PermissionGuard 
    systemAdminOnly
    fallback={fallback}
    showFallback={showFallback}
  >
    {children}
  </PermissionGuard>
);
