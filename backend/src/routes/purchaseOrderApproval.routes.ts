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
const submitPurchaseOrderSchema = Joi.object({
  notes: Joi.string().optional().allow('')
});

const approvePurchaseOrderSchema = Joi.object({
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

// POST /api/purchase-orders/:id/submit - Submit purchase order for approval
router.post('/:id/submit',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_CREATE),
  validateRequest(submitPurchaseOrderSchema),
  expressAsyncHandler(async (req, res) => {
    const action = 'POST /api/purchase-orders/:id/submit';
    const purchaseOrderId = parseInt(req.params.id);
    const userId = req.user?.user_id || 1;
    const { notes } = req.body;

    try {
      MyLogger.info(action, { purchaseOrderId, userId, notes });

      await ApprovalMediator.submitForApproval(
        'purchase_order',
        purchaseOrderId,
        userId,
        notes
      );

      MyLogger.success(action, { purchaseOrderId, userId });
      serializeSuccessResponse(res, null, 'Purchase order submitted for approval');

    } catch (error: any) {
      MyLogger.error(action, error, { purchaseOrderId, userId });
      throw error;
    }
  })
);

// POST /api/purchase-orders/:id/approve - Approve or reject purchase order
router.post('/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_APPROVE),
  validateRequest(approvePurchaseOrderSchema),
  expressAsyncHandler(async (req, res) => {
    const action = 'POST /api/purchase-orders/:id/approve';
    const purchaseOrderId = parseInt(req.params.id);
    const userId = req.user?.user_id || 1;
    const { action: approvalAction, notes } = req.body;

    try {
      MyLogger.info(action, { purchaseOrderId, userId, approvalAction, notes });

      await ApprovalMediator.processApproval(
        'purchase_order',
        purchaseOrderId,
        userId,
        approvalAction,
        notes
      );

      const message = approvalAction === 'approve' 
        ? 'Purchase order approved successfully'
        : 'Purchase order rejected';

      MyLogger.success(action, { purchaseOrderId, userId, approvalAction });
      serializeSuccessResponse(res, null, message);

    } catch (error: any) {
      MyLogger.error(action, error, { purchaseOrderId, userId, approvalAction });
      throw error;
    }
  })
);

// GET /api/purchase-orders/:id/approval-history - Get approval history
router.get('/:id/approval-history',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/purchase-orders/:id/approval-history';
    const purchaseOrderId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { purchaseOrderId });

      const history = await ApprovalMediator.getApprovalHistory(
        'purchase_order',
        purchaseOrderId
      );

      MyLogger.success(action, { purchaseOrderId, historyCount: history.length });
      serializeSuccessResponse(res, history, 'Approval history retrieved successfully');

    } catch (error: any) {
      MyLogger.error(action, error, { purchaseOrderId });
      throw error;
    }
  })
);

// GET /api/purchase-orders/pending-approvals - Get purchase orders pending approval
router.get('/pending-approvals',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_APPROVE),
  expressAsyncHandler(async (req, res) => {
    const action = 'GET /api/purchase-orders/pending-approvals';
    const userRole = req.user?.role || 'viewer';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    try {
      MyLogger.info(action, { userRole, page, limit });

      const result = await ApprovalMediator.getPendingApprovals(
        'purchase_order',
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
