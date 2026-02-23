import { Router } from "express";
import EcomController from "./controllers/EcomController";
import { authenticate } from "@/middleware/auth";
import { checkPermission, PERMISSIONS } from "@/middleware/permission";
import { uploadSliderImage } from "./upload";

const router = Router();

/**
 * @route   GET /api/ecom/sliders/public
 * @desc    Get active sliders for the ecom site (Public)
 * @access  Public
 */
router.get("/sliders/public", EcomController.getPublicSliders);

/**
 * @route   GET /api/ecom/sliders
 * @desc    Get all sliders (Admin)
 * @access  Private (Ecommerce Sliders Read)
 */
router.get(
  "/sliders",
  authenticate,
  checkPermission({ module: "Ecommerce", action: "read", resource: "sliders" }),
  EcomController.getAllSliders
);

/**
 * @route   GET /api/ecom/sliders/:id
 * @desc    Get slider by ID
 * @access  Private (Ecommerce Sliders Read)
 */
router.get(
  "/sliders/:id",
  authenticate,
  checkPermission({ module: "Ecommerce", action: "read", resource: "sliders" }),
  EcomController.getSliderById
);

/**
 * @route   POST /api/ecom/sliders
 * @desc    Create a new slider
 * @access  Private (Ecommerce Sliders Create)
 */
router.post(
  "/sliders",
  authenticate,
  checkPermission({ module: "Ecommerce", action: "create", resource: "sliders" }),
  EcomController.createSlider
);

/**
 * @route   PATCH /api/ecom/sliders/:id
 * @desc    Update a slider
 * @access  Private (Ecommerce Sliders Update)
 */
router.patch(
  "/sliders/:id",
  authenticate,
  checkPermission({ module: "Ecommerce", action: "update", resource: "sliders" }),
  EcomController.updateSlider
);

/**
 * @route   DELETE /api/ecom/sliders/:id
 * @desc    Delete a slider
 * @access  Private (Ecommerce Sliders Delete)
 */
router.delete(
  "/sliders/:id",
  authenticate,
  checkPermission({ module: "Ecommerce", action: "delete", resource: "sliders" }),
  EcomController.deleteSlider
);

/**
 * @route   POST /api/ecom/sliders/upload
 * @desc    Upload slider image
 * @access  Private (Ecommerce Sliders Create/Update)
 */
router.post(
  "/sliders/upload",
  authenticate,
  // checkPermission({ module: "Ecommerce", action: "create", resource: "sliders" }), // Allow for both create and update
  uploadSliderImage,
  EcomController.uploadSliderImage
);

export default router;
