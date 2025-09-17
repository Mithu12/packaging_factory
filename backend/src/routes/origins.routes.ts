import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { OriginMediator } from '@/mediators/origins/OriginMediator';
import { validateCreateOrigin, validateUpdateOrigin } from '@/validation/originValidation';
import { validateRequest } from '@/middleware/validation';
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';

const router = express.Router();

// Get all origins
router.get('/',
  authenticate,
  employeeAndAbove, // Employees and above can view origins
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/origins';
    try {
      MyLogger.info(action);
      const origins = await OriginMediator.getAllOrigins();
      MyLogger.success(action, { count: origins.length });
      serializeSuccessResponse(res, origins, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  })
);

// Get origin by ID
router.get('/:id',
  authenticate,
  employeeAndAbove, // Employees and above can view origin details
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/origins/:id';
    try {
      const originId = parseInt(req.params.id);
      if (isNaN(originId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid origin ID'
        });
        return;
      }
      
      MyLogger.info(action, { origin_id: originId });
      const origin = await OriginMediator.getOriginById(originId);
      MyLogger.success(action, { origin_id: originId, name: origin.name });
      serializeSuccessResponse(res, origin, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error, { origin_id: req.params.id });
      throw error;
    }
  })
);

// Create new origin
router.post('/',
  authenticate,
  managerAndAbove,
  validateRequest(validateCreateOrigin),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/origins';
    try {
      MyLogger.info(action, { name: req.body.name });
      const origin = await OriginMediator.createOrigin(req.body);
      MyLogger.success(action, { origin_id: origin.id, name: origin.name });
      res.status(201).json({
        success: true,
        message: 'Origin created successfully',
        data: origin
      });
    } catch (error: any) {
      MyLogger.error(action, error, { name: req.body.name });
      throw error;
    }
  })
);

// Update origin
router.put('/:id',
  authenticate,
  managerAndAbove,
  validateRequest(validateUpdateOrigin),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/origins/:id';
    try {
      const originId = parseInt(req.params.id);
      if (isNaN(originId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid origin ID'
        });
        return;
      }
      
      MyLogger.info(action, { origin_id: originId, updateFields: Object.keys(req.body) });
      const origin = await OriginMediator.updateOrigin(originId, req.body);
      MyLogger.success(action, { origin_id: originId, name: origin.name });
      serializeSuccessResponse(res, origin, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error, { origin_id: req.params.id, updateFields: Object.keys(req.body) });
      throw error;
    }
  })
);

// Delete origin (soft delete)
router.delete('/:id',
  authenticate,
  adminOnly, // Only admins can delete origins
  expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/origins/:id';
    try {
      const originId = parseInt(req.params.id);
      if (isNaN(originId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid origin ID'
        });
        return;
      }
      
      MyLogger.info(action, { origin_id: originId });
      await OriginMediator.deleteOrigin(originId);
      MyLogger.success(action, { origin_id: originId, message: 'Origin deleted successfully' });
      serializeSuccessResponse(res, { message: 'Origin deleted successfully' }, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error, { origin_id: req.params.id });
      throw error;
    }
  })
);

// Get origins by status
router.get('/status/:status',
  authenticate,
  employeeAndAbove, // Employees and above can view origins by status
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/origins/status/:status';
    try {
      const status = req.params.status as 'active' | 'inactive';
      if (!['active', 'inactive'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be active or inactive'
        });
        return;
      }
      
      MyLogger.info(action, { status });
      const origins = await OriginMediator.getOriginsByStatus(status);
      MyLogger.success(action, { count: origins.length, status });
      serializeSuccessResponse(res, origins, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error, { status: req.params.status });
      throw error;
    }
  })
);

// Get origin statistics
router.get('/stats',
  authenticate,
  managerAndAbove, // Only managers and above can view origin statistics
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/origins/stats';
    try {
      MyLogger.info(action);
      const stats = await OriginMediator.getOriginStats();
      MyLogger.success(action, { stats });
      serializeSuccessResponse(res, stats, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  })
);

export default router;
