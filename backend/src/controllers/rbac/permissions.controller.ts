import { Request, Response, NextFunction } from 'express';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { UserRole } from '@/types/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: UserRole;
    role_id?: number;
  };
}

export class PermissionsController {
  
  // ==================== PERMISSION CRUD OPERATIONS ====================
  
  /**
   * GET /api/rbac/permissions
   * Get all permissions with optional filtering and pagination
   */
  static async getAllPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/permissions';
    
    try {
      MyLogger.info(action, { query: req.query });
      
      const {
        page = 1,
        limit = 10,
        search,
        module,
        action: actionFilter,
        resource,
        sort_by = 'module',
        sort_order = 'asc'
      } = req.query;
      
      const permissions = await RoleMediator.getAllPermissions();
      
      // Apply filtering
      let filteredPermissions = permissions;
      
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        filteredPermissions = filteredPermissions.filter(permission => 
          permission.name.toLowerCase().includes(searchTerm) ||
          permission.display_name.toLowerCase().includes(searchTerm) ||
          permission.module.toLowerCase().includes(searchTerm) ||
          permission.action.toLowerCase().includes(searchTerm) ||
          permission.resource.toLowerCase().includes(searchTerm) ||
          (permission.description && permission.description.toLowerCase().includes(searchTerm))
        );
      }
      
      if (module) {
        filteredPermissions = filteredPermissions.filter(permission => 
          permission.module.toLowerCase() === (module as string).toLowerCase()
        );
      }
      
      if (actionFilter) {
        filteredPermissions = filteredPermissions.filter(permission => 
          permission.action.toLowerCase() === (actionFilter as string).toLowerCase()
        );
      }
      
      if (resource) {
        filteredPermissions = filteredPermissions.filter(permission => 
          permission.resource.toLowerCase() === (resource as string).toLowerCase()
        );
      }
      
      // Apply sorting
      filteredPermissions.sort((a, b) => {
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
      const paginatedPermissions = filteredPermissions.slice(startIndex, endIndex);
      
      const response = {
        permissions: paginatedPermissions,
        pagination: {
          current_page: Number(page),
          per_page: Number(limit),
          total: filteredPermissions.length,
          total_pages: Math.ceil(filteredPermissions.length / Number(limit))
        },
        filters: {
          search,
          module,
          action: actionFilter,
          resource,
          sort_by,
          sort_order
        }
      };
      
      MyLogger.success(action, { 
        totalPermissions: permissions.length,
        filteredPermissions: filteredPermissions.length,
        returnedPermissions: paginatedPermissions.length,
        page: Number(page),
        limit: Number(limit)
      });
      
      serializeSuccessResponse(res, response, 'Permissions retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving permissions');
    }
  }
  
  /**
   * GET /api/rbac/permissions/:id
   * Get permission details
   */
  static async getPermissionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/permissions/:id';
    const permissionId = parseInt(req.params.id);
    
    try {
      MyLogger.info(action, { permissionId });
      
      if (isNaN(permissionId)) {
        serializeErrorResponse(res, {}, '400', 'Invalid permission ID');
        return;
      }
      
      const permission = await RoleMediator.getPermissionById(permissionId);
      
      MyLogger.success(action, { 
        permissionId,
        permissionName: permission.name
      });
      
      serializeSuccessResponse(res, permission, 'Permission retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { permissionId });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving permission');
    }
  }
  
  /**
   * GET /api/rbac/permissions/grouped
   * Get permissions grouped by module
   */
  static async getPermissionsGrouped(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/permissions/grouped';
    
    try {
      MyLogger.info(action);
      
      const permissions = await RoleMediator.getAllPermissions();
      
      // Group permissions by module
      const groupedPermissions = permissions.reduce((acc: any, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = {
            module: permission.module,
            permissions: []
          };
        }
        acc[permission.module].permissions.push(permission);
        return acc;
      }, {});
      
      // Convert to array and add statistics
      const modules = Object.values(groupedPermissions).map((moduleData: any) => ({
        ...moduleData,
        permission_count: moduleData.permissions.length,
        actions: [...new Set(moduleData.permissions.map((p: any) => p.action))],
        resources: [...new Set(moduleData.permissions.map((p: any) => p.resource))]
      }));
      
      MyLogger.success(action, { 
        totalPermissions: permissions.length,
        moduleCount: modules.length
      });
      
      serializeSuccessResponse(res, {
        modules,
        summary: {
          total_modules: modules.length,
          total_permissions: permissions.length,
          unique_actions: [...new Set(permissions.map(p => p.action))],
          unique_resources: [...new Set(permissions.map(p => p.resource))]
        }
      }, 'Grouped permissions retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error);
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving grouped permissions');
    }
  }
  
  /**
   * GET /api/rbac/permissions/module/:module
   * Get permissions by module
   */
  static async getPermissionsByModule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/permissions/module/:module';
    const module = req.params.module;
    
    try {
      MyLogger.info(action, { module });
      
      const permissions = await RoleMediator.getPermissionsByModule(module);
      
      // Group by action and resource for better organization
      const organized = {
        module,
        permissions,
        by_action: permissions.reduce((acc: any, permission) => {
          if (!acc[permission.action]) {
            acc[permission.action] = [];
          }
          acc[permission.action].push(permission);
          return acc;
        }, {}),
        by_resource: permissions.reduce((acc: any, permission) => {
          if (!acc[permission.resource]) {
            acc[permission.resource] = [];
          }
          acc[permission.resource].push(permission);
          return acc;
        }, {}),
        statistics: {
          total_permissions: permissions.length,
          unique_actions: [...new Set(permissions.map(p => p.action))].length,
          unique_resources: [...new Set(permissions.map(p => p.resource))].length
        }
      };
      
      MyLogger.success(action, { 
        module,
        permissionsCount: permissions.length
      });
      
      serializeSuccessResponse(res, organized, `Permissions for ${module} retrieved successfully`);
      
    } catch (error: any) {
      MyLogger.error(action, error, { module });
      const statusCode = error.statusCode || 500;
      serializeErrorResponse(res, {}, statusCode.toString(), error.message || 'Error retrieving permissions by module');
    }
  }
  
  // ==================== PERMISSION STATISTICS ====================
  
  /**
   * GET /api/rbac/permissions/stats
   * Get permission statistics
   */
  static async getPermissionStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/rbac/permissions/stats';
    
    try {
      MyLogger.info(action);
      
      const permissions = await RoleMediator.getAllPermissions();
      
      // Calculate comprehensive statistics
      const moduleStats = permissions.reduce((acc: any, permission) => {
        if (!acc[permission.module]) {
          acc[permission.module] = {
            module: permission.module,
            total_permissions: 0,
            actions: new Set(),
            resources: new Set()
          };
        }
        acc[permission.module].total_permissions++;
        acc[permission.module].actions.add(permission.action);
        acc[permission.module].resources.add(permission.resource);
        return acc;
      }, {});
      
      // Convert sets to arrays and add counts
      const moduleStatsArray = Object.values(moduleStats).map((stat: any) => ({
        module: stat.module,
        total_permissions: stat.total_permissions,
        unique_actions: stat.actions.size,
        unique_resources: stat.resources.size,
        actions: Array.from(stat.actions),
        resources: Array.from(stat.resources)
      }));
      
      const actionStats = permissions.reduce((acc: any, permission) => {
        if (!acc[permission.action]) {
          acc[permission.action] = {
            action: permission.action,
            count: 0,
            modules: new Set(),
            resources: new Set()
          };
        }
        acc[permission.action].count++;
        acc[permission.action].modules.add(permission.module);
        acc[permission.action].resources.add(permission.resource);
        return acc;
      }, {});
      
      const actionStatsArray = Object.values(actionStats).map((stat: any) => ({
        action: stat.action,
        count: stat.count,
        modules: Array.from(stat.modules),
        resources: Array.from(stat.resources)
      }));
      
      const stats = {
        overview: {
          total_permissions: permissions.length,
          total_modules: [...new Set(permissions.map(p => p.module))].length,
          total_actions: [...new Set(permissions.map(p => p.action))].length,
          total_resources: [...new Set(permissions.map(p => p.resource))].length
        },
        by_module: moduleStatsArray,
        by_action: actionStatsArray,
        unique_modules: [...new Set(permissions.map(p => p.module))],
        unique_actions: [...new Set(permissions.map(p => p.action))],
        unique_resources: [...new Set(permissions.map(p => p.resource))]
      };
      
      MyLogger.success(action, { 
        totalPermissions: permissions.length,
        moduleCount: stats.overview.total_modules,
        actionCount: stats.overview.total_actions
      });
      
      serializeSuccessResponse(res, stats, 'Permission statistics retrieved successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error);
      serializeErrorResponse(res, {}, '500', error.message || 'Error retrieving permission statistics');
    }
  }
  
  // ==================== PERMISSION SEARCH ====================
  
  /**
   * POST /api/rbac/permissions/search
   * Advanced permission search
   */
  static async searchPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const action = 'POST /api/rbac/permissions/search';
    
    try {
      MyLogger.info(action, { searchCriteria: req.body });
      
      const {
        query,
        modules = [],
        actions = [],
        resources = [],
        exact_match = false
      } = req.body;
      
      const allPermissions = await RoleMediator.getAllPermissions();
      
      let results = allPermissions;
      
      // Apply text search
      if (query) {
        const searchTerm = query.toLowerCase();
        results = results.filter(permission => {
          if (exact_match) {
            return permission.name.toLowerCase() === searchTerm ||
                   permission.display_name.toLowerCase() === searchTerm;
          } else {
            return permission.name.toLowerCase().includes(searchTerm) ||
                   permission.display_name.toLowerCase().includes(searchTerm) ||
                   permission.module.toLowerCase().includes(searchTerm) ||
                   permission.action.toLowerCase().includes(searchTerm) ||
                   permission.resource.toLowerCase().includes(searchTerm) ||
                   (permission.description && permission.description.toLowerCase().includes(searchTerm));
          }
        });
      }
      
      // Apply module filter
      if (modules.length > 0) {
        results = results.filter(permission => 
          modules.includes(permission.module)
        );
      }
      
      // Apply action filter
      if (actions.length > 0) {
        results = results.filter(permission => 
          actions.includes(permission.action)
        );
      }
      
      // Apply resource filter
      if (resources.length > 0) {
        results = results.filter(permission => 
          resources.includes(permission.resource)
        );
      }
      
      MyLogger.success(action, { 
        totalPermissions: allPermissions.length,
        matchedPermissions: results.length,
        searchQuery: query
      });
      
      serializeSuccessResponse(res, {
        permissions: results,
        search_criteria: {
          query,
          modules,
          actions,
          resources,
          exact_match
        },
        results_summary: {
          total_found: results.length,
          total_searched: allPermissions.length
        }
      }, 'Permission search completed successfully');
      
    } catch (error: any) {
      MyLogger.error(action, error, { searchCriteria: req.body });
      serializeErrorResponse(res, {}, '500', error.message || 'Error searching permissions');
    }
  }
}
