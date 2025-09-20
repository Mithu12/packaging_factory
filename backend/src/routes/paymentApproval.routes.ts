import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Joi from 'joi';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { validateRequest } from '@/middleware/validation';
import { ApprovalMediator } from '@/mediators/approval/ApprovalMediator';
import { serializeSuccessResponse, serializeErrorResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';

const router = express.Router();

// Validation schemas
const submitPaymentSchema = Joi.object({
  notes: Joi.string().optional().allow('')
});

const approvePaymentSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  notes: Joi.string().optional().allow('')
});

// Role-based middleware
const canSubmit = (req: any, res: any, next: any) => {
  const userRole = req.user?.role;
  if (!ApprovalMediator.canSubmit(userRole)) {
    return serializeErrorResponse(res, {}, '403', 'Insufficient permissions to submit for approval');
  }
  return next();
};

const canApprove = (req: any, res: any, next: any) => {
  const userRole = req.user?.role;
  if (!ApprovalMediator.canApprove(userRole)) {
    return serializeErrorResponse(res, {}, '403', 'Insufficient permissions to approve');
  }
  return next();
};

// POST /api/payments/:id/submit - Submit payment for approval
router.post('/:id/submit',
  authenticate,
  requirePermission(PERMISSIONS.PAYMENTS_CREATE),
  validateRequest(submitPaymentSchema),
  expressAsyncHandler(async (req, res) => {
    const action = 'POST /api/payments/:id/submit';
    const paymentId = parseInt(req.params.id);
    const userId = req.user?.user_id || 1;
    const { notes } = req.body;

    try {
      MyLogger.info(action, { paymentId, userId, notes });

      await ApprovalMediator.submitForApproval(
        'payment',
        paymentId,
        userId,
        notes
      );

      MyLogger.success(action, { paymentId, userId });
      serializeSuccessResponse(res, null, 'Payment submitted for approval');

    } catch (error: any) {
      MyLogger.error(action, error, { paymentId, userId });
      throw error;
    }
  })
);

// POST /api/payments/:id/approve - Approve or reject payment
router.post('/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.PAYMENTS_APPROVE),
  validateRequest(approvePaymentSchema),
  expressAsyncHandler(async (req, res) => {
    const action = 'POST /api/payments/:id/approve';
    const paymentId = parseInt(req.params.id);
    const userId = req.user?.user_id || 1;
    const { action: approvalAction, notes } = req.body;

    try {
      MyLogger.info(action, { paymentId, userId, approvalAction, notes });

      await ApprovalMediator.processApproval(
        'payment',
        paymentId,
        userId,
        approvalAction,
        notes
      );

      const message = approvalAction === 'approve' 
        ? 'Payment approved successfully'
        : 'Payment rejected';

      MyLogger.success(action, { paymentId, userId, approvalAction });
      serializeSuccessResponse(res, null, message);

    } catch (error: any) {
      MyLogger.error(action, error, { paymentId, userId, approvalAction });
      throw error;
    }
  })
);

// GET /api/payments/:id/approval-history - Get approval history
router.get('/:id/approval-history',
  authenticate,
  requirePermission(PERMISSIONS.PAYMENTS_READ),
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/payments/:id/approval-history';
    const paymentId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { paymentId });

      const history = await ApprovalMediator.getApprovalHistory(
        'payment',
        paymentId
      );

      MyLogger.success(action, { paymentId, historyCount: history.length });
      serializeSuccessResponse(res, history, 'Approval history retrieved successfully');

    } catch (error: any) {
      MyLogger.error(action, error, { paymentId });
      throw error;
    }
  })
);

// GET /api/payments/pending-approvals - Get payments pending approval
router.get('/pending-approvals',
  authenticate,
  requirePermission(PERMISSIONS.PAYMENTS_APPROVE),
  canApprove,
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/payments/pending-approvals';
    const userRole = req.user?.role || 'viewer';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    try {
      MyLogger.info(action, { userRole, page, limit });

      const result = await ApprovalMediator.getPendingApprovals(
        'payment',
        userRole,
        page,
        limit
      );

      MyLogger.success(action, { userRole, total: result.total, entitiesCount: result.entities.length });
      serializeSuccessResponse(res, result, 'Pending approvals retrieved successfully');

    } catch (error: any) {
      MyLogger.error(action, error, { userRole, page, limit });
      throw error;
    }
  })
);

export default router;
