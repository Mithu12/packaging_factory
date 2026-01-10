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
    distribution_center_id?: number;
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
    HR: 'HR',
    INVENTORY: 'Inventory',
    SALES: 'Sales',
    PURCHASE: 'Purchase',
    FACTORY: 'Factory',
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
    SUBMIT: 'submit',
    VIEW_OWN: 'view_own',
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

    // Sales Reports
    SALES_REPORTS_READ: createPermissionCheck('Sales', 'read', 'sales_reports'),
    SALES_REPORTS_EXPORT: createPermissionCheck('Sales', 'export', 'sales_reports'),

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
    SYSTEM_BACKUP: createPermissionCheck('System', 'manage', 'backup'),


    // ---- Accounts: Master Data ----
    ACCOUNT_GROUPS_CREATE: createPermissionCheck('Finance', 'create', 'account_groups'),
    ACCOUNT_GROUPS_READ: createPermissionCheck('Finance', 'read', 'account_groups'),
    ACCOUNT_GROUPS_UPDATE: createPermissionCheck('Finance', 'update', 'account_groups'),
    ACCOUNT_GROUPS_DELETE: createPermissionCheck('Finance', 'delete', 'account_groups'),

    CHART_OF_ACCOUNTS_CREATE: createPermissionCheck('Finance', 'create', 'chart_of_accounts'),
    CHART_OF_ACCOUNTS_READ: createPermissionCheck('Finance', 'read', 'chart_of_accounts'),
    CHART_OF_ACCOUNTS_UPDATE: createPermissionCheck('Finance', 'update', 'chart_of_accounts'),
    CHART_OF_ACCOUNTS_DELETE: createPermissionCheck('Finance', 'delete', 'chart_of_accounts'),

    COST_CENTERS_CREATE: createPermissionCheck('Finance', 'create', 'cost_centers'),
    COST_CENTERS_READ: createPermissionCheck('Finance', 'read', 'cost_centers'),
    COST_CENTERS_UPDATE: createPermissionCheck('Finance', 'update', 'cost_centers'),
    COST_CENTERS_DELETE: createPermissionCheck('Finance', 'delete', 'cost_centers'),


    // ---- Accounts: Vouchers ----
    VOUCHERS_CREATE: createPermissionCheck('Finance', 'create', 'vouchers'),
    VOUCHERS_READ: createPermissionCheck('Finance', 'read', 'vouchers'),
    VOUCHERS_UPDATE: createPermissionCheck('Finance', 'update', 'vouchers'),
    VOUCHERS_DELETE: createPermissionCheck('Finance', 'delete', 'vouchers'),
    VOUCHERS_APPROVE: createPermissionCheck('Finance', 'approve', 'vouchers'),
    VOUCHERS_REJECT: createPermissionCheck('Finance', 'reject', 'vouchers'),

    // ---- Accounts: Reports (read-only) ----
    GENERAL_LEDGER_READ: createPermissionCheck('Finance', 'read', 'general_ledger'),
    COST_CENTER_LEDGER_READ: createPermissionCheck('Finance', 'read', 'cost_center_ledger'),
    INCOME_STATEMENT_READ: createPermissionCheck('Finance', 'read', 'income_statement'),
    BALANCE_SHEET_READ: createPermissionCheck('Finance', 'read', 'balance_sheet'),

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
    HR_PAYROLL_PROCESS: createPermissionCheck('HR', 'process', 'payroll'),
    HR_PAYROLL_APPROVE: createPermissionCheck('HR', 'approve', 'payroll'),
    HR_PAYROLL_MANAGE: createPermissionCheck('HR', 'manage', 'payroll'),
    HR_PAYROLL_DELETE: createPermissionCheck('HR', 'delete', 'payroll'),

    // HR: Attendance Management
    HR_ATTENDANCE_CREATE: createPermissionCheck('HR', 'create', 'attendance'),
    HR_ATTENDANCE_READ: createPermissionCheck('HR', 'read', 'attendance'),
    HR_ATTENDANCE_UPDATE: createPermissionCheck('HR', 'update', 'attendance'),
    HR_ATTENDANCE_MANAGE: createPermissionCheck('HR', 'manage', 'attendance'),

    // HR: Leave Management
    HR_LEAVE_CREATE: createPermissionCheck('HR', 'create', 'leave'),
    HR_LEAVE_READ: createPermissionCheck('HR', 'read', 'leave'),
    HR_LEAVE_UPDATE: createPermissionCheck('HR', 'update', 'leave'),
    HR_LEAVE_APPROVE: createPermissionCheck('HR', 'approve', 'leave'),
    HR_LEAVE_MANAGE: createPermissionCheck('HR', 'manage', 'leave'),
    HR_LEAVE_DELETE: createPermissionCheck('HR', 'delete', 'leave'),

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
    FACTORY_ORDERS_VIEW_OWN: createPermissionCheck('Factory', 'view_own', 'factory_customer_orders'),

    // ---- Sales Rep Module ----
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
    HR: [
        PERMISSIONS.HR_EMPLOYEES_CREATE,
        PERMISSIONS.HR_EMPLOYEES_READ,
        PERMISSIONS.HR_EMPLOYEES_UPDATE,
        PERMISSIONS.HR_EMPLOYEES_DELETE,
        PERMISSIONS.HR_EMPLOYEES_MANAGE,
        PERMISSIONS.HR_DEPARTMENTS_CREATE,
        PERMISSIONS.HR_DEPARTMENTS_READ,
        PERMISSIONS.HR_DEPARTMENTS_UPDATE,
        PERMISSIONS.HR_DEPARTMENTS_DELETE,
        PERMISSIONS.HR_DEPARTMENTS_MANAGE,
        PERMISSIONS.HR_DESIGNATIONS_CREATE,
        PERMISSIONS.HR_DESIGNATIONS_READ,
        PERMISSIONS.HR_DESIGNATIONS_UPDATE,
        PERMISSIONS.HR_DESIGNATIONS_DELETE,
        PERMISSIONS.HR_DESIGNATIONS_MANAGE,
        PERMISSIONS.HR_PAYROLL_CREATE,
        PERMISSIONS.HR_PAYROLL_READ,
        PERMISSIONS.HR_PAYROLL_UPDATE,
        PERMISSIONS.HR_PAYROLL_PROCESS,
        PERMISSIONS.HR_PAYROLL_APPROVE,
        PERMISSIONS.HR_PAYROLL_MANAGE,
        PERMISSIONS.HR_ATTENDANCE_CREATE,
        PERMISSIONS.HR_ATTENDANCE_READ,
        PERMISSIONS.HR_ATTENDANCE_UPDATE,
        PERMISSIONS.HR_ATTENDANCE_MANAGE,
        PERMISSIONS.HR_LEAVE_CREATE,
        PERMISSIONS.HR_LEAVE_READ,
        PERMISSIONS.HR_LEAVE_UPDATE,
        PERMISSIONS.HR_LEAVE_APPROVE,
        PERMISSIONS.HR_LEAVE_MANAGE,
        PERMISSIONS.HR_TRANSFERS_CREATE,
        PERMISSIONS.HR_TRANSFERS_READ,
        PERMISSIONS.HR_TRANSFERS_UPDATE,
        PERMISSIONS.HR_TRANSFERS_APPROVE,
        PERMISSIONS.HR_TRANSFERS_MANAGE,
        PERMISSIONS.HR_CONTRACTS_CREATE,
        PERMISSIONS.HR_CONTRACTS_READ,
        PERMISSIONS.HR_CONTRACTS_UPDATE,
        PERMISSIONS.HR_CONTRACTS_MANAGE,
        PERMISSIONS.HR_LOANS_CREATE,
        PERMISSIONS.HR_LOANS_READ,
        PERMISSIONS.HR_LOANS_UPDATE,
        PERMISSIONS.HR_LOANS_APPROVE,
        PERMISSIONS.HR_LOANS_MANAGE,
        PERMISSIONS.HR_REPORTS_READ,
        PERMISSIONS.HR_REPORTS_MANAGE,
        PERMISSIONS.HR_SETTINGS_READ,
        PERMISSIONS.HR_SETTINGS_UPDATE,
        PERMISSIONS.HR_SETTINGS_MANAGE,
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
        PERMISSIONS.SALES_REPORTS_READ,
        PERMISSIONS.SALES_REPORTS_EXPORT,
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
    SALES_REP: [
        PERMISSIONS.SALES_REP_DASHBOARD_READ,
        PERMISSIONS.SALES_REP_CUSTOMERS_CREATE,
        PERMISSIONS.SALES_REP_CUSTOMERS_READ,
        PERMISSIONS.SALES_REP_CUSTOMERS_UPDATE,
        PERMISSIONS.SALES_REP_CUSTOMERS_DELETE,
        PERMISSIONS.SALES_REP_ORDERS_CREATE,
        PERMISSIONS.SALES_REP_ORDERS_READ,
        PERMISSIONS.SALES_REP_ORDERS_UPDATE,
        PERMISSIONS.SALES_REP_ORDERS_DELETE,
        PERMISSIONS.SALES_REP_INVOICES_CREATE,
        PERMISSIONS.SALES_REP_INVOICES_READ,
        PERMISSIONS.SALES_REP_INVOICES_UPDATE,
        PERMISSIONS.SALES_REP_PAYMENTS_CREATE,
        PERMISSIONS.SALES_REP_PAYMENTS_READ,
        PERMISSIONS.SALES_REP_PAYMENTS_UPDATE,
        PERMISSIONS.SALES_REP_DELIVERIES_CREATE,
        PERMISSIONS.SALES_REP_DELIVERIES_READ,
        PERMISSIONS.SALES_REP_DELIVERIES_UPDATE,
        PERMISSIONS.SALES_REP_REPORTS_READ,
        PERMISSIONS.SALES_REP_REPORTS_EXPORT,
        PERMISSIONS.SALES_REP_NOTIFICATIONS_READ,
        PERMISSIONS.SALES_REP_NOTIFICATIONS_UPDATE,
    ],
} as const;
