import { Request, Response, NextFunction } from 'express';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import { AuthMediator } from '@/mediators/auth/AuthMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { AssignPermissionRequest } from '@/types/rbac';
import { UserRole } from '@/types/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: UserRole;
    role_id?: number;
  };
}

export class UserPermissionsController {
  
  // ==================== USER PERMISSION MANAGEMENT ====================
  
  /**
   * GET /api/rbac/users/:userId/permissions
   * Get user permissions (role-based + direct)
   */
  static async getUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/users/:userId/permissions';
    const userId = parseInt(req.params.userId);
    
    try {
      MyLogger.info(action, { userId });
      
      if (isNaN(userId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid user ID');
        return;
      }
      
      // Check if user can view other users' permissions (must be admin or viewing own permissions)
      const requestingUserId = req.user!.user_id;
      if (requestingUserId !== userId) {
        const hasAdminPermission = await AuthMediator.hasPermission(requestingUserId, {
          module: 'User Management',
          action: 'read',
          resource: 'users'
        });
        
        if (!hasAdminPermission) {
          serializeErrorResponse(res, {}, '403', 'Cannot view other users permissions');
          return;
        }
      }
      
      const userWithPermissions = await RoleMediator.getUserPermissions(userId);
      
      // Add additional metadata
      const response = {
        ...userWithPermissions,
        summary: {
          total_permissions: userWithPermissions.all_permissions.length,
          role_permissions: userWithPermissions.role_permissions.length,
          direct_permissions: userWithPermissions.direct_permissions.length,
          role_name: userWithPermissions.role_details?.display_name || 'No Role',
          role_level: userWithPermissions.role_details?.level || 0
        },
        permissions_by_module: userWithPermissions.all_permissions.reduce((acc: any, permission) => {
          if (!acc[permission.module]) {
            acc[permission.module] = [];
          }
          acc[permission.module].push(permission);
          return acc;
        }, {})
      };
      
      MyLogger.success(action, { 
        userId,
        totalPermissions: userWithPermissions.all_permissions.length,
        rolePermissions: userWithPermissions.role_permissions.length,
        directPermissions: userWithPermissions.direct_permissions.length
      });
      
      serializeSuccessResponse(res, response, 'User permissions retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { userId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving user permissions');
    }
  }
  
  /**
   * POST /api/rbac/users/assign-permissions
   * Assign permissions directly to a user
   */
  static async assignPermissionsToUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'POST /api/rbac/users/assign-permissions';
    
    try {
      MyLogger.info(action, { assignmentData: req.body });
      
      const assignmentData: AssignPermissionRequest = req.body;
      const assignedBy = req.user!.user_id;
      
      await RoleMediator.assignPermissionsToUser(assignmentData, assignedBy);
      
      MyLogger.success(action, { 
        userId: assignmentData.user_id,
        permissionIds: assignmentData.permission_ids,
        assignedBy,
        expiresAt: assignmentData.expires_at
      });
      
      serializeSuccessResponse(res, {
        user_id: assignmentData.user_id,
        assigned_permissions: assignmentData.permission_ids.length,
        expires_at: assignmentData.expires_at,
        assigned_by: assignedBy
      }, 'Permissions assigned to user successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { assignmentData: req.body });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error assigning permissions to user');
    }
  }
  
  /**
   * DELETE /api/rbac/users/remove-permissions
   * Remove permissions from a user
   */
  static async removePermissionsFromUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'DELETE /api/rbac/users/remove-permissions';
    
    try {
      MyLogger.info(action, { removalData: req.body });
      
      const { user_id, permission_ids } = req.body;
      const removedBy = req.user!.user_id;
      
      await RoleMediator.removePermissionsFromUser(user_id, permission_ids, removedBy);
      
      MyLogger.success(action, { 
        userId: user_id,
        permissionIds: permission_ids,
        removedBy
      });
      
      serializeSuccessResponse(res, {
        user_id,
        removed_permissions: permission_ids.length,
        removed_by: removedBy
      }, 'Permissions removed from user successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { removalData: req.body });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error removing permissions from user');
    }
  }
  
  /**
   * PUT /api/rbac/users/:userId/role
   * Update user's role
   */
  static async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'PUT /api/rbac/users/:userId/role';
    const userId = parseInt(req.params.userId);
    
    try {
      MyLogger.info(action, { userId, roleData: req.body });
      
      if (isNaN(userId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid user ID');
        return;
      }
      
      const { role_id } = req.body;
      const updatedBy = req.user!.user_id;
      
      await RoleMediator.updateUserRole(userId, role_id, updatedBy);
      
      // Get updated user permissions to return
      const updatedUserPermissions = await RoleMediator.getUserPermissions(userId);
      
      MyLogger.success(action, { 
        userId,
        newRoleId: role_id,
        updatedBy,
        newRoleName: updatedUserPermissions.role_details?.display_name
      });
      
      serializeSuccessResponse(res, {
        user_id: userId,
        new_role_id: role_id,
        new_role_name: updatedUserPermissions.role_details?.display_name,
        total_permissions: updatedUserPermissions.all_permissions.length,
        updated_by: updatedBy
      }, 'User role updated successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { userId, roleData: req.body });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error updating user role');
    }
  }
  
  /**
   * POST /api/rbac/users/:userId/check-permission
   * Check if user has a specific permission
   */
  static async checkUserPermission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'POST /api/rbac/users/:userId/check-permission';
    const userId = parseInt(req.params.userId);
    
    try {
      MyLogger.info(action, { userId, permissionCheck: req.body });
      
      if (isNaN(userId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid user ID');
        return;
      }
      
      const { module, action: permissionAction, resource } = req.body;
      
      const hasPermission = await RoleMediator.hasPermission(userId, {
        module,
        action: permissionAction,
        resource
      });
      
      MyLogger.success(action, { 
        userId,
        permission: `${module}.${permissionAction}.${resource}`,
        hasPermission
      });
      
      serializeSuccessResponse(res, {
        user_id: userId,
        permission: {
          module,
          action: permissionAction,
          resource
        },
        has_permission: hasPermission,
        checked_at: new Date().toISOString()
      }, 'Permission check completed');
      
    } catch (error: any) {
      MyLogger.error(action, error, { userId, permissionCheck: req.body });
      serializeErrorResponse(res, {}, '500', error.message || 'Error checking user permission');
    }
  }
  
  /**
   * POST /api/rbac/users/:userId/check-permissions
   * Check if user has any of the specified permissions
   */
  static async checkUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'POST /api/rbac/users/:userId/check-permissions';
    const userId = parseInt(req.params.userId);
    
    try {
      MyLogger.info(action, { userId, permissionChecks: req.body });
      
      if (isNaN(userId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid user ID');
        return;
      }
      
      const { permissions } = req.body;
      
      const hasAnyPermission = await RoleMediator.hasAnyPermission(userId, permissions);
      
      // Check each permission individually for detailed response
      const individualChecks = await Promise.all(
        permissions.map(async (permission: any) => ({
          permission,
          has_permission: await RoleMediator.hasPermission(userId, permission)
        }))
      );
      
      MyLogger.success(action, { 
        userId,
        totalChecks: permissions.length,
        hasAnyPermission,
        passedChecks: individualChecks.filter(check => check.has_permission).length
      });
      
      serializeSuccessResponse(res, {
        user_id: userId,
        has_any_permission: hasAnyPermission,
        individual_checks: individualChecks,
        summary: {
          total_checks: permissions.length,
          passed_checks: individualChecks.filter(check => check.has_permission).length,
          failed_checks: individualChecks.filter(check => !check.has_permission).length
        },
        checked_at: new Date().toISOString()
      }, 'Multiple permission check completed');
      
    } catch (error: any) {
      MyLogger.error(action, error, { userId, permissionChecks: req.body });
      serializeErrorResponse(res, {}, '500', error.message || 'Error checking user permissions');
    }
  }
  
  // ==================== BULK OPERATIONS ====================
  
  /**
   * POST /api/rbac/users/bulk-assign-permissions
   * Assign permissions to multiple users
   */
  static async bulkAssignPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'POST /api/rbac/users/bulk-assign-permissions';
    
    try {
      MyLogger.info(action, { bulkData: req.body });
      
      const { user_ids, permission_ids, expires_at } = req.body;
      const assignedBy = req.user!.user_id;
      
      const results = [];
      const errors = [];
      
      // Process each user individually to handle partial failures
      for (const userId of user_ids) {
        try {
          await RoleMediator.assignPermissionsToUser({
            user_id: userId,
            permission_ids,
            expires_at
          }, assignedBy);
          
          results.push({
            user_id: userId,
            status: 'success',
            assigned_permissions: permission_ids.length
          });
        } catch (error: any) {
          errors.push({
            user_id: userId,
            status: 'error',
            error: error.message
          });
        }
      }
      
      MyLogger.success(action, { 
        totalUsers: user_ids.length,
        successfulAssignments: results.length,
        failedAssignments: errors.length,
        permissionIds: permission_ids,
        assignedBy
      });
      
      serializeSuccessResponse(res, {
        results,
        errors,
        summary: {
          total_users: user_ids.length,
          successful_assignments: results.length,
          failed_assignments: errors.length,
          permissions_per_user: permission_ids.length
        },
        assigned_by: assignedBy,
        expires_at
      }, 'Bulk permission assignment completed');
      
    } catch (error: any) {
      MyLogger.error(action, error, { bulkData: req.body });
      serializeErrorResponse(res, {}, '500', error.message || 'Error in bulk permission assignment');
    }
  }
  
  /**
   * GET /api/rbac/users/with-permission
   * Get all users who have a specific permission
   */
  static async getUsersWithPermission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/users/with-permission';
    
    try {
      MyLogger.info(action, { query: req.query });
      
      const { module, action: permissionAction, resource } = req.query;
      
      if (!module || !permissionAction || !resource) {
        serializeErrorResponse(res, {}, '400', 'Module, action, and resource are required');
        return;
      }
      
      const usersWithPermission = await RoleMediator.getUsersWithPermission({
        module: module as string,
        action: permissionAction as string,
        resource: resource as string
      });
      
      MyLogger.success(action, { 
        permission: `${module}.${permissionAction}.${resource}`,
        userCount: usersWithPermission.length
      });
      
      serializeSuccessResponse(res, {
        permission: {
          module,
          action: permissionAction,
          resource
        },
        users: usersWithPermission,
        summary: {
          total_users: usersWithPermission.length,
          active_users: usersWithPermission.filter(u => u.is_active).length,
          inactive_users: usersWithPermission.filter(u => !u.is_active).length
        }
      }, 'Users with permission retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving users with permission');
    }
  }
}
