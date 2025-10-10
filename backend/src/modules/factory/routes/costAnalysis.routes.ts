import express from 'express';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import { CostAnalysisController } from '@/modules/factory/controllers/costAnalysis.controller';
import {
  costAnalysisQuerySchema,
  costVarianceQuerySchema,
  costTrendQuerySchema,
  costCenterQuerySchema
} from '@/modules/factory/validation/costAnalysisValidation';
import expressAsyncHandler from 'express-async-handler';
import { MyLogger } from '@/utils/new-logger';

const router = express.Router();

// Validation middleware
const validateQuery = (schema: any) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let action = 'Validate Query Parameters'
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method })
      const { error, value } = schema.validate(req.query);
      if (error) {
        MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
        return res.status(400).json({
          error: {
            message: 'Validation error',
            details: error.details.map((detail: any) => detail.message)
          }
        });
      }
      req.query = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method })
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method })
      throw err;
    }
  };
};

// GET /api/factory/cost-analysis/material-analyses - Get material cost analyses
router.get('/material-analyses',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_COST_ANALYSIS_READ),
  validateQuery(costAnalysisQuerySchema),
  expressAsyncHandler(CostAnalysisController.getMaterialCostAnalyses)
);

// GET /api/factory/cost-analysis/variances - Get cost variances
router.get('/variances',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_COST_ANALYSIS_READ),
  validateQuery(costVarianceQuerySchema),
  expressAsyncHandler(CostAnalysisController.getCostVariances)
);

// GET /api/factory/cost-analysis/trends - Get cost trends
router.get('/trends',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_COST_ANALYSIS_READ),
  validateQuery(costTrendQuerySchema),
  expressAsyncHandler(CostAnalysisController.getCostTrends)
);

// GET /api/factory/cost-analysis/cost-centers - Get cost centers
router.get('/cost-centers',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_COST_ANALYSIS_READ),
  validateQuery(costCenterQuerySchema),
  expressAsyncHandler(CostAnalysisController.getCostCenters)
);

export default router;
