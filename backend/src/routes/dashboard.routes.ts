import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from 'express-async-handler';
import DashboardController from '@/controllers/dashboard.controller';

const router = express.Router();

// GET /api/dashboard/stats - Get dashboard statistics
router.get(
  '/stats',
  authenticate,
  // Dashboard stats accessible to users with factory or system dashboard permission
  requirePermission(PERMISSIONS.FACTORY_DASHBOARD_READ),
  expressAsyncHandler(DashboardController.getDashboardStats)
);

export default router;
