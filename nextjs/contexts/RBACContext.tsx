'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserWithPermissions, Permission, PermissionCheck, PERMISSIONS } from '@/types/rbac';
import { useAuth } from './AuthContext';

interface RBACContextType {
  userPermissions: UserWithPermissions | null;
  permissions: Permission[];
  isLoading: boolean;
  hasPermission: (permission: PermissionCheck) => boolean;
  hasAnyPermission: (permissions: PermissionCheck[]) => boolean;
  hasAllPermissions: (permissions: PermissionCheck[]) => boolean;
  isSystemAdmin: () => boolean;
  canCreate: (resource: string, module?: string) => boolean;
  canRead: (resource: string, module?: string) => boolean;
  canUpdate: (resource: string, module?: string) => boolean;
  canDelete: (resource: string, module?: string) => boolean;
  canApprove: (resource: string, module?: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

interface RBACProviderProps {
  children: ReactNode;
}

export const RBACProvider: React.FC<RBACProviderProps> = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState<UserWithPermissions | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  // Load user permissions when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserPermissions();
    } else {
      setUserPermissions(null);
      setPermissions([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadUserPermissions = async () => {
    try {
      setIsLoading(true);

      // First try to fetch user permissions from the backend API
      try {
        const response = await fetch('/api/rbac/user-permissions', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.data) {
            setUserPermissions(data.data);
            setPermissions(data.data.all_permissions || []);
            setIsLoading(false);
            return;
          }
        }
      } catch (fetchError) {
        console.warn('Failed to fetch user permissions from API:', fetchError);
        // Continue to fallback methods
      }

      // Fallback: use user's role to determine basic permissions
      if (user) {
        // Create a basic UserWithPermissions object using the user data
        let basicPermissions: Permission[] = [];

        // Assign permissions based on role
        if (user.role === 'admin' || user.role === 'system_admin') {
          // Admin gets all permissions (simplified approach)
          basicPermissions = [
            {
              id: 0,
              name: 'all',
              display_name: 'All Permissions',
              description: 'Has all permissions',
              module: 'System',
              action: 'manage',
              resource: 'system',
              created_at: new Date().toISOString(),
            }
          ];
        } else if (user.role && user.role.includes('inventory')) {
          // Inventory role gets inventory-related permissions
          basicPermissions = [
            {
              id: 1,
              name: 'Inventory.read.products',
              display_name: 'Read Products',
              description: 'Permission to read products',
              module: 'Inventory',
              action: 'read',
              resource: 'products',
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              name: 'Inventory.create.products',
              display_name: 'Create Products',
              description: 'Permission to create products',
              module: 'Inventory',
              action: 'create',
              resource: 'products',
              created_at: new Date().toISOString(),
            },
            {
              id: 3,
              name: 'Inventory.update.products',
              display_name: 'Update Products',
              description: 'Permission to update products',
              module: 'Inventory',
              action: 'update',
              resource: 'products',
              created_at: new Date().toISOString(),
            },
            {
              id: 4,
              name: 'Inventory.delete.products',
              display_name: 'Delete Products',
              description: 'Permission to delete products',
              module: 'Inventory',
              action: 'delete',
              resource: 'products',
              created_at: new Date().toISOString(),
            },
          ];
        } else if (user.permissions && Array.isArray(user.permissions)) {
          // If user has explicit permissions array
          basicPermissions = user.permissions.map((perm: string) => {
            const parts = perm.split('.');
            if (parts.length === 3) {
              return {
                id: 0,
                name: perm,
                display_name: perm,
                description: '',
                module: parts[0],
                action: parts[1],
                resource: parts[2],
                created_at: new Date().toISOString(),
              };
            }
            return {
              id: 0,
              name: perm,
              display_name: perm,
              description: '',
              module: 'Unknown',
              action: 'Unknown',
              resource: 'Unknown',
              created_at: new Date().toISOString(),
            };
          });
        }

        const basicUserWithPermissions: UserWithPermissions = {
          ...user,
          role_details: undefined,
          role_permissions: [],
          direct_permissions: [],
          all_permissions: basicPermissions,
        };

        setUserPermissions(basicUserWithPermissions);
        setPermissions(basicPermissions);
      } else {
        setUserPermissions(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      // Try to use basic user permissions as fallback
      if (user) {
        const fallbackUserWithPermissions: UserWithPermissions = {
          ...user,
          role_details: undefined,
          role_permissions: [],
          direct_permissions: [],
          all_permissions: user.permissions ? user.permissions.map((perm: string) => {
            const parts = perm.split('.');
            if (parts.length === 3) {
              return {
                id: 0,
                name: perm,
                display_name: perm,
                description: '',
                module: parts[0],
                action: parts[1],
                resource: parts[2],
                created_at: new Date().toISOString(),
              };
            }
            return {
              id: 0,
              name: perm,
              display_name: perm,
              description: '',
              module: 'Unknown',
              action: 'Unknown',
              resource: 'Unknown',
              created_at: new Date().toISOString(),
            };
          }) : [],
        };
        setUserPermissions(fallbackUserWithPermissions);
        setPermissions(fallbackUserWithPermissions.all_permissions);
      } else {
        setUserPermissions(null);
        setPermissions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPermissions = async () => {
    await loadUserPermissions();
  };

  // Helper function to create permission string
  const createPermissionString = (permission: PermissionCheck): string => {
    if (!permission || typeof permission !== 'object') {
      console.error('Invalid permission object:', permission);
      return '';
    }
    if (!permission.module || !permission.action || !permission.resource) {
      console.error('Permission object missing required fields:', permission);
      return '';
    }
    return `${permission.module}.${permission.action}.${permission.resource}`;
  };

  // Check if user has a specific permission
  const hasPermission = (permission: PermissionCheck): boolean => {
    if (!userPermissions) return false;
    if (!permission) {
      console.error('Permission is undefined or null');
      return false;
    }

    // Check if user has the special "all" permission (admin)
    if (permissions.some(p => p.name === 'all' && p.resource === 'system')) {
      return true;
    }

    const permissionString = createPermissionString(permission);
    if (!permissionString) return false;

    return permissions.some(p =>
      `${p.module}.${p.action}.${p.resource}` === permissionString
    );
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissionChecks: PermissionCheck[]): boolean => {
    if (!userPermissions || !permissions.length) return false;

    return permissionChecks.some(permission => hasPermission(permission));
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissionChecks: PermissionCheck[]): boolean => {
    if (!userPermissions || !permissions.length) return false;

    return permissionChecks.every(permission => hasPermission(permission));
  };

  // Check if user is system admin
  const isSystemAdmin = (): boolean => {
    return hasPermission(PERMISSIONS.SYSTEM_ADMIN) ||
           userPermissions?.role_details?.name === 'admin' ||
           userPermissions?.role === 'admin';
  };

  // Convenience methods for common permission checks
  const canCreate = (resource: string, module: string = 'Inventory'): boolean => {
    return hasPermission({ module, action: 'create', resource });
  };

  const canRead = (resource: string, module: string = 'Inventory'): boolean => {
    return hasPermission({ module, action: 'read', resource });
  };

  const canUpdate = (resource: string, module: string = 'Inventory'): boolean => {
    return hasPermission({ module, action: 'update', resource });
  };

  const canDelete = (resource: string, module: string = 'Inventory'): boolean => {
    return hasPermission({ module, action: 'delete', resource });
  };

  const canApprove = (resource: string, module: string = 'Finance'): boolean => {
    return hasPermission({ module, action: 'approve', resource });
  };

  const value: RBACContextType = {
    userPermissions,
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSystemAdmin,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canApprove,
    refreshPermissions,
  };

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

// Custom hooks for specific permission types
export const usePermission = (permission: PermissionCheck) => {
  const { hasPermission } = useRBAC();
  return hasPermission(permission);
};

export const usePermissions = (permissions: PermissionCheck[]) => {
  const { hasAnyPermission, hasAllPermissions } = useRBAC();
  return {
    hasAny: hasAnyPermission(permissions),
    hasAll: hasAllPermissions(permissions),
  };
};

export const useSystemAdmin = () => {
  const { isSystemAdmin } = useRBAC();
  return isSystemAdmin();
};

// Resource-specific permission hooks
export const useProductPermissions = () => {
  const { canCreate, canRead, canUpdate, canDelete } = useRBAC();
  return {
    canCreateProducts: canCreate('products'),
    canReadProducts: canRead('products'),
    canUpdateProducts: canUpdate('products'),
    canDeleteProducts: canDelete('products'),
  };
};

export const useFinancePermissions = () => {
  const { canCreate, canRead, canUpdate, canDelete, canApprove } = useRBAC();
  return {
    canCreatePayments: canCreate('payments', 'Finance'),
    canReadPayments: canRead('payments', 'Finance'),
    canUpdatePayments: canUpdate('payments', 'Finance'),
    canDeletePayments: canDelete('payments', 'Finance'),
    canApprovePayments: canApprove('payments', 'Finance'),
    canCreateExpenses: canCreate('expenses', 'Finance'),
    canReadExpenses: canRead('expenses', 'Finance'),
    canUpdateExpenses: canUpdate('expenses', 'Finance'),
    canDeleteExpenses: canDelete('expenses', 'Finance'),
    canApproveExpenses: canApprove('expenses', 'Finance'),
  };
};

export const useUserManagementPermissions = () => {
  const { canCreate, canRead, canUpdate, canDelete, hasPermission } = useRBAC();
  return {
    canCreateUsers: canCreate('users', 'User Management'),
    canReadUsers: canRead('users', 'User Management'),
    canUpdateUsers: canUpdate('users', 'User Management'),
    canDeleteUsers: canDelete('users', 'User Management'),
    canManageRoles: hasPermission(PERMISSIONS.ROLES_MANAGE),
  };
};