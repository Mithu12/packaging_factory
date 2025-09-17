import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, hasRole, hasAnyRole, Role } from '@/utils/rbac';

interface RoleGuardProps {
  children: ReactNode;
  module?: string;
  action?: string;
  requiredRole?: Role;
  requiredRoles?: Role[];
  fallback?: ReactNode;
  showFallback?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  module,
  action,
  requiredRole,
  requiredRoles,
  fallback = null,
  showFallback = false,
}) => {
  const { user } = useAuth();

  // Check permission-based access
  if (module && action) {
    const hasAccess = hasPermission(user, module, action);
    if (!hasAccess) {
      return showFallback ? <>{fallback}</> : null;
    }
  }

  // Check role-based access
  if (requiredRole) {
    const hasAccess = hasRole(user, requiredRole);
    if (!hasAccess) {
      return showFallback ? <>{fallback}</> : null;
    }
  }

  // Check multiple roles access
  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = hasAnyRole(user, requiredRoles);
    if (!hasAccess) {
      return showFallback ? <>{fallback}</> : null;
    }
  }

  return <>{children}</>;
};

export default RoleGuard;
