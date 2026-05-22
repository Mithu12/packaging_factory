import express from "express";
import expressAsyncHandler from "express-async-handler";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import { MyLogger } from "@/utils/new-logger";
import purchaseReturnsController from "../controllers/purchaseReturns.controller";
import {
  createPurchaseReturnSchema,
  updatePurchaseReturnSchema,
  approvalActionSchema,
  cancelPurchaseReturnSchema,
  purchaseReturnQuerySchema,
} from "../validation/purchaseReturnValidation";

const router = express.Router();

const validateRequest = (schema: any) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const action = "Validate Request Body";
    try {
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
            details: error.details.map((d: any) => d.message),
          },
        });
      }
      req.body = value;
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path });
      throw err;
    }
  };
};

const validateQuery = (schema: any) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: {
          message: "Query validation error",
          details: error.details.map((d: any) => d.message),
        },
      });
    }
    req.query = value;
    return next();
  };
};

router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_READ),
  validateQuery(purchaseReturnQuerySchema),
  expressAsyncHandler(purchaseReturnsController.getAllPurchaseReturns)
);

router.get(
  "/stats",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_READ),
  expressAsyncHandler(purchaseReturnsController.getPurchaseReturnStats)
);

router.get(
  "/search",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_READ),
  expressAsyncHandler(purchaseReturnsController.searchPurchaseReturns)
);

router.get(
  "/eligible-lines",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_READ),
  expressAsyncHandler(purchaseReturnsController.getEligibleLines)
);

router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_READ),
  expressAsyncHandler(purchaseReturnsController.getPurchaseReturnById)
);

router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_CREATE),
  validateRequest(createPurchaseReturnSchema),
  expressAsyncHandler(purchaseReturnsController.createPurchaseReturn)
);

router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_UPDATE),
  validateRequest(updatePurchaseReturnSchema),
  expressAsyncHandler(purchaseReturnsController.updatePurchaseReturn)
);

router.post(
  "/:id/submit",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_UPDATE),
  validateRequest(approvalActionSchema),
  expressAsyncHandler(purchaseReturnsController.submitPurchaseReturn)
);

router.post(
  "/:id/approve",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_APPROVE),
  validateRequest(approvalActionSchema),
  expressAsyncHandler(purchaseReturnsController.approvePurchaseReturn)
);

router.post(
  "/:id/reject",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_APPROVE),
  validateRequest(approvalActionSchema),
  expressAsyncHandler(purchaseReturnsController.rejectPurchaseReturn)
);

router.patch(
  "/:id/cancel",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_UPDATE),
  validateRequest(cancelPurchaseReturnSchema),
  expressAsyncHandler(purchaseReturnsController.cancelPurchaseReturn)
);

router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_RETURNS_DELETE),
  expressAsyncHandler(purchaseReturnsController.deletePurchaseReturn)
);

export default router;
