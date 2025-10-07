import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { validateRequest, validateQuery, validateParams } from '@/middleware/validation';
import { auditMiddleware } from '@/middleware/audit';
import {
  approveWastageSchema,
  wastageQuerySchema,
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

