import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { validateRequest, validateQuery, validateParams } from '@/middleware/validation';
import { auditMiddleware } from '@/middleware/audit';
import {
  approveWastageSchema,
  createWastageSchema,
  createWastageSaleSchema,
  wastageQuerySchema,
  wastageSaleQuerySchema,
  wastageParamsSchema,
} from '@/validation/wastage.validation';
import * as wastageController from '../controllers/wastage.controller';

const router = express.Router();

/**
 * @route   GET /api/factory/wastage/stats
 * @desc    Get wastage stats
 * @access  Private (FACTORY_WASTAGE_READ)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_READ),
  wastageController.getWastageStats
);

/**
 * @route   GET /api/factory/wastage
 * @desc    Get all wastage records
 * @access  Private (FACTORY_WASTAGE_READ)
 */
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_READ),
  validateQuery(wastageQuerySchema),
  wastageController.getWastageRecords
);

/**
 * @route   POST /api/factory/wastage
 * @desc    Record a standalone wastage (storage damage, QC rejects, etc.)
 * @access  Private (FACTORY_WASTAGE_CREATE)
 */
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_CREATE),
  validateRequest(createWastageSchema),
  auditMiddleware,
  wastageController.createWastage
);

/**
 * Sale routes must be registered before '/:id' so 'sales' is not captured
 * as an id parameter.
 *
 * @route   GET /api/factory/wastage/sales
 * @desc    List wastage sales with their sold items
 * @access  Private (FACTORY_WASTAGE_READ)
 */
router.get(
  '/sales',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_READ),
  validateQuery(wastageSaleQuerySchema),
  wastageController.getWastageSales
);

/**
 * @route   POST /api/factory/wastage/sales
 * @desc    Sell approved wastage records to a buyer (scrap sale)
 * @access  Private (FACTORY_WASTAGE_SELL)
 */
router.post(
  '/sales',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_SELL),
  validateRequest(createWastageSaleSchema),
  auditMiddleware,
  wastageController.createWastageSale
);

/**
 * @route   GET /api/factory/wastage/:id
 * @desc    Get wastage by ID
 * @access  Private (FACTORY_WASTAGE_READ)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_READ),
  validateParams(wastageParamsSchema),
  wastageController.getWastageById
);

/**
 * @route   POST /api/factory/wastage/:id/approve
 * @desc    Approve wastage record
 * @access  Private (FACTORY_WASTAGE_APPROVE)
 */
router.post(
  '/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_APPROVE),
  validateParams(wastageParamsSchema),
  validateRequest(approveWastageSchema),
  auditMiddleware,
  wastageController.approveWastage
);

/**
 * @route   POST /api/factory/wastage/:id/reject
 * @desc    Reject wastage record
 * @access  Private (FACTORY_WASTAGE_APPROVE)
 */
router.post(
  '/:id/reject',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_WASTAGE_APPROVE),
  validateParams(wastageParamsSchema),
  validateRequest(approveWastageSchema),
  auditMiddleware,
  wastageController.rejectWastage
);

export default router;

