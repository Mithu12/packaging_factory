import { Request, Response, NextFunction } from 'express';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { CostAnalysisMediator } from '@/modules/factory/mediators/costAnalysis/CostAnalysisMediator';

export class CostAnalysisController {
  // Get material cost analyses
  static async getMaterialCostAnalyses(req: Request, res: Response, next: NextFunction): Promise<void> {
    let action = 'GET /api/factory/cost-analysis/material-analyses';
    try {
      MyLogger.info(action, { query: req.query, userId: req.user?.user_id });

      const analyses = await CostAnalysisMediator.getMaterialCostAnalyses(req.query as any, req.user!.user_id);

      MyLogger.success(action, { count: analyses.analyses.length, total: analyses.total });
      serializeSuccessResponse(res, analyses, 'SUCCESS');
    } catch (error) {
      MyLogger.error(action, error);
      next(error);
    }
  }

  // Get cost variances
  static async getCostVariances(req: Request, res: Response, next: NextFunction): Promise<void> {
    let action = 'GET /api/factory/cost-analysis/variances';
    try {
      MyLogger.info(action, { query: req.query, userId: req.user?.user_id });

      const variances = await CostAnalysisMediator.getCostVariances(req.query as any, req.user!.user_id);

      MyLogger.success(action, { count: variances.variances.length, total: variances.total });
      serializeSuccessResponse(res, variances, 'SUCCESS');
    } catch (error) {
      MyLogger.error(action, error);
      next(error);
    }
  }

  // Get cost trends
  static async getCostTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    let action = 'GET /api/factory/cost-analysis/trends';
    try {
      MyLogger.info(action, { query: req.query, userId: req.user?.user_id });

      const trends = await CostAnalysisMediator.getCostTrends(req.query as any, req.user!.user_id);

      MyLogger.success(action, { count: trends.length });
      serializeSuccessResponse(res, trends, 'SUCCESS');
    } catch (error) {
      MyLogger.error(action, error);
      next(error);
    }
  }

  // Get cost centers
  static async getCostCenters(req: Request, res: Response, next: NextFunction): Promise<void> {
    let action = 'GET /api/factory/cost-analysis/cost-centers';
    try {
      MyLogger.info(action, { query: req.query, userId: req.user?.user_id });

      const costCenters = await CostAnalysisMediator.getCostCenters(req.query as any, req.user!.user_id);

      MyLogger.success(action, { count: costCenters.cost_centers.length, total: costCenters.total });
      serializeSuccessResponse(res, costCenters, 'SUCCESS');
    } catch (error) {
      MyLogger.error(action, error);
      next(error);
    }
  }
}
