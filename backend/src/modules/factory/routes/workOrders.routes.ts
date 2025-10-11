import express from "express";
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  workOrderQuerySchema,
  updateWorkOrderStatusSchema,
  workOrderIdSchema,
  bulkUpdateWorkOrderStatusSchema,
} from "../validation/workOrderValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { workOrdersController } from "../controllers/workOrders.controller";
import { auditMiddleware } from "@/middleware/audit";

const router = express.Router();
router.use(authenticate);

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

// Apply audit middleware to all routes
router.use(auditMiddleware);

// =====================================================
// Operator Management Routes
// =====================================================

// Get all operators
router.get(
  "/operators",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_READ),
  expressAsyncHandler(workOrdersController.getOperators)
);

// =====================================================
// Work Order CRUD Routes
// =====================================================

// Get all work orders with filtering and pagination
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
  expressAsyncHandler(workOrdersController.getAllWorkOrders)
);

// Get work order statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
  expressAsyncHandler(workOrdersController.getWorkOrderStats)
);

// Create new work order
router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_CREATE),
  validateRequest(createWorkOrderSchema),
  expressAsyncHandler(workOrdersController.createWorkOrder)
);

// Update work order
router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_UPDATE),
  validateRequest(updateWorkOrderSchema),
  expressAsyncHandler(workOrdersController.updateWorkOrder)
);

// Update work order status
router.post(
  "/:id/status",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_UPDATE),
  validateRequest(updateWorkOrderStatusSchema),
  expressAsyncHandler(workOrdersController.updateWorkOrderStatus)
);

// Plan work order (assign production line, operators and change status to planned)
router.post(
  "/:id/plan",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_UPDATE),
  expressAsyncHandler(workOrdersController.planWorkOrder)
);

// Complete work order with material consumption
router.post(
  "/:id/complete-with-consumption",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_UPDATE),
  expressAsyncHandler(workOrdersController.recordMaterialConsumptionForCompletion)
);

// Delete work order
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_DELETE),
  expressAsyncHandler(workOrdersController.deleteWorkOrder)
);

// =====================================================
// Production Line Management Routes
// =====================================================

// Get all production lines
router.get(
  "/production-lines",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_READ),
  expressAsyncHandler(workOrdersController.getProductionLines)
);


// =====================================================
// Bulk Operations Routes
// =====================================================

// Bulk update work order status
router.post(
  "/bulk/status",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_UPDATE),
  validateRequest(bulkUpdateWorkOrderStatusSchema),
  expressAsyncHandler(workOrdersController.bulkUpdateWorkOrderStatus)
);


// Get work order by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
  expressAsyncHandler(workOrdersController.getWorkOrderById)
);


export default router;
