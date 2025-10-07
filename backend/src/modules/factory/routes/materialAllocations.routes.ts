import express from 'express';
import {
  createMaterialAllocationSchema,
  updateMaterialAllocationSchema,
  materialAllocationQuerySchema,
  allocationIdSchema,
  returnAllocationSchema
} from '../validation/materialAllocationValidation';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from 'express-async-handler';
import { MyLogger } from '@/utils/new-logger';
import { materialAllocationsController } from '../controllers/materialAllocations.controller';
import { auditMiddleware } from '@/middleware/audit';

const router = express.Router();
router.use(authenticate);
router.use(auditMiddleware);

const validateRequest = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = 'Validate Request Body';
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.body);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details
        });
        res.status(400);
        throw new Error('Validation error');
      }
      req.body = value;
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method
      });
      next(error);
    }
  };
};

const validateQuery = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = 'Validate Query Parameters';
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.query);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details
        });
        res.status(400);
        throw new Error('Query validation error');
      }
      req.query = value;
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method
      });
      next(error);
    }
  };
};

// =====================================================
// Material Allocation Routes
// =====================================================

// Get all material allocations with filtering and pagination
router.get(
  '/',
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_ALLOCATIONS_READ),
  validateQuery(materialAllocationQuerySchema),
  expressAsyncHandler(materialAllocationsController.getAllAllocations)
);

// Get allocation statistics
router.get(
  '/stats',
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_ALLOCATIONS_READ),
  expressAsyncHandler(materialAllocationsController.getAllocationStats)
);

// Create new material allocation
router.post(
  '/',
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_ALLOCATIONS_CREATE),
  validateRequest(createMaterialAllocationSchema),
  expressAsyncHandler(materialAllocationsController.createAllocation)
);

// Update material allocation
router.put(
  '/:id',
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_ALLOCATIONS_UPDATE),
  validateRequest(updateMaterialAllocationSchema),
  expressAsyncHandler(materialAllocationsController.updateAllocation)
);

// Return material allocation
router.post(
  '/:id/return',
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_ALLOCATIONS_UPDATE),
  validateRequest(returnAllocationSchema),
  expressAsyncHandler(materialAllocationsController.returnAllocation)
);

// Get material allocation by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.FACTORY_MATERIAL_ALLOCATIONS_READ),
  expressAsyncHandler(materialAllocationsController.getAllocationById)
);

export default router;

