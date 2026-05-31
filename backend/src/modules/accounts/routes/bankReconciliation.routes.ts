import { Router } from 'express';
import {
  getReconciliationEntries,
  saveReconciliation,
  listReconciliations,
  getReconciliationById,
} from '../controllers/bankReconciliation.controller';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { validateRequest, validateQuery } from '@/middleware/validation';
import {
  reconciliationEntriesQuerySchema,
  saveReconciliationSchema,
  listReconciliationsQuerySchema,
} from '../validation/bankReconciliationValidation';
import expressAsyncHandler from 'express-async-handler';

const router = Router();
router.use(authenticate);

// GET /api/accounts/bank-reconciliation/entries - ledger entries to reconcile
router.get(
  '/entries',
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  validateQuery(reconciliationEntriesQuerySchema),
  expressAsyncHandler(getReconciliationEntries)
);

// GET /api/accounts/bank-reconciliation - list saved reconciliations
router.get(
  '/',
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  validateQuery(listReconciliationsQuerySchema),
  expressAsyncHandler(listReconciliations)
);

// GET /api/accounts/bank-reconciliation/:id
router.get(
  '/:id',
  requirePermission(PERMISSIONS.VOUCHERS_READ),
  expressAsyncHandler(getReconciliationById)
);

// POST /api/accounts/bank-reconciliation - save / complete a reconciliation
router.post(
  '/',
  requirePermission(PERMISSIONS.VOUCHERS_CREATE),
  validateRequest(saveReconciliationSchema),
  expressAsyncHandler(saveReconciliation)
);

export default router;
