import express, { NextFunction, Request, Response } from "express";
import {
  createAccountGroupSchema,
  updateAccountGroupSchema,
  getAccountGroupsQuerySchema,
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
import AccountGroupsController from "../controllers/accountGroups.controller";

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

// ===== ACCOUNT GROUPS ROUTES =====

/**
 * @route GET /api/accounts/account-groups
 * @desc Get all account groups with pagination and filtering
 * @access Finance Read Permission
 */
router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_READ),
  validateQuery(getAccountGroupsQuerySchema),
  expressAsyncHandler(AccountGroupsController.getAllAccountGroups)
);

/**
 * @route GET /api/accounts/account-groups/tree
 * @desc Get hierarchical account groups tree
 * @access Finance Read Permission
 */
router.get(
  "/tree",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_READ),
  expressAsyncHandler(AccountGroupsController.getAccountGroupsTree)
);

/**
 * @route GET /api/accounts/account-groups/stats
 * @desc Get account group statistics
 * @access Finance Read Permission
 */
router.get(
  "/stats",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_READ),
  expressAsyncHandler(AccountGroupsController.getAccountGroupStats)
);

/**
 * @route GET /api/accounts/account-groups/search
 * @desc Search account groups by name or code
 * @access Finance Read Permission
 */
router.get(
  "/search",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_READ),
  expressAsyncHandler(AccountGroupsController.searchAccountGroups)
);

/**
 * @route GET /api/accounts/account-groups/:id
 * @desc Get account group by ID with children
 * @access Finance Read Permission
 */
router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_READ),
  expressAsyncHandler(AccountGroupsController.getAccountGroupById)
);

/**
 * @route POST /api/accounts/account-groups
 * @desc Create new account group
 * @access Finance Create Permission
 */
router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_READ),
  validateRequest(createAccountGroupSchema),
  expressAsyncHandler(AccountGroupsController.createAccountGroup)
);

/**
 * @route PUT /api/accounts/account-groups/:id
 * @desc Update account group
 * @access Finance Update Permission
 */
router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_UPDATE),
  validateRequest(updateAccountGroupSchema),
  expressAsyncHandler(AccountGroupsController.updateAccountGroup)
);

/**
 * @route DELETE /api/accounts/account-groups/:id
 * @desc Delete account group
 * @access Finance Delete Permission
 */
router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_DELETE),
  expressAsyncHandler(AccountGroupsController.deleteAccountGroup)
);

/**
 * @route PUT /api/accounts/account-groups/:id/deactivate
 * @desc Deactivate account group (soft delete)
 * @access Finance Update Permission
 */
router.put(
  "/:id/deactivate",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_UPDATE),
  expressAsyncHandler(AccountGroupsController.deactivateAccountGroup)
);

/**
 * @route PUT /api/accounts/account-groups/:id/activate
 * @desc Activate account group
 * @access Finance Update Permission
 */
router.put(
  "/:id/activate",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.ACCOUNT_GROUPS_UPDATE),
  expressAsyncHandler(AccountGroupsController.activateAccountGroup)
);

export default router;
