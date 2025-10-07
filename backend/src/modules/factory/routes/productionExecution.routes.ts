import express from 'express';
import { authenticate } from '@/middleware/authenticate';
import { requirePermission } from '@/middleware/permission';
import { validateRequest, validateQuery, validateParams } from '@/middleware/validateRequest';
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
  requirePermission('FACTORY_PRODUCTION_RUNS_READ'),
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
  requirePermission('FACTORY_PRODUCTION_RUNS_READ'),
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
  requirePermission('FACTORY_PRODUCTION_RUNS_READ'),
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
  requirePermission('FACTORY_PRODUCTION_RUNS_CREATE'),
  validateRequest(createProductionRunSchema),
  auditMiddleware({
    action: 'CREATE',
    resource: 'PRODUCTION_RUN',
    getDetails: (req) => ({
      work_order_id: req.body.work_order_id,
      target_quantity: req.body.target_quantity,
    }),
  }),
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
  requirePermission('FACTORY_PRODUCTION_RUNS_UPDATE'),
  validateParams(productionRunParamsSchema),
  auditMiddleware({
    action: 'START',
    resource: 'PRODUCTION_RUN',
    getDetails: (req) => ({
      production_run_id: req.params.id,
    }),
  }),
  productionExecutionController.startProductionRun
);

/**
 * @route   POST /api/factory/production-runs/:id/pause
 * @desc    Pause production run
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
router.post(
  '/:id/pause',
  authenticate,
  requirePermission('FACTORY_PRODUCTION_RUNS_UPDATE'),
  validateParams(productionRunParamsSchema),
  validateRequest(pauseProductionRunSchema),
  auditMiddleware({
    action: 'PAUSE',
    resource: 'PRODUCTION_RUN',
    getDetails: (req) => ({
      production_run_id: req.params.id,
    }),
  }),
  productionExecutionController.pauseProductionRun
);

/**
 * @route   POST /api/factory/production-runs/:id/complete
 * @desc    Complete production run
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
router.post(
  '/:id/complete',
  authenticate,
  requirePermission('FACTORY_PRODUCTION_RUNS_UPDATE'),
  validateParams(productionRunParamsSchema),
  validateRequest(completeProductionRunSchema),
  auditMiddleware({
    action: 'COMPLETE',
    resource: 'PRODUCTION_RUN',
    getDetails: (req) => ({
      production_run_id: req.params.id,
      produced_quantity: req.body.produced_quantity,
    }),
  }),
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
  requirePermission('FACTORY_PRODUCTION_RUNS_UPDATE'),
  validateRequest(recordDowntimeSchema),
  auditMiddleware({
    action: 'RECORD_DOWNTIME',
    resource: 'PRODUCTION_RUN',
    getDetails: (req) => ({
      production_run_id: req.body.production_run_id,
      downtime_reason: req.body.downtime_reason,
    }),
  }),
  productionExecutionController.recordDowntime
);

export default router;

