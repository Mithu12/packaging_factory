import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FactoryDashboardMediator } from '../mediators/dashboard/FactoryDashboardMediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';

/**
 * @desc    Get factory dashboard statistics
 * @route   GET /api/factory/dashboard/stats
 * @access  Private (FACTORY_DASHBOARD_READ)
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.user_id;

  const isSuperAdmin = await RoleMediator.isSystemAdmin(userId);
  const stats = await FactoryDashboardMediator.getDashboardStats(userId, isSuperAdmin);

  serializeSuccessResponse(res, stats, 'Dashboard statistics retrieved successfully');
});

