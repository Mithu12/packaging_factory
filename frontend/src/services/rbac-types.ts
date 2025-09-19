// RBAC Types for Frontend

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

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  user_count?: number;
}

export interface UserWithPermissions {
  id: number;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role?: string; // Legacy role field
  role_id?: number;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  role_details?: Role;
  role_permissions: Permission[];
  direct_permissions: Permission[];
  all_permissions: Permission[];
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  level: number;
  department?: string;
  permission_ids?: number[];
}

export interface UpdateRoleRequest {
  display_name?: string;
  description?: string;
  level?: number;
  department?: string;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface AssignPermissionRequest {
  user_id: number;
  permission_ids: number[];
  expires_at?: string;
}

export interface DepartmentStats {
  department: string;
  total_users: number;
  active_users: number;
  roles: Role[];
}

export interface PermissionStats {
  module: string;
  total_permissions: number;
  assigned_permissions: number;
  roles_using: number;
}

export interface Progress {
  value: number;
  className?: string;
}

// Role constants for the frontend
export const ROLE_NAMES = {
  SYSTEM_ADMIN: 'system_admin',
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
  TECHNICIAN_SUPERVISOR: 'technician_supervisor',
  TECHNICIAN: 'technician',
  CALL_CENTER_MANAGER: 'call_center_manager',
  CALL_CENTER_OPERATOR: 'call_center_operator',
  CUSTOMER_SERVICE: 'customer_service',
  MARKETING: 'marketing',
  AUDITOR: 'auditor'
} as const;

export const MODULES = {
  USER_MANAGEMENT: 'User Management',
  FINANCE: 'Finance',
  HR: 'HR',
  SALES: 'Sales',
  PURCHASE: 'Purchase',
  INVENTORY: 'Inventory',
  OPERATIONS: 'Operations',
  CUSTOMER_SERVICE: 'Customer Service',
  MARKETING: 'Marketing',
  DASHBOARD: 'Dashboard',
  REPORTS: 'Reports',
  SYSTEM: 'System',
  SELF_SERVICE: 'Self Service'
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  MANAGE: 'manage',
  PROCESS: 'process',
  ASSIGN: 'assign',
  RESOLVE: 'resolve',
  SEND: 'send'
} as const;

// Helper types for UI components
export interface RoleSelectOption {
  value: string;
  label: string;
  description?: string;
  department?: string;
  level: number;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface PermissionCheckbox {
  permission: Permission;
  checked: boolean;
  disabled?: boolean;
}

// API response types
export interface RolesResponse {
  success: boolean;
  data: Role[];
  message: string;
}

export interface RoleResponse {
  success: boolean;
  data: RoleWithPermissions;
  message: string;
}

export interface PermissionsResponse {
  success: boolean;
  data: {
    permissions: Permission[];
    grouped: Record<string, Permission[]>;
  };
  message: string;
}

export interface UserPermissionsResponse {
  success: boolean;
  data: UserWithPermissions;
  message: string;
}

export interface DepartmentStatsResponse {
  success: boolean;
  data: DepartmentStats[];
  message: string;
}
