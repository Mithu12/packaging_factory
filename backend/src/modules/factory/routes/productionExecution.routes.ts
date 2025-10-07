import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { validateRequest, validateQuery, validateParams } from '@/middleware/validation';
import { auditMiddleware } from '@/middleware/audit';
import {
  createProductionRunSchema,
  completeProductionRunSchema,
  pauseProductionRunSchema,
  recordDowntimeSchema,
  productionRunQuerySchema,
  productionRunParamsSchema,
} from '@/validation/productionExecution.validation';
import * as productionExecutionController from '../controllers/productionExecution.controller';

const router = express.Router();

/**
 * @route   GET /api/factory/production-runs/stats
 * @desc    Get production run stats
 * @access  Private (FACTORY_PRODUCTION_RUNS_READ)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_READ),
  productionExecutionController.getProductionRunStats
);

/**
 * @route   GET /api/factory/production-runs
 * @desc    Get all production runs
 * @access  Private (FACTORY_PRODUCTION_RUNS_READ)
 */
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_READ),
  validateQuery(productionRunQuerySchema),
  productionExecutionController.getProductionRuns
);

/**
 * @route   GET /api/factory/production-runs/:id
 * @desc    Get production run by ID
 * @access  Private (FACTORY_PRODUCTION_RUNS_READ)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_READ),
  validateParams(productionRunParamsSchema),
  productionExecutionController.getProductionRunById
);

/**
 * @route   POST /api/factory/production-runs
 * @desc    Create production run
 * @access  Private (FACTORY_PRODUCTION_RUNS_CREATE)
 */
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_CREATE),
  validateRequest(createProductionRunSchema),
  auditMiddleware,
  productionExecutionController.createProductionRun
);

/**
 * @route   POST /api/factory/production-runs/:id/start
 * @desc    Start production run
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
router.post(
  '/:id/start',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_UPDATE),
  validateParams(productionRunParamsSchema),
  auditMiddleware,productionExecutionController.startProductionRun
);

/**
 * @route   POST /api/factory/production-runs/:id/pause
 * @desc    Pause production run
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
router.post(
  '/:id/pause',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_UPDATE),
  validateParams(productionRunParamsSchema),
  validateRequest(pauseProductionRunSchema),
  auditMiddleware,productionExecutionController.pauseProductionRun
);

/**
 * @route   POST /api/factory/production-runs/:id/complete
 * @desc    Complete production run
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
router.post(
  '/:id/complete',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_UPDATE),
  validateParams(productionRunParamsSchema),
  validateRequest(completeProductionRunSchema),
  auditMiddleware,
  productionExecutionController.completeProductionRun
);

/**
 * @route   POST /api/factory/production-runs/downtime
 * @desc    Record downtime
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
router.post(
  '/downtime',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_UPDATE),
  validateRequest(recordDowntimeSchema),
  auditMiddleware,
  productionExecutionController.recordDowntime
);

export default router;

