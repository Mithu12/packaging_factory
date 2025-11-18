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

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  granted_at: string;
  granted_by?: number;
  role?: Role;
  permission?: Permission;
}

export interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  granted_at: string;
  granted_by?: number;
  expires_at?: string;
  permission?: Permission;
}

export const ROLE_NAMES = {
  SYSTEM_ADMIN: 'admin',
  EXECUTIVE: 'executive',
  FINANCE_MANAGER: 'finance_manager',
  FINANCE_STAFF: 'finance_staff',
  HR_MANAGER: 'hr_manager',
  EMPLOYEE: 'employee',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
  PURCHASE_MANAGER: 'purchase_manager',
  PURCHASE_STAFF: 'purchase_staff',
  INVENTORY_MANAGER: 'inventory_manager',
  WAREHOUSE_STAFF: 'warehouse_staff',
} as const;

export const MODULES = {
  USER_MANAGEMENT: 'User Management',
  FINANCE: 'Finance',
  HR: 'HR',
  SALES: 'Sales',
  PURCHASE: 'Purchase',
  INVENTORY: 'Inventory',
  OPERATIONS: 'Operations',
  DASHBOARD: 'Dashboard',
  REPORTS: 'Reports',
  SYSTEM: 'System',
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  MANAGE: 'manage',
} as const;
