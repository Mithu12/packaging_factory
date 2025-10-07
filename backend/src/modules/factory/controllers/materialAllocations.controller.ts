import { Request, Response, NextFunction } from 'express';
import { AddMaterialAllocationMediator } from '../mediators/materialAllocations/AddMaterialAllocation.mediator';
import { GetMaterialAllocationInfoMediator } from '../mediators/materialAllocations/GetMaterialAllocationInfo.mediator';
import { UpdateMaterialAllocationMediator } from '../mediators/materialAllocations/UpdateMaterialAllocation.mediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';

class MaterialAllocationsController {
  // Get all material allocations with pagination and filtering
  async getAllAllocations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = 'GET /api/factory/material-allocations';
      MyLogger.info(action, { query: req.query });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await GetMaterialAllocationInfoMediator.getAllocations(
        req.query,
        userId
      );

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit
      });

      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  // Get material allocation by ID
  async getAllocationById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = 'GET /api/factory/material-allocations/:id';
      const { id } = req.params;
      MyLogger.info(action, { allocationId: id });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const allocation = await GetMaterialAllocationInfoMediator.getAllocationById(
        id,
        userId
      );

      MyLogger.success(action, { allocationId: id });
      serializeSuccessResponse(res, allocation, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  // Create new material allocation
  async createAllocation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = 'POST /api/factory/material-allocations';
      MyLogger.info(action, { body: req.body });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const allocation = await AddMaterialAllocationMediator.createAllocation(
        req.body,
        userId
      );

      MyLogger.success(action, { allocationId: allocation.id });
      serializeSuccessResponse(res, allocation, 'SUCCESS', 201);
    } catch (error) {
      next(error);
    }
  }

  // Update material allocation
  async updateAllocation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = 'PUT /api/factory/material-allocations/:id';
      const { id } = req.params;
      MyLogger.info(action, { allocationId: id, body: req.body });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const allocation = await UpdateMaterialAllocationMediator.updateAllocation(
        id,
        req.body,
        userId
      );

      MyLogger.success(action, { allocationId: id });
      serializeSuccessResponse(res, allocation, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  // Return material allocation
  async returnAllocation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = 'POST /api/factory/material-allocations/:id/return';
      const { id } = req.params;
      MyLogger.info(action, { allocationId: id, body: req.body });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await UpdateMaterialAllocationMediator.returnAllocation(
        id,
        userId,
        req.body.notes
      );

      MyLogger.success(action, { allocationId: id });
      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  // Get allocation statistics
  async getAllocationStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = 'GET /api/factory/material-allocations/stats';
      MyLogger.info(action);

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const stats = await GetMaterialAllocationInfoMediator.getAllocationStats(userId);

      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }
}

export const materialAllocationsController = new MaterialAllocationsController();

