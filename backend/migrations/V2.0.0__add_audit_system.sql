-- Comprehensive Audit System
-- Version: 2.0.0
-- Description: Creates comprehensive audit and security tracking tables

-- 1. Create user_activity_logs table for comprehensive action tracking
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

-- 2. Create user_sessions table for session tracking
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

-- 3. Create security_events table for security-related activities
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

-- 4. Create data_changes table for detailed field-level tracking
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

-- 5. Create audit_settings table for configuration
CREATE TABLE IF NOT EXISTS audit_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create comprehensive indexes for audit tables
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_session_id ON user_activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource ON user_activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_composite ON user_activity_logs(user_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON user_sessions(login_at);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_data_changes_activity_log_id ON data_changes(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_data_changes_table_record ON data_changes(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_data_changes_field_name ON data_changes(field_name);

-- Insert default audit settings
INSERT INTO audit_settings (setting_key, setting_value, description) VALUES
('retention_days', '{"activity_logs": 365, "security_events": 730, "data_changes": 365}', 'Data retention periods in days'),
('logging_level', '{"api_calls": true, "data_changes": true, "authentication": true, "authorization": true}', 'What types of events to log'),
('sensitive_fields', '["password", "password_hash", "ssn", "credit_card", "bank_account"]', 'Fields to exclude from logging'),
('alert_thresholds', '{"failed_logins": 5, "permission_denials": 10, "suspicious_activity": 3}', 'Thresholds for security alerts'),
('auto_cleanup', '{"enabled": true, "cleanup_hour": 2}', 'Automatic cleanup of old audit data')
ON CONFLICT (setting_key) DO NOTHING;
