'use client';

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { PermissionCheck } from '@/types/rbac';
import { useRBAC } from '@/contexts/RBACContext';
import { cn } from '@/lib/utils';

interface PermissionButtonProps extends ButtonProps {
  permission?: PermissionCheck;
  permissions?: PermissionCheck[];
  requireAll?: boolean;
  systemAdminOnly?: boolean;
  hideIfNoPermission?: boolean;
  disableIfNoPermission?: boolean;
  children: React.ReactNode;
}

/**
 * PermissionButton - Button component with built-in permission checking
 *
 * Usage examples:
 *
 * // Single permission - hide if no permission
 * <PermissionButton
 *   permission={PERMISSIONS.PRODUCTS_CREATE}
 *   hideIfNoPermission
 *   onClick={handleCreateProduct}
 * >
 *   Create Product
 * </PermissionButton>
 *
 * // Single permission - disable if no permission
 * <PermissionButton
 *   permission={PERMISSIONS.PRODUCTS_UPDATE}
 *   disableIfNoPermission
 *   onClick={handleUpdateProduct}
 * >
 *   Update Product
 * </PermissionButton>
 *
 * // Multiple permissions - user needs ANY
 * <PermissionButton
 *   permissions={[PERMISSIONS.PRODUCTS_READ, PERMISSIONS.BRANDS_READ]}
 *   hideIfNoPermission
 *   onClick={handleViewInventory}
 * >
 *   View Inventory
 * </PermissionButton>
 *
 * // System admin only
 * <PermissionButton
 *   systemAdminOnly
 *   hideIfNoPermission
 *   variant="destructive"
 *   onClick={handleSystemReset}
 * >
 *   Reset System
 * </PermissionButton>
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  permissions,
  requireAll = false,
  systemAdminOnly = false,
  hideIfNoPermission = false,
  disableIfNoPermission = true,
  children,
  className,
  disabled,
  ...props
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSystemAdmin, isLoading } = useRBAC();

  // Don't render while loading
  if (isLoading) {
    return null;
  }

  let hasRequiredPermission = true;

  // System admin check
  if (systemAdminOnly) {
    hasRequiredPermission = isSystemAdmin();
  }
  // Single permission check
  else if (permission) {
    hasRequiredPermission = hasPermission(permission);
  }
  // Multiple permissions check
  else if (permissions && permissions.length > 0) {
    hasRequiredPermission = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  // Hide button if no permission and hideIfNoPermission is true
  if (!hasRequiredPermission && hideIfNoPermission) {
    return null;
  }

  // Determine if button should be disabled
  const isDisabled = disabled || (!hasRequiredPermission && disableIfNoPermission);

  return (
    <Button
      {...props}
      disabled={isDisabled}
      className={cn(
        !hasRequiredPermission && disableIfNoPermission && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </Button>
  );
};

// Convenience components for common button patterns

interface ResourceButtonProps extends Omit<ButtonProps, 'children'> {
  resource: string;
  module?: string;
  hideIfNoPermission?: boolean;
  disableIfNoPermission?: boolean;
  children: React.ReactNode;
}

export const CreateButton: React.FC<ResourceButtonProps> = ({
  resource,
  module = 'Inventory',
  hideIfNoPermission = false,
  disableIfNoPermission = true,
  children,
  ...props
}) => (
  <PermissionButton
    permission={{ module, action: 'create', resource }}
    hideIfNoPermission={hideIfNoPermission}
    disableIfNoPermission={disableIfNoPermission}
    {...props}
  >
    {children}
  </PermissionButton>
);

export const UpdateButton: React.FC<ResourceButtonProps> = ({
  resource,
  module = 'Inventory',
  hideIfNoPermission = false,
  disableIfNoPermission = true,
  children,
  ...props
}) => (
  <PermissionButton
    permission={{ module, action: 'update', resource }}
    hideIfNoPermission={hideIfNoPermission}
    disableIfNoPermission={disableIfNoPermission}
    {...props}
  >
    {children}
  </PermissionButton>
);

export const DeleteButton: React.FC<ResourceButtonProps> = ({
  resource,
  module = 'Inventory',
  hideIfNoPermission = false,
  disableIfNoPermission = true,
  children,
  ...props
}) => (
  <PermissionButton
    permission={{ module, action: 'delete', resource }}
    hideIfNoPermission={hideIfNoPermission}
    disableIfNoPermission={disableIfNoPermission}
    variant="destructive"
    {...props}
  >
    {children}
  </PermissionButton>
);

export const ApproveButton: React.FC<ResourceButtonProps> = ({
  resource,
  module = 'Finance',
  hideIfNoPermission = false,
  disableIfNoPermission = true,
  children,
  ...props
}) => (
  <PermissionButton
    permission={{ module, action: 'approve', resource }}
    hideIfNoPermission={hideIfNoPermission}
    disableIfNoPermission={disableIfNoPermission}
    variant="default"
    {...props}
  >
    {children}
  </PermissionButton>
);

export const SystemAdminButton: React.FC<Omit<ButtonProps, 'children'> & {
  hideIfNoPermission?: boolean;
  disableIfNoPermission?: boolean;
  children: React.ReactNode;
}> = ({
  hideIfNoPermission = false,
  disableIfNoPermission = true,
  children,
  ...props
}) => (
  <PermissionButton
    systemAdminOnly
    hideIfNoPermission={hideIfNoPermission}
    disableIfNoPermission={disableIfNoPermission}
    {...props}
  >
    {children}
  </PermissionButton>
);