import express, {NextFunction, Request, Response} from 'express';
import {
    createCustomerSchema,
    updateCustomerSchema,
    customerQuerySchema
} from '@/validation/posValidation';
import { authenticate } from "@/middleware/auth";
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import CustomersController from "@/controllers/customers/customers.controller";
import {DeleteCustomerMediator} from "@/mediators/customers/DeleteCustomer.mediator";
import {serializeSuccessResponse} from "@/utils/responseHelper";
import {UpdateCustomerInfoMediator} from "@/mediators/customers/UpdateCustomerInfo.mediator";

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

// GET /api/customers - Get all customers with pagination and filtering
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  validateQuery(customerQuerySchema), 
  expressAsyncHandler(CustomersController.getAllCustomers)
);

// GET /api/customers/stats - Get customer statistics
router.get('/stats', 
  authenticate, 
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(CustomersController.getCustomerStats)
);

// GET /api/customers/search - Search customers
router.get('/search', 
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(CustomersController.searchCustomers)
);

// GET /api/customers/type/:type - Get customers by type
router.get('/type/:type', 
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(CustomersController.getCustomersByType)
);

// GET /api/customers/:id - Get customer by ID
router.get('/:id', 
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(CustomersController.getCustomerById)
);

// POST /api/customers - Create new customer
router.post('/', 
  authenticate, 
  auditMiddleware,
  requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
  validateRequest(createCustomerSchema), 
  expressAsyncHandler(CustomersController.createCustomer)
);

// PUT /api/customers/:id - Update customer
router.put('/:id', 
  authenticate, 
  auditMiddleware,
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  validateRequest(updateCustomerSchema), 
  expressAsyncHandler(CustomersController.updateCustomer)
);

// PATCH /api/customers/:id/toggle-status - Toggle customer status
router.patch('/:id/toggle-status', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/customers/:id/toggle-status'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { customerId: id })
        const customer = await UpdateCustomerInfoMediator.toggleCustomerStatus(id);
        MyLogger.success(action, { customerId: id, customerName: customer.name, newStatus: customer.status })
        serializeSuccessResponse(res, customer, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { customerId: req.params.id })
        throw error;
    }
}));

// PATCH /api/customers/:id/loyalty-points - Update customer loyalty points
router.patch('/:id/loyalty-points', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/customers/:id/loyalty-points'
    try {
        const id = parseInt(req.params.id);
        const { points } = req.body;
        MyLogger.info(action, { customerId: id, points })
        const customer = await UpdateCustomerInfoMediator.updateCustomerLoyaltyPoints(id, points);
        MyLogger.success(action, { customerId: id, customerName: customer.name, newLoyaltyPoints: customer.loyalty_points })
        serializeSuccessResponse(res, customer, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { customerId: req.params.id, points: req.body.points })
        throw error;
    }
}));

// PATCH /api/customers/:id/collect-payment - Collect due payment from customer
router.patch('/:id/collect-payment', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/customers/:id/collect-payment'
    try {
        const id = parseInt(req.params.id);
        const { amount, payment_method } = req.body;
        
        if (!amount || amount <= 0) {
            res.status(400).json({
                error: {
                    message: 'Payment amount must be a positive number'
                }
            });
            return;
        }
        
        const userId = (req as any).user?.user_id;
        MyLogger.info(action, { customerId: id, amount, payment_method, userId })
        const customer = await UpdateCustomerInfoMediator.collectDuePayment(id, amount, payment_method || 'cash', userId);
        MyLogger.success(action, { customerId: id, customerName: customer.name, newDueAmount: customer.due_amount })
        serializeSuccessResponse(res, customer, 'Payment recorded successfully')
    } catch (error: any) {
        MyLogger.error(action, error, { customerId: req.params.id, amount: req.body.amount })
        throw error;
    }
}));

// DELETE /api/customers/:id - Soft delete customer (mark as inactive)
router.delete('/:id', 
  authenticate, 
  auditMiddleware,
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  expressAsyncHandler(CustomersController.deleteCustomer)
);

// DELETE /api/customers/:id/hard - Hard delete customer (permanent)
router.delete('/:id/hard', 
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/customers/:id/hard'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { customerId: id })
        await DeleteCustomerMediator.hardDeleteCustomer(id);
        MyLogger.success(action, { customerId: id, message: 'Customer permanently deleted' })
        serializeSuccessResponse(res, { message: 'Customer permanently deleted' }, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { customerId: req.params.id })
        throw error;
    }
}));

// GET /api/customers/:id/references - Check customer references
router.get('/:id/references', 
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/customers/:id/references'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { customerId: id })
        const references = await DeleteCustomerMediator.checkCustomerReferences(id);
        MyLogger.success(action, { customerId: id, hasReferences: references.hasReferences })
        serializeSuccessResponse(res, references, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { customerId: req.params.id })
        throw error;
    }
}));

export default router;
