import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { authenticate } from '@/middleware/auth';
import { requireSystemAdmin, requirePermission, PERMISSIONS } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';
import { validateRequest, validateQuery } from '@/middleware/validation';
import { serializeSuccessResponse, serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { RolesController } from '@/controllers/rbac/roles.controller';
import { PermissionsController } from '@/controllers/rbac/permissions.controller';
import { UserPermissionsController } from '@/controllers/rbac/user-permissions.controller';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import {
  createRoleSchema,
  updateRoleSchema,
  assignRolePermissionsSchema,
  removeRolePermissionsSchema,
  assignUserPermissionsSchema,
  removeUserPermissionsSchema,
  updateUserRoleSchema,
  checkPermissionSchema,
  checkMultiplePermissionsSchema,
  roleQuerySchema,
  permissionQuerySchema,
  userPermissionQuerySchema,
  bulkAssignRolePermissionsSchema,
  bulkAssignUserPermissionsSchema
} from '@/validation/rbacValidation';

const router = express.Router();

// ==================== ROLE MANAGEMENT ROUTES ====================

/**
 * @route GET /api/rbac/roles
 * @desc Get all roles with filtering and pagination
 * @access System Admin
 */
router.get('/roles',
  authenticate,
  requireSystemAdmin(),
  validateQuery(roleQuerySchema),
  expressAsyncHandler(RolesController.getAllRoles)
);

/**
 * @route GET /api/rbac/roles/stats
 * @desc Get role statistics
 * @access System Admin
 */
router.get('/roles/stats',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(RolesController.getRoleStats)
);

/**
 * @route GET /api/rbac/roles/departments
 * @desc Get roles grouped by department
 * @access System Admin
 */
router.get('/roles/departments',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(RolesController.getRolesByDepartment)
);

/**
 * @route GET /api/rbac/departments/stats
 * @desc Get department statistics
 * @access System Admin
 */
router.get('/departments/stats',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/rbac/departments/stats';
    
    try {
      const departmentStats = await RoleMediator.getDepartmentStats();
      
      res.json({
        success: true,
        message: 'Department statistics retrieved successfully',
        data: departmentStats
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving department statistics'
      });
    }
  })
);

/**
 * @route GET /api/rbac/roles/:id
 * @desc Get role details with permissions
 * @access System Admin
 */
router.get('/roles/:id',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(RolesController.getRoleById)
);

/**
 * @route POST /api/rbac/roles
 * @desc Create a new role
 * @access System Admin
 */
router.post('/roles',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(createRoleSchema),
  expressAsyncHandler(RolesController.createRole)
);

/**
 * @route PUT /api/rbac/roles/:id
 * @desc Update an existing role
 * @access System Admin
 */
router.put('/roles/:id',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(updateRoleSchema),
  expressAsyncHandler(RolesController.updateRole)
);

/**
 * @route DELETE /api/rbac/roles/:id
 * @desc Delete a role (soft delete)
 * @access System Admin
 */
router.delete('/roles/:id',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  expressAsyncHandler(RolesController.deleteRole)
);

// ==================== ROLE-PERMISSION ASSIGNMENT ROUTES ====================

/**
 * @route POST /api/rbac/roles/:id/permissions
 * @desc Assign permissions to a role
 * @access System Admin
 */
router.post('/roles/:id/permissions',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(assignRolePermissionsSchema),
  expressAsyncHandler(RolesController.assignPermissionsToRole)
);

/**
 * @route DELETE /api/rbac/roles/:id/permissions
 * @desc Remove permissions from a role
 * @access System Admin
 */
router.delete('/roles/:id/permissions',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(removeRolePermissionsSchema),
  expressAsyncHandler(RolesController.removePermissionsFromRole)
);

// ==================== PERMISSION MANAGEMENT ROUTES ====================

/**
 * @route GET /api/rbac/permissions
 * @desc Get all permissions with filtering and pagination
 * @access System Admin
 */
router.get('/permissions',
  authenticate,
  requireSystemAdmin(),
  validateQuery(permissionQuerySchema),
  expressAsyncHandler(PermissionsController.getAllPermissions)
);

/**
 * @route GET /api/rbac/permissions/grouped
 * @desc Get permissions grouped by module
 * @access System Admin
 */
router.get('/permissions/grouped',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(PermissionsController.getPermissionsGrouped)
);

/**
 * @route GET /api/rbac/permissions/stats
 * @desc Get permission statistics
 * @access System Admin
 */
router.get('/permissions/stats',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(PermissionsController.getPermissionStats)
);

/**
 * @route GET /api/rbac/permissions/module/:module
 * @desc Get permissions by module
 * @access System Admin
 */
router.get('/permissions/module/:module',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(PermissionsController.getPermissionsByModule)
);

/**
 * @route GET /api/rbac/permissions/:id
 * @desc Get permission details
 * @access System Admin
 */
// TODO: remove route - not used in frontend
router.get('/permissions/:id',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(PermissionsController.getPermissionById)
);

/**
 * @route POST /api/rbac/permissions/search
 * @desc Advanced permission search
 * @access System Admin
 */
router.post('/permissions/search',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(PermissionsController.searchPermissions)
);

// ==================== USER PERMISSION MANAGEMENT ROUTES ====================

/**
 * @route GET /api/rbac/users/:userId/permissions
 * @desc Get user permissions (role-based + direct)
 * @access User (own permissions) or System Admin (any user)
 */
router.get('/users/:userId/permissions',
  authenticate,
  validateQuery(userPermissionQuerySchema),
  expressAsyncHandler(UserPermissionsController.getUserPermissions)
);

/**
 * @route POST /api/rbac/users/assign-permissions
 * @desc Assign permissions directly to a user
 * @access System Admin
 */
router.post('/users/assign-permissions',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(assignUserPermissionsSchema),
  expressAsyncHandler(UserPermissionsController.assignPermissionsToUser)
);

/**
 * @route DELETE /api/rbac/users/remove-permissions
 * @desc Remove permissions from a user
 * @access System Admin
 */
router.delete('/users/remove-permissions',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(removeUserPermissionsSchema),
  expressAsyncHandler(UserPermissionsController.removePermissionsFromUser)
);

/**
 * @route PUT /api/rbac/users/:userId/role
 * @desc Update user's role
 * @access System Admin
 */
router.put('/users/:userId/role',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(updateUserRoleSchema),
  expressAsyncHandler(UserPermissionsController.updateUserRole)
);

/**
 * @route POST /api/rbac/users/:userId/check-permission
 * @desc Check if user has a specific permission
 * @access User (own permissions) or System Admin (any user)
 */
router.post('/users/:userId/check-permission',
  authenticate,
  validateRequest(checkPermissionSchema),
  expressAsyncHandler(UserPermissionsController.checkUserPermission)
);

/**
 * @route POST /api/rbac/users/:userId/check-permissions
 * @desc Check if user has any of the specified permissions
 * @access User (own permissions) or System Admin (any user)
 */
router.post('/users/:userId/check-permissions',
  authenticate,
  validateRequest(checkMultiplePermissionsSchema),
  expressAsyncHandler(UserPermissionsController.checkUserPermissions)
);

// ==================== BULK OPERATIONS ROUTES ====================

/**
 * @route POST /api/rbac/roles/bulk-assign-permissions
 * @desc Assign permissions to multiple roles
 * @access System Admin
 */
router.post('/roles/bulk-assign-permissions',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(bulkAssignRolePermissionsSchema),
  expressAsyncHandler(async (req, res) => {
    const action = 'POST /api/rbac/roles/bulk-assign-permissions';
    
    try {
      const { role_ids, permission_ids } = req.body;
      const assignedBy = req.user!.user_id;
      
      const results = [];
      const errors = [];
      
        // Process each role individually
        for (const roleId of role_ids) {
          try {
            await RoleMediator.assignPermissionsToRolePublic(roleId, permission_ids, assignedBy);
            results.push({
              role_id: roleId,
              status: 'success',
              assigned_permissions: permission_ids.length
            });
          } catch (error: any) {
            errors.push({
              role_id: roleId,
              status: 'error',
              error: error.message
            });
          }
        }
      
      res.json({
        success: true,
        message: 'Bulk role permission assignment completed',
        data: {
          results,
          errors,
          summary: {
            total_roles: role_ids.length,
            successful_assignments: results.length,
            failed_assignments: errors.length
          }
        }
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error in bulk role permission assignment'
      });
    }
  })
);

/**
 * @route POST /api/rbac/users/bulk-assign-permissions
 * @desc Assign permissions to multiple users
 * @access System Admin
 */
router.post('/users/bulk-assign-permissions',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(bulkAssignUserPermissionsSchema),
  expressAsyncHandler(UserPermissionsController.bulkAssignPermissions)
);

/**
 * @route GET /api/rbac/users/with-permission
 * @desc Get all users who have a specific permission
 * @access System Admin
 */
router.get('/users/with-permission',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(UserPermissionsController.getUsersWithPermission)
);

/**
 * @route GET /api/rbac/roles/:roleId/users
 * @desc Get all users who have a specific role
 * @access System Admin
 */
router.get('/roles/:roleId/users',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/rbac/roles/:roleId/users';
    const roleId = parseInt(req.params.roleId);

    try {
      MyLogger.info(action, { roleId });

      if (isNaN(roleId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid role ID');
        return;
      }

      const users = await RoleMediator.getUsersByRole(roleId);

      MyLogger.success(action, {
        roleId,
        userCount: users.length
      });

      serializeSuccessResponse(res, {
        role_id: roleId,
        users,
        summary: {
          total_users: users.length,
          active_users: users.filter(u => u.is_active).length,
          inactive_users: users.filter(u => !u.is_active).length
        }
      }, 'Users with role retrieved successfully');

    } catch (error: any) {
      MyLogger.error(action, error, { roleId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving users with role');
    }
  })
);

/**
 * @route GET /api/rbac/roles/:roleId/employees
 * @desc Get all employees who are users with a specific role
 * @access System Admin
 */
router.get('/roles/:roleId/employees',
  authenticate,
  requireSystemAdmin(),
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/rbac/roles/:roleId/employees';
    const roleId = parseInt(req.params.roleId);

    try {
      MyLogger.info(action, { roleId });

      if (isNaN(roleId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid role ID');
        return;
      }

      const employees = await RoleMediator.getEmployeesByUserRole(roleId);

      MyLogger.success(action, {
        roleId,
        employeeCount: employees.length
      });

      serializeSuccessResponse(res, {
        role_id: roleId,
        employees,
        summary: {
          total_employees: employees.length,
          active_employees: employees.filter(emp => emp.employee_active).length,
          active_users: employees.filter(emp => emp.user_active).length
        }
      }, 'Employees with user role retrieved successfully');

    } catch (error: any) {
      MyLogger.error(action, error, { roleId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving employees with user role');
    }
  })
);

// ==================== UTILITY ROUTES ====================

/**
 * @route GET /api/rbac/health
 * @desc RBAC system health check
 * @access Authenticated users
 */
// TODO: remove route - not used in frontend
router.get('/health',
  authenticate,
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/rbac/health';
    
    try {
      // Basic health checks
      const roles = await RoleMediator.getAllRoles();
      const permissions = await RoleMediator.getAllPermissions();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        system: {
          total_roles: roles.length,
          active_roles: roles.filter((r: any) => r.is_active).length,
          total_permissions: permissions.length,
          unique_modules: [...new Set(permissions.map((p: any) => p.module))].length
        },
        user: {
          user_id: req.user!.user_id,
          username: req.user!.username,
          role: req.user!.role
        }
      };
      
      res.json({
        success: true,
        message: 'RBAC system is healthy',
        data: health
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'RBAC system health check failed',
        error: error.message
      });
    }
  })
);

export default router;
