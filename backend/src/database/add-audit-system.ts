import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

export async function addAuditSystem(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    MyLogger.info('Creating audit system tables...');
    
    // 1. Create user_activity_logs table for comprehensive action tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        action VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject'
        resource_type VARCHAR(100) NOT NULL, -- 'product', 'order', 'payment', 'user', 'setting'
        resource_id INTEGER, -- ID of the affected resource (nullable for bulk operations)
        endpoint VARCHAR(255), -- API endpoint called
        method VARCHAR(10), -- HTTP method (GET, POST, PUT, DELETE)
        ip_address INET,
        user_agent TEXT,
        request_data JSONB, -- Request payload (sensitive data filtered)
        response_status INTEGER, -- HTTP response status
        response_data JSONB, -- Response data (sensitive data filtered)
        old_values JSONB, -- Previous values for update operations
        new_values JSONB, -- New values for update operations
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        duration_ms INTEGER, -- Request processing time
        metadata JSONB, -- Additional context (role, permissions, etc.)
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create user_sessions table for session tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        logout_at TIMESTAMP WITH TIME ZONE,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        device_info JSONB,
        location_info JSONB
      );
    `);

    // 3. Create security_events table for security-related activities
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL, -- 'failed_login', 'permission_denied', 'suspicious_activity', 'password_change'
        severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
        ip_address INET,
        user_agent TEXT,
        endpoint VARCHAR(255),
        description TEXT,
        metadata JSONB,
        resolved BOOLEAN DEFAULT false,
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create data_changes table for detailed field-level tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_changes (
        id BIGSERIAL PRIMARY KEY,
        activity_log_id INTEGER REFERENCES user_activity_logs(id) ON DELETE CASCADE,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        data_type VARCHAR(50), -- 'string', 'number', 'boolean', 'date', 'json'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create audit_settings table for configuration
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_settings (
        id BIGSERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value JSONB NOT NULL,
        description TEXT,
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    MyLogger.info('Creating indexes for audit tables...');

    // Create indexes for user_activity_logs table
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity_logs(action);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_resource ON user_activity_logs(resource_type, resource_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_endpoint ON user_activity_logs(endpoint);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_session ON user_activity_logs(session_id);`);

    // Create indexes for user_sessions table
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, last_activity);`);

    // Create indexes for security_events table
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);`);

    // Create indexes for data_changes table
    await client.query(`CREATE INDEX IF NOT EXISTS idx_data_changes_activity_log ON data_changes(activity_log_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_data_changes_table_record ON data_changes(table_name, record_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_data_changes_field ON data_changes(field_name);`);

    MyLogger.info('Inserting default audit settings...');

    // Insert default audit settings
    await client.query(`
      INSERT INTO audit_settings (setting_key, setting_value, description) VALUES
      ('retention_days', '365', 'Number of days to retain audit logs'),
      ('log_sensitive_data', 'false', 'Whether to log sensitive data in requests/responses'),
      ('track_read_operations', 'false', 'Whether to track read-only operations'),
      ('track_failed_requests', 'true', 'Whether to track failed requests'),
      ('excluded_endpoints', '[]', 'Array of endpoints to exclude from logging'),
      ('sensitive_fields', '["password", "token", "secret", "key", "ssn", "credit_card"]', 'Fields to exclude from logging')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    MyLogger.info('Creating audit cleanup function...');

    // Create function to clean old audit logs
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_audit_logs() RETURNS void AS $$
      DECLARE
        retention_days INTEGER;
      BEGIN
        SELECT (setting_value::text)::integer INTO retention_days 
        FROM audit_settings WHERE setting_key = 'retention_days';
        
        DELETE FROM user_activity_logs 
        WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
        
        DELETE FROM security_events 
        WHERE created_at < NOW() - INTERVAL '1 day' * retention_days AND resolved = true;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query('COMMIT');
    MyLogger.success('Audit system tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    MyLogger.error('Failed to create audit system tables', error);
    throw error;
  } finally {
    client.release();
  }
}
