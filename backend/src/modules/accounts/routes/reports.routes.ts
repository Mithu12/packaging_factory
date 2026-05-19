import { Router } from 'express';
import { ReportsController } from '@/modules/accounts/controllers/incomeStatement.controller';
import { requirePermission } from '@/middleware/permission';
import { validateQuery } from '@/middleware/validation';
import { getIncomeStatementQuerySchema, getBalanceSheetQuerySchema, getVatRegisterQuerySchema } from '@/modules/accounts/validation/incomeStatementValidation';
import { PERMISSIONS } from '@/middleware/permission';
import { authenticate } from '@/middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/accounts/reports/income-statement - Get income statement
router.get(
  "/income-statement",
  requirePermission(PERMISSIONS.INCOME_STATEMENT_READ),
  validateQuery(getIncomeStatementQuerySchema),
  ReportsController.getIncomeStatement
);

// GET /api/accounts/reports/balance-sheet - Get balance sheet
router.get(
  "/balance-sheet",
  requirePermission(PERMISSIONS.BALANCE_SHEET_READ),
  validateQuery(getBalanceSheetQuerySchema),
  ReportsController.getBalanceSheet
);

// GET /api/accounts/reports/cc-summary - Get CC-wise account summary
router.get(
  "/cc-summary",
  requirePermission(PERMISSIONS.BALANCE_SHEET_READ),
  ReportsController.getCcAccountSummary
);

// GET /api/accounts/reports/vat-register - Input vs Output VAT register
router.get(
  "/vat-register",
  requirePermission(PERMISSIONS.INCOME_STATEMENT_READ),
  validateQuery(getVatRegisterQuerySchema),
  ReportsController.getVatRegister
);

export default router;
