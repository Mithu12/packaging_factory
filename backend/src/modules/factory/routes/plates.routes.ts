import express from "express";
import expressAsyncHandler from "express-async-handler";
import Joi from "joi";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import { platesController } from "../controllers/plates.controller";

const router = express.Router();
router.use(authenticate);

const plateStatuses = ["active", "broken", "retired"] as const;

const plateQuerySchema = Joi.object({
  status: Joi.string().valid(...plateStatuses).optional(),
  plate_type_id: Joi.number().integer().positive().optional(),
  factory_id: Joi.number().integer().positive().optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(255).optional(),
  sort_by: Joi.string().valid("plate_code", "total_uses", "status", "created_at").optional(),
  sort_order: Joi.string().valid("asc", "desc").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const createPlateTypeSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  code: Joi.string().max(100).allow("", null).optional(),
  description: Joi.string().max(2000).allow("", null).optional(),
  expected_lifespan_uses: Joi.number().integer().positive().allow(null).optional(),
});

const updatePlateTypeSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  code: Joi.string().max(100).allow("", null).optional(),
  description: Joi.string().max(2000).allow("", null).optional(),
  expected_lifespan_uses: Joi.number().integer().positive().allow(null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const createPlateSchema = Joi.object({
  plate_type_id: Joi.number().integer().positive().required(),
  plate_code: Joi.string().max(100).allow("", null).optional(),
  expected_lifespan_uses: Joi.number().integer().positive().allow(null).optional(),
  factory_id: Joi.number().integer().positive().allow(null).optional(),
  notes: Joi.string().max(2000).allow("", null).optional(),
});

const updatePlateSchema = Joi.object({
  plate_type_id: Joi.number().integer().positive().optional(),
  plate_code: Joi.string().max(100).allow("", null).optional(),
  status: Joi.string().valid(...plateStatuses).optional(),
  broken_reason: Joi.string().max(2000).allow("", null).optional(),
  expected_lifespan_uses: Joi.number().integer().positive().allow(null).optional(),
  factory_id: Joi.number().integer().positive().allow(null).optional(),
  notes: Joi.string().max(2000).allow("", null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const validateRequest =
  (schema: Joi.ObjectSchema) =>
  (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const err: any = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }
    next();
  };

const validateQuery =
  (schema: Joi.ObjectSchema) =>
  (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const { error } = schema.validate(req.query);
    if (error) {
      const err: any = new Error(error.details[0].message);
      err.statusCode = 400;
      throw err;
    }
    next();
  };

// =======================================
// Plate types & lifespan stats
// NOTE: these static paths must precede "/:id" so they aren't captured by it.
// =======================================
router.get(
  "/types",
  requirePermission(PERMISSIONS.FACTORY_PLATE_TYPES_READ),
  expressAsyncHandler(platesController.listPlateTypes)
);

router.post(
  "/types",
  requirePermission(PERMISSIONS.FACTORY_PLATE_TYPES_CREATE),
  validateRequest(createPlateTypeSchema),
  expressAsyncHandler(platesController.createPlateType)
);

router.put(
  "/types/:typeId",
  requirePermission(PERMISSIONS.FACTORY_PLATE_TYPES_UPDATE),
  validateRequest(updatePlateTypeSchema),
  expressAsyncHandler(platesController.updatePlateType)
);

router.delete(
  "/types/:typeId",
  requirePermission(PERMISSIONS.FACTORY_PLATE_TYPES_DELETE),
  expressAsyncHandler(platesController.deletePlateType)
);

router.get(
  "/stats",
  requirePermission(PERMISSIONS.FACTORY_PLATES_READ),
  expressAsyncHandler(platesController.getLifespanStats)
);

// =======================================
// Plate CRUD
// =======================================
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_PLATES_READ),
  validateQuery(plateQuerySchema),
  expressAsyncHandler(platesController.listPlates)
);

router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_PLATES_CREATE),
  validateRequest(createPlateSchema),
  expressAsyncHandler(platesController.createPlate)
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_PLATES_READ),
  expressAsyncHandler(platesController.getPlate)
);

router.get(
  "/:id/usage",
  requirePermission(PERMISSIONS.FACTORY_PLATES_READ),
  expressAsyncHandler(platesController.getPlateUsageHistory)
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_PLATES_UPDATE),
  validateRequest(updatePlateSchema),
  expressAsyncHandler(platesController.updatePlate)
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_PLATES_DELETE),
  expressAsyncHandler(platesController.deletePlate)
);

export default router;
