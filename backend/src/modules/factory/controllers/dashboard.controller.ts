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
  const userId = req.user!.id;

  const stats = await FactoryDashboardMediator.getDashboardStats(userId);

  res.status(200).json(serializeSuccessResponse(stats));
});

