import { NextFunction, Request, Response } from "express";
import { InvoiceMediator } from "@/mediators/payments/InvoiceMediator";
import { PaymentMediator } from "@/mediators/payments/PaymentMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class PaymentsController {
    // ==================== INVOICE METHODS ====================

    async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/payments/invoices';
        try {
            MyLogger.info(action, { query: req.query });
            const invoices = await InvoiceMediator.getInvoices(req.query);
            MyLogger.success(action, { count: invoices.length });
            serializeSuccessResponse(res, invoices, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getInvoiceStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/payments/invoices/stats';
        try {
            MyLogger.info(action);
            const stats = await InvoiceMediator.getInvoiceStats();
            MyLogger.success(action, stats);
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/payments/invoices/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { invoiceId: id });
            const invoice = await InvoiceMediator.getInvoiceById(id);
            MyLogger.success(action, { invoiceId: id });
            serializeSuccessResponse(res, invoice, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { invoiceId: req.params.id });
            throw error;
        }
    }

    async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/payments/invoices';
        try {
            MyLogger.info(action, { customerId: req.body.customer_id });
            const invoice = await InvoiceMediator.createInvoice(req.body);
            MyLogger.success(action, { invoiceId: invoice.id });
            serializeSuccessResponse(res, invoice, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.body.customer_id });
            throw error;
        }
    }

    async updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PUT /api/payments/invoices/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { invoiceId: id });
            const invoice = await InvoiceMediator.updateInvoice(id, req.body);
            MyLogger.success(action, { invoiceId: id });
            serializeSuccessResponse(res, invoice, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { invoiceId: req.params.id });
            throw error;
        }
    }

    async deleteInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'DELETE /api/payments/invoices/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { invoiceId: id });
            await InvoiceMediator.deleteInvoice(id);
            MyLogger.success(action, { invoiceId: id });
            serializeSuccessResponse(res, {}, 'Invoice deleted successfully');
        } catch (error: any) {
            MyLogger.error(action, error, { invoiceId: req.params.id });
            throw error;
        }
    }

    // ==================== PAYMENT METHODS ====================

    async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/payments';
        try {
            MyLogger.info(action, { query: req.query });
            const payments = await PaymentMediator.getPayments(req.query);
            MyLogger.success(action, { count: payments.length });
            serializeSuccessResponse(res, payments, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getPaymentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/payments/stats';
        try {
            MyLogger.info(action);
            const stats = await PaymentMediator.getPaymentStats();
            MyLogger.success(action, stats);
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/payments/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { paymentId: id });
            const payment = await PaymentMediator.getPaymentById(id);
            MyLogger.success(action, { paymentId: id });
            serializeSuccessResponse(res, payment, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { paymentId: req.params.id });
            throw error;
        }
    }

    async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/payments';
        try {
            MyLogger.info(action, { invoiceId: req.body.invoice_id, amount: req.body.amount });
            const payment = await PaymentMediator.createPayment(req.body);
            MyLogger.success(action, { paymentId: payment.id });
            serializeSuccessResponse(res, payment, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { invoiceId: req.body.invoice_id });
            throw error;
        }
    }

    async updatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PUT /api/payments/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { paymentId: id });
            const payment = await PaymentMediator.updatePayment(id, req.body);
            MyLogger.success(action, { paymentId: id });
            serializeSuccessResponse(res, payment, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { paymentId: req.params.id });
            throw error;
        }
    }

    async deletePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'DELETE /api/payments/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { paymentId: id });
            await PaymentMediator.deletePayment(id);
            MyLogger.success(action, { paymentId: id });
            serializeSuccessResponse(res, {}, 'Payment deleted successfully');
        } catch (error: any) {
            MyLogger.error(action, error, { paymentId: req.params.id });
            throw error;
        }
    }

    // Additional filtering methods can be added when mediator methods are available
}

export default new PaymentsController();
