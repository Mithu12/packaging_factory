import { makeRequest } from './api-utils';
import { UserWithPermissions, PermissionCheck, Role, Permission } from '@/types/rbac';

export class RBACApi {
  // ==================== AUTHENTICATION & USER PERMISSIONS ====================

  /**
   * Get current user with all permissions
   */
  static async getUserWithPermissions(): Promise<UserWithPermissions> {
    return makeRequest<UserWithPermissions>('/auth/profile/permissions');
  }

  /**
   * Check if current user has a specific permission
   */
  static async hasPermission(permission: PermissionCheck): Promise<boolean> {
    try {
      const response = await makeRequest<{ hasPermission: boolean }>('/auth/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permission),
      });
      return response.hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Check if current user has any of the specified permissions
   */
  static async hasAnyPermission(permissions: PermissionCheck[]): Promise<boolean> {
    try {
      const response = await makeRequest<{ hasPermission: boolean }>('/auth/check-any-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });
      return response.hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Get all roles with filtering and pagination
   */
  static async getAllRoles(params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    level?: number;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/rbac/roles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return makeRequest<{
      roles: Role[];
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        total_pages: number;
      };
      filters: any;
    }>(url);
  }

  /**
   * Get role details with permissions
   */
  static async getRoleById(roleId: number) {
    return makeRequest<Role & { permissions: Permission[] }>(`/rbac/roles/${roleId}`);
  }

  /**
   * Create a new role
   */
  static async createRole(roleData: {
    name: string;
    display_name: string;
    description?: string;
    level: number;
    department?: string;
    permission_ids?: number[];
  }) {
    return makeRequest<Role>('/rbac/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  /**
   * Update an existing role
   */
  static async updateRole(roleId: number, updateData: {
    display_name?: string;
    description?: string;
    level?: number;
    department?: string;
    is_active?: boolean;
  }) {
    return makeRequest<Role>(`/rbac/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete a role (soft delete)
   */
  static async deleteRole(roleId: number) {
    return makeRequest<{ id: number }>(`/rbac/roles/${roleId}`, {
      method: 'DELETE',
    });
  }


  /**
   * Get role statistics
   */
  static async getRoleStats() {
    return makeRequest<{
      overview: {
        total_roles: number;
        active_roles: number;
        inactive_roles: number;
        unique_departments: number;
        average_level: number;
        min_level: number;
        max_level: number;
      };
      by_department: Array<{
        department: string;
        role_count: number;
        active_count: number;
      }>;
      by_level: Array<{
        level: number;
        role_count: number;
        active_count: number;
      }>;
    }>('/rbac/roles/stats');
  }

  /**
   * Get roles grouped by department
   */
  static async getRolesByDepartment() {
    return makeRequest<{
      departments: Array<{
        department: string;
        role_count: number;
        active_roles: number;
        roles: Role[];
      }>;
      summary: {
        total_departments: number;
        total_roles: number;
        active_roles: number;
      };
    }>('/rbac/roles/departments');
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStats() {
    return makeRequest<Array<{
      department: string;
      total_roles: number;
      active_roles: number;
      total_users: number;
      active_users: number;
      average_role_level: number;
      min_role_level: number;
      max_role_level: number;
      unique_permissions: number;
    }>>('/rbac/departments/stats');
  }

  // ==================== PERMISSION MANAGEMENT ====================

  /**
   * Get all permissions with filtering and pagination
   */
  static async getAllPermissions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    module?: string;
    action?: string;
    resource?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/rbac/permissions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return makeRequest<{
      permissions: Permission[];
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        total_pages: number;
      };
      filters: any;
    }>(url);
  }

  /**
   * Get permissions grouped by module
   */
  static async getPermissionsGrouped() {
    return makeRequest<{
      modules: Array<{
        module: string;
        permissions: Permission[];
        permission_count: number;
        actions: string[];
        resources: string[];
      }>;
      summary: {
        total_modules: number;
        total_permissions: number;
        unique_actions: string[];
        unique_resources: string[];
      };
    }>('/rbac/permissions/grouped');
  }

  /**
   * Get permissions by module
   */
  static async getPermissionsByModule(module: string) {
    return makeRequest<{
      module: string;
      permissions: Permission[];
      by_action: Record<string, Permission[]>;
      by_resource: Record<string, Permission[]>;
      statistics: {
        total_permissions: number;
        unique_actions: number;
        unique_resources: number;
      };
    }>(`/rbac/permissions/module/${encodeURIComponent(module)}`);
  }

  /**
   * Get permission statistics
   */
  static async getPermissionStats() {
    return makeRequest<{
      overview: {
        total_permissions: number;
        total_modules: number;
        total_actions: number;
        total_resources: number;
      };
      by_module: Array<{
        module: string;
        total_permissions: number;
        unique_actions: number;
        unique_resources: number;
        actions: string[];
        resources: string[];
      }>;
      by_action: Array<{
        action: string;
        count: number;
        modules: string[];
        resources: string[];
      }>;
      unique_modules: string[];
      unique_actions: string[];
      unique_resources: string[];
    }>('/rbac/permissions/stats');
  }

  /**
   * Advanced permission search
   */
  static async searchPermissions(searchCriteria: {
    query?: string;
    modules?: string[];
    actions?: string[];
    resources?: string[];
    exact_match?: boolean;
  }) {
    return makeRequest<{
      permissions: Permission[];
      search_criteria: typeof searchCriteria;
      results_summary: {
        total_found: number;
        total_searched: number;
      };
    }>('/rbac/permissions/search', {
      method: 'POST',
      body: JSON.stringify(searchCriteria),
    });
  }

  // ==================== ROLE-PERMISSION ASSIGNMENT ====================

  /**
   * Assign permissions to a role
   */
  static async assignPermissionsToRole(roleId: number, permissionIds: number[]) {
    return makeRequest<{
      role_id: number;
      assigned_permissions: number;
    }>(`/rbac/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permission_ids: permissionIds }),
    });
  }

  /**
   * Remove permissions from a role
   */
  static async removePermissionsFromRole(roleId: number, permissionIds: number[]) {
    return makeRequest<{
      role_id: number;
      removed_permissions: number;
    }>(`/rbac/roles/${roleId}/permissions`, {
      method: 'DELETE',
      body: JSON.stringify({ permission_ids: permissionIds }),
    });
  }

  // ==================== USER PERMISSION MANAGEMENT ====================

  /**
   * Get user permissions (role-based + direct)
   */
  static async getUserPermissions(userId: number, params?: {
    page?: number;
    limit?: number;
    include_expired?: boolean;
    module?: string;
    action?: string;
    resource?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `/rbac/users/${userId}/permissions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return makeRequest<UserWithPermissions & {
      summary: {
        total_permissions: number;
        role_permissions: number;
        direct_permissions: number;
        role_name: string;
        role_level: number;
      };
      permissions_by_module: Record<string, Permission[]>;
    }>(url);
  }

  /**
   * Assign permissions directly to a user
   */
  static async assignPermissionsToUser(assignmentData: {
    user_id: number;
    permission_ids: number[];
    expires_at?: string;
  }) {
    return makeRequest<{
      user_id: number;
      assigned_permissions: number;
      expires_at?: string;
      assigned_by: number;
    }>('/rbac/users/assign-permissions', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  /**
   * Remove permissions from a user
   */
  static async removePermissionsFromUser(removalData: {
    user_id: number;
    permission_ids: number[];
  }) {
    return makeRequest<{
      user_id: number;
      removed_permissions: number;
      removed_by: number;
    }>('/rbac/users/remove-permissions', {
      method: 'DELETE',
      body: JSON.stringify(removalData),
    });
  }

  /**
   * Update user's role
   */
  static async updateUserRole(userId: number, roleId: number) {
    return makeRequest<{
      user_id: number;
      new_role_id: number;
      new_role_name: string;
      total_permissions: number;
      updated_by: number;
    }>(`/rbac/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role_id: roleId }),
    });
  }

  /**
   * Check if user has a specific permission
   */
  static async checkUserPermission(userId: number, permission: PermissionCheck) {
    return makeRequest<{
      user_id: number;
      permission: PermissionCheck;
      has_permission: boolean;
      checked_at: string;
    }>(`/rbac/users/${userId}/check-permission`, {
      method: 'POST',
      body: JSON.stringify(permission),
    });
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async checkUserPermissions(userId: number, permissions: PermissionCheck[]) {
    return makeRequest<{
      user_id: number;
      has_any_permission: boolean;
      individual_checks: Array<{
        permission: PermissionCheck;
        has_permission: boolean;
      }>;
      summary: {
        total_checks: number;
        passed_checks: number;
        failed_checks: number;
      };
      checked_at: string;
    }>(`/rbac/users/${userId}/check-permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissions }),
    });
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Assign permissions to multiple roles
   */
  static async bulkAssignRolePermissions(roleIds: number[], permissionIds: number[]) {
    return makeRequest<{
      results: Array<{
        role_id: number;
        status: 'success' | 'error';
        assigned_permissions?: number;
        error?: string;
      }>;
      errors: Array<{
        role_id: number;
        status: 'error';
        error: string;
      }>;
      summary: {
        total_roles: number;
        successful_assignments: number;
        failed_assignments: number;
      };
    }>('/rbac/roles/bulk-assign-permissions', {
      method: 'POST',
      body: JSON.stringify({ role_ids: roleIds, permission_ids: permissionIds }),
    });
  }

  /**
   * Assign permissions to multiple users
   */
  static async bulkAssignUserPermissions(userIds: number[], permissionIds: number[], expiresAt?: string) {
    return makeRequest<{
      results: Array<{
        user_id: number;
        status: 'success' | 'error';
        assigned_permissions?: number;
        error?: string;
      }>;
      errors: Array<{
        user_id: number;
        status: 'error';
        error: string;
      }>;
      summary: {
        total_users: number;
        successful_assignments: number;
        failed_assignments: number;
        permissions_per_user: number;
      };
      assigned_by: number;
      expires_at?: string;
    }>('/rbac/users/bulk-assign-permissions', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: userIds,
        permission_ids: permissionIds,
        expires_at: expiresAt
      }),
    });
  }

  /**
   * Get all users who have a specific permission
   */
  static async getUsersWithPermission(permission: PermissionCheck) {
    const queryParams = new URLSearchParams({
      module: permission.module,
      action: permission.action,
      resource: permission.resource,
    });

    return makeRequest<{
      permission: PermissionCheck;
      users: Array<{
        id: number;
        username: string;
        email: string;
        full_name: string;
        is_active: boolean;
        last_login?: string;
        role_name: string;
        role_display_name: string;
        permission_source: string;
      }>;
      summary: {
        total_users: number;
        active_users: number;
        inactive_users: number;
      };
    }>(`/rbac/users/with-permission?${queryParams.toString()}`);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * RBAC system health check
   */
  static async getRBACHealth() {
    return makeRequest<{
      status: string;
      timestamp: string;
      system: {
        total_roles: number;
        active_roles: number;
        total_permissions: number;
        unique_modules: number;
      };
      user: {
        user_id: number;
        username: string;
        role: string;
      };
    }>('/rbac/health');
  }

  // ==================== LEGACY COMPATIBILITY ====================

  /**
   * @deprecated Use getAllPermissions() instead
   */
  static async getAllPermissionsLegacy(): Promise<Permission[]> {
    const response = await this.getAllPermissions({ limit: 1000 });
    return response.permissions;
  }

  /**
   * @deprecated Use getAllRoles() instead
   */
  static async getAllRolesLegacy(): Promise<Role[]> {
    const response = await this.getAllRoles({ limit: 1000 });
    return response.roles;
  }

  /**
   * @deprecated Use getUserPermissions() instead
   */
  static async getUserRole(userId: number): Promise<Role> {
    const userPermissions = await this.getUserPermissions(userId);
    if (!userPermissions.role_details) {
      throw new Error('User role not found');
    }
    return userPermissions.role_details;
  }

  // ==================== USER MANAGEMENT WITH RBAC (/auth/users routes) ====================

  /**
   * Get all users with RBAC data
   */
  static async getAllUsersWithRBAC() {
    return makeRequest<UserWithPermissions[]>('/auth/users');
  }

  /**
   * Create new user with RBAC role
   */
  static async createUserWithRole(userData: {
    username: string;
    email: string;
    full_name: string;
    mobile_number?: string;
    departments?: string[];
    role_id: number;
    password?: string;
    distribution_center_id?: number;
  }) {
    return makeRequest<UserWithPermissions>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Update user with RBAC role
   */
  static async updateUserWithRole(userId: number, userData: {
    username?: string;
    email?: string;
    full_name?: string;
    mobile_number?: string;
    departments?: string[];
    role_id?: number;
    distribution_center_id?: number;
  }) {
    return makeRequest<UserWithPermissions>(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }
}