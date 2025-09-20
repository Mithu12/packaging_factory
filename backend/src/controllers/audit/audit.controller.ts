import { Request, Response, NextFunction } from 'express';
import { AuditService } from '@/services/audit-service';
import { serializeSuccessResponse, serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { UserRole } from '@/types/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: UserRole;
  };
}

export class AuditController {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  // Get user activity logs
  getUserActivity = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'AuditController.getUserActivity';
    
    try {
      const userId = parseInt(req.params.userId) || req.user?.user_id;
      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        action: filterAction,
        resourceType
      } = req.query;

      if (!userId) {
        serializeErrorResponse(res, {}, '400', 'User ID is required');
        return;
      }

      // Only allow users to view their own activity unless they're admin
      if (req.user?.user_id !== userId && req.user?.role !== UserRole.ADMIN) {
        serializeErrorResponse(res, {}, '403', 'Cannot view other users activity');
        return;
      }

      const options = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        action: filterAction as string,
        resourceType: resourceType as string
      };

      const activities = await this.auditService.getUserActivity(userId, options);

      MyLogger.success(action, { userId, count: activities.length });
      serializeSuccessResponse(res, activities, 'SUCCESS');

    } catch (error: any) {
      MyLogger.error(action, error, { userId: req.params.userId });
      next(error);
    }
  };

  // Get security events (admin only)
  getSecurityEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'AuditController.getSecurityEvents';
    
    try {
      const {
        limit = 50,
        offset = 0,
        severity,
        resolved,
        startDate,
        endDate
      } = req.query;

      const options = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        severity: severity as string,
        resolved: resolved ? resolved === 'true' : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const events = await this.auditService.getSecurityEvents(options);

      MyLogger.success(action, { count: events.length });
      serializeSuccessResponse(res, events, 'SUCCESS');

    } catch (error: any) {
      MyLogger.error(action, error);
      next(error);
    }
  };

  // Get active sessions
  getActiveSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'AuditController.getActiveSessions';
    
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      // Only allow users to view their own sessions unless they're admin
      if (userId && req.user?.user_id !== userId && req.user?.role !== UserRole.ADMIN) {
        serializeErrorResponse(res, {}, '403', 'Cannot view other users sessions');
        return;
      }

      const sessions = await this.auditService.getActiveSessions(userId);

      MyLogger.success(action, { count: sessions.length });
      serializeSuccessResponse(res, sessions, 'SUCCESS');

    } catch (error: any) {
      MyLogger.error(action, error);
      next(error);
    }
  };

  // Get audit statistics
  getAuditStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'AuditController.getAuditStats';
    
    try {
      const {
        startDate,
        endDate,
        userId
      } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId ? parseInt(userId as string) : undefined
      };

      const stats = await this.auditService.getAuditStats(options);

      MyLogger.success(action, { stats });
      serializeSuccessResponse(res, stats, 'SUCCESS');

    } catch (error: any) {
      MyLogger.error(action, error);
      next(error);
    }
  };

  // Resolve security event (admin only)
  resolveSecurityEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'AuditController.resolveSecurityEvent';
    
    try {
      const eventId = parseInt(req.params.eventId);
      const { notes } = req.body;

      if (!eventId) {
        serializeErrorResponse(res, {}, '400', 'Event ID is required');
        return;
      }

      // Update security event as resolved
      const client = await require('@/database/connection').default.connect();
      
      try {
        await client.query(`
          UPDATE security_events 
          SET resolved = true, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [req.user?.user_id, eventId]);

        MyLogger.success(action, { eventId, resolvedBy: req.user?.user_id });
        serializeSuccessResponse(res, { message: 'Security event resolved' }, 'SUCCESS');

      } finally {
        client.release();
      }

    } catch (error: any) {
      MyLogger.error(action, error, { eventId: req.params.eventId });
      next(error);
    }
  };

  // Export audit data (admin only)
  exportAuditData = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'AuditController.exportAuditData';
    
    try {
      const {
        startDate,
        endDate,
        userId,
        format = 'json'
      } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        userId: userId ? parseInt(userId as string) : undefined,
        limit: 10000 // Large limit for export
      };

      const activities = await this.auditService.getUserActivity(
        userId ? parseInt(userId as string) : 0, 
        options
      );

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(activities);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-export.csv');
        res.send(csv);
      } else {
        // Return JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-export.json');
        serializeSuccessResponse(res, activities, 'SUCCESS');
      }

      MyLogger.success(action, { count: activities.length, format });

    } catch (error: any) {
      MyLogger.error(action, error);
      next(error);
    }
  };

  // Clean up old audit logs (admin only)
  cleanupAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const action = 'AuditController.cleanupAuditLogs';
    
    try {
      await this.auditService.cleanupOldLogs();

      MyLogger.success(action, { cleanedBy: req.user?.user_id });
      serializeSuccessResponse(res, { message: 'Audit logs cleanup completed' }, 'SUCCESS');

    } catch (error: any) {
      MyLogger.error(action, error);
      next(error);
    }
  };

  // Helper method to convert data to CSV
  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle JSON fields and escape commas
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}

export default new AuditController();
