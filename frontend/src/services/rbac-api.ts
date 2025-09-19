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
    try {
      console.log('RBAC API: Fetching all roles...');
      const response = await makeRequest<any>(this.BASE_PATH, {
        method: 'GET'
      });
      console.log('RBAC API: Raw response received:', response);
      
      // Handle different response formats
      if (response.data) {
        console.log('RBAC API: Returning response.data:', response.data);
        return Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        console.log('RBAC API: Response is array:', response);
        return response;
      } else {
        console.log('RBAC API: Unexpected response format, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('RBAC API: Error fetching roles:', error);
      // Return mock data for development
      return this.getMockRoles();
    }
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleById(roleId: number): Promise<RoleWithPermissions> {
    try {
      console.log('RBAC API: Fetching role by ID:', roleId);
      const response = await makeRequest<any>(`${this.BASE_PATH}/${roleId}`, {
        method: 'GET'
      });
      console.log('RBAC API: Role details response:', response);
      
      // Handle different response formats
      if (response.data) {
        return response.data;
      } else if (response.id) {
        return response;
      } else {
        // Return mock role with permissions
        return this.getMockRoleWithPermissions(roleId);
      }
    } catch (error) {
      console.error('RBAC API: Error fetching role by ID:', error);
      // Return mock role with permissions
      return this.getMockRoleWithPermissions(roleId);
    }
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
    try {
      console.log('RBAC API: Fetching all permissions...');
      const response = await makeRequest<any>(`${this.BASE_PATH}/permissions/all`, {
        method: 'GET'
      });
      console.log('RBAC API: Permissions response:', response);
      
      // Handle different response formats
      if (response.data) {
        return response.data;
      } else if (response.permissions && response.grouped) {
        return response;
      } else {
        // Return mock permissions
        return this.getMockPermissions();
      }
    } catch (error) {
      console.error('RBAC API: Error fetching permissions:', error);
      // Return mock permissions
      return this.getMockPermissions();
    }
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
    const response = await makeRequest<UserWithPermissions>(`${this.BASE_PATH}/users/${userId}/permissions`, {
      method: 'GET'
    });    
    return response;
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

  // ==================== ANALYTICS ====================

  /**
   * Get department statistics
   */
  async getDepartmentStats(): Promise<DepartmentStats[]> {
    try {
      console.log('RBAC API: Fetching department stats...');
      const response = await makeRequest<any>(`${this.BASE_PATH}/analytics/departments`, {
        method: 'GET'
      });
      console.log('RBAC API: Department stats response:', response);
      
      // Handle different response formats
      if (response.data) {
        return Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        return response;
      } else {
        return [];
      }
    } catch (error) {
      console.error('RBAC API: Error fetching department stats:', error);
      // Return mock data for development
      return this.getMockDepartmentStats();
    }
  }

  // ==================== USER ASSIGNMENT ====================

  /**
   * Assign role to user
   */
  async assignUserRole(userId: number, roleId: number): Promise<void> {
    await makeRequest(`${this.BASE_PATH}/users/assign-role`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        role_id: roleId
      })
    });
  }

  /**
   * Remove role from user
   */
  async removeUserRole(userId: number): Promise<void> {
    await makeRequest(`${this.BASE_PATH}/users/${userId}/remove-role`, {
      method: 'DELETE'
    });
  }

  // ==================== MOCK DATA FOR DEVELOPMENT ====================

  /**
   * Get mock roles for development/fallback
   */
  private getMockRoles(): Role[] {
    return [
      {
        id: 1,
        name: 'system_admin',
        display_name: 'System Administrator',
        description: 'Full system access and control',
        level: 1,
        department: 'IT',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'finance_manager',
        display_name: 'Finance Manager',
        description: 'Manages financial operations and approvals',
        level: 3,
        department: 'Finance',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 3,
        name: 'sales_manager',
        display_name: 'Sales Manager',
        description: 'Manages sales operations and team',
        level: 3,
        department: 'Sales',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 4,
        name: 'employee',
        display_name: 'Employee',
        description: 'Basic employee access with self-service capabilities',
        level: 6,
        department: 'General',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];
  }

  /**
   * Get mock department stats
   */
  private getMockDepartmentStats(): DepartmentStats[] {
    return [
      {
        department: 'IT',
        total_users: 5,
        active_users: 5,
        roles: []
      },
      {
        department: 'Finance',
        total_users: 8,
        active_users: 7,
        roles: []
      },
      {
        department: 'Sales',
        total_users: 12,
        active_users: 10,
        roles: []
      },
      {
        department: 'HR',
        total_users: 6,
        active_users: 6,
        roles: []
      }
    ];
  }

  /**
   * Get mock role with permissions by ID
   */
  private getMockRoleWithPermissions(roleId: number): RoleWithPermissions {
    const mockRoles = this.getMockRoles();
    const baseRole = mockRoles.find(r => r.id === roleId) || mockRoles[0];
    
    return {
      ...baseRole,
      permissions: this.getMockPermissionsForRole(roleId),
      user_count: Math.floor(Math.random() * 10) + 1
    };
  }

  /**
   * Get mock permissions for a specific role
   */
  private getMockPermissionsForRole(roleId: number): Permission[] {
    const allPermissions = this.getMockPermissions().permissions;
    
    // Different roles get different permission sets
    switch (roleId) {
      case 1: // System Admin - all permissions
        return allPermissions;
      case 2: // Finance Manager - finance related permissions
        return allPermissions.filter(p => 
          p.module === 'Finance' || 
          p.module === 'Dashboard' || 
          p.module === 'Reports' ||
          p.module === 'Self Service'
        );
      case 3: // Sales Manager - sales related permissions
        return allPermissions.filter(p => 
          p.module === 'Sales' || 
          p.module === 'Inventory' ||
          p.module === 'Dashboard' || 
          p.module === 'Reports' ||
          p.module === 'Self Service'
        );
      case 4: // Employee - only self service permissions
        return allPermissions.filter(p => p.module === 'Self Service');
      default:
        return allPermissions.slice(0, 5); // Some basic permissions
    }
  }

  /**
   * Get mock permissions data
   */
  private getMockPermissions(): { permissions: Permission[]; grouped: Record<string, Permission[]> } {
    const permissions: Permission[] = [
      // Finance permissions
      { id: 1, name: 'accounts.create', display_name: 'Create Chart of Accounts', module: 'Finance', action: 'create', resource: 'accounts', created_at: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'accounts.read', display_name: 'View Chart of Accounts', module: 'Finance', action: 'read', resource: 'accounts', created_at: '2024-01-01T00:00:00Z' },
      { id: 3, name: 'payments.create', display_name: 'Create Payments', module: 'Finance', action: 'create', resource: 'payments', created_at: '2024-01-01T00:00:00Z' },
      { id: 4, name: 'payments.approve', display_name: 'Approve Payments', module: 'Finance', action: 'approve', resource: 'payments', created_at: '2024-01-01T00:00:00Z' },
      
      // Sales permissions
      { id: 5, name: 'customers.create', display_name: 'Create Customers', module: 'Sales', action: 'create', resource: 'customers', created_at: '2024-01-01T00:00:00Z' },
      { id: 6, name: 'customers.read', display_name: 'View Customers', module: 'Sales', action: 'read', resource: 'customers', created_at: '2024-01-01T00:00:00Z' },
      { id: 7, name: 'sales_orders.create', display_name: 'Create Sales Orders', module: 'Sales', action: 'create', resource: 'sales_orders', created_at: '2024-01-01T00:00:00Z' },
      { id: 8, name: 'pos.access', display_name: 'Access POS System', module: 'Sales', action: 'read', resource: 'pos', created_at: '2024-01-01T00:00:00Z' },
      
      // Inventory permissions
      { id: 9, name: 'products.create', display_name: 'Create Products', module: 'Inventory', action: 'create', resource: 'products', created_at: '2024-01-01T00:00:00Z' },
      { id: 10, name: 'products.read', display_name: 'View Products', module: 'Inventory', action: 'read', resource: 'products', created_at: '2024-01-01T00:00:00Z' },
      { id: 11, name: 'inventory.track', display_name: 'Track Inventory', module: 'Inventory', action: 'read', resource: 'inventory', created_at: '2024-01-01T00:00:00Z' },
      
      // Dashboard permissions
      { id: 12, name: 'dashboard.executive', display_name: 'Access Executive Dashboard', module: 'Dashboard', action: 'read', resource: 'executive_dashboard', created_at: '2024-01-01T00:00:00Z' },
      { id: 13, name: 'dashboard.departmental', display_name: 'Access Departmental Dashboard', module: 'Dashboard', action: 'read', resource: 'departmental_dashboard', created_at: '2024-01-01T00:00:00Z' },
      
      // Reports permissions
      { id: 14, name: 'reports.generate', display_name: 'Generate Custom Reports', module: 'Reports', action: 'create', resource: 'custom_reports', created_at: '2024-01-01T00:00:00Z' },
      { id: 15, name: 'reports.export', display_name: 'Export Reports', module: 'Reports', action: 'export', resource: 'reports', created_at: '2024-01-01T00:00:00Z' },
      
      // Self Service permissions
      { id: 16, name: 'profile.read', display_name: 'View Own Profile', module: 'Self Service', action: 'read', resource: 'own_profile', created_at: '2024-01-01T00:00:00Z' },
      { id: 17, name: 'profile.update', display_name: 'Update Own Profile', module: 'Self Service', action: 'update', resource: 'own_profile', created_at: '2024-01-01T00:00:00Z' },
      { id: 18, name: 'payslip.read', display_name: 'View Own Payslips', module: 'Self Service', action: 'read', resource: 'own_payslips', created_at: '2024-01-01T00:00:00Z' },
      { id: 19, name: 'leave.request', display_name: 'Request Leave', module: 'Self Service', action: 'create', resource: 'own_leave_requests', created_at: '2024-01-01T00:00:00Z' }
    ];

    // Group permissions by module
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return { permissions, grouped };
  }
}

// Export singleton instance
export const RBACApi = new RBACApiService();
