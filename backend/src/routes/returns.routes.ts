import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';
import { validateRequest } from '@/middleware/validation';
import { ReturnsController } from '@/controllers/returns/returns.controller';
import { 
  validateCreateReturn, 
  validateProcessReturn, 
  validateRefundTransaction,
  validateReturnQuery 
} from '@/validation/returnsValidation';

const router = express.Router();

// Get all returns with pagination and filtering
router.get('/',
  authenticate,
  requirePermission(PERMISSIONS.POS_RETURNS_READ),
  validateRequest(validateReturnQuery),
  expressAsyncHandler(ReturnsController.getAllReturns)
);

// Get return statistics
router.get('/stats',
  authenticate,
  requirePermission(PERMISSIONS.POS_RETURNS_READ),
  expressAsyncHandler(ReturnsController.getReturnStats)
);

// Check return eligibility for an order
router.get('/eligibility/:orderId',
  authenticate,
  requirePermission(PERMISSIONS.POS_RETURNS_READ),
  expressAsyncHandler(ReturnsController.checkReturnEligibility)
);

// Get returns by customer
router.get('/customer/:customerId',
  authenticate,
  requirePermission(PERMISSIONS.POS_RETURNS_READ),
  expressAsyncHandler(ReturnsController.getReturnsByCustomer)
);

// Get returns by original order
router.get('/order/:orderId',
  authenticate,
  requirePermission(PERMISSIONS.POS_RETURNS_READ),
  expressAsyncHandler(ReturnsController.getReturnsByOrder)
);

// Get return by ID with full details
router.get('/:id',
  authenticate,
  requirePermission(PERMISSIONS.POS_RETURNS_READ),
  expressAsyncHandler(ReturnsController.getReturnById)
);

// Create a new return
router.post('/',
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.POS_RETURNS_CREATE),
  validateRequest(validateCreateReturn),
  expressAsyncHandler(ReturnsController.createReturn)
);

// Process return (approve/reject)
router.patch('/:id/process',
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.POS_RETURNS_APPROVE),
  validateRequest(validateProcessReturn),
  expressAsyncHandler(ReturnsController.processReturn)
);

// Complete return with inventory updates
router.patch('/:id/complete',
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.POS_RETURNS_COMPLETE),
  expressAsyncHandler(ReturnsController.completeReturn)
);

// Update return status
router.patch('/:id/status',
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.POS_RETURNS_APPROVE),
  expressAsyncHandler(ReturnsController.updateReturnStatus)
);

// Process refund transaction
router.post('/:id/refund',
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.POS_REFUNDS),
  validateRequest(validateRefundTransaction),
  expressAsyncHandler(ReturnsController.processRefund)
);

export default router;
