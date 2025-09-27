import express, { NextFunction, Request, Response } from "express";
import {
  createChartOfAccountSchema,
  updateChartOfAccountSchema,
  getChartOfAccountsQuerySchema,
} from "../validation/accountGroupValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  requireSystemAdmin,
  PERMISSIONS,
} from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import ChartOfAccountsController from "../controllers/chartOfAccounts.controller";

const router = express.Router();

const validateRequest = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    let action = "Validate Request Body";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.body);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        return res.status(400).json({
          error: {
            message: "Validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
      }
      req.body = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method });
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method });
      throw err;
    }
  };
};

const validateQuery = (schema: any) => {
  return (req: express.Request, res: Response, next: NextFunction) => {
    let action = "Validate Query Parameters";
    try {
      MyLogger.info(action, {
        endpoint: req.path,
        method: req.method,
        query: req.query,
      });
      const { error, value } = schema.validate(req.query);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        return res.status(400).json({
          error: {
            message: "Query validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
      }
      req.query = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method });
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method });
      throw err;
    }
  };
};

// ===== CHART OF ACCOUNTS ROUTES =====

/**
 * @route GET /api/accounts/chart-of-accounts
 * @desc Get all chart of accounts with pagination and filtering
 * @access Finance Read Permission
 */
router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  validateQuery(getChartOfAccountsQuerySchema),
  expressAsyncHandler(ChartOfAccountsController.getAllChartOfAccounts)
);

/**
 * @route GET /api/accounts/chart-of-accounts/tree
 * @desc Get hierarchical chart of accounts tree
 * @access Finance Read Permission
 */
router.get(
  "/tree",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  expressAsyncHandler(ChartOfAccountsController.getChartOfAccountsTree)
);

/**
 * @route GET /api/accounts/chart-of-accounts/:id
 * @desc Get chart of account by ID with children
 * @access Finance Read Permission
 */
router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNTS_READ),
  expressAsyncHandler(ChartOfAccountsController.getChartOfAccountById)
);

/**
 * @route POST /api/accounts/chart-of-accounts
 * @desc Create new chart of account
 * @access Finance Create Permission
 */
router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNTS_CREATE),
  validateRequest(createChartOfAccountSchema),
  expressAsyncHandler(ChartOfAccountsController.createChartOfAccount)
);

/**
 * @route PUT /api/accounts/chart-of-accounts/:id
 * @desc Update chart of account
 * @access Finance Update Permission
 */
router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNTS_UPDATE),
  validateRequest(updateChartOfAccountSchema),
  expressAsyncHandler(ChartOfAccountsController.updateChartOfAccount)
);

/**
 * @route DELETE /api/accounts/chart-of-accounts/:id
 * @desc Delete chart of account
 * @access Finance Delete Permission
 */
router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNTS_DELETE),
  expressAsyncHandler(ChartOfAccountsController.deleteChartOfAccount)
);

/**
 * @route PUT /api/accounts/chart-of-accounts/:id/deactivate
 * @desc Deactivate chart of account (soft delete)
 * @access Finance Update Permission
 */
router.put(
  "/:id/deactivate",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNTS_UPDATE),
  expressAsyncHandler(ChartOfAccountsController.deactivateChartOfAccount)
);

/**
 * @route PUT /api/accounts/chart-of-accounts/:id/activate
 * @desc Activate chart of account
 * @access Finance Update Permission
 */
router.put(
  "/:id/activate",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNTS_UPDATE),
  expressAsyncHandler(ChartOfAccountsController.activateChartOfAccount)
);

export default router;
