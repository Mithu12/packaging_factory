import express from "express";
import expressAsyncHandler from "express-async-handler";
import {
  validateCreateBrand,
  validateUpdateBrand,
} from "@/validation/brandValidation";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  requireSystemAdmin,
  PERMISSIONS,
} from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import BrandsController from "@/modules/inventory/controllers/brands.controller";

const router = express.Router();

// Get all brands - Requires brands read permission
router.get(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.BRANDS_READ),
  expressAsyncHandler(BrandsController.getAllBrands)
);

// Get brand by ID - Requires brands read permission
router.get(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.BRANDS_READ),
  expressAsyncHandler(BrandsController.getBrandById)
);

// Create new brand - Requires brands create permission
router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.BRANDS_CREATE),
  validateRequest(validateCreateBrand),
  expressAsyncHandler(BrandsController.createBrand)
);

// Update brand - Requires brands update permission
router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.BRANDS_UPDATE),
  validateRequest(validateUpdateBrand),
  expressAsyncHandler(BrandsController.updateBrand)
);

// Delete brand (soft delete) - Requires brands delete permission
router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.BRANDS_DELETE),
  expressAsyncHandler(BrandsController.deleteBrand)
);

// Get brands by status - Requires brands read permission
router.get(
  "/status/:status",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.BRANDS_READ),
  expressAsyncHandler(BrandsController.getBrandsByStatus)
);

export default router;
