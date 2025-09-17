import { User } from '@/services/auth-api';

export type Role = 'admin' | 'manager' | 'employee' | 'viewer';

export interface Permission {
  module: string;
  action: string;
  roles: Role[];
}

// Define role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  employee: 1,
  manager: 2,
  admin: 3,
};

// Define all permissions in the system
export const PERMISSIONS: Permission[] = [
  // Dashboard
  { module: 'dashboard', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  
  // POS Management
  { module: 'pos', action: 'view', roles: ['employee', 'manager', 'admin'] },
  { module: 'pos', action: 'create_sale', roles: ['employee', 'manager', 'admin'] },
  { module: 'pos', action: 'process_payment', roles: ['employee', 'manager', 'admin'] },
  { module: 'pos', action: 'view_reports', roles: ['manager', 'admin'] },
  
  // Products
  { module: 'products', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'products', action: 'create', roles: ['manager', 'admin'] },
  { module: 'products', action: 'update', roles: ['manager', 'admin'] },
  { module: 'products', action: 'delete', roles: ['admin'] },
  { module: 'products', action: 'adjust_stock', roles: ['manager', 'admin'] },
  
  // Categories
  { module: 'categories', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'categories', action: 'create', roles: ['manager', 'admin'] },
  { module: 'categories', action: 'update', roles: ['manager', 'admin'] },
  { module: 'categories', action: 'delete', roles: ['admin'] },
  
  // Brands
  { module: 'brands', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'brands', action: 'create', roles: ['manager', 'admin'] },
  { module: 'brands', action: 'update', roles: ['manager', 'admin'] },
  { module: 'brands', action: 'delete', roles: ['admin'] },
  
  // Origins
  { module: 'origins', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'origins', action: 'create', roles: ['manager', 'admin'] },
  { module: 'origins', action: 'update', roles: ['manager', 'admin'] },
  { module: 'origins', action: 'delete', roles: ['admin'] },
  
  // Customers
  { module: 'customers', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'customers', action: 'create', roles: ['employee', 'manager', 'admin'] },
  { module: 'customers', action: 'update', roles: ['manager', 'admin'] },
  { module: 'customers', action: 'delete', roles: ['admin'] },
  
  // Sales Orders
  { module: 'sales_orders', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'sales_orders', action: 'create', roles: ['employee', 'manager', 'admin'] },
  { module: 'sales_orders', action: 'update', roles: ['manager', 'admin'] },
  { module: 'sales_orders', action: 'delete', roles: ['admin'] },
  
  // Purchase Orders
  { module: 'purchase_orders', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'purchase_orders', action: 'create', roles: ['manager', 'admin'] },
  { module: 'purchase_orders', action: 'update', roles: ['manager', 'admin'] },
  { module: 'purchase_orders', action: 'delete', roles: ['admin'] },
  { module: 'purchase_orders', action: 'receive', roles: ['employee', 'manager', 'admin'] },
  
  // Suppliers
  { module: 'suppliers', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'suppliers', action: 'create', roles: ['manager', 'admin'] },
  { module: 'suppliers', action: 'update', roles: ['manager', 'admin'] },
  { module: 'suppliers', action: 'delete', roles: ['admin'] },
  
  // Inventory
  { module: 'inventory', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'inventory', action: 'adjust', roles: ['manager', 'admin'] },
  { module: 'inventory', action: 'reports', roles: ['manager', 'admin'] },
  
  // Payments
  { module: 'payments', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'payments', action: 'create', roles: ['manager', 'admin'] },
  { module: 'payments', action: 'update', roles: ['manager', 'admin'] },
  { module: 'payments', action: 'delete', roles: ['admin'] },
  
  // Reports
  { module: 'reports', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'reports', action: 'generate', roles: ['manager', 'admin'] },
  { module: 'reports', action: 'export', roles: ['manager', 'admin'] },
  
  // Settings
  { module: 'settings', action: 'view', roles: ['viewer', 'employee', 'manager', 'admin'] },
  { module: 'settings', action: 'update', roles: ['admin'] },
  
  // User Management
  { module: 'users', action: 'view', roles: ['admin'] },
  { module: 'users', action: 'create', roles: ['admin'] },
  { module: 'users', action: 'update', roles: ['admin'] },
  { module: 'users', action: 'delete', roles: ['admin'] },
];

/**
 * Check if a user has permission to perform an action on a module
 */
export function hasPermission(
  user: User | null,
  module: string,
  action: string
): boolean {
  if (!user) return false;
  
  const permission = PERMISSIONS.find(
    p => p.module === module && p.action === action
  );
  
  if (!permission) return false;
  
  return permission.roles.includes(user.role as Role);
}

/**
 * Check if a user has a specific role or higher
 */
export function hasRole(user: User | null, requiredRole: Role): boolean {
  if (!user) return false;
  
  const userRoleLevel = ROLE_HIERARCHY[user.role as Role] ?? -1;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];
  
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(user: User | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as Role);
}

/**
 * Get all modules the user can access
 */
export function getAccessibleModules(user: User | null): string[] {
  if (!user) return [];
  
  const modules = new Set<string>();
  
  PERMISSIONS.forEach(permission => {
    if (permission.roles.includes(user.role as Role)) {
      modules.add(permission.module);
    }
  });
  
  return Array.from(modules);
}

/**
 * Get all actions a user can perform on a specific module
 */
export function getModuleActions(user: User | null, module: string): string[] {
  if (!user) return [];
  
  return PERMISSIONS
    .filter(p => p.module === module && p.roles.includes(user.role as Role))
    .map(p => p.action);
}

/**
 * Check if user can view a specific route
 */
export function canViewRoute(user: User | null, route: string): boolean {
  if (!user) return false;
  
  // Map routes to modules
  const routeModuleMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/pos-manager': 'pos',
    '/products': 'products',
    '/categories': 'categories',
    '/brands': 'brands',
    '/origins': 'origins',
    '/suppliers': 'suppliers',
    '/purchase-orders': 'purchase_orders',
    '/inventory': 'inventory',
    '/payments': 'payments',
    '/reports': 'reports',
    '/settings': 'settings',
    '/user-management': 'users',
  };
  
  const module = routeModuleMap[route];
  if (!module) return false;
  
  return hasPermission(user, module, 'view');
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    employee: 'Employee',
    viewer: 'Viewer',
  };
  
  return roleNames[role] || role;
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    admin: 'destructive',
    manager: 'secondary',
    employee: 'outline',
    viewer: 'muted',
  };
  
  return roleColors[role] || 'default';
}
