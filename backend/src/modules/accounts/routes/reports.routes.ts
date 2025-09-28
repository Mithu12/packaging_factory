import { Router } from 'express';
import { IncomeStatementController } from '@/modules/accounts/controllers/incomeStatement.controller';
import { requirePermission } from '@/middleware/permission';
import { validateQuery } from '@/middleware/validation';
import { getIncomeStatementQuerySchema } from '@/modules/accounts/validation/incomeStatementValidation';
import { PERMISSIONS } from '@/middleware/permission';
import { authenticate } from '@/middleware/auth';

const router = Router();
router.use(authenticate);
// GET /api/accounts/reports/income-statement - Get income statement
router.get(
  "/income-statement",
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  validateQuery(getIncomeStatementQuerySchema),
  IncomeStatementController.getIncomeStatement
);

export default router;
