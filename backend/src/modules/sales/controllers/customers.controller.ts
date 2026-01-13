import { NextFunction, Request, Response } from "express";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { CustomerPaymentHistoryMediator } from "../mediators/customers/CustomerPaymentHistory.mediator";

class SalesCustomersController {
    async getCustomerPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = 'GET /api/sales/customers/:customerId/payment-history';
        try {
            const customerId = parseInt(req.params.customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    error: {
                        message: 'Invalid customer ID'
                    }
                });
                return;
            }

            MyLogger.info(action, { customerId });

            const paymentHistory = await CustomerPaymentHistoryMediator.getCustomerPaymentHistory(customerId);

            MyLogger.success(action, { 
                customerId, 
                paymentsCount: paymentHistory.payments.length,
                ordersCount: paymentHistory.orders.length
            });

            serializeSuccessResponse(res, paymentHistory, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.params.customerId });
            next(error);
        }
    }
}

export default new SalesCustomersController();
