import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import AuditController from '@/controllers/audit/audit.controller';
import { validateRequest, validateQuery } from '@/middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const auditQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).optional(),
  offset: Joi.number().integer().min(0).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  action: Joi.string().valid('create', 'read', 'update', 'delete', 'approve', 'reject', 'login', 'logout').optional(),
  resourceType: Joi.string().max(100).optional(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  resolved: Joi.boolean().optional(),
  userId: Joi.number().integer().optional(),
  format: Joi.string().valid('json', 'csv').optional()
});

const resolveEventSchema = Joi.object({
  notes: Joi.string().max(500).optional()
});

// ==================== USER ACTIVITY ROUTES ====================

// GET /api/audit/activity - Get current user's activity
router.get('/activity',
  authenticate,
  validateQuery(auditQuerySchema),
  expressAsyncHandler(AuditController.getUserActivity)
);

// GET /api/audit/activity/:userId - Get specific user's activity (admin only)
router.get('/activity/:userId',
  authenticate,
  requirePermission(PERMISSIONS.USERS_READ),
  validateQuery(auditQuerySchema),
  expressAsyncHandler(AuditController.getUserActivity)
);

// ==================== SECURITY EVENTS ROUTES ====================

// GET /api/audit/security-events - Get security events (admin only)
router.get('/security-events',
  authenticate,
  requirePermission(PERMISSIONS.USERS_READ), // Using USERS_READ as proxy for admin access
  validateQuery(auditQuerySchema),
  expressAsyncHandler(AuditController.getSecurityEvents)
);

// POST /api/audit/security-events/:eventId/resolve - Resolve security event (admin only)
router.post('/security-events/:eventId/resolve',
  authenticate,
  requirePermission(PERMISSIONS.USERS_UPDATE),
  validateRequest(resolveEventSchema),
  expressAsyncHandler(AuditController.resolveSecurityEvent)
);

// ==================== SESSION ROUTES ====================

// GET /api/audit/sessions - Get active sessions
router.get('/sessions',
  authenticate,
  validateQuery(auditQuerySchema),
  expressAsyncHandler(AuditController.getActiveSessions)
);

// ==================== STATISTICS ROUTES ====================

// GET /api/audit/stats - Get audit statistics
router.get('/stats',
  authenticate,
  requirePermission(PERMISSIONS.USERS_READ),
  validateQuery(auditQuerySchema),
  expressAsyncHandler(AuditController.getAuditStats)
);

// ==================== EXPORT ROUTES ====================

// GET /api/audit/export - Export audit data (admin only)
router.get('/export',
  authenticate,
  requirePermission(PERMISSIONS.USERS_READ),
  validateQuery(auditQuerySchema),
  expressAsyncHandler(AuditController.exportAuditData)
);

// ==================== MAINTENANCE ROUTES ====================

// POST /api/audit/cleanup - Clean up old audit logs (system admin only)
router.post('/cleanup',
  authenticate,
  requirePermission(PERMISSIONS.USERS_DELETE), // Using USERS_DELETE as proxy for system admin
  expressAsyncHandler(AuditController.cleanupAuditLogs)
);

export default router;
