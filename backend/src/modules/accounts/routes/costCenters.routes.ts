import express, { NextFunction, Request, Response } from "express";
import {
  createCostCenterSchema,
  updateCostCenterSchema,
  getCostCentersQuerySchema,
} from "../validation/costCenterValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  requireSystemAdmin,
  PERMISSIONS,
} from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import CostCentersController from "../controllers/costCenters.controller";
import Joi from "joi";

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

// ===== COST CENTERS ROUTES =====

/**
 * @route GET /api/accounts/cost-centers
 * @desc Get all cost centers with pagination and filtering
 * @access Finance Read Permission
 */
router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.COST_CENTERS_READ),
  validateQuery(getCostCentersQuerySchema),
  expressAsyncHandler(CostCentersController.getAllCostCenters)
);

/**
 * @route GET /api/accounts/cost-centers/stats
 * @desc Get cost center statistics
 * @access Finance Read Permission
 */
router.get(
  "/stats",
  authenticate,
  requirePermission(PERMISSIONS.COST_CENTERS_READ),
  expressAsyncHandler(CostCentersController.getCostCenterStats)
);

/**
 * @route GET /api/accounts/cost-centers/search
 * @desc Search cost centers
 * @access Finance Read Permission
 */
router.get(
  "/search",
  authenticate,
  requirePermission(PERMISSIONS.COST_CENTERS_READ),
  validateQuery(Joi.object({
    q: Joi.string().required().min(1).max(255)
  })),
  expressAsyncHandler(CostCentersController.searchCostCenters)
);

/**
 * @route GET /api/accounts/cost-centers/:id
 * @desc Get cost center by ID
 * @access Finance Read Permission
 */
router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.COST_CENTERS_READ),
  expressAsyncHandler(CostCentersController.getCostCenterById)
);

/**
 * @route POST /api/accounts/cost-centers
 * @desc Create new cost center
 * @access Finance Create Permission
 */
router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.COST_CENTERS_CREATE),
  validateRequest(createCostCenterSchema),
  expressAsyncHandler(CostCentersController.createCostCenter)
);

/**
 * @route PUT /api/accounts/cost-centers/:id
 * @desc Update cost center
 * @access Finance Update Permission
 */
router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.COST_CENTERS_UPDATE),
  validateRequest(updateCostCenterSchema),
  expressAsyncHandler(CostCentersController.updateCostCenter)
);

/**
 * @route PUT /api/accounts/cost-centers/:id/actual-spend
 * @desc Update actual spend for cost center
 * @access Finance Update Permission
 */
router.put(
  "/:id/actual-spend",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.COST_CENTERS_UPDATE),
  validateRequest(Joi.object({
    actualSpend: Joi.number().min(0).precision(2).required()
  })),
  expressAsyncHandler(CostCentersController.updateActualSpend)
);

/**
 * @route DELETE /api/accounts/cost-centers/:id
 * @desc Delete cost center
 * @access Finance Delete Permission
 */
router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.COST_CENTERS_DELETE),
  expressAsyncHandler(CostCentersController.deleteCostCenter)
);

/**
 * @route PUT /api/accounts/cost-centers/:id/deactivate
 * @desc Deactivate cost center (soft delete)
 * @access Finance Update Permission
 */
router.put(
  "/:id/deactivate",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.COST_CENTERS_UPDATE),
  expressAsyncHandler(CostCentersController.deactivateCostCenter)
);

/**
 * @route PUT /api/accounts/cost-centers/:id/activate
 * @desc Activate cost center
 * @access Finance Update Permission
 */
router.put(
  "/:id/activate",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.COST_CENTERS_UPDATE),
  expressAsyncHandler(CostCentersController.activateCostCenter)
);

export default router;
