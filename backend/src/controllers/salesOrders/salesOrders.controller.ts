import { NextFunction, Request, Response } from "express";
import { GetSalesOrderInfoMediator } from "@/mediators/salesOrders/GetSalesOrderInfo.mediator";
import { AddSalesOrderMediator } from "@/mediators/salesOrders/AddSalesOrder.mediator";
import { UpdateSalesOrderInfoMediator } from "@/mediators/salesOrders/UpdateSalesOrderInfo.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { AuthMediator } from "@/mediators/auth/AuthMediator";

class SalesOrdersController {
    async getAllSalesOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales-orders';
        try {
            MyLogger.info(action, { query: req.query });
            const result = await GetSalesOrderInfoMediator.getAllSalesOrders(req.query);
            MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getPOSStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales-orders/stats';
        try {
            MyLogger.info(action);
            const stats = await GetSalesOrderInfoMediator.getPOSStats();
            MyLogger.success(action, { stats });
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getSalesOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales-orders/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { salesOrderId: id });
            const salesOrder = await GetSalesOrderInfoMediator.getSalesOrderById(id);
            MyLogger.success(action, { salesOrderId: id });
            serializeSuccessResponse(res, salesOrder, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { salesOrderId: req.params.id });
            throw error;
        }
    }

    async createSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/sales-orders';
        try {
            MyLogger.info(action, { customerId: req.body.customer_id });

            // Inject distribution_center_id from user if not provided
            if (!req.body.distribution_center_id && (req as any).user) {
                const userId = (req as any).user.user_id;
                const user = await AuthMediator.getUserProfile(userId);
                if (user.distribution_center_id) {
                    req.body.distribution_center_id = user.distribution_center_id;
                    MyLogger.info(action, { message: 'Injected distribution_center_id from user', distributionCenterId: user.distribution_center_id });
                }
            }

            const salesOrder = await AddSalesOrderMediator.createSalesOrder(req.body);
            MyLogger.success(action, { salesOrderId: salesOrder.id });
            serializeSuccessResponse(res, salesOrder, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.body.customer_id });
            throw error;
        }
    }

    // Additional status update methods can be added when mediator methods are available
}

export default new SalesOrdersController();
