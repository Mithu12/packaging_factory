# 🔍 User Action Tracking Implementation Guide

This guide provides a comprehensive solution for tracking user actions in your ERP system with multiple implementation approaches.

## 📋 **Overview**

The user action tracking system provides:
- **Complete audit trail** of all user activities
- **Security event monitoring** for suspicious activities
- **Session tracking** for user login/logout
- **Data change logging** with before/after values
- **Performance metrics** and reporting
- **Compliance support** for regulatory requirements

## 🏗️ **Architecture Components**

### **1. Database Layer**
- `user_activity_logs` - Main audit log table
- `security_events` - Security-related events
- `user_sessions` - Session tracking
- `data_changes` - Field-level change tracking
- `audit_settings` - Configuration settings

### **2. Service Layer**
- `AuditService` - Core audit operations
- Database operations and queries
- Data retention and cleanup

### **3. Middleware Layer**
- `AuditMiddleware` - Automatic request/response logging
- `EnhancedPermissionMiddleware` - Permission checks with audit
- Request interception and data sanitization

### **4. API Layer**
- `AuditController` - Audit data endpoints
- `audit.routes.ts` - RESTful audit APIs
- Export and reporting functionality

## 🚀 **Implementation Options**

### **Option 1: Full Automatic Tracking (Recommended)**

**Best for:** Complete transparency and compliance requirements

```typescript
// 1. Add audit tables to your database
import { addAuditSystem } from '@/database/add-audit-system';
await addAuditSystem();

// 2. Add audit middleware to your app
import { auditMiddleware } from '@/middleware/audit';
app.use('/api', auditMiddleware);

// 3. Replace permission middleware with enhanced version
import { requirePermissionWithAudit } from '@/middleware/enhanced-permission';
// Use requirePermissionWithAudit instead of requirePermission
```

**Features:**
- ✅ Automatic logging of all API requests/responses
- ✅ Security event tracking
- ✅ Session management
- ✅ Permission denial logging
- ✅ Performance metrics

### **Option 2: Selective Tracking**

**Best for:** Performance-conscious applications with specific audit needs

```typescript
// 1. Add audit tables
import { addAuditSystem } from '@/database/add-audit-system';
await addAuditSystem();

// 2. Add audit middleware only to sensitive routes
import { auditMiddleware } from '@/middleware/audit';
app.use('/api/payments', auditMiddleware);
app.use('/api/users', auditMiddleware);
app.use('/api/settings', auditMiddleware);

// 3. Manual logging for specific actions
import { AuditService } from '@/services/audit-service';
const auditService = new AuditService();
await auditService.logActivity({...});
```

**Features:**
- ✅ Targeted audit logging
- ✅ Lower performance impact
- ✅ Manual control over what gets logged
- ✅ Flexible implementation

### **Option 3: Security-Focused Tracking**

**Best for:** Security monitoring and threat detection

```typescript
// 1. Add audit tables
import { addAuditSystem } from '@/database/add-audit-system';
await addAuditSystem();

// 2. Add security event logging
import { logSecurityEvent } from '@/middleware/audit';

// In your authentication middleware
if (loginFailed) {
  await logSecurityEvent(req, 'failed_login', 'medium', 'Invalid credentials');
}

// In your permission middleware
if (permissionDenied) {
  await logSecurityEvent(req, 'permission_denied', 'high', 'Unauthorized access attempt');
}
```

**Features:**
- ✅ Security event monitoring
- ✅ Failed login tracking
- ✅ Permission violation alerts
- ✅ Suspicious activity detection

### **Option 4: Compliance-Ready Tracking**

**Best for:** Regulatory compliance (SOX, GDPR, HIPAA, etc.)

```typescript
// Full implementation with data retention and export
import { auditMiddleware } from '@/middleware/audit';
import auditRoutes from '@/routes/audit.routes';

// Enable comprehensive logging
app.use('/api', auditMiddleware);
app.use('/api/audit', auditRoutes);

// Configure data retention
await client.query(`
  UPDATE audit_settings 
  SET setting_value = '2555' -- 7 years for SOX compliance
  WHERE setting_key = 'retention_days'
`);
```

**Features:**
- ✅ Complete audit trail
- ✅ Data export capabilities
- ✅ Long-term retention
- ✅ Compliance reporting

## 📊 **Configuration Options**

### **Audit Settings**

```sql
-- Configure audit behavior
UPDATE audit_settings SET setting_value = 'true' WHERE setting_key = 'track_read_operations';
UPDATE audit_settings SET setting_value = 'false' WHERE setting_key = 'log_sensitive_data';
UPDATE audit_settings SET setting_value = '365' WHERE setting_key = 'retention_days';
```

### **Middleware Configuration**

```typescript
const auditConfig = {
  excludeEndpoints: ['/health', '/metrics'],
  excludeMethods: ['OPTIONS'],
  logSensitiveData: false,
  trackReadOperations: true,
  sensitiveFields: ['password', 'token', 'ssn']
};

const auditMiddleware = new AuditMiddleware(auditConfig).auditRequest;
```

## 📈 **What Gets Tracked**

### **User Activities**
- ✅ Login/logout events
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Permission checks and denials
- ✅ API endpoint access
- ✅ Request/response data (sanitized)
- ✅ IP addresses and user agents
- ✅ Session information
- ✅ Response times and status codes

### **Security Events**
- ✅ Failed login attempts
- ✅ Permission violations
- ✅ Suspicious activity patterns
- ✅ Account lockouts
- ✅ Password changes
- ✅ Role/permission modifications

### **Data Changes**
- ✅ Field-level before/after values
- ✅ Bulk operation tracking
- ✅ Data type information
- ✅ Change timestamps
- ✅ User attribution

### **Session Tracking**
- ✅ Login/logout times
- ✅ Session duration
- ✅ Device information
- ✅ Location data (if available)
- ✅ Concurrent session monitoring

## 🔍 **Querying Audit Data**

### **API Endpoints**

```bash
# Get user activity
GET /api/audit/activity?limit=50&startDate=2024-01-01

# Get security events
GET /api/audit/security-events?severity=high&resolved=false

# Get active sessions
GET /api/audit/sessions

# Get audit statistics
GET /api/audit/stats?startDate=2024-01-01&endDate=2024-01-31

# Export audit data
GET /api/audit/export?format=csv&startDate=2024-01-01
```

### **Database Queries**

```sql
-- Recent user activities
SELECT * FROM user_activity_logs 
WHERE user_id = 123 
ORDER BY created_at DESC 
LIMIT 50;

-- Failed login attempts
SELECT * FROM security_events 
WHERE event_type = 'failed_login' 
AND created_at > NOW() - INTERVAL '24 hours';

-- Data changes for a specific record
SELECT * FROM data_changes 
WHERE table_name = 'products' 
AND record_id = 456;

-- Active sessions
SELECT * FROM user_sessions 
WHERE is_active = true 
AND last_activity > NOW() - INTERVAL '30 minutes';
```

## 🛡️ **Security & Privacy**

### **Data Sanitization**
- Sensitive fields are automatically redacted
- Configurable sensitive field list
- Password and token exclusion
- PII protection options

### **Access Control**
- Users can only view their own activity (unless admin)
- Role-based access to security events
- Admin-only export and cleanup functions
- Permission-based audit API access

### **Data Retention**
- Configurable retention periods
- Automatic cleanup of old logs
- Compliance-ready retention policies
- Secure data deletion

## 📋 **Implementation Steps**

### **Step 1: Database Setup**
```bash
# Add audit tables to your migration
npm run migrate:add-audit-system
```

### **Step 2: Middleware Integration**
```typescript
// In your main app.ts
import { auditMiddleware } from '@/middleware/audit';
app.use('/api', authenticate, auditMiddleware);
```

### **Step 3: Route Integration**
```typescript
// Add audit routes
import auditRoutes from '@/routes/audit.routes';
app.use('/api/audit', auditRoutes);
```

### **Step 4: Configuration**
```typescript
// Configure audit settings in your database
await addAuditSystem();
```

### **Step 5: Testing**
```bash
# Test audit logging
curl -X POST /api/products -H "Authorization: Bearer token" -d '{...}'

# Check audit logs
curl -X GET /api/audit/activity -H "Authorization: Bearer token"
```

## 📊 **Performance Considerations**

### **Database Optimization**
- Proper indexing on audit tables
- Partitioning for large datasets
- Regular cleanup of old data
- Asynchronous logging where possible

### **Application Impact**
- Minimal overhead with proper configuration
- Exclude read-only operations if needed
- Use database connection pooling
- Consider async logging for high-traffic endpoints

### **Storage Management**
- Monitor audit table growth
- Implement data archiving
- Use compression for old data
- Regular maintenance tasks

## 🔧 **Maintenance Tasks**

### **Regular Cleanup**
```sql
-- Run cleanup function (configured retention period)
SELECT cleanup_audit_logs();
```

### **Monitoring**
```sql
-- Check audit table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE '%audit%' OR tablename LIKE '%activity%';
```

### **Performance Tuning**
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM user_activity_logs WHERE user_id = 123;

-- Update table statistics
ANALYZE user_activity_logs;
```

## 🎯 **Use Cases**

### **Compliance Reporting**
- Generate audit reports for regulators
- Track data access and modifications
- Demonstrate security controls
- Support legal discovery requests

### **Security Monitoring**
- Detect unusual user behavior
- Monitor failed access attempts
- Track privilege escalation
- Identify potential threats

### **Operational Intelligence**
- Analyze user behavior patterns
- Optimize system performance
- Track feature usage
- Support troubleshooting

### **Business Analytics**
- User engagement metrics
- Feature adoption rates
- Performance bottlenecks
- Usage trends and patterns

## 🚨 **Alerts & Notifications**

### **Security Alerts**
- Multiple failed login attempts
- Permission violations
- Unusual access patterns
- Suspicious IP addresses

### **Operational Alerts**
- High error rates
- Performance degradation
- System overload
- Data integrity issues

## 📚 **Best Practices**

1. **Start Simple**: Begin with basic activity logging and expand as needed
2. **Configure Wisely**: Balance completeness with performance
3. **Secure Access**: Protect audit data with proper permissions
4. **Regular Maintenance**: Clean up old data and monitor performance
5. **Test Thoroughly**: Verify audit logging doesn't break existing functionality
6. **Document Everything**: Maintain clear documentation of what gets logged
7. **Monitor Impact**: Watch for performance degradation
8. **Plan for Scale**: Design for your expected data volume

This comprehensive tracking system provides enterprise-grade audit capabilities while maintaining flexibility for different use cases and requirements.
