"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PermissionCheck } from '@/types/rbac';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: PermissionCheck;
  permissions?: PermissionCheck[];
  requireAll?: boolean;
  systemAdminOnly?: boolean;
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

/**
 * ProtectedRoute - Route-level permission protection for Next.js
 * 
 * Usage examples:
 * 
 * // Single permission required
 * <ProtectedRoute permission={PERMISSIONS.PRODUCTS_READ}>
 *   <ProductsPage />
 * </ProtectedRoute>
 * 
 * // Multiple permissions - user needs ANY
 * <ProtectedRoute permissions={[PERMISSIONS.PRODUCTS_READ, PERMISSIONS.BRANDS_READ]}>
 *   <InventoryPage />
 * </ProtectedRoute>
 * 
 * // Multiple permissions - user needs ALL
 * <ProtectedRoute permissions={[PERMISSIONS.USERS_CREATE, PERMISSIONS.ROLES_MANAGE]} requireAll>
 *   <UserManagementPage />
 * </ProtectedRoute>
 * 
 * // System admin only
 * <ProtectedRoute systemAdminOnly>
 *   <SystemSettingsPage />
 * </ProtectedRoute>
 * 
 * // Custom fallback path
 * <ProtectedRoute permission={PERMISSIONS.FINANCE_READ} fallbackPath="/dashboard">
 *   <FinancePage />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  systemAdminOnly = false,
  fallbackPath = '/access-denied',
  showAccessDenied = true,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSystemAdmin, isLoading: rbacLoading } = useRBAC();

  // Show loading while authentication or permissions are loading
  if (authLoading || rbacLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Use useEffect for navigation in Next.js to avoid issues during render
    if (typeof window !== 'undefined') {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // System admin check
  if (systemAdminOnly) {
    if (!isSystemAdmin()) {
      if (typeof window !== 'undefined') {
        router.replace(showAccessDenied ? fallbackPath : '/dashboard');
      }
      return null;
    }
    return <>{children}</>;
  }

  // Single permission check
  if (permission) {
    if (!hasPermission(permission)) {
      if (typeof window !== 'undefined') {
        router.replace(showAccessDenied ? fallbackPath : '/dashboard');
      }
      return null;
    }
    return <>{children}</>;
  }

  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      if (typeof window !== 'undefined') {
        router.replace(showAccessDenied ? fallbackPath : '/dashboard');
      }
      return null;
    }
    return <>{children}</>;
  }

  // No permission requirements specified - render children
  return <>{children}</>;
};

// Convenience components for common route protection patterns

interface ResourceProtectedRouteProps {
  children: React.ReactNode;
  resource: string;
  module?: string;
  action?: 'create' | 'read' | 'update' | 'delete' | 'approve';
  fallbackPath?: string;
}

export const CreateProtectedRoute: React.FC<ResourceProtectedRouteProps> = ({ 
  children, 
  resource, 
  module = 'Inventory',
  fallbackPath = '/access-denied'
}) => (
  <ProtectedRoute 
    permission={{ module, action: 'create', resource }}
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

export const ReadProtectedRoute: React.FC<ResourceProtectedRouteProps> = ({ 
  children, 
  resource, 
  module = 'Inventory',
  fallbackPath = '/access-denied'
}) => (
  <ProtectedRoute 
    permission={{ module, action: 'read', resource }}
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

export const UpdateProtectedRoute: React.FC<ResourceProtectedRouteProps> = ({ 
  children, 
  resource, 
  module = 'Inventory',
  fallbackPath = '/access-denied'
}) => (
  <ProtectedRoute 
    permission={{ module, action: 'update', resource }}
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

export const DeleteProtectedRoute: React.FC<ResourceProtectedRouteProps> = ({ 
  children, 
  resource, 
  module = 'Inventory',
  fallbackPath = '/access-denied'
}) => (
  <ProtectedRoute 
    permission={{ module, action: 'delete', resource }}
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);

export const SystemAdminRoute: React.FC<{
  children: React.ReactNode;
  fallbackPath?: string;
}> = ({ children, fallbackPath = '/access-denied' }) => (
  <ProtectedRoute 
    systemAdminOnly
    fallbackPath={fallbackPath}
  >
    {children}
  </ProtectedRoute>
);
