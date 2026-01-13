import { NextFunction, Request, Response } from "express";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { CustomerPaymentHistoryMediator } from "../mediators/customers/CustomerPaymentHistory.mediator";

class SalesCustomersController {
    async getCustomerOrdersWithDueAmounts(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = 'GET /api/sales/customers/:customerId/orders-with-due';
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

            const orders = await CustomerPaymentHistoryMediator.getCustomerOrdersWithDueAmounts(customerId);

            MyLogger.success(action, {
                customerId,
                ordersCount: orders.length
            });

            serializeSuccessResponse(res, orders, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.params.customerId });
            next(error);
        }
    }

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

            const paymentsPage = req.query.payments_page ? parseInt(req.query.payments_page as string) : 1;
            const paymentsLimit = req.query.payments_limit ? parseInt(req.query.payments_limit as string) : 20;
            const ordersPage = req.query.orders_page ? parseInt(req.query.orders_page as string) : 1;
            const ordersLimit = req.query.orders_limit ? parseInt(req.query.orders_limit as string) : 20;
            const paymentType = req.query.payment_type as string || 'all';
            const orderStatusFilter = req.query.order_status_filter as string || 'all';

            MyLogger.info(action, { 
                customerId, 
                paymentsPage, 
                paymentsLimit, 
                ordersPage, 
                ordersLimit,
                paymentType,
                orderStatusFilter
            });

            const paymentHistory = await CustomerPaymentHistoryMediator.getCustomerPaymentHistory(customerId, {
                payments_page: paymentsPage,
                payments_limit: paymentsLimit,
                orders_page: ordersPage,
                orders_limit: ordersLimit,
                payment_type: paymentType as any,
                order_status_filter: orderStatusFilter as any
            });

            MyLogger.success(action, { 
                customerId, 
                paymentsCount: paymentHistory.payments.length,
                ordersCount: paymentHistory.orders.length,
                paymentsPage: paymentHistory.pagination.payments.page,
                ordersPage: paymentHistory.pagination.orders.page
            });

            serializeSuccessResponse(res, paymentHistory, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.params.customerId });
            next(error);
        }
    }
}

export default new SalesCustomersController();
