import { Request, Response, NextFunction } from 'express';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { CreateRoleRequest, UpdateRoleRequest } from '@/types/rbac';
import { UserRole } from '@/types/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: UserRole;
    role_id?: number;
  };
}

export class RolesController {
  
  // ==================== ROLE CRUD OPERATIONS ====================
  
  /**
   * GET /api/rbac/roles
   * Get all roles with optional filtering and pagination
   */
  static async getAllRoles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/roles';
    
    try {
      MyLogger.info(action, { query: req.query });
      
      const {
        page = 1,
        limit = 100,
        search,
        department,
        level,
        is_active,
        sort_by = 'level',
        sort_order = 'asc'
      } = req.query;
      
      const roles = await RoleMediator.getAllRoles();
      
      // Apply filtering
      let filteredRoles = roles;
      
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredRoles = filteredRoles.filter(role => 
          role.name.toLowerCase().includes(searchTerm) ||
          role.display_name.toLowerCase().includes(searchTerm) ||
          (role.description && role.description.toLowerCase().includes(searchTerm))
        );
      }
      
      if (department) {
        filteredRoles = filteredRoles.filter(role => 
          role.department && role.department.toLowerCase() === (department as string).toLowerCase()
        );
      }
      
      if (level) {
        filteredRoles = filteredRoles.filter(role => role.level === Number(level));
      }
      
      if (is_active !== undefined) {
        filteredRoles = filteredRoles.filter(role => role.is_active === (is_active === 'true'));
      }
      
      // Apply sorting
      filteredRoles.sort((a, b) => {
        const aValue = a[sort_by as keyof typeof a];
        const bValue = b[sort_by as keyof typeof b];
        
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sort_order === 'asc' ? 1 : -1;
        if (bValue == null) return sort_order === 'asc' ? -1 : 1;
        
        if (aValue < bValue) return sort_order === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort_order === 'asc' ? 1 : -1;
        return 0;
      });
      
      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedRoles = filteredRoles.slice(startIndex, endIndex);
      
      const response = {
        roles: paginatedRoles,
        pagination: {
          current_page: Number(page),
          per_page: Number(limit),
          total: filteredRoles.length,
          total_pages: Math.ceil(filteredRoles.length / Number(limit))
        },
        filters: {
          search,
          department,
          level,
          is_active,
          sort_by,
          sort_order
        }
      };
      
      MyLogger.success(action, { 
        totalRoles: roles.length,
        filteredRoles: filteredRoles.length,
        returnedRoles: paginatedRoles.length,
        page: Number(page),
        limit: Number(limit)
      });
      
      serializeSuccessResponse(res, response, 'Roles retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving roles');
    }
  }
  
  /**
   * GET /api/rbac/roles/:id
   * Get role details with permissions
   */
  static async getRoleById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/roles/:id';
    const roleId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { roleId });
      
      if (isNaN(roleId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid role ID');
        return;
      }
      
      const roleWithPermissions = await RoleMediator.getRoleById(roleId);
      
      MyLogger.success(action, { 
        roleId,
        roleName: roleWithPermissions.name,
        permissionsCount: roleWithPermissions.permissions.length
      });
      
      serializeSuccessResponse(res, roleWithPermissions, 'Role retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving role');
    }
  }
  
  /**
   * POST /api/rbac/roles
   * Create a new role
   */
  static async createRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'POST /api/rbac/roles';
    
    try {
      MyLogger.info(action, { roleData: req.body });
      
      const roleData: CreateRoleRequest = req.body;
      const createdBy = req.user!.user_id;
      
      const newRole = await RoleMediator.createRole(roleData, createdBy);
      
      MyLogger.success(action, { 
        roleId: newRole.id,
        roleName: newRole.name,
        createdBy
      });
      
      res.status(201);
      serializeSuccessResponse(res, newRole, 'Role created successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleData: req.body });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error creating role');
    }
  }
  
  /**
   * PUT /api/rbac/roles/:id
   * Update an existing role
   */
  static async updateRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'PUT /api/rbac/roles/:id';
    const roleId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { roleId, updateData: req.body });
      
      if (isNaN(roleId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid role ID');
        return;
      }
      
      const updateData: UpdateRoleRequest = req.body;
      const updatedBy = req.user!.user_id;
      
      const updatedRole = await RoleMediator.updateRole(roleId, updateData, updatedBy);
      
      MyLogger.success(action, { 
        roleId,
        roleName: updatedRole.name,
        updatedBy
      });
      
      serializeSuccessResponse(res, updatedRole, 'Role updated successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId, updateData: req.body });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error updating role');
    }
  }
  
  /**
   * DELETE /api/rbac/roles/:id
   * Delete a role (soft delete)
   */
  static async deleteRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'DELETE /api/rbac/roles/:id';
    const roleId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { roleId });
      
      if (isNaN(roleId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid role ID');
        return;
      }
      
      const deletedBy = req.user!.user_id;
      
      await RoleMediator.deleteRole(roleId);
      
      MyLogger.success(action, { roleId, deletedBy });
      
      serializeSuccessResponse(res, { id: roleId }, 'Role deleted successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error deleting role');
    }
  }
  
  // ==================== ROLE-PERMISSION MANAGEMENT ====================
  
  /**
   * POST /api/rbac/roles/:id/permissions
   * Assign permissions to a role
   */
  static async assignPermissionsToRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'POST /api/rbac/roles/:id/permissions';
    const roleId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { roleId, permissionData: req.body });
      
      if (isNaN(roleId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid role ID');
        return;
      }
      
      const { permission_ids } = req.body;
      const assignedBy = req.user!.user_id;
      
      await RoleMediator.assignPermissionsToRolePublic(roleId, permission_ids, assignedBy);
      
      MyLogger.success(action, { 
        roleId,
        permissionIds: permission_ids,
        assignedBy
      });
      
      serializeSuccessResponse(res, { 
        role_id: roleId,
        assigned_permissions: permission_ids.length
      }, 'Permissions assigned to role successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId, permissionData: req.body });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error assigning permissions to role');
    }
  }
  
  /**
   * DELETE /api/rbac/roles/:id/permissions
   * Remove permissions from a role
   */
  static async removePermissionsFromRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'DELETE /api/rbac/roles/:id/permissions';
    const roleId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { roleId, permissionData: req.body });
      
      if (isNaN(roleId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid role ID');
        return;
      }
      
      const { permission_ids } = req.body;
      const removedBy = req.user!.user_id;
      
      await RoleMediator.removePermissionsFromRole(roleId, permission_ids, removedBy);
      
      MyLogger.success(action, { 
        roleId,
        permissionIds: permission_ids,
        removedBy
      });
      
      serializeSuccessResponse(res, { 
        role_id: roleId,
        removed_permissions: permission_ids.length
      }, 'Permissions removed from role successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { roleId, permissionData: req.body });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error removing permissions from role');
    }
  }
  
  // ==================== ROLE STATISTICS ====================
  
  /**
   * GET /api/rbac/roles/stats
   * Get role statistics
   */
  static async getRoleStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/roles/stats';
    
    try {
      MyLogger.info(action);
      
      const stats = await RoleMediator.getRoleStats();
      
      MyLogger.success(action, { statsKeys: Object.keys(stats) });
      
      serializeSuccessResponse(res, stats, 'Role statistics retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error);
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving role statistics');
    }
  }
  
  /**
   * GET /api/rbac/roles/departments
   * Get roles grouped by department
   */
  static async getRolesByDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/roles/departments';
    
    try {
      MyLogger.info(action);
      
      const roles = await RoleMediator.getAllRoles();
      
      // Group roles by department
      const rolesByDepartment = roles.reduce((acc: any, role) => {
        const dept = role.department || 'General';
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(role);
        return acc;
      }, {});
      
      // Calculate department statistics
      const departmentStats = Object.keys(rolesByDepartment).map(dept => ({
        department: dept,
        role_count: rolesByDepartment[dept].length,
        active_roles: rolesByDepartment[dept].filter((r: any) => r.is_active).length,
        roles: rolesByDepartment[dept]
      }));
      
      MyLogger.success(action, { 
        departmentCount: departmentStats.length,
        totalRoles: roles.length
      });
      
      serializeSuccessResponse(res, {
        departments: departmentStats,
        summary: {
          total_departments: departmentStats.length,
          total_roles: roles.length,
          active_roles: roles.filter(r => r.is_active).length
        }
      }, 'Roles by department retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error);
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving roles by department');
    }
  }
}
