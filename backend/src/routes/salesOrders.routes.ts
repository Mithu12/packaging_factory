import express, {NextFunction, Request, Response} from 'express';
import {
    createSalesOrderSchema,
    updateSalesOrderSchema,
    salesOrderQuerySchema
} from '@/validation/posValidation';
import { authenticate } from "@/middleware/auth";
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import SalesOrdersController from "@/controllers/salesOrders/salesOrders.controller";
import {GetSalesOrderInfoMediator} from "@/mediators/salesOrders/GetSalesOrderInfo.mediator";
import {serializeSuccessResponse} from "@/utils/responseHelper";
import {UpdateSalesOrderInfoMediator} from "@/mediators/salesOrders/UpdateSalesOrderInfo.mediator";
import {AddSalesOrderMediator} from "@/mediators/salesOrders/AddSalesOrder.mediator";

const router = express.Router();

// Validation middleware
const validateRequest = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Request Body'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method })
            const {error, value} = schema.validate(req.body);
            if (error) {
                MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        details: error.details.map((detail: any) => detail.message)
                    }
                });
            }
            req.body = value;
            MyLogger.success(action, { endpoint: req.path, method: req.method })
            return next();
        } catch (err: any) {
            MyLogger.error(action, err, { endpoint: req.path, method: req.method })
            throw err;
        }
    };
};

const validateQuery = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Query Parameters'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method, query: req.query })
            const {error, value} = schema.validate(req.query);
            if (error) {
                MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        details: error.details.map((detail: any) => detail.message)
                    }
                });
            }
            req.query = value;
            MyLogger.success(action, { endpoint: req.path, method: req.method })
            return next();
        } catch (err: any) {
            MyLogger.error(action, err, { endpoint: req.path, method: req.method })
            throw err;
        }
    };
};

// GET /api/sales-orders - Get all sales orders with pagination and filtering
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  validateQuery(salesOrderQuerySchema), 
  expressAsyncHandler(SalesOrdersController.getAllSalesOrders)
);

// GET /api/sales-orders/stats - Get POS statistics
router.get('/stats', 
  authenticate, 
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(SalesOrdersController.getPOSStats)
);

// GET /api/sales-orders/search - Search sales orders
router.get('/search', 
  authenticate, 
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/sales-orders/search'
    try {
        const {q, limit} = req.query;
        MyLogger.info(action, { query: q, limit })
        const salesOrders = await GetSalesOrderInfoMediator.searchSalesOrders(
            q as string,
            limit ? parseInt(limit as string) : 10
        );
        MyLogger.success(action, { query: q, resultsCount: salesOrders.length })
        serializeSuccessResponse(res, salesOrders, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query.q })
        throw error;
    }
}));

// GET /api/sales-orders/:id - Get sales order by ID with details
router.get('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(SalesOrdersController.getSalesOrderById)
);

// POST /api/sales-orders - Create new sales order
router.post('/', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.SALES_ORDERS_CREATE),
  validateRequest(createSalesOrderSchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/sales-orders'
    try {
        MyLogger.info(action, { 
            customerId: req.body.customer_id, 
            paymentMethod: req.body.payment_method,
            lineItemsCount: req.body.line_items.length
        })
        const salesOrder = await AddSalesOrderMediator.createSalesOrder(req.body);
        MyLogger.success(action, { 
            salesOrderId: salesOrder.id, 
            orderNumber: salesOrder.order_number,
            totalAmount: salesOrder.total_amount
        })
        serializeSuccessResponse(res, salesOrder, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { customerId: req.body.customer_id })
        throw error;
    }
}));

// PUT /api/sales-orders/:id - Update sales order
router.put('/:id', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.SALES_ORDERS_UPDATE),
  validateRequest(updateSalesOrderSchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/sales-orders/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { salesOrderId: id, updateFields: Object.keys(req.body) })
        const salesOrder = await UpdateSalesOrderInfoMediator.updateSalesOrder(id, req.body);
        MyLogger.success(action, { 
            salesOrderId: id, 
            orderNumber: salesOrder.order_number,
            updatedFields: Object.keys(req.body)
        })
        serializeSuccessResponse(res, salesOrder, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { salesOrderId: req.params.id, updateFields: Object.keys(req.body) })
        throw error;
    }
}));

export default router;
