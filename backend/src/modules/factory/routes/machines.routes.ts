import express from "express";
import expressAsyncHandler from "express-async-handler";
import Joi from "joi";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import { machineController } from "../controllers/machines.controller";

const router = express.Router();
router.use(authenticate);

const machineStatuses = ["active", "inactive", "under_maintenance"] as const;
const maintenanceTypes = ["preventive", "corrective"] as const;

const machineQuerySchema = Joi.object({
  factory_id: Joi.number().integer().positive().optional(),
  production_line_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid(...machineStatuses).optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(255).optional(),
  sort_by: Joi.string()
    .valid("name", "code", "status", "next_service_date", "created_at")
    .optional(),
  sort_order: Joi.string().valid("asc", "desc").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const createMachineSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  code: Joi.string().min(1).max(50).required(),
  model: Joi.string().max(255).allow("", null).optional(),
  serial_number: Joi.string().max(255).allow("", null).optional(),
  manufacturer: Joi.string().max(255).allow("", null).optional(),
  purchase_date: Joi.date().iso().allow(null).optional(),
  location: Joi.string().max(255).allow("", null).optional(),
  production_line_id: Joi.number().integer().positive().allow(null).optional(),
  status: Joi.string().valid(...machineStatuses).optional(),
  next_service_date: Joi.date().iso().allow(null).optional(),
  notes: Joi.string().max(2000).allow("", null).optional(),
});

const updateMachineSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  code: Joi.string().min(1).max(50).optional(),
  model: Joi.string().max(255).allow("", null).optional(),
  serial_number: Joi.string().max(255).allow("", null).optional(),
  manufacturer: Joi.string().max(255).allow("", null).optional(),
  purchase_date: Joi.date().iso().allow(null).optional(),
  location: Joi.string().max(255).allow("", null).optional(),
  production_line_id: Joi.number().integer().positive().allow(null).optional(),
  status: Joi.string().valid(...machineStatuses).optional(),
  next_service_date: Joi.date().iso().allow(null).optional(),
  notes: Joi.string().max(2000).allow("", null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const createMaintenanceLogSchema = Joi.object({
  maintenance_type: Joi.string().valid(...maintenanceTypes).required(),
  performed_at: Joi.date().iso().optional(),
  technician: Joi.string().max(255).allow("", null).optional(),
  cost: Joi.number().min(0).precision(2).optional(),
  next_service_date: Joi.date().iso().allow(null).optional(),
  notes: Joi.string().max(2000).allow("", null).optional(),
});

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
// Machine CRUD
// =======================================
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_READ),
  validateQuery(machineQuerySchema),
  expressAsyncHandler(machineController.getMachines)
);

router.get(
  "/stats",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_READ),
  expressAsyncHandler(machineController.getMachineStats)
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_READ),
  expressAsyncHandler(machineController.getMachineById)
);

router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_CREATE),
  validateRequest(createMachineSchema),
  expressAsyncHandler(machineController.createMachine)
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_UPDATE),
  validateRequest(updateMachineSchema),
  expressAsyncHandler(machineController.updateMachine)
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_DELETE),
  expressAsyncHandler(machineController.deleteMachine)
);

// =======================================
// Maintenance logs (nested under a machine)
// =======================================
router.get(
  "/:id/maintenance-logs",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_READ),
  expressAsyncHandler(machineController.getMaintenanceLogs)
);

router.post(
  "/:id/maintenance-logs",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_UPDATE),
  validateRequest(createMaintenanceLogSchema),
  expressAsyncHandler(machineController.createMaintenanceLog)
);

router.delete(
  "/:id/maintenance-logs/:logId",
  requirePermission(PERMISSIONS.FACTORY_MACHINES_UPDATE),
  expressAsyncHandler(machineController.deleteMaintenanceLog)
);

export default router;
