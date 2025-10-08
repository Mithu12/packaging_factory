import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { FactoryDashboardMediator } from '../mediators/dashboard/FactoryDashboardMediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';

/**
 * @desc    Get factory dashboard statistics
 * @route   GET /api/factory/dashboard/stats
 * @access  Private (FACTORY_DASHBOARD_READ)
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.user_id;

  const stats = await FactoryDashboardMediator.getDashboardStats(userId);

  serializeSuccessResponse(res, stats, 'Dashboard statistics retrieved successfully');
});

