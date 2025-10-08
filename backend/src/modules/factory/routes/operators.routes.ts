import express from "express";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import Joi from "joi";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  PERMISSIONS,
} from "@/middleware/permission";
import { operatorController } from "../controllers/operators.controller";

const router = express.Router();
router.use(authenticate);

// Validation schemas
const operatorQuerySchema = Joi.object({
  factory_id: Joi.number().integer().positive().optional(),
  skill_level: Joi.string().valid('beginner', 'intermediate', 'expert', 'master').optional(),
  department: Joi.string().max(100).optional(),
  availability_status: Joi.string().valid('available', 'busy', 'off_duty', 'on_leave').optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(255).optional(),
  sort_by: Joi.string().valid('employee_id', 'skill_level', 'department', 'availability_status', 'created_at').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const createOperatorSchema = Joi.object({
  employee_id: Joi.string().min(1).max(50).required(),
  skill_level: Joi.string().valid('beginner', 'intermediate', 'expert', 'master').required(),
  department: Joi.string().max(100).optional(),
  hourly_rate: Joi.number().min(0).precision(2).optional(),
});

const updateOperatorSchema = Joi.object({
  employee_id: Joi.string().min(1).max(50).optional(),
  skill_level: Joi.string().valid('beginner', 'intermediate', 'expert', 'master').optional(),
  department: Joi.string().max(100).optional(),
  availability_status: Joi.string().valid('available', 'busy', 'off_duty', 'on_leave').optional(),
  hourly_rate: Joi.number().min(0).precision(2).optional(),
  is_active: Joi.boolean().optional(),
});

const updateAvailabilitySchema = Joi.object({
  availability_status: Joi.string().valid('available', 'busy', 'off_duty', 'on_leave').required(),
  current_work_order_id: Joi.string().optional(),
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
// Operator CRUD Routes
// =====================================================

// Get all operators with filtering and pagination
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_READ),
  validateQuery(operatorQuerySchema),
  expressAsyncHandler(operatorController.getOperators)
);

// Get operator statistics
router.get(
  "/stats",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_READ),
  expressAsyncHandler(operatorController.getOperatorStats)
);

// Get operator by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_READ),
  expressAsyncHandler(operatorController.getOperatorById)
);

// Get operator by employee ID
router.get(
  "/employee/:employee_id",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_READ),
  expressAsyncHandler(operatorController.getOperatorByEmployeeId)
);

// Create new operator
router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_CREATE),
  validateRequest(createOperatorSchema),
  expressAsyncHandler(operatorController.createOperator)
);

// Update operator
router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_UPDATE),
  validateRequest(updateOperatorSchema),
  expressAsyncHandler(operatorController.updateOperator)
);

// Update operator availability
router.patch(
  "/:id/availability",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_UPDATE),
  validateRequest(updateAvailabilitySchema),
  expressAsyncHandler(operatorController.updateOperatorAvailability)
);

// Delete operator
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_OPERATORS_DELETE),
  expressAsyncHandler(operatorController.deleteOperator)
);

export default router;
