import { Request, Response, NextFunction } from 'express';
import { MyLogger } from '@/utils/new-logger';
import { AuditService } from '@/services/audit-service';

// Extend Request interface to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        startTime: number;
        sessionId?: string;
        originalBody?: any;
        originalQuery?: any;
        originalPath?: string;
      };
    }
  }
}

export interface AuditConfig {
  excludeEndpoints?: string[];
  excludeMethods?: string[];
  logSensitiveData?: boolean;
  trackReadOperations?: boolean;
  sensitiveFields?: string[];
}

const DEFAULT_CONFIG: AuditConfig = {
  excludeEndpoints: ['/health', '/metrics', '/favicon.ico'],
  excludeMethods: [],
  logSensitiveData: false,
  trackReadOperations: false,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'ssn', 'credit_card', 'authorization']
};

export class AuditMiddleware {
  private config: AuditConfig;
  private auditService: AuditService;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.auditService = new AuditService();
  }

  // Main audit middleware
  public auditRequest = async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    MyLogger.info('Audit middleware', { endpoint: req.path });
    const originalPath = req.originalUrl || req.url || req.path;
    
    // Skip if endpoint is excluded
    if (this.shouldSkipAudit(req, originalPath)) {
        MyLogger.info('Skipping audit for endpoint', { endpoint: originalPath });
      return next();
    }

    // Initialize audit context
    req.auditContext = {
      startTime,
      sessionId: this.extractSessionId(req),
      originalBody: this.sanitizeData(req.body),
      originalQuery: this.sanitizeData(req.query),
      originalPath: req.originalUrl || req.url || req.path
    };

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    let responseData: any;

    // Intercept response
    res.send = function(data: any) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Handle response completion
    res.on('finish', async () => {
      try {
        await this.logActivity(req, res, responseData, startTime);
      } catch (error) {
        MyLogger.error('Failed to log audit activity', error);
      }
    });

    next();
  };

  // Log user activity
  private async logActivity(req: Request, res: Response, responseData: any, startTime: number) {
    const user = (req as any).user;
    const duration = Date.now() - startTime;

    // Skip read operations if not configured to track them
    if (!this.config.trackReadOperations && req.method === 'GET') {
        MyLogger.info('Skipping audit for read operation', { endpoint: req.path });
      return;
    }

    const originalPath = req.auditContext?.originalPath || req.originalUrl || req.url || req.path;
    
    // Debug logging
    MyLogger.info('Audit logging details', {
      'req.path': req.path,
      'req.originalUrl': req.originalUrl,
      'req.url': req.url,
      'originalPath': originalPath,
      'resourceType': this.extractResourceType(originalPath),
      'statusCode': res.statusCode
    });
    
    const activityData = {
      userId: user?.user_id || null,
      sessionId: req.auditContext?.sessionId,
      action: this.mapHttpMethodToAction(req.method),
      resourceType: this.extractResourceType(originalPath),
      resourceId: this.extractResourceId(req),
      endpoint: originalPath,
      method: req.method,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      requestData: this.config.logSensitiveData ? req.auditContext?.originalBody : this.sanitizeData(req.auditContext?.originalBody),
      responseStatus: res.statusCode,
      responseData: this.config.logSensitiveData ? responseData : this.sanitizeData(responseData),
      success: res.statusCode < 400,
      errorMessage: res.statusCode >= 400 ? this.extractErrorMessage(responseData) : null,
      durationMs: duration,
      metadata: {
        userRole: user?.role,
        userPermissions: user?.permissions,
        queryParams: req.auditContext?.originalQuery,
        headers: this.sanitizeHeaders(req.headers)
      }
    };

    await this.auditService.logActivity(activityData);
  }

  // Helper methods
  private shouldSkipAudit(req: Request, path?: string): boolean {
    const pathToCheck = (path || req.path).toLowerCase();
    return this.config.excludeEndpoints?.some(endpoint => 
      pathToCheck.includes(endpoint.toLowerCase())
    ) || false;
  }

  private extractSessionId(req: Request): string | undefined {
    return req.get('X-Session-ID') || undefined;
  }

  private mapHttpMethodToAction(method: string): string {
    const actionMap: { [key: string]: string } = {
      'GET': 'read',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    };
    return actionMap[method] || method.toLowerCase();
  }

  private extractResourceType(path: string): string {
    // Extract resource type from path (e.g., /api/products/123 -> products)
    const pathParts = path.split('/').filter(part => part);
    if (pathParts.length >= 2 && pathParts[0] === 'api') {
      return pathParts[1];
    }
    return pathParts[0] || 'unknown';
  }

  private extractResourceId(req: Request): number | null {
    const id = req.params.id || req.query.id;
    return id && !isNaN(Number(id)) ? Number(id) : null;
  }

  private getClientIP(req: Request): string {
    return (req.ip || 
            req.connection.remoteAddress || 
            req.socket.remoteAddress || 
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            'unknown').replace('::ffff:', '');
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const field of this.config.sensitiveFields || []) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private extractErrorMessage(responseData: any): string | null {
    if (typeof responseData === 'object' && responseData?.error) {
      return responseData.error.message || responseData.error.toString();
    }
    return null;
  }
}

// Security event middleware for failed authentication, permission denied, etc.
export const logSecurityEvent = async (
  req: Request,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  description?: string,
  metadata?: any
) => {
  try {
    const auditService = new AuditService();
    const user = (req as any).user;

    await auditService.logSecurityEvent({
      userId: user?.user_id || null,
      eventType,
      severity,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      description,
      metadata: {
        method: req.method,
        userRole: user?.role,
        ...metadata
      }
    });
  } catch (error) {
    MyLogger.error('Failed to log security event', error);
  }
};

// Export configured middleware instance
export const auditMiddleware = new AuditMiddleware().auditRequest;
