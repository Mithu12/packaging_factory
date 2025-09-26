import express from "express";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import Joi from "joi";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import InventoryController from "../controllers/inventory.controller";

const router = express.Router();

const inventoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(255).optional(),
  category_id: Joi.number().integer().min(1).optional(),
  subcategory_id: Joi.number().integer().min(1).optional(),
  supplier_id: Joi.number().integer().min(1).optional(),
  status: Joi.string()
    .valid("active", "inactive", "discontinued", "out_of_stock")
    .optional(),
  stock_status: Joi.string()
    .valid("low", "critical", "optimal", "overstock", "out_of_stock")
    .optional(),
  sortBy: Joi.string()
    .valid(
      "product_name",
      "product_sku",
      "category_name",
      "supplier_name",
      "current_stock",
      "total_value",
      "last_movement_date"
    )
    .optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

const stockMovementQuerySchema = Joi.object({
  product_id: Joi.number().integer().min(1).optional(),
  movement_type: Joi.string()
    .valid("receipt", "issue", "adjustment", "transfer")
    .optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string()
    .valid("created_at", "product_name", "movement_type", "quantity")
    .optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

const validateQuery = (schema: Joi.ObjectSchema) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
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
            message: "Validation error",
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

router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_TRACK),
  validateQuery(inventoryQuerySchema),
  expressAsyncHandler(InventoryController.getInventoryItems)
);

router.get(
  "/stats",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_TRACK),
  expressAsyncHandler(InventoryController.getInventoryStats)
);

router.get(
  "/movements",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_TRACK),
  validateQuery(stockMovementQuerySchema),
  expressAsyncHandler(InventoryController.getStockMovements)
);

router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_TRACK),
  expressAsyncHandler(InventoryController.getInventoryItemById)
);

export default router;
