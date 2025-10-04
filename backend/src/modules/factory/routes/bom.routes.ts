import express from "express";
import {
  createBOMSchema,
  updateBOMSchema,
  bomQuerySchema,
  bomIdSchema,
} from "../validation/bomValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { bomController } from "../controllers/bom.controller";
import { auditMiddleware } from "@/middleware/audit";

const router = express.Router();
router.use(authenticate);

// Apply audit middleware to all routes
router.use(auditMiddleware);

const validateRequest = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = "Validate Request Body";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.body);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        res.status(400)
        throw new Error("Validation error");
      }
      req.body = value;
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

// =====================================================
// BOM CRUD Routes
// =====================================================

// Get all BOMs with filtering and pagination
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_BOMS_READ),
  expressAsyncHandler(bomController.getBOMs)
);

// Get BOM statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.FACTORY_BOMS_READ),
  expressAsyncHandler(bomController.getBOMStats)
);

// Create new BOM
router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_BOMS_CREATE),
  validateRequest(createBOMSchema),
  expressAsyncHandler(bomController.createBOM)
);


// Update BOM
router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_BOMS_UPDATE),
  validateRequest(updateBOMSchema),
  expressAsyncHandler(bomController.updateBOM)
);

// Delete BOM
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_BOMS_DELETE),
  expressAsyncHandler(bomController.deleteBOM)
);

// =====================================================
// Material Requirements Routes
// =====================================================

// Get material requirements for work orders
router.get(
  "/material-requirements",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
  expressAsyncHandler(bomController.getMaterialRequirements)
);

// Get material planning statistics
router.get(
  "/material-planning/stats",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
  expressAsyncHandler(bomController.getMaterialPlanningStats)
);

// Get BOM by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_BOMS_READ),
  expressAsyncHandler(bomController.getBOMById)
);
export default router;
