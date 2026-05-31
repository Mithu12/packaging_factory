import { Router } from 'express';
import {
  getAllCheques,
  getChequeById,
  createCheque,
  updateChequeStatus,
} from '../controllers/cheques.controller';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { validateRequest, validateQuery } from '@/middleware/validation';
import {
  createChequeSchema,
  updateChequeStatusSchema,
  getChequesQuerySchema,
} from '../validation/chequeValidation';
import expressAsyncHandler from 'express-async-handler';

const router = Router();
router.use(authenticate);

// GET /api/accounts/cheques - list cheques
router.get(
  '/',
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  validateQuery(getChequesQuerySchema),
  expressAsyncHandler(getAllCheques)
);

// GET /api/accounts/cheques/:id
router.get(
  '/:id',
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  expressAsyncHandler(getChequeById)
);

// POST /api/accounts/cheques - record a cheque / pay-order
router.post(
  '/',
  requirePermission(PERMISSIONS.VOUCHERS_CREATE),
  validateRequest(createChequeSchema),
  expressAsyncHandler(createCheque)
);

// PUT /api/accounts/cheques/:id/status - mark cleared/bounced/cancelled
router.put(
  '/:id/status',
  requirePermission(PERMISSIONS.VOUCHERS_UPDATE),
  validateRequest(updateChequeStatusSchema),
  expressAsyncHandler(updateChequeStatus)
);

export default router;
