import express from "express";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import Joi from "joi";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  PERMISSIONS,
} from "@/middleware/permission";
import { productionLineController } from "../controllers/productionLines.controller";

const router = express.Router();
router.use(authenticate);

// Validation schemas
const productionLineQuerySchema = Joi.object({
  factory_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('available', 'busy', 'maintenance', 'offline').optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(255).optional(),
  sort_by: Joi.string().valid('name', 'code', 'capacity', 'current_load', 'status', 'created_at').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const createProductionLineSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  code: Joi.string().min(1).max(50).required(),
  description: Joi.string().max(1000).optional(),
  capacity: Joi.number().integer().min(1).required(),
  location: Joi.string().max(255).optional(),
});

const updateProductionLineSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  code: Joi.string().min(1).max(50).optional(),
  description: Joi.string().max(1000).optional(),
  capacity: Joi.number().integer().min(1).optional(),
  location: Joi.string().max(255).optional(),
  status: Joi.string().valid('available', 'busy', 'maintenance', 'offline').optional(),
  is_active: Joi.boolean().optional(),
});

const updateLoadSchema = Joi.object({
  load_change: Joi.number().integer().required(),
});

const validateRequest = (schema: Joi.ObjectSchema) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      (err as any).statusCode = 400;
      throw err;
    }
    next();
  };

const validateQuery = (schema: Joi.ObjectSchema) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { error } = schema.validate(req.query);
    if (error) {
      const err = new Error(error.details[0].message);
      (err as any).statusCode = 400;
      throw err;
    }
    next();
  };

// =====================================================
// Production Line CRUD Routes
// =====================================================

// Get all production lines with filtering and pagination
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_READ),
  validateQuery(productionLineQuerySchema),
  expressAsyncHandler(productionLineController.getProductionLines)
);

// Get production line statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_READ),
  expressAsyncHandler(productionLineController.getProductionLineStats)
);

// Get production line by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_READ),
  expressAsyncHandler(productionLineController.getProductionLineById)
);

// Create new production line
router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_CREATE),
  validateRequest(createProductionLineSchema),
  expressAsyncHandler(productionLineController.createProductionLine)
);

// Update production line
router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_UPDATE),
  validateRequest(updateProductionLineSchema),
  expressAsyncHandler(productionLineController.updateProductionLine)
);

// Update production line load
router.patch(
  "/:id/load",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_UPDATE),
  validateRequest(updateLoadSchema),
  expressAsyncHandler(productionLineController.updateProductionLineLoad)
);

// Delete production line
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_DELETE),
  expressAsyncHandler(productionLineController.deleteProductionLine)
);

export default router;
