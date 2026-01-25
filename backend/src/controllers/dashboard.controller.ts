import { Request, Response, NextFunction } from 'express';
import { GetDashboardStatsMediator } from '@/mediators/dashboard/GetDashboardStats.mediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';

class DashboardController {
  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = 'GET /api/dashboard/stats';
    try {
      const { startDate, endDate, distribution_center_id } = req.query;
      const filter = {
        ...(startDate && endDate ? {
          startDate: startDate as string,
          endDate: endDate as string
        } : {}),
        ...(distribution_center_id ? {
          distribution_center_id: parseInt(distribution_center_id as string)
        } : {})
      };
      
      const hasFilter = Object.keys(filter).length > 0;
      MyLogger.info(action, { filter: hasFilter ? filter : undefined });
      const stats = await GetDashboardStatsMediator.getDashboardStats(hasFilter ? filter : undefined);
      MyLogger.success(action, { stats });
      serializeSuccessResponse(res, stats, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

export default new DashboardController();
