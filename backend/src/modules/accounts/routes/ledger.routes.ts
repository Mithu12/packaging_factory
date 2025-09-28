import express from 'express';
import { LedgerController } from '../controllers/ledger.controller';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { validateQuery } from '@/middleware/validation';
import { PERMISSIONS } from '@/middleware/permission';
import { getLedgerEntriesQuerySchema } from '../validation/ledgerValidation';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/accounts/ledger - Get all ledger entries with pagination and filtering
router.get(
  "/",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  validateQuery(getLedgerEntriesQuerySchema),
  LedgerController.getAllLedgerEntries
);

// GET /api/accounts/ledger/stats - Get ledger statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  validateQuery(getLedgerEntriesQuerySchema),
  LedgerController.getLedgerStats
);

// GET /api/accounts/ledger/cost-center/:id - Get ledger entries for specific cost center
router.get(
  "/cost-center/:id",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  validateQuery(getLedgerEntriesQuerySchema),
  LedgerController.getCostCenterLedgerEntries
);

export default router;
