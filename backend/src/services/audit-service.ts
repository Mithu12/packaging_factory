import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface ActivityLogData {
  userId: number | null;
  sessionId?: string;
  action: string;
  resourceType: string;
  resourceId?: number | null;
  endpoint: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  requestData?: any;
  responseStatus: number;
  responseData?: any;
  oldValues?: any;
  newValues?: any;
  success: boolean;
  errorMessage?: string | null;
  durationMs: number;
  metadata?: any;
}

export interface SecurityEventData {
  userId?: number | null;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  description?: string;
  metadata?: any;
}

export interface SessionData {
  sessionId: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  locationInfo?: any;
}

export interface DataChangeData {
  activityLogId: number;
  tableName: string;
  recordId: number;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  dataType?: string;
}

export class AuditService {
  
  // Log user activity
  async logActivity(data: ActivityLogData): Promise<number> {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO user_activity_logs (
          user_id, session_id, action, resource_type, resource_id,
          endpoint, method, ip_address, user_agent, request_data,
          response_status, response_data, old_values, new_values,
          success, error_message, duration_ms, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id
      `;

      const values = [
        data.userId,
        data.sessionId,
        data.action,
        data.resourceType,
        data.resourceId,
        data.endpoint,
        data.method,
        data.ipAddress,
        data.userAgent,
        JSON.stringify(data.requestData),
        data.responseStatus,
        JSON.stringify(data.responseData),
        JSON.stringify(data.oldValues),
        JSON.stringify(data.newValues),
        data.success,
        data.errorMessage,
        data.durationMs,
        JSON.stringify(data.metadata)
      ];

      const result = await client.query(query, values);
      return result.rows[0].id;

    } catch (error) {
      MyLogger.error('Failed to log activity', error, data);
      throw error;
    } finally {
      client.release();
    }
  }

  // Log security event
  async logSecurityEvent(data: SecurityEventData): Promise<void> {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO security_events (
          user_id, event_type, severity, ip_address, user_agent,
          endpoint, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const values = [
        data.userId,
        data.eventType,
        data.severity,
        data.ipAddress,
        data.userAgent,
        data.endpoint,
        data.description,
        JSON.stringify(data.metadata)
      ];

      await client.query(query, values);

    } catch (error) {
      MyLogger.error('Failed to log security event', error, data);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create user session
  async createSession(data: SessionData): Promise<void> {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO user_sessions (
          session_id, user_id, ip_address, user_agent, device_info, location_info
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (session_id) DO UPDATE SET
          last_activity = CURRENT_TIMESTAMP,
          is_active = true
      `;

      const values = [
        data.sessionId,
        data.userId,
        data.ipAddress,
        data.userAgent,
        JSON.stringify(data.deviceInfo),
        JSON.stringify(data.locationInfo)
      ];

      await client.query(query, values);

    } catch (error) {
      MyLogger.error('Failed to create session', error, data);
      throw error;
    } finally {
      client.release();
    }
  }

  // End user session
  async endSession(sessionId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE user_sessions 
        SET logout_at = CURRENT_TIMESTAMP, is_active = false
        WHERE session_id = $1
      `;

      await client.query(query, [sessionId]);

    } catch (error) {
      MyLogger.error('Failed to end session', error, { sessionId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update session activity
  async updateSessionActivity(sessionId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE user_sessions 
        SET last_activity = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND is_active = true
      `;

      await client.query(query, [sessionId]);

    } catch (error) {
      MyLogger.error('Failed to update session activity', error, { sessionId });
    } finally {
      client.release();
    }
  }

  // Log detailed data changes
  async logDataChanges(changes: DataChangeData[]): Promise<void> {
    if (!changes.length) return;

    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO data_changes (
          activity_log_id, table_name, record_id, field_name,
          old_value, new_value, data_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      for (const change of changes) {
        const values = [
          change.activityLogId,
          change.tableName,
          change.recordId,
          change.fieldName,
          change.oldValue,
          change.newValue,
          change.dataType
        ];

        await client.query(query, values);
      }

    } catch (error) {
      MyLogger.error('Failed to log data changes', error, changes);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user activity history
  async getUserActivity(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
      resourceType?: string;
    } = {}
  ): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          ual.*,
          u.username,
          u.email
        FROM user_activity_logs ual
        LEFT JOIN users u ON ual.user_id = u.id
        WHERE ual.user_id = $1
      `;

      const values: any[] = [userId];
      let paramIndex = 2;

      if (options.startDate) {
        query += ` AND ual.created_at >= $${paramIndex}`;
        values.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        query += ` AND ual.created_at <= $${paramIndex}`;
        values.push(options.endDate);
        paramIndex++;
      }

      if (options.action) {
        query += ` AND ual.action = $${paramIndex}`;
        values.push(options.action);
        paramIndex++;
      }

      if (options.resourceType) {
        query += ` AND ual.resource_type = $${paramIndex}`;
        values.push(options.resourceType);
        paramIndex++;
      }

      query += ` ORDER BY ual.created_at DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(options.limit);
        paramIndex++;
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(options.offset);
      }

      const result = await client.query(query, values);
      return result.rows;

    } catch (error) {
      MyLogger.error('Failed to get user activity', error, { userId, options });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get security events
  async getSecurityEvents(options: {
    limit?: number;
    offset?: number;
    severity?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          se.*,
          u.username,
          u.email,
          resolver.username as resolved_by_username
        FROM security_events se
        LEFT JOIN users u ON se.user_id = u.id
        LEFT JOIN users resolver ON se.resolved_by = resolver.id
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramIndex = 1;

      if (options.severity) {
        query += ` AND se.severity = $${paramIndex}`;
        values.push(options.severity);
        paramIndex++;
      }

      if (options.resolved !== undefined) {
        query += ` AND se.resolved = $${paramIndex}`;
        values.push(options.resolved);
        paramIndex++;
      }

      if (options.startDate) {
        query += ` AND se.created_at >= $${paramIndex}`;
        values.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        query += ` AND se.created_at <= $${paramIndex}`;
        values.push(options.endDate);
        paramIndex++;
      }

      query += ` ORDER BY se.created_at DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(options.limit);
        paramIndex++;
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(options.offset);
      }

      const result = await client.query(query, values);
      return result.rows;

    } catch (error) {
      MyLogger.error('Failed to get security events', error, options);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get active sessions
  async getActiveSessions(userId?: number): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          us.*,
          u.username,
          u.email
        FROM user_sessions us
        LEFT JOIN users u ON us.user_id = u.id
        WHERE us.is_active = true
      `;

      const values: any[] = [];

      if (userId) {
        query += ` AND us.user_id = $1`;
        values.push(userId);
      }

      query += ` ORDER BY us.last_activity DESC`;

      const result = await client.query(query, values);
      return result.rows;

    } catch (error) {
      MyLogger.error('Failed to get active sessions', error, { userId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Clean up old audit logs
  async cleanupOldLogs(): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('SELECT cleanup_audit_logs()');
      MyLogger.info('Audit logs cleanup completed');

    } catch (error) {
      MyLogger.error('Failed to cleanup audit logs', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get audit statistics
  async getAuditStats(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: number;
  } = {}): Promise<any> {
    const client = await pool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (options.startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        values.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        values.push(options.endDate);
        paramIndex++;
      }

      if (options.userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        values.push(options.userId);
        paramIndex++;
      }

      const queries = [
        `SELECT COUNT(*) as total_activities FROM user_activity_logs ${whereClause}`,
        `SELECT action, COUNT(*) as count FROM user_activity_logs ${whereClause} GROUP BY action`,
        `SELECT resource_type, COUNT(*) as count FROM user_activity_logs ${whereClause} GROUP BY resource_type`,
        `SELECT DATE(created_at) as date, COUNT(*) as count FROM user_activity_logs ${whereClause} GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`
      ];

      const results = await Promise.all(
        queries.map(query => client.query(query, values))
      );

      return {
        totalActivities: results[0].rows[0].total_activities,
        actionBreakdown: results[1].rows,
        resourceBreakdown: results[2].rows,
        dailyActivity: results[3].rows
      };

    } catch (error) {
      MyLogger.error('Failed to get audit stats', error, options);
      throw error;
    } finally {
      client.release();
    }
  }
}
