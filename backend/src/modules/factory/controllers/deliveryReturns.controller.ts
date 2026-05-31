import { Request, Response, NextFunction } from 'express';
import { CreateDeliveryReturnMediator } from '../mediators/deliveries/returns/CreateDeliveryReturn.mediator';
import { GetDeliveryReturnsMediator } from '../mediators/deliveries/returns/GetDeliveryReturns.mediator';
import { UpdateDeliveryReturnMediator } from '../mediators/deliveries/returns/UpdateDeliveryReturn.mediator';
import { MyLogger } from '@/utils/new-logger';
import { serializeSuccessResponse, createError } from '@/utils/responseHelper';

class DeliveryReturnsController {
  /** POST /api/factory/customer-orders/deliveries/:deliveryId/returns */
  async createReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /deliveries/:deliveryId/returns';
      const { deliveryId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);

      MyLogger.info(action, { deliveryId, userId, body: req.body });
      const result = await CreateDeliveryReturnMediator.createReturn(deliveryId, req.body, userId);
      res.status(201);
      serializeSuccessResponse(res, result, 'Delivery return created');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/deliveries/:deliveryId/returns */
  async listReturnsForDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deliveryId } = req.params;
      const returns = await GetDeliveryReturnsMediator.listByDelivery(deliveryId);
      serializeSuccessResponse(res, returns, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/returns */
  async listAllReturns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await GetDeliveryReturnsMediator.listAll({
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        status: (req.query.status as string) || undefined,
        factory_customer_id: (req.query.factory_customer_id as string) || undefined,
      });
      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/returns/:returnId */
  async getReturnById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { returnId } = req.params;
      const ret = await GetDeliveryReturnsMediator.getById(returnId);
      if (!ret) {
        res.status(404);
        serializeSuccessResponse(res, null, 'Delivery return not found');
        return;
      }
      serializeSuccessResponse(res, ret, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/factory/customer-orders/returns/:returnId/approve */
  async approveReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { returnId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);
      const ret = await UpdateDeliveryReturnMediator.approve(returnId, userId);
      serializeSuccessResponse(res, ret, 'Delivery return approved');
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/factory/customer-orders/returns/:returnId/reject */
  async rejectReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { returnId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);
      const ret = await UpdateDeliveryReturnMediator.setStatus(returnId, 'rejected', userId);
      serializeSuccessResponse(res, ret, 'Delivery return rejected');
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/factory/customer-orders/returns/:returnId/cancel */
  async cancelReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { returnId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);
      const ret = await UpdateDeliveryReturnMediator.setStatus(returnId, 'cancelled', userId);
      serializeSuccessResponse(res, ret, 'Delivery return cancelled');
    } catch (error) {
      next(error);
    }
  }
}

export const deliveryReturnsController = new DeliveryReturnsController();
