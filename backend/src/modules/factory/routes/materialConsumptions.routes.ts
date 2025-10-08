import express from 'express';
import { authenticate } from '@/middleware/auth';
import { PERMISSIONS, requirePermission } from '@/middleware/permission';
import { validateRequest, validateQuery, validateParams } from '@/middleware/validation';
import { auditMiddleware } from '@/middleware/audit';
import {
  createConsumptionSchema,
  consumptionQuerySchema,
  consumptionParamsSchema,
  bulkConsumptionSchema,
} from '@/validation/materialConsumptions.validation';
import * as materialConsumptionsController from '../controllers/materialConsumptions.controller';

const router = express.Router();

/**
 * @route   GET /api/factory/material-consumptions/stats
 * @desc    Get consumption stats
 * @access  Private (FACTORY_CONSUMPTIONS_READ)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_CONSUMPTIONS_READ),
  materialConsumptionsController.getConsumptionStats
);

/**
 * @route   GET /api/factory/material-consumptions
 * @desc    Get all consumptions
 * @access  Private (FACTORY_CONSUMPTIONS_READ)
 */
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_CONSUMPTIONS_READ),
  validateQuery(consumptionQuerySchema),
  materialConsumptionsController.getConsumptions
);

/**
 * @route   GET /api/factory/material-consumptions/:id
 * @desc    Get consumption by ID
 * @access  Private (FACTORY_MATERIAL_CONSUMPTIONS_READ)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_CONSUMPTIONS_READ),
  validateParams(consumptionParamsSchema),
  materialConsumptionsController.getConsumptionById
);

/**
 * @route   POST /api/factory/material-consumptions
 * @desc    Create material consumption
 * @access  Private (FACTORY_MATERIAL_CONSUMPTIONS_CREATE)
 */
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_CONSUMPTIONS_CREATE),
  validateRequest(createConsumptionSchema),
  auditMiddleware,
  materialConsumptionsController.createConsumption
);

/**
 * @route   POST /api/factory/material-consumptions/bulk
 * @desc    Create bulk material consumptions
 * @access  Private (FACTORY_CONSUMPTIONS_CREATE)
 */
router.post(
  '/bulk',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_CONSUMPTIONS_CREATE),
  validateRequest(bulkConsumptionSchema),
  auditMiddleware,
  materialConsumptionsController.createBulkConsumptions
);

export default router;

