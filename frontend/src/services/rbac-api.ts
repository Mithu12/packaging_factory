import { makeRequest } from './api-utils';
import { UserWithPermissions, Permission, Role, PermissionCheck } from '@/types/rbac';

export class RBACApi {
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

  /**
   * Get all available permissions
   */
  static async getAllPermissions(): Promise<Permission[]> {
    return makeRequest<Permission[]>('/roles/permissions');
  }

  /**
   * Get all available roles
   */
  static async getAllRoles(): Promise<Role[]> {
    return makeRequest<Role[]>('/roles');
  }

  /**
   * Get user's role details
   */
  static async getUserRole(userId: number): Promise<Role> {
    return makeRequest<Role>(`/roles/user/${userId}`);
  }

  /**
   * Assign permissions to user (admin only)
   */
  static async assignPermissionsToUser(userId: number, permissionIds: number[]): Promise<void> {
    return makeRequest<void>('/roles/users/assign-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        permission_ids: permissionIds,
      }),
    });
  }

  /**
   * Remove permissions from user (admin only)
   */
  static async removePermissionsFromUser(userId: number, permissionIds: number[]): Promise<void> {
    return makeRequest<void>('/roles/users/remove-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        permission_ids: permissionIds,
      }),
    });
  }

  /**
   * Update user role (admin only)
   */
  static async updateUserRole(userId: number, roleId: number): Promise<void> {
    return makeRequest<void>(`/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role_id: roleId }),
    });
  }
}