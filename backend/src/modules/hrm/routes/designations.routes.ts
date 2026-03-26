import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { auditMiddleware } from "@/middleware/audit";
import DesignationsController from "../controllers/designations.controller";

const router = express.Router();
router.use(authenticate);
router.use(auditMiddleware);

/**
 * @route   GET /api/hrm/designations
 * @desc    Get all designations with pagination and filtering
 * @access  Private
 */
router.get(
  "/",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_READ),
  expressAsyncHandler(DesignationsController.getDesignations)
);

/**
 * @route   GET /api/hrm/designations/hierarchy
 * @desc    Get designation hierarchy (recursive tree structure)
 * @access  Private
 */
router.get(
  "/hierarchy",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_READ),
  expressAsyncHandler(DesignationsController.getDesignationHierarchy)
);

/**
 * @route   GET /api/hrm/designations/export
 * @desc    Export designations (CSV)
 * @access  Private
 */
router.get(
  "/export",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_READ),
  expressAsyncHandler(DesignationsController.exportDesignations)
);

/**
 * @route   GET /api/hrm/designations/:id
 * @desc    Get designation by ID
 * @access  Private
 */
router.get(
  "/:id",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_READ),
  expressAsyncHandler(DesignationsController.getDesignationById)
);

/**
 * @route   POST /api/hrm/designations
 * @desc    Create new designation
 * @access  Private
 * @body    title required; code optional (auto-generated from title when omitted)
 */
router.post(
  "/",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_CREATE),
  expressAsyncHandler(DesignationsController.createDesignation)
);

/**
 * @route   PUT /api/hrm/designations/:id
 * @desc    Update designation
 * @access  Private
 */
router.put(
  "/:id",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_UPDATE),
  expressAsyncHandler(DesignationsController.updateDesignation)
);

/**
 * @route   DELETE /api/hrm/designations/:id
 * @desc    Delete designation (soft delete)
 * @access  Private
 */
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_DELETE),
  expressAsyncHandler(DesignationsController.deleteDesignation)
);

/**
 * @route   PATCH /api/hrm/designations/:id/toggle-status
 * @desc    Toggle active status
 * @access  Private
 */
router.patch(
  "/:id/toggle-status",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_UPDATE),
  expressAsyncHandler(DesignationsController.toggleDesignationStatus)
);

/**
 * @route   PATCH /api/hrm/designations/bulk-update
 * @desc    Bulk activate/deactivate/delete designations
 * @access  Private
 */
router.patch(
  "/bulk-update",
  requirePermission(PERMISSIONS.HR_DESIGNATIONS_UPDATE),
  expressAsyncHandler(DesignationsController.bulkUpdateDesignations)
);

export default router;





