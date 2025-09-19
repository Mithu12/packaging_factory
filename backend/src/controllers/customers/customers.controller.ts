import { NextFunction, Request, Response } from "express";
import { GetCustomerInfoMediator } from "@/mediators/customers/GetCustomerInfo.mediator";
import { AddCustomerMediator } from "@/mediators/customers/AddCustomer.mediator";
import { UpdateCustomerInfoMediator } from "@/mediators/customers/UpdateCustomerInfo.mediator";
import { DeleteCustomerMediator } from "@/mediators/customers/DeleteCustomer.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class CustomersController {
    async getAllCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/customers';
        try {
            MyLogger.info(action, { query: req.query });
            const result = await GetCustomerInfoMediator.getAllCustomers(req.query);
            MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getCustomerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/customers/stats';
        try {
            MyLogger.info(action);
            const stats = await GetCustomerInfoMediator.getCustomerStats();
            MyLogger.success(action, stats);
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async searchCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/customers/search';
        try {
            const { q, limit } = req.query;
            MyLogger.info(action, { query: q, limit });
            const customers = await GetCustomerInfoMediator.searchCustomers(
                q as string,
                limit ? parseInt(limit as string) : 10
            );
            MyLogger.success(action, { query: q, resultsCount: customers.length });
            serializeSuccessResponse(res, customers, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query.q });
            throw error;
        }
    }

    async getCustomersByType(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/customers/type/:type';
        try {
            const customerType = req.params.type;
            MyLogger.info(action, { customerType });
            const customers = await GetCustomerInfoMediator.getCustomersByType(customerType);
            MyLogger.success(action, { customerType, customersCount: customers.length });
            serializeSuccessResponse(res, customers, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerType: req.params.type });
            throw error;
        }
    }

    async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/customers/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { customerId: id });
            const customer = await GetCustomerInfoMediator.getCustomerById(id);
            MyLogger.success(action, { customerId: id, customerName: customer.name });
            serializeSuccessResponse(res, customer, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.params.id });
            throw error;
        }
    }

    async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/customers';
        try {
            MyLogger.info(action, { customerName: req.body.name });
            const customer = await AddCustomerMediator.createCustomer(req.body);
            MyLogger.success(action, { customerId: customer.id, customerName: customer.name });
            serializeSuccessResponse(res, customer, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerName: req.body.name });
            throw error;
        }
    }

    async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PUT /api/customers/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { customerId: id, updateFields: Object.keys(req.body) });
            const customer = await UpdateCustomerInfoMediator.updateCustomer(id, req.body);
            MyLogger.success(action, { customerId: id, customerName: customer.name });
            serializeSuccessResponse(res, customer, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.params.id });
            throw error;
        }
    }

    async deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'DELETE /api/customers/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { customerId: id });
            await DeleteCustomerMediator.deleteCustomer(id);
            MyLogger.success(action, { customerId: id });
            serializeSuccessResponse(res, {}, 'Deleted Successfully');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.params.id });
            throw error;
        }
    }
}

export default new CustomersController();
