// Frontend RBAC Types - Mirror backend implementation

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  module: string;
  action: string;
  resource: string;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  level: number;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionCheck {
  module: string;
  action: string;
  resource: string;
}

export interface UserWithPermissions {
  id: number;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role: string; // Legacy role field
  role_id?: number;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  // RBAC specific fields
  role_details?: Role;
  role_permissions: Permission[];
  direct_permissions: Permission[];
  all_permissions: Permission[];
}

// Permission check helper type
export type PermissionString = `${string}.${string}.${string}`;

// Common permission modules
export const MODULES = {
  USER_MANAGEMENT: 'User Management',
  FINANCE: 'Finance',
  INVENTORY: 'Inventory',
  SALES: 'Sales',
  PURCHASE: 'Purchase',
  SYSTEM: 'System',
} as const;

// Common actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  MANAGE: 'manage',
  TRACK: 'track',
  ADJUST: 'adjust',
} as const;

// Permission helper function
export const createPermissionCheck = (
  module: string,
  action: string,
  resource: string
): PermissionCheck => ({
  module,
  action,
  resource,
});

// Frontend Permission Constants - Mirror backend PERMISSIONS
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

  // Inventory
  INVENTORY_READ: createPermissionCheck('Inventory', 'read', 'inventory'),
  INVENTORY_TRACK: createPermissionCheck('Inventory', 'read', 'inventory'), // Alias for backward compatibility
  INVENTORY_ADJUST: createPermissionCheck('Inventory', 'update', 'inventory'),
  INVENTORY_MANAGE: createPermissionCheck('Inventory', 'manage', 'inventory'),

  // Warehouses
  WAREHOUSES_CREATE: createPermissionCheck('Inventory', 'create', 'warehouses'),
  WAREHOUSES_READ: createPermissionCheck('Inventory', 'read', 'warehouses'),
  WAREHOUSES_UPDATE: createPermissionCheck('Inventory', 'update', 'warehouses'),

  // Stock Transfers
  STOCK_TRANSFERS_CREATE: createPermissionCheck('Inventory', 'create', 'stock_transfers'),
  STOCK_TRANSFERS_READ: createPermissionCheck('Inventory', 'read', 'stock_transfers'),
  STOCK_TRANSFERS_APPROVE: createPermissionCheck('Inventory', 'approve', 'stock_transfers'),

  // Products
  PRODUCTS_CREATE: createPermissionCheck('Inventory', 'create', 'products'),
  PRODUCTS_READ: createPermissionCheck('Inventory', 'read', 'products'),
  PRODUCTS_UPDATE: createPermissionCheck('Inventory', 'update', 'products'),
  PRODUCTS_DELETE: createPermissionCheck('Inventory', 'delete', 'products'),

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

  // Customers
  CUSTOMERS_CREATE: createPermissionCheck('Sales', 'create', 'customers'),
  CUSTOMERS_READ: createPermissionCheck('Sales', 'read', 'customers'),
  CUSTOMERS_UPDATE: createPermissionCheck('Sales', 'update', 'customers'),
  CUSTOMERS_DELETE: createPermissionCheck('Sales', 'delete', 'customers'),

  // Sales Orders
  SALES_ORDERS_CREATE: createPermissionCheck('Sales', 'create', 'sales_orders'),
  SALES_ORDERS_READ: createPermissionCheck('Sales', 'read', 'sales_orders'),
  SALES_ORDERS_UPDATE: createPermissionCheck('Sales', 'update', 'sales_orders'),
  SALES_ORDERS_DELETE: createPermissionCheck('Sales', 'delete', 'sales_orders'),
  SALES_ORDERS_APPROVE: createPermissionCheck('Sales', 'approve', 'sales_orders'),
  SALES_ORDERS_CANCEL: createPermissionCheck('Sales', 'update', 'sales_order_status'),

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

  // Purchase Orders
  PURCHASE_ORDERS_CREATE: createPermissionCheck('Purchase', 'create', 'purchase_orders'),
  PURCHASE_ORDERS_READ: createPermissionCheck('Purchase', 'read', 'purchase_orders'),
  PURCHASE_ORDERS_UPDATE: createPermissionCheck('Purchase', 'update', 'purchase_orders'),
  PURCHASE_ORDERS_DELETE: createPermissionCheck('Purchase', 'delete', 'purchase_orders'),
  PURCHASE_ORDERS_APPROVE: createPermissionCheck('Purchase', 'approve', 'purchase_orders'),
  PURCHASE_ORDERS_CANCEL: createPermissionCheck('Purchase', 'update', 'purchase_order_status'),

  // Stock Adjustments
  STOCK_ADJUSTMENTS_CREATE: createPermissionCheck('Inventory', 'create', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_READ: createPermissionCheck('Inventory', 'read', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_UPDATE: createPermissionCheck('Inventory', 'update', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_DELETE: createPermissionCheck('Inventory', 'delete', 'stock_adjustments'),
  STOCK_ADJUSTMENTS_APPROVE: createPermissionCheck('Inventory', 'approve', 'stock_adjustments'),

  // Settings
  SETTINGS_READ: createPermissionCheck('System', 'read', 'settings'),
  SETTINGS_UPDATE: createPermissionCheck('System', 'update', 'settings'),

  // System Admin
  SYSTEM_ADMIN: createPermissionCheck('System', 'manage', 'system'),
} as const;

// Permission groups for easier management
export const PERMISSION_GROUPS = {
  FINANCE: [
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_UPDATE,
    PERMISSIONS.PAYMENTS_DELETE,
    PERMISSIONS.PAYMENTS_APPROVE,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_READ,
    PERMISSIONS.EXPENSES_UPDATE,
    PERMISSIONS.EXPENSES_DELETE,
    PERMISSIONS.EXPENSES_APPROVE,
  ],
  INVENTORY: [
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.BRANDS_CREATE,
    PERMISSIONS.BRANDS_READ,
    PERMISSIONS.BRANDS_UPDATE,
    PERMISSIONS.BRANDS_DELETE,
    PERMISSIONS.CATEGORIES_CREATE,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.CATEGORIES_UPDATE,
    PERMISSIONS.CATEGORIES_DELETE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_TRACK,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.WAREHOUSES_CREATE,
    PERMISSIONS.WAREHOUSES_READ,
    PERMISSIONS.WAREHOUSES_UPDATE,
    PERMISSIONS.STOCK_TRANSFERS_CREATE,
    PERMISSIONS.STOCK_TRANSFERS_READ,
    PERMISSIONS.STOCK_TRANSFERS_APPROVE,
  ],
  SALES: [
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.SALES_ORDERS_CREATE,
    PERMISSIONS.SALES_ORDERS_READ,
    PERMISSIONS.SALES_ORDERS_UPDATE,
    PERMISSIONS.SALES_ORDERS_DELETE,
  ],
  PURCHASE: [
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.SUPPLIERS_UPDATE,
    PERMISSIONS.SUPPLIERS_DELETE,
    PERMISSIONS.PURCHASE_ORDERS_CREATE,
    PERMISSIONS.PURCHASE_ORDERS_READ,
    PERMISSIONS.PURCHASE_ORDERS_UPDATE,
    PERMISSIONS.PURCHASE_ORDERS_DELETE,
  ],
} as const;
