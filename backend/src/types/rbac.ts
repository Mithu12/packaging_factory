// RBAC Type Definitions

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

export interface RoleHierarchy {
  id: number;
  parent_role_id: number;
  child_role_id: number;
  created_at: string;
  parent_role?: Role;
  child_role?: Role;
}

export interface DepartmentStats {
  department: string;
  total_roles: number;
  active_roles: number;
  total_users: number;
  active_users: number;
  average_role_level: number;
  min_role_level: number;
  max_role_level: number;
  unique_permissions: number;
}

// Enhanced User interface with role-based information
export interface UserWithRole {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  role?: string; // Legacy role field
  role_id?: number;
  role_details?: Role;
  permissions?: Permission[];
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// User with comprehensive RBAC permissions
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

// Permission checking utilities
export interface PermissionCheck {
  module: string;
  action: string;
  resource: string;
}

// Role creation/update requests
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

// Permission assignment requests
export interface AssignPermissionRequest {
  user_id: number;
  permission_ids: number[];
  expires_at?: string;
}

export interface RolePermissionRequest {
  role_id: number;
  permission_ids: number[];
}

// Response types
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  user_count?: number;
}

export interface UserWithPermissions extends UserWithRole {
  role_permissions: Permission[];
  direct_permissions: Permission[];
  all_permissions: Permission[];
}

// Dashboard and reporting types
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

// Constants for role names (to avoid typos)
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

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

// Permission constants
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

// Helper type for permission checking
export interface PermissionContext {
  user_id: number;
  role_id?: number;
  department?: string;
  level?: number;
}

// Middleware types
export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: string;
    role_id?: number;
    permissions?: string[];
  };
}

export interface PermissionMiddlewareOptions {
  module: string;
  action: string;
  resource: string;
  required?: boolean; // Default true
  allow_own_resource?: boolean; // Allow access to own resources (e.g., own profile)
}
