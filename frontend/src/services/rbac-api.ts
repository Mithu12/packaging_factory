import { makeRequest } from './api-utils';
import {
  Role,
  RoleWithPermissions,
  Permission,
  UserWithPermissions,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignPermissionRequest,
  DepartmentStats,
  RolesResponse,
  RoleResponse,
  PermissionsResponse,
  UserPermissionsResponse,
  DepartmentStatsResponse
} from './rbac-types';

class RBACApiService {
  private readonly BASE_PATH = '/roles';

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    const response = await makeRequest<RolesResponse>(this.BASE_PATH, {
      method: 'GET'
    });
    return response.data;
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleById(roleId: number): Promise<RoleWithPermissions> {
    const response = await makeRequest<RoleResponse>(`${this.BASE_PATH}/${roleId}`, {
      method: 'GET'
    });
    return response.data;
  }

  /**
   * Create a new role
   */
  async createRole(roleData: CreateRoleRequest): Promise<Role> {
    const response = await makeRequest<RoleResponse>(this.BASE_PATH, {
      method: 'POST',
      body: JSON.stringify(roleData)
    });
    return response.data;
  }

  /**
   * Update an existing role
   */
  async updateRole(roleId: number, roleData: UpdateRoleRequest): Promise<Role> {
    const response = await makeRequest<RoleResponse>(`${this.BASE_PATH}/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    });
    return response.data;
  }

  /**
   * Delete a role (soft delete)
   */
  async deleteRole(roleId: number): Promise<void> {
    await makeRequest(`${this.BASE_PATH}/${roleId}`, {
      method: 'DELETE'
    });
  }

  // ==================== PERMISSION MANAGEMENT ====================

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<{ permissions: Permission[]; grouped: Record<string, Permission[]> }> {
    const response = await makeRequest<PermissionsResponse>(`${this.BASE_PATH}/permissions/all`, {
      method: 'GET'
    });
    return response.data;
  }

  /**
   * Get permissions by module
   */
  async getPermissionsByModule(module: string): Promise<Permission[]> {
    const response = await makeRequest<{ success: boolean; data: Permission[]; message: string }>(`${this.BASE_PATH}/permissions/module/${module}`, {
      method: 'GET'
    });
    return response.data;
  }

  // ==================== USER PERMISSION MANAGEMENT ====================

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: number): Promise<UserWithPermissions> {
    const response = await makeRequest<UserPermissionsResponse>(`${this.BASE_PATH}/users/${userId}/permissions`, {
      method: 'GET'
    });
    return response.data;
  }

  /**
   * Assign permissions directly to a user
   */
  async assignPermissionsToUser(assignmentData: AssignPermissionRequest): Promise<void> {
    await makeRequest(`${this.BASE_PATH}/users/assign-permissions`, {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
  }

  // ==================== ANALYTICS & REPORTING ====================

  /**
   * Get department analytics
   */
  async getDepartmentStats(): Promise<DepartmentStats[]> {
    const response = await makeRequest<DepartmentStatsResponse>(`${this.BASE_PATH}/analytics/departments`, {
      method: 'GET'
    });
    return response.data;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if current user has a specific permission
   * Note: This would typically be done through the auth context,
   * but we can implement it here for API validation
   */
  async checkUserPermission(userId: number, module: string, action: string, resource: string): Promise<boolean> {
    try {
      const userPerms = await this.getUserPermissions(userId);
      const permissionName = `${module.toLowerCase()}.${action.toLowerCase()}.${resource.toLowerCase()}`;
      
      return userPerms.all_permissions.some(perm => 
        perm.module.toLowerCase() === module.toLowerCase() &&
        perm.action.toLowerCase() === action.toLowerCase() &&
        perm.resource.toLowerCase() === resource.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  /**
   * Get roles by department
   */
  async getRolesByDepartment(department: string): Promise<Role[]> {
    const allRoles = await this.getAllRoles();
    return allRoles.filter(role => role.department === department);
  }

  /**
   * Get roles by level range
   */
  async getRolesByLevelRange(minLevel: number, maxLevel: number): Promise<Role[]> {
    const allRoles = await this.getAllRoles();
    return allRoles.filter(role => role.level >= minLevel && role.level <= maxLevel);
  }

  /**
   * Search roles by name or display name
   */
  async searchRoles(query: string): Promise<Role[]> {
    const allRoles = await this.getAllRoles();
    const lowercaseQuery = query.toLowerCase();
    
    return allRoles.filter(role => 
      role.name.toLowerCase().includes(lowercaseQuery) ||
      role.display_name.toLowerCase().includes(lowercaseQuery) ||
      (role.description && role.description.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get available permissions for a specific module
   */
  async getAvailablePermissionsForModule(module: string): Promise<Permission[]> {
    const { permissions } = await this.getAllPermissions();
    return permissions.filter(perm => perm.module === module);
  }

  /**
   * Validate role creation data
   */
  validateRoleData(roleData: CreateRoleRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!roleData.name || roleData.name.trim().length < 2) {
      errors.push('Role name must be at least 2 characters long');
    }

    if (!roleData.display_name || roleData.display_name.trim().length < 2) {
      errors.push('Display name must be at least 2 characters long');
    }

    if (roleData.level < 1 || roleData.level > 10) {
      errors.push('Role level must be between 1 and 10');
    }

    // Check for valid role name format (snake_case)
    if (roleData.name && !/^[a-z][a-z0-9_]*$/.test(roleData.name)) {
      errors.push('Role name must be in snake_case format (lowercase letters, numbers, and underscores only)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format role for display in UI
   */
  formatRoleForDisplay(role: Role): string {
    return `${role.display_name} (${role.department || 'General'})`;
  }

  /**
   * Format permission for display in UI
   */
  formatPermissionForDisplay(permission: Permission): string {
    return `${permission.module} - ${permission.display_name}`;
  }

  /**
   * Group permissions by module for UI
   */
  groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }
}

// Export singleton instance
export const RBACApi = new RBACApiService();
