import { NextFunction, Request, Response } from "express";
import { GetSalesOrderInfoMediator } from "@/mediators/salesOrders/GetSalesOrderInfo.mediator";
import { AddSalesOrderMediator } from "@/mediators/salesOrders/AddSalesOrder.mediator";
import { UpdateSalesOrderInfoMediator } from "@/mediators/salesOrders/UpdateSalesOrderInfo.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

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
            const salesOrder = await AddSalesOrderMediator.createSalesOrder(req.body);
            MyLogger.success(action, { salesOrderId: salesOrder.id });
            serializeSuccessResponse(res, salesOrder, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.body.customer_id });
            throw error;
        }
    }

    async updateSalesOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PATCH /api/sales-orders/:id/status';
        try {
            const id = parseInt(req.params.id);
            const { status } = req.body;
            MyLogger.info(action, { salesOrderId: id, newStatus: status });
            const salesOrder = await UpdateSalesOrderInfoMediator.updateSalesOrderStatus(id, status);
            MyLogger.success(action, { salesOrderId: id, newStatus: status });
            serializeSuccessResponse(res, salesOrder, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { salesOrderId: req.params.id });
            throw error;
        }
    }

    async finalizeSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/sales-orders/:id/finalize';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { salesOrderId: id });
            const salesOrder = await UpdateSalesOrderInfoMediator.finalizeSalesOrder(id);
            MyLogger.success(action, { salesOrderId: id });
            serializeSuccessResponse(res, salesOrder, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { salesOrderId: req.params.id });
            throw error;
        }
    }
}

export default new SalesOrdersController();
