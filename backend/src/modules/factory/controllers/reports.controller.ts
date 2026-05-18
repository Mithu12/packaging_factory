import { NextFunction, Request, Response } from "express";
import { GetStockVsOrderDemandMediator } from "../mediators/reports/GetStockVsOrderDemand.mediator";
import { GetCustomerPaymentRemindersMediator } from "../mediators/reports/GetCustomerPaymentReminders.mediator";
import { FactoryCustomerOrderStatus } from "@/types/factory";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class FactoryReportsController {
    async getStockVsOrderDemand(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/reports/stock-vs-order-demand";
        try {
            const statusesRaw = typeof req.query.statuses === "string" ? req.query.statuses : "";
            const search = typeof req.query.search === "string" ? req.query.search : undefined;

            const statuses = statusesRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean) as FactoryCustomerOrderStatus[];

            MyLogger.info(action, { statuses, search });

            const userId = req.user?.user_id;
            const result = await GetStockVsOrderDemandMediator.getReport({ statuses, search }, userId);

            MyLogger.success(action, {
                rowCount: result.rows.length,
                productsShort: result.summary.products_short,
            });
            serializeSuccessResponse(res, result, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            next(error);
        }
    }

    async getCustomerPaymentReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/reports/customer-payment-reminders";
        try {
            const search = typeof req.query.search === "string" ? req.query.search : undefined;

            MyLogger.info(action, { search });

            const userId = req.user?.user_id;
            const result = await GetCustomerPaymentRemindersMediator.getCustomerSummary(
                { search },
                userId
            );

            MyLogger.success(action, {
                rowCount: result.rows.length,
                totalOutstanding: result.summary.total_outstanding,
            });
            serializeSuccessResponse(res, result, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            next(error);
        }
    }

    async getCustomerPaymentReminderDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/reports/customer-payment-reminders/:id";
        try {
            const customerId = String(req.params.id || "").trim();
            MyLogger.info(action, { customerId });

            const userId = req.user?.user_id;
            const result = await GetCustomerPaymentRemindersMediator.getCustomerDetail(
                customerId,
                userId
            );

            MyLogger.success(action, {
                customerId,
                invoiceCount: result.invoices.length,
            });
            serializeSuccessResponse(res, result, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { params: req.params });
            next(error);
        }
    }
}

export default new FactoryReportsController();
