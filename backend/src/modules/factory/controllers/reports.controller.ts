import { NextFunction, Request, Response } from "express";
import { GetStockVsOrderDemandMediator } from "../mediators/reports/GetStockVsOrderDemand.mediator";
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
}

export default new FactoryReportsController();
