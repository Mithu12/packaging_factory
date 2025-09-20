import express from 'express';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { requireSystemAdmin } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  display_name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(500).optional().allow(''),
  level: Joi.number().integer().min(1).max(10).required(),
  department: Joi.string().max(100).optional().allow(''),
  permission_ids: Joi.array().items(Joi.number().integer()).optional()
});

const updateRoleSchema = Joi.object({
  display_name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(500).optional().allow(''),
  level: Joi.number().integer().min(1).max(10).optional(),
  department: Joi.string().max(100).optional().allow(''),
  is_active: Joi.boolean().optional(),
  permission_ids: Joi.array().items(Joi.number().integer()).optional()
});

const assignPermissionsSchema = Joi.object({
  user_id: Joi.number().integer().required(),
  permission_ids: Joi.array().items(Joi.number().integer()).required(),
  expires_at: Joi.string().isoDate().optional()
});

// GET /api/roles - Get all roles
router.get('/',
  authenticate,
  requireSystemAdmin(),
  async (req, res) => {
    const action = 'GET /api/roles';
    
    try {
      MyLogger.info(action);
      
      const roles = await RoleMediator.getAllRoles();
      
      MyLogger.success(action, { rolesCount: roles.length });
      serializeSuccessResponse(res, roles, 'Roles retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error);
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving roles');
    }
  }
);

// GET /api/roles/:id - Get role details with permissions
router.get('/:id',
  authenticate,
  requireSystemAdmin(),
  async (req, res) => {
    const action = 'GET /api/roles/:id';
    const roleId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { roleId });
      
      const role = await RoleMediator.getRoleById(roleId);
      
      MyLogger.success(action, { roleId, permissionsCount: role.permissions.length });
      serializeSuccessResponse(res, role, 'Role details retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving role');
    }
  }
);

// POST /api/roles - Create new role
router.post('/',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(createRoleSchema),
  async (req, res) => {
    const action = 'POST /api/roles';
    const userId = (req as any).user?.user_id || 1;
    
    try {
      MyLogger.info(action, { roleName: req.body.name });
      
      const role = await RoleMediator.createRole(req.body, userId);
      
      MyLogger.success(action, { roleId: role.id, roleName: role.name });
      serializeSuccessResponse(res, role, 'Role created successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleName: req.body.name });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error creating role');
    }
  }
);

// PUT /api/roles/:id - Update role
router.put('/:id',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(updateRoleSchema),
  async (req, res) => {
    const action = 'PUT /api/roles/:id';
    const roleId = parseInt(req.params.id);
    const userId = (req as any).user?.user_id || 1;
    
    try {
      MyLogger.info(action, { roleId });
      
      const role = await RoleMediator.updateRole(roleId, req.body, userId);
      
      MyLogger.success(action, { roleId, roleName: role.name });
      serializeSuccessResponse(res, role, 'Role updated successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error updating role');
    }
  }
);

// DELETE /api/roles/:id - Delete role (soft delete)
router.delete('/:id',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  async (req, res) => {
    const action = 'DELETE /api/roles/:id';
    const roleId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { roleId });
      
      await RoleMediator.deleteRole(roleId);
      
      MyLogger.success(action, { roleId });
      serializeSuccessResponse(res, null, 'Role deleted successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error deleting role');
    }
  }
);

// GET /api/roles/permissions/all - Get all permissions
router.get('/permissions/all',
  authenticate,
  requireSystemAdmin(),
  async (req, res) => {
    const action = 'GET /api/roles/permissions/all';
    
    try {
      MyLogger.info(action);
      
      const permissions = await RoleMediator.getAllPermissions();
      
      // Group permissions by module for easier UI consumption
      const groupedPermissions = permissions.reduce((acc: any, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = [];
        }
        acc[permission.module].push(permission);
        return acc;
      }, {});
      
      MyLogger.success(action, { permissionsCount: permissions.length, modulesCount: Object.keys(groupedPermissions).length });
      serializeSuccessResponse(res, {
        permissions,
        grouped: groupedPermissions
      }, 'Permissions retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error);
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving permissions');
    }
  }
);

// GET /api/roles/permissions/module/:module - Get permissions by module
router.get('/permissions/module/:module',
  authenticate,
  requireSystemAdmin(),
  async (req, res) => {
    const action = 'GET /api/roles/permissions/module/:module';
    const module = req.params.module;
    
    try {
      MyLogger.info(action, { module });
      
      const permissions = await RoleMediator.getPermissionsByModule(module);
      
      MyLogger.success(action, { module, permissionsCount: permissions.length });
      serializeSuccessResponse(res, permissions, `Permissions for ${module} retrieved successfully`);
      
    } catch (error: any) {
      MyLogger.error(action, error, { module });
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving permissions');
    }
  }
);

// GET /api/roles/users/:userId/permissions - Get user permissions
router.get('/users/:userId/permissions',
  authenticate,
  requireSystemAdmin(),
  async (req, res) => {
    const action = 'GET /api/roles/users/:userId/permissions';
    const userId = parseInt(req.params.userId);
    
    try {
      MyLogger.info(action, { userId });
      
      const userWithPermissions = await RoleMediator.getUserPermissions(userId);
      
      MyLogger.success(action, { 
        userId, 
        totalPermissions: userWithPermissions.all_permissions.length,
        rolePermissions: userWithPermissions.role_permissions.length,
        directPermissions: userWithPermissions.direct_permissions.length
      });
      
      serializeSuccessResponse(res, userWithPermissions, 'User permissions retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { userId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving user permissions');
    }
  }
);

// POST /api/roles/users/assign-permissions - Assign permissions directly to user
router.post('/users/assign-permissions',
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  validateRequest(assignPermissionsSchema),
  async (req, res) => {
    const action = 'POST /api/roles/users/assign-permissions';
    const assignedBy = (req as any).user?.user_id || 1;
    
    try {
      MyLogger.info(action, { 
        targetUserId: req.body.user_id, 
        permissionCount: req.body.permission_ids.length 
      });
      
      await RoleMediator.assignPermissionsToUser(req.body, assignedBy);
      
      MyLogger.success(action, { 
        targetUserId: req.body.user_id, 
        permissionsAssigned: req.body.permission_ids.length 
      });
      
      serializeSuccessResponse(res, null, 'Permissions assigned to user successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { targetUserId: req.body.user_id });
      serializeErrorResponse(res, {}, '500', error.message || 'Error assigning permissions');
    }
  }
);

// GET /api/roles/analytics/departments - Get department analytics
router.get('/analytics/departments',
  authenticate,
  requireSystemAdmin(),
  async (req, res) => {
    const action = 'GET /api/roles/analytics/departments';
    
    try {
      MyLogger.info(action);
      
      const stats = await RoleMediator.getDepartmentStats();
      
      MyLogger.success(action, { departmentCount: stats.length });
      serializeSuccessResponse(res, stats, 'Department analytics retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error);
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving department analytics');
    }
  }
);

export default router;
