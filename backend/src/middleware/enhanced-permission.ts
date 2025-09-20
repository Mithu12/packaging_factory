import { Request, Response, NextFunction } from 'express';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import { serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { PermissionCheck, PermissionMiddlewareOptions } from '@/types/rbac';
import { UserRole } from '@/types/auth';
import { AuditService } from '@/services/audit-service';
import { logSecurityEvent } from '@/middleware/audit';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: UserRole;
    role_id?: number;
  };
}

/**
 * Enhanced middleware with audit logging for permission checks
 */
export const requirePermissionWithAudit = (options: PermissionMiddlewareOptions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'EnhancedPermissionMiddleware.requirePermission';
    const auditService = new AuditService();
    
    try {
      // Check if user is authenticated
      if (!req.user) {
        MyLogger.warn(action, 'No user in request');
        
        // Log security event for unauthenticated access attempt
        await logSecurityEvent(req, 'unauthenticated_access', 'medium', 
          'Attempt to access protected resource without authentication');
        
        serializeErrorResponse(res, {}, '401', 'Authentication required');
        return;
      }

      const userId = req.user.user_id;
      const permissionCheck: PermissionCheck = {
        module: options.module,
        action: options.action,
        resource: options.resource
      };

      // Check if user has the required permission
      const hasPermission = await RoleMediator.hasPermission(userId, permissionCheck);

      if (!hasPermission) {
        MyLogger.warn(action + ' - Permission denied', {
          userId,
          username: req.user.username,
          role: req.user.role,
          requiredPermission: permissionCheck,
          endpoint: req.path,
          method: req.method
        });

        // Log security event for permission denied
        await logSecurityEvent(req, 'permission_denied', 'medium', 
          `User ${req.user.username} denied access to ${req.method} ${req.path}`, {
            requiredPermission: permissionCheck,
            userRole: req.user.role
          });

        const message = options.required !== false 
          ? 'Insufficient permissions to access this resource'
          : 'Permission check failed';

        serializeErrorResponse(res, {}, '403', message);
        return;
      }

      // Log successful permission check for sensitive operations
      if (options.action === 'delete' || options.action === 'approve' || options.module === 'User Management') {
        MyLogger.info(action + ' - Sensitive operation authorized', {
          userId,
          username: req.user.username,
          permission: permissionCheck,
          endpoint: req.path,
          method: req.method
        });
      }

      next();

    } catch (error: any) {
      MyLogger.error(action, error, {
        userId: req.user?.user_id,
        permission: options,
        endpoint: req.path
      });

      // Log security event for permission check error
      await logSecurityEvent(req, 'permission_check_error', 'high', 
        'Error occurred during permission validation', {
          error: error.message,
          permission: options
        });

      serializeErrorResponse(res, {}, '500', 'Permission validation error');
      return;
    }
  };
};

/**
 * Middleware to log all successful operations
 */
export const logSuccessfulOperation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data: any) {
    logOperationSuccess(req, res, data);
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    logOperationSuccess(req, res, data);
    return originalJson.call(this, data);
  };

  next();
};

async function logOperationSuccess(req: AuthenticatedRequest, res: Response, responseData: any) {
  if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
    const auditService = new AuditService();
    
    try {
      // Only log write operations (POST, PUT, PATCH, DELETE)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        await auditService.logActivity({
          userId: req.user.user_id,
          action: mapHttpMethodToAction(req.method),
          resourceType: extractResourceType(req.path),
          resourceId: extractResourceId(req),
          endpoint: req.path,
          method: req.method,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestData: req.body,
          responseStatus: res.statusCode,
          responseData: responseData,
          success: true,
          durationMs: 0, // Would need to be calculated from middleware
          metadata: {
            userRole: req.user.role,
            username: req.user.username
          }
        });
      }
    } catch (error) {
      MyLogger.error('Failed to log successful operation', error);
    }
  }
}

function mapHttpMethodToAction(method: string): string {
  const actionMap: { [key: string]: string } = {
    'GET': 'read',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  return actionMap[method] || method.toLowerCase();
}

function extractResourceType(path: string): string {
  const pathParts = path.split('/').filter(part => part);
  if (pathParts.length >= 2 && pathParts[0] === 'api') {
    return pathParts[1];
  }
  return pathParts[0] || 'unknown';
}

function extractResourceId(req: AuthenticatedRequest): number | null {
  const id = req.params.id;
  return id && !isNaN(Number(id)) ? Number(id) : null;
}
