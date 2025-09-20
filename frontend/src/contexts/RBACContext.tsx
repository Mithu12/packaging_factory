import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserWithPermissions, Permission, PermissionCheck, PERMISSIONS } from '@/types/rbac';
import { RBACApi } from '@/services/rbac-api';
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
      const userWithPermissions = await RBACApi.getUserWithPermissions();
      setUserPermissions(userWithPermissions);
      setPermissions(userWithPermissions.all_permissions || []);
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      setUserPermissions(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPermissions = async () => {
    await loadUserPermissions();
  };

  // Helper function to create permission string
  const createPermissionString = (permission: PermissionCheck): string => {
    return `${permission.module}.${permission.action}.${permission.resource}`;
  };

  // Check if user has a specific permission
  const hasPermission = (permission: PermissionCheck): boolean => {
    if (!userPermissions || !permissions.length) return false;
    
    const permissionString = createPermissionString(permission);
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
           userPermissions?.user_role?.name === 'system_admin' ||
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
