import { Request, Response, NextFunction } from 'express';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import { serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { PermissionCheck, PermissionMiddlewareOptions } from '@/types/rbac';
import { UserRole } from '@/types/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: UserRole;
    role_id?: number;
  };
}

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (options: PermissionMiddlewareOptions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const action = 'PermissionMiddleware.requirePermission';
    
    try {
      // Check if user is authenticated
      if (!req.user) {
        MyLogger.warn(action, 'No user in request');
        return serializeErrorResponse(res, {}, '401', 'Authentication required');
      }

      const userId = req.user.user_id;
      const permissionCheck: PermissionCheck = {
        module: options.module,
        action: options.action,
        resource: options.resource
      };

      // Check if user has the required permission
      const hasPermission = await RoleMediator.hasPermission(userId, permissionCheck);

      if (!hasPermission) {
        MyLogger.warn(action, 'Permission denied');

        const message = options.required !== false 
          ? 'Insufficient permissions to access this resource'
          : 'Permission check failed';

        return serializeErrorResponse(res, {}, '403', message);
      }

      // Permission granted
      MyLogger.info(action, 'Permission granted');

      return next();

    } catch (error) {
      MyLogger.error(action, error);
      return serializeErrorResponse(res, {}, '500', 'Error checking permissions');
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 */
export const requireAnyPermission = (permissions: PermissionCheck[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const action = 'PermissionMiddleware.requireAnyPermission';
    
    try {
      if (!req.user) {
        return serializeErrorResponse(res, {}, '401', 'Authentication required');
      }

      const userId = req.user.user_id;
      const hasAnyPermission = await RoleMediator.hasAnyPermission(userId, permissions);

      if (!hasAnyPermission) {
        MyLogger.warn(action, 'No matching permissions');

        return serializeErrorResponse(res, {}, '403', 'Insufficient permissions to access this resource');
      }

      MyLogger.info(action, 'Permission granted');
      return next();

    } catch (error) {
      MyLogger.error(action, error, {
        userId: req.user?.user_id,
        path: req.path
      });

      return serializeErrorResponse(res, {}, '500', 'Error checking permissions');
    }
  };
};

/**
 * Middleware for resource owners - allows access to own resources
 */
export const requirePermissionOrOwnership = (
  permission: PermissionCheck,
  getResourceOwnerIdFn: (req: AuthenticatedRequest) => number | Promise<number>
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const action = 'PermissionMiddleware.requirePermissionOrOwnership';
    
    try {
      if (!req.user) {
        return serializeErrorResponse(res, {}, '401', 'Authentication required');
      }

      const userId = req.user.user_id;
      
      // First check if user has general permission
      const hasPermission = await RoleMediator.hasPermission(userId, permission);
      
      if (hasPermission) {
        MyLogger.info(action, {
          userId,
          permission: `${permission.module}.${permission.action}.${permission.resource}`,
          status: 'General permission granted'
        });
        return next();
      }

      // If no general permission, check ownership
      try {
        const resourceOwnerId = await getResourceOwnerIdFn(req);
        
        if (resourceOwnerId === userId) {
          MyLogger.info(action, {
            userId,
            resourceOwnerId,
            path: req.path,
            status: 'Owner access granted'
          });
          return next();
        }
      } catch (ownershipError) {
        MyLogger.warn(action, `Could not determine resource ownership: ${ownershipError}`);
      }

      // Neither permission nor ownership
      MyLogger.warn(action, {
        userId,
        permission: `${permission.module}.${permission.action}.${permission.resource}`,
        path: req.path,
        status: 'Access denied - no permission or ownership'
      });

      return serializeErrorResponse(res, {}, '403', 'Insufficient permissions to access this resource');

    } catch (error) {
      MyLogger.error(action, error, {
        userId: req.user?.user_id,
        path: req.path
      });

      return serializeErrorResponse(res, {}, '500', 'Error checking permissions');
    }
  };
};

/**
 * Middleware to check if user is system admin
 */
export const requireSystemAdmin = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const action = 'PermissionMiddleware.requireSystemAdmin';
    
    try {
      if (!req.user) {
        return serializeErrorResponse(res, {}, '401', 'Authentication required');
      }

      const userId = req.user.user_id;
      const isAdmin = await RoleMediator.isSystemAdmin(userId);

      if (!isAdmin) {
        MyLogger.warn(action, {
          userId,
          username: req.user.username,
          role: req.user.role,
          path: req.path,
          status: 'System admin access denied'
        });

        return serializeErrorResponse(res, {}, '403', 'System administrator access required');
      }

      MyLogger.info(action, {
        userId,
        username: req.user.username,
        path: req.path,
        status: 'System admin access granted'
      });

      return next();

    } catch (error) {
      MyLogger.error(action, error, {
        userId: req.user?.user_id,
        path: req.path
      });

      return serializeErrorResponse(res, {}, '500', 'Error checking admin permissions');
    }
  };
};

/**
 * Helper function to create permission check objects
 */
export const createPermissionCheck = (module: string, action: string, resource: string): PermissionCheck => ({
  module,
  action,
  resource
});

/**
 * Common permission checks - predefined for convenience
 */
export const PERMISSIONS = {
  // User Management
  USERS_CREATE: createPermissionCheck('User Management', 'create', 'users'),
  USERS_READ: createPermissionCheck('User Management', 'read', 'users'),
  USERS_UPDATE: createPermissionCheck('User Management', 'update', 'users'),
  USERS_DELETE: createPermissionCheck('User Management', 'delete', 'users'),
  ROLES_MANAGE: createPermissionCheck('User Management', 'manage', 'roles'),

  // Finance
  PAYMENTS_CREATE: createPermissionCheck('Finance', 'create', 'payments'),
  PAYMENTS_READ: createPermissionCheck('Finance', 'read', 'payments'),
  PAYMENTS_APPROVE: createPermissionCheck('Finance', 'approve', 'payments'),
  VOUCHERS_CREATE: createPermissionCheck('Finance', 'create', 'vouchers'),
  VOUCHERS_APPROVE: createPermissionCheck('Finance', 'approve', 'vouchers'),

  // Sales
  SALES_ORDERS_CREATE: createPermissionCheck('Sales', 'create', 'sales_orders'),
  SALES_ORDERS_READ: createPermissionCheck('Sales', 'read', 'sales_orders'),
  SALES_ORDERS_APPROVE: createPermissionCheck('Sales', 'approve', 'sales_orders'),
  
  // Customers
  CUSTOMERS_CREATE: createPermissionCheck('Sales', 'create', 'customers'),
  CUSTOMERS_READ: createPermissionCheck('Sales', 'read', 'customers'),
  CUSTOMERS_UPDATE: createPermissionCheck('Sales', 'update', 'customers'),
  CUSTOMERS_DELETE: createPermissionCheck('Sales', 'delete', 'customers'),

  // Purchase
  PURCHASE_ORDERS_CREATE: createPermissionCheck('Purchase', 'create', 'purchase_orders'),
  PURCHASE_ORDERS_READ: createPermissionCheck('Purchase', 'read', 'purchase_orders'),
  PURCHASE_ORDERS_APPROVE: createPermissionCheck('Purchase', 'approve', 'purchase_orders'),
  SUPPLIERS_CREATE: createPermissionCheck('Purchase', 'create', 'suppliers'),
  SUPPLIERS_READ: createPermissionCheck('Purchase', 'read', 'suppliers'),

  // Inventory
  PRODUCTS_CREATE: createPermissionCheck('Inventory', 'create', 'products'),
  PRODUCTS_READ: createPermissionCheck('Inventory', 'read', 'products'),
  INVENTORY_TRACK: createPermissionCheck('Inventory', 'read', 'inventory'),
  INVENTORY_ADJUST: createPermissionCheck('Inventory', 'update', 'inventory'),
  
  // Brands
  BRANDS_CREATE: createPermissionCheck('Inventory', 'create', 'brands'),
  BRANDS_READ: createPermissionCheck('Inventory', 'read', 'brands'),
  BRANDS_UPDATE: createPermissionCheck('Inventory', 'update', 'brands'),
  BRANDS_DELETE: createPermissionCheck('Inventory', 'delete', 'brands'),
  
  // Categories
  CATEGORIES_CREATE: createPermissionCheck('Inventory', 'create', 'categories'),
  CATEGORIES_READ: createPermissionCheck('Inventory', 'read', 'categories'),
  CATEGORIES_UPDATE: createPermissionCheck('Inventory', 'update', 'categories'),
  CATEGORIES_DELETE: createPermissionCheck('Inventory', 'delete', 'categories'),

  // Reports & Dashboard
  DASHBOARD_EXECUTIVE: createPermissionCheck('Dashboard', 'read', 'executive_dashboard'),
  DASHBOARD_DEPARTMENTAL: createPermissionCheck('Dashboard', 'read', 'departmental_dashboard'),
  REPORTS_FINANCIAL: createPermissionCheck('Finance', 'read', 'financial_reports'),
  REPORTS_SALES: createPermissionCheck('Sales', 'read', 'sales_reports'),

  // Self Service
  PROFILE_READ: createPermissionCheck('Self Service', 'read', 'own_profile'),
  PROFILE_UPDATE: createPermissionCheck('Self Service', 'update', 'own_profile'),
  PAYSLIP_READ: createPermissionCheck('Self Service', 'read', 'own_payslip')
};

// Export permission middleware functions
export {
  requirePermission as checkPermission,
  requireAnyPermission as checkAnyPermission,
  requirePermissionOrOwnership as checkPermissionOrOwnership,
  requireSystemAdmin as checkSystemAdmin
};
