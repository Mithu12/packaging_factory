import express from 'express';
import { authenticate } from '@/middleware/authenticate';
import { requirePermission } from '@/middleware/permission';
import * as dashboardController from '../controllers/dashboard.controller';

const router = express.Router();

/**
 * @route   GET /api/factory/dashboard/stats
 * @desc    Get factory dashboard statistics
 * @access  Private (FACTORY_DASHBOARD_READ)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('FACTORY_DASHBOARD_READ'),
  dashboardController.getDashboardStats
);

export default router;

