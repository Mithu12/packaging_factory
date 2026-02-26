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
        res.status(403)
        throw new Error(message)
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
  PAYMENTS_UPDATE: createPermissionCheck('Finance', 'update', 'payments'),
  PAYMENTS_DELETE: createPermissionCheck('Finance', 'delete', 'payments'),
  PAYMENTS_APPROVE: createPermissionCheck('Finance', 'approve', 'payments'),
  PAYMENTS_REJECT: createPermissionCheck('Finance', 'reject', 'payments'),
  
  // Settings
  SETTINGS_READ: createPermissionCheck('System', 'read', 'settings'),
  SETTINGS_UPDATE: createPermissionCheck('System', 'update', 'settings'),
  SYSTEM_BACKUP: createPermissionCheck('System', 'manage', 'backup'),
  SYSTEM_ADMIN: createPermissionCheck('System', 'manage', 'system'),
  SYSTEM_DASHBOARD_READ: createPermissionCheck('System', 'read', 'dashboard'),
  
  // Expenses
  EXPENSES_CREATE: createPermissionCheck('Finance', 'create', 'expenses'),
  EXPENSES_READ: createPermissionCheck('Finance', 'read', 'expenses'),
  EXPENSES_UPDATE: createPermissionCheck('Finance', 'update', 'expenses'),
  EXPENSES_DELETE: createPermissionCheck('Finance', 'delete', 'expenses'),
  EXPENSES_APPROVE: createPermissionCheck('Finance', 'approve', 'expenses'),
  EXPENSES_REJECT: createPermissionCheck('Finance', 'reject', 'expenses'),
  
  // Expense Categories
  EXPENSE_CATEGORIES_CREATE: createPermissionCheck('Finance', 'create', 'expense_categories'),
  EXPENSE_CATEGORIES_READ: createPermissionCheck('Finance', 'read', 'expense_categories'),
  EXPENSE_CATEGORIES_UPDATE: createPermissionCheck('Finance', 'update', 'expense_categories'),
  EXPENSE_CATEGORIES_DELETE: createPermissionCheck('Finance', 'delete', 'expense_categories'),

  // Sales
  SALES_ORDERS_CREATE: createPermissionCheck('Sales', 'create', 'sales_orders'),
  SALES_ORDERS_READ: createPermissionCheck('Sales', 'read', 'sales_orders'),
  SALES_ORDERS_UPDATE: createPermissionCheck('Sales', 'update', 'sales_orders'),
  SALES_ORDERS_DELETE: createPermissionCheck('Sales', 'delete', 'sales_orders'),
  SALES_ORDERS_APPROVE: createPermissionCheck('Sales', 'approve', 'sales_orders'),
  SALES_ORDERS_CANCEL: createPermissionCheck('Sales', 'update', 'sales_order_status'),
  
  // POS
  POS_ACCESS: createPermissionCheck('Sales', 'read', 'pos'),
  POS_TRANSACTIONS: createPermissionCheck('Sales', 'create', 'pos_transactions'),
  POS_REFUNDS: createPermissionCheck('Sales', 'create', 'pos_refunds'),
  POS_DISCOUNTS: createPermissionCheck('Sales', 'apply', 'pos_discounts'),
  POS_GIFTS: createPermissionCheck('Sales', 'create', 'pos_gifts'),
  
  // POS Returns
  POS_RETURNS_CREATE: createPermissionCheck('Sales', 'create', 'pos_returns'),
  POS_RETURNS_READ: createPermissionCheck('Sales', 'read', 'pos_returns'),
  POS_RETURNS_APPROVE: createPermissionCheck('Sales', 'approve', 'pos_returns'),
  POS_RETURNS_COMPLETE: createPermissionCheck('Sales', 'process', 'pos_returns'),
  
  // Customers
  CUSTOMERS_CREATE: createPermissionCheck('Sales', 'create', 'customers'),
  CUSTOMERS_READ: createPermissionCheck('Sales', 'read', 'customers'),
  CUSTOMERS_UPDATE: createPermissionCheck('Sales', 'update', 'customers'),
  CUSTOMERS_DELETE: createPermissionCheck('Sales', 'delete', 'customers'),

  // Sales Reports
  SALES_REPORTS_READ: createPermissionCheck('Sales', 'read', 'sales_reports'),
  SALES_REPORTS_EXPORT: createPermissionCheck('Sales', 'export', 'sales_reports'),

  // Purchase
  PURCHASE_ORDERS_CREATE: createPermissionCheck('Purchase', 'create', 'purchase_orders'),
  PURCHASE_ORDERS_READ: createPermissionCheck('Purchase', 'read', 'purchase_orders'),
  PURCHASE_ORDERS_UPDATE: createPermissionCheck('Purchase', 'update', 'purchase_orders'),
  PURCHASE_ORDERS_DELETE: createPermissionCheck('Purchase', 'delete', 'purchase_orders'),
  PURCHASE_ORDERS_APPROVE: createPermissionCheck('Purchase', 'approve', 'purchase_orders'),
  PURCHASE_ORDERS_CANCEL: createPermissionCheck('Purchase', 'update', 'purchase_order_status'),
  
  // Suppliers
  SUPPLIERS_CREATE: createPermissionCheck('Purchase', 'create', 'suppliers'),
  SUPPLIERS_READ: createPermissionCheck('Purchase', 'read', 'suppliers'),
  SUPPLIERS_UPDATE: createPermissionCheck('Purchase', 'update', 'suppliers'),
  SUPPLIERS_DELETE: createPermissionCheck('Purchase', 'delete', 'suppliers'),
  
  // Supplier Categories
  SUPPLIER_CATEGORIES_CREATE: createPermissionCheck('Purchase', 'create', 'supplier_categories'),
  SUPPLIER_CATEGORIES_READ: createPermissionCheck('Purchase', 'read', 'supplier_categories'),
  SUPPLIER_CATEGORIES_UPDATE: createPermissionCheck('Purchase', 'update', 'supplier_categories'),
  SUPPLIER_CATEGORIES_DELETE: createPermissionCheck('Purchase', 'delete', 'supplier_categories'),

  // Ecommerce
  ECOMMERCE_DASHBOARD_READ: createPermissionCheck('Ecommerce', 'read', 'dashboard'),

  // Inventory
  PRODUCTS_CREATE: createPermissionCheck('Inventory', 'create', 'products'),
  PRODUCTS_READ: createPermissionCheck('Inventory', 'read', 'products'),
  PRODUCTS_UPDATE: createPermissionCheck('Inventory', 'update', 'products'),
  PRODUCTS_DELETE: createPermissionCheck('Inventory', 'delete', 'products'),
  INVENTORY_READ: createPermissionCheck('Inventory', 'read', 'inventory'),
  INVENTORY_TRACK: createPermissionCheck('Inventory', 'read', 'inventory'),
  INVENTORY_ADJUST: createPermissionCheck('Inventory', 'update', 'inventory'),
  INVENTORY_MANAGE: createPermissionCheck('Inventory', 'manage', 'inventory'),

  // Warehouses
  WAREHOUSES_CREATE: createPermissionCheck('Inventory', 'create', 'warehouses'),
  WAREHOUSES_READ: createPermissionCheck('Inventory', 'read', 'warehouses'),
  WAREHOUSES_UPDATE: createPermissionCheck('Inventory', 'update', 'warehouses'),
  
  // Stock Adjustments
  STOCK_ADJUSTMENTS_CREATE: createPermissionCheck('Inventory', 'create', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_READ: createPermissionCheck('Inventory', 'read', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_UPDATE: createPermissionCheck('Inventory', 'update', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_DELETE: createPermissionCheck('Inventory', 'delete', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_APPROVE: createPermissionCheck('Inventory', 'approve', 'stock_adjustments'),
  
  // Stock Transfers
  STOCK_TRANSFERS_CREATE: createPermissionCheck('Inventory', 'create', 'stock_transfers'),
  STOCK_TRANSFERS_READ: createPermissionCheck('Inventory', 'read', 'stock_transfers'),
  STOCK_TRANSFERS_APPROVE: createPermissionCheck('Inventory', 'approve', 'stock_transfers'),
  
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
  
  // Origins
  ORIGINS_CREATE: createPermissionCheck('Inventory', 'create', 'origins'),
  ORIGINS_READ: createPermissionCheck('Inventory', 'read', 'origins'),
  ORIGINS_UPDATE: createPermissionCheck('Inventory', 'update', 'origins'),
  ORIGINS_DELETE: createPermissionCheck('Inventory', 'delete', 'origins'),

  // Reports & Dashboard
  DASHBOARD_EXECUTIVE: createPermissionCheck('Dashboard', 'read', 'executive_dashboard'),
  DASHBOARD_DEPARTMENTAL: createPermissionCheck('Dashboard', 'read', 'departmental_dashboard'),
  REPORTS_FINANCIAL: createPermissionCheck('Finance', 'read', 'financial_reports'),
  REPORTS_SALES: createPermissionCheck('Sales', 'read', 'sales_reports'),

  // Self Service
  PROFILE_READ: createPermissionCheck('Self Service', 'read', 'own_profile'),
  PROFILE_UPDATE: createPermissionCheck('Self Service', 'update', 'own_profile'),
  PAYSLIP_READ: createPermissionCheck('Self Service', 'read', 'own_payslip'),


  // ---- Accounts: Master Data ----
  ACCOUNT_GROUPS_CREATE: createPermissionCheck('Finance', 'create', 'account_groups'),
  ACCOUNT_GROUPS_READ:   createPermissionCheck('Finance', 'read',   'account_groups'),
  ACCOUNT_GROUPS_UPDATE: createPermissionCheck('Finance', 'update', 'account_groups'),
  ACCOUNT_GROUPS_DELETE: createPermissionCheck('Finance', 'delete', 'account_groups'),
  
  CHART_OF_ACCOUNTS_CREATE: createPermissionCheck('Finance', 'create', 'chart_of_accounts'),
  CHART_OF_ACCOUNTS_READ:   createPermissionCheck('Finance', 'read',   'chart_of_accounts'),
  CHART_OF_ACCOUNTS_UPDATE: createPermissionCheck('Finance', 'update', 'chart_of_accounts'),
  CHART_OF_ACCOUNTS_DELETE: createPermissionCheck('Finance', 'delete', 'chart_of_accounts'),
  
  COST_CENTERS_CREATE: createPermissionCheck('Finance', 'create', 'cost_centers'),
  COST_CENTERS_READ:   createPermissionCheck('Finance', 'read',   'cost_centers'),
  COST_CENTERS_UPDATE: createPermissionCheck('Finance', 'update', 'cost_centers'),
  COST_CENTERS_DELETE: createPermissionCheck('Finance', 'delete', 'cost_centers'),
  
  // ---- Accounts: Vouchers ----
  VOUCHERS_CREATE: createPermissionCheck('Finance', 'create',  'vouchers'),
  VOUCHERS_READ:   createPermissionCheck('Finance', 'read',    'vouchers'),
  VOUCHERS_UPDATE: createPermissionCheck('Finance', 'update',  'vouchers'),
  VOUCHERS_DELETE: createPermissionCheck('Finance', 'delete',  'vouchers'),
  VOUCHERS_APPROVE:createPermissionCheck('Finance', 'approve', 'vouchers'),
  VOUCHERS_REJECT: createPermissionCheck('Finance', 'reject',  'vouchers'),
  
  // ---- Accounts: Reports (read-only) ----
  GENERAL_LEDGER_READ:       createPermissionCheck('Finance', 'read', 'general_ledger'),
  COST_CENTER_LEDGER_READ:   createPermissionCheck('Finance', 'read', 'cost_center_ledger'),
  INCOME_STATEMENT_READ:     createPermissionCheck('Finance', 'read', 'income_statement'),
  BALANCE_SHEET_READ:        createPermissionCheck('Finance', 'read', 'balance_sheet'),

  // HR
  HR_DASHBOARD_READ: createPermissionCheck('HR', 'read', 'dashboard'),

  // ---- HR: Employee Management ----
  HR_EMPLOYEES_CREATE: createPermissionCheck('HR', 'create', 'employees'),
  HR_EMPLOYEES_READ: createPermissionCheck('HR', 'read', 'employees'),
  HR_EMPLOYEES_UPDATE: createPermissionCheck('HR', 'update', 'employees'),
  HR_EMPLOYEES_DELETE: createPermissionCheck('HR', 'delete', 'employees'),
  HR_EMPLOYEES_MANAGE: createPermissionCheck('HR', 'manage', 'employees'),

  // HR: Department Management
  HR_DEPARTMENTS_CREATE: createPermissionCheck('HR', 'create', 'departments'),
  HR_DEPARTMENTS_READ: createPermissionCheck('HR', 'read', 'departments'),
  HR_DEPARTMENTS_UPDATE: createPermissionCheck('HR', 'update', 'departments'),
  HR_DEPARTMENTS_DELETE: createPermissionCheck('HR', 'delete', 'departments'),
  HR_DEPARTMENTS_MANAGE: createPermissionCheck('HR', 'manage', 'departments'),

  // HR: Designation Management
  HR_DESIGNATIONS_CREATE: createPermissionCheck('HR', 'create', 'designations'),
  HR_DESIGNATIONS_READ: createPermissionCheck('HR', 'read', 'designations'),
  HR_DESIGNATIONS_UPDATE: createPermissionCheck('HR', 'update', 'designations'),
  HR_DESIGNATIONS_DELETE: createPermissionCheck('HR', 'delete', 'designations'),
  HR_DESIGNATIONS_MANAGE: createPermissionCheck('HR', 'manage', 'designations'),

  // HR: Payroll Management
  HR_PAYROLL_CREATE: createPermissionCheck('HR', 'create', 'payroll'),
  HR_PAYROLL_READ: createPermissionCheck('HR', 'read', 'payroll'),
  HR_PAYROLL_UPDATE: createPermissionCheck('HR', 'update', 'payroll'),
  HR_PAYROLL_DELETE: createPermissionCheck('HR', 'delete', 'payroll'),
  HR_PAYROLL_PROCESS: createPermissionCheck('HR', 'process', 'payroll'),
  HR_PAYROLL_APPROVE: createPermissionCheck('HR', 'approve', 'payroll'),
  HR_PAYROLL_MANAGE: createPermissionCheck('HR', 'manage', 'payroll'),

  // HR: Attendance Management
  HR_ATTENDANCE_CREATE: createPermissionCheck('HR', 'create', 'attendance'),
  HR_ATTENDANCE_READ: createPermissionCheck('HR', 'read', 'attendance'),
  HR_ATTENDANCE_UPDATE: createPermissionCheck('HR', 'update', 'attendance'),
  HR_ATTENDANCE_MANAGE: createPermissionCheck('HR', 'manage', 'attendance'),

  // HR: Leave Management
  HR_LEAVE_CREATE: createPermissionCheck('HR', 'create', 'leave'),
  HR_LEAVE_READ: createPermissionCheck('HR', 'read', 'leave'),
  HR_LEAVE_UPDATE: createPermissionCheck('HR', 'update', 'leave'),
  HR_LEAVE_DELETE: createPermissionCheck('HR', 'delete', 'leave'),
  HR_LEAVE_APPROVE: createPermissionCheck('HR', 'approve', 'leave'),
  HR_LEAVE_MANAGE: createPermissionCheck('HR', 'manage', 'leave'),

  // Self Service Leave
  SELF_SERVICE_LEAVE_READ: createPermissionCheck('Self Service', 'read', 'leave'),
  SELF_SERVICE_LEAVE_READ_OWN: createPermissionCheck('Self Service', 'read', 'own_leave'),
  SELF_SERVICE_LEAVE_CREATE: createPermissionCheck('Self Service', 'create', 'own_leave'),
  SELF_SERVICE_LEAVE_UPDATE: createPermissionCheck('Self Service', 'update', 'own_leave'),

  // HR: Transfer Management
  HR_TRANSFERS_CREATE: createPermissionCheck('HR', 'create', 'transfers'),
  HR_TRANSFERS_READ: createPermissionCheck('HR', 'read', 'transfers'),
  HR_TRANSFERS_UPDATE: createPermissionCheck('HR', 'update', 'transfers'),
  HR_TRANSFERS_APPROVE: createPermissionCheck('HR', 'approve', 'transfers'),
  HR_TRANSFERS_MANAGE: createPermissionCheck('HR', 'manage', 'transfers'),

  // HR: Contract Management
  HR_CONTRACTS_CREATE: createPermissionCheck('HR', 'create', 'contracts'),
  HR_CONTRACTS_READ: createPermissionCheck('HR', 'read', 'contracts'),
  HR_CONTRACTS_UPDATE: createPermissionCheck('HR', 'update', 'contracts'),
  HR_CONTRACTS_MANAGE: createPermissionCheck('HR', 'manage', 'contracts'),

  // HR: Loan Management
  HR_LOANS_CREATE: createPermissionCheck('HR', 'create', 'loans'),
  HR_LOANS_READ: createPermissionCheck('HR', 'read', 'loans'),
  HR_LOANS_UPDATE: createPermissionCheck('HR', 'update', 'loans'),
  HR_LOANS_APPROVE: createPermissionCheck('HR', 'approve', 'loans'),
  HR_LOANS_MANAGE: createPermissionCheck('HR', 'manage', 'loans'),

  // HR: Reports and Analytics
  HR_REPORTS_READ: createPermissionCheck('HR', 'read', 'reports'),
  HR_REPORTS_MANAGE: createPermissionCheck('HR', 'manage', 'reports'),

  // HR: Settings and Configuration
  HR_SETTINGS_READ: createPermissionCheck('HR', 'read', 'settings'),
  HR_SETTINGS_UPDATE: createPermissionCheck('HR', 'update', 'settings'),
  HR_SETTINGS_MANAGE: createPermissionCheck('HR', 'manage', 'settings'),

  // ---- Factory: Customer Orders ----
  FACTORY_ORDERS_CREATE: createPermissionCheck('Factory', 'create', 'factory_customer_orders'),
  FACTORY_ORDERS_READ: createPermissionCheck('Factory', 'read', 'factory_customer_orders'),
  FACTORY_ORDERS_UPDATE: createPermissionCheck('Factory', 'update', 'factory_customer_orders'),
  FACTORY_ORDERS_DELETE: createPermissionCheck('Factory', 'delete', 'factory_customer_orders'),
  FACTORY_ORDERS_APPROVE: createPermissionCheck('Factory', 'approve', 'factory_customer_orders'),

  // ---- Factory: Sales Rep Workflow ----
  FACTORY_ORDERS_SUBMIT: createPermissionCheck('Factory', 'submit', 'factory_customer_orders'),
  FACTORY_ORDERS_APPROVE_WORKFLOW: createPermissionCheck('Factory', 'approve_workflow', 'factory_customer_orders'),
  FACTORY_ORDERS_ROUTE: createPermissionCheck('Factory', 'route', 'factory_customer_orders'),
  FACTORY_ORDERS_VIEW_OWN: createPermissionCheck('Factory', 'view_own', 'factory_customer_orders'),

  // Work Orders
  FACTORY_WORK_ORDERS_CREATE: createPermissionCheck('Factory', 'create', 'work_orders'),
  FACTORY_WORK_ORDERS_READ: createPermissionCheck('Factory', 'read', 'work_orders'),
  FACTORY_WORK_ORDERS_UPDATE: createPermissionCheck('Factory', 'update', 'work_orders'),
  FACTORY_WORK_ORDERS_DELETE: createPermissionCheck('Factory', 'delete', 'work_orders'),

  // Production Lines
  FACTORY_PRODUCTION_LINES_CREATE: createPermissionCheck('Factory', 'create', 'production_lines'),
  FACTORY_PRODUCTION_LINES_READ: createPermissionCheck('Factory', 'read', 'production_lines'),
  FACTORY_PRODUCTION_LINES_UPDATE: createPermissionCheck('Factory', 'update', 'production_lines'),
  FACTORY_PRODUCTION_LINES_DELETE: createPermissionCheck('Factory', 'delete', 'production_lines'),

  // Operators
  FACTORY_OPERATORS_CREATE: createPermissionCheck('Factory', 'create', 'operators'),
  FACTORY_OPERATORS_READ: createPermissionCheck('Factory', 'read', 'operators'),
  FACTORY_OPERATORS_UPDATE: createPermissionCheck('Factory', 'update', 'operators'),
  FACTORY_OPERATORS_DELETE: createPermissionCheck('Factory', 'delete', 'operators'),

  // Work Order Assignments
  FACTORY_WORK_ORDER_ASSIGNMENTS_CREATE: createPermissionCheck('Factory', 'create', 'work_order_assignments'),
  FACTORY_WORK_ORDER_ASSIGNMENTS_READ: createPermissionCheck('Factory', 'read', 'work_order_assignments'),
  FACTORY_WORK_ORDER_ASSIGNMENTS_UPDATE: createPermissionCheck('Factory', 'update', 'work_order_assignments'),
  FACTORY_WORK_ORDER_ASSIGNMENTS_DELETE: createPermissionCheck('Factory', 'delete', 'work_order_assignments'),

  // Bill of Materials (BOM)
  FACTORY_BOMS_CREATE: createPermissionCheck('Factory', 'create', 'boms'),
  FACTORY_BOMS_READ: createPermissionCheck('Factory', 'read', 'boms'),
  FACTORY_BOMS_UPDATE: createPermissionCheck('Factory', 'update', 'boms'),
  FACTORY_BOMS_DELETE: createPermissionCheck('Factory', 'delete', 'boms'),

  // Material Allocations
  FACTORY_MATERIAL_ALLOCATIONS_CREATE: createPermissionCheck('Factory', 'create', 'material_allocations'),
  FACTORY_MATERIAL_ALLOCATIONS_READ: createPermissionCheck('Factory', 'read', 'material_allocations'),
  FACTORY_MATERIAL_ALLOCATIONS_UPDATE: createPermissionCheck('Factory', 'update', 'material_allocations'),
  FACTORY_MATERIAL_ALLOCATIONS_DELETE: createPermissionCheck('Factory', 'delete', 'material_allocations'),

  // Material Consumptions
  FACTORY_MATERIAL_CONSUMPTIONS_CREATE: createPermissionCheck('Factory', 'create', 'material_consumptions'),
  FACTORY_MATERIAL_CONSUMPTIONS_READ: createPermissionCheck('Factory', 'read', 'material_consumptions'),

  // Wastage Tracking
  FACTORY_WASTAGE_CREATE: createPermissionCheck('Factory', 'create', 'wastage'),
  FACTORY_WASTAGE_READ: createPermissionCheck('Factory', 'read', 'wastage'),
  FACTORY_WASTAGE_APPROVE: createPermissionCheck('Factory', 'approve', 'wastage'),

  // Production Runs
  FACTORY_PRODUCTION_RUNS_CREATE: createPermissionCheck('Factory', 'create', 'production_runs'),
  FACTORY_PRODUCTION_RUNS_READ: createPermissionCheck('Factory', 'read', 'production_runs'),
  FACTORY_PRODUCTION_RUNS_UPDATE: createPermissionCheck('Factory', 'update', 'production_runs'),

  // Dashboard
  FACTORY_DASHBOARD_READ: createPermissionCheck('Factory', 'read', 'dashboard'),

  // Cost Analysis
  FACTORY_COST_ANALYSIS_READ: createPermissionCheck('Factory', 'read', 'cost_analysis'),

  // Sales Rep Module
  SALES_REP_DASHBOARD_READ: createPermissionCheck('Sales Rep', 'read', 'dashboard'),
  SALES_REP_CUSTOMERS_CREATE: createPermissionCheck('Sales Rep', 'create', 'customers'),
  SALES_REP_CUSTOMERS_READ: createPermissionCheck('Sales Rep', 'read', 'customers'),
  SALES_REP_CUSTOMERS_UPDATE: createPermissionCheck('Sales Rep', 'update', 'customers'),
  SALES_REP_CUSTOMERS_DELETE: createPermissionCheck('Sales Rep', 'delete', 'customers'),
  SALES_REP_ORDERS_CREATE: createPermissionCheck('Sales Rep', 'create', 'orders'),
  SALES_REP_ORDERS_READ: createPermissionCheck('Sales Rep', 'read', 'orders'),
  SALES_REP_ORDERS_UPDATE: createPermissionCheck('Sales Rep', 'update', 'orders'),
  SALES_REP_ORDERS_DELETE: createPermissionCheck('Sales Rep', 'delete', 'orders'),
  SALES_REP_INVOICES_CREATE: createPermissionCheck('Sales Rep', 'create', 'invoices'),
  SALES_REP_INVOICES_READ: createPermissionCheck('Sales Rep', 'read', 'invoices'),
  SALES_REP_INVOICES_UPDATE: createPermissionCheck('Sales Rep', 'update', 'invoices'),
  SALES_REP_PAYMENTS_CREATE: createPermissionCheck('Sales Rep', 'create', 'payments'),
  SALES_REP_PAYMENTS_READ: createPermissionCheck('Sales Rep', 'read', 'payments'),
  SALES_REP_PAYMENTS_UPDATE: createPermissionCheck('Sales Rep', 'update', 'payments'),
  SALES_REP_DELIVERIES_CREATE: createPermissionCheck('Sales Rep', 'create', 'deliveries'),
  SALES_REP_DELIVERIES_READ: createPermissionCheck('Sales Rep', 'read', 'deliveries'),
  SALES_REP_DELIVERIES_UPDATE: createPermissionCheck('Sales Rep', 'update', 'deliveries'),
  SALES_REP_REPORTS_READ: createPermissionCheck('Sales Rep', 'read', 'reports'),
  SALES_REP_REPORTS_EXPORT: createPermissionCheck('Sales Rep', 'export', 'reports'),
  SALES_REP_NOTIFICATIONS_READ: createPermissionCheck('Sales Rep', 'read', 'notifications'),
  SALES_REP_NOTIFICATIONS_UPDATE: createPermissionCheck('Sales Rep', 'update', 'notifications'),

  // Ecommerce
  ECOMMERCE_SLIDERS_READ: createPermissionCheck('Ecommerce', 'read', 'sliders'),
  ECOMMERCE_SLIDERS_CREATE: createPermissionCheck('Ecommerce', 'create', 'sliders'),
  ECOMMERCE_SLIDERS_UPDATE: createPermissionCheck('Ecommerce', 'update', 'sliders'),
  ECOMMERCE_SLIDERS_DELETE: createPermissionCheck('Ecommerce', 'delete', 'sliders'),

  // Factory Extended
  FACTORY_MANAGEMENT_READ: createPermissionCheck('Factory', 'read', 'factories'),
};

// Export permission middleware functions
export {
  requirePermission as checkPermission,
  requireAnyPermission as checkAnyPermission,
  requirePermissionOrOwnership as checkPermissionOrOwnership,
  requireSystemAdmin as checkSystemAdmin
};
