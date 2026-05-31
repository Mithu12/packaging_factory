import express from "express";
import {
  createPreProductionEntrySchema,
  preProductionEntryQuerySchema,
} from "../validation/preProductionValidation";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { preProductionEntriesController } from "../controllers/preProductionEntries.controller";
import { auditMiddleware } from "@/middleware/audit";
import { createError } from "@/middleware/errorHandler";

const router = express.Router();
router.use(authenticate);
router.use(auditMiddleware);

const validateRequest = (schema: any, source: "body" | "query" = "body") => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = "Validate Pre-Production Request";
    try {
      const target = source === "query" ? req.query : req.body;
      const { error, value } = schema.validate(target, { abortEarly: false });
      if (error) {
        const detail = error.details.map((d: any) => d.message).join("; ");
        MyLogger.warn(action, { endpoint: req.path, validationErrors: error.details });
        throw createError(`Validation error: ${detail}`, 400);
      }
      if (source === "query") {
        req.query = value;
      } else {
        req.body = value;
      }
      next();
    } catch (error: any) {
      next(error);
    }
  };
};

// POST /api/factory/pre-production-entries — record a manual pre-production entry
router.post(
  "/",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_CREATE),
  validateRequest(createPreProductionEntrySchema),
  expressAsyncHandler(preProductionEntriesController.create)
);

// GET /api/factory/pre-production-entries — list manual pre-production entries
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
  validateRequest(preProductionEntryQuerySchema, "query"),
  expressAsyncHandler(preProductionEntriesController.list)
);

export default router;
