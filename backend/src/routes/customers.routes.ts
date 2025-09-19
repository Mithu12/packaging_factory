import express, {NextFunction, Request, Response} from 'express';
import {
    createCustomerSchema,
    updateCustomerSchema,
    customerQuerySchema
} from '@/validation/posValidation';
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from "@/middleware/auth";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import CustomersController from "@/controllers/customers/customers.controller";

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
  employeeAndAbove, // Employees and above can view customers
  validateQuery(customerQuerySchema), 
  expressAsyncHandler(CustomersController.getAllCustomers)
);

// GET /api/customers/stats - Get customer statistics
router.get('/stats', 
  authenticate, 
  managerAndAbove, // Only managers and above can view customer statistics
  expressAsyncHandler(CustomersController.getCustomerStats)
);

// GET /api/customers/search - Search customers
router.get('/search', expressAsyncHandler(CustomersController.searchCustomers));

// GET /api/customers/type/:type - Get customers by type
router.get('/type/:type', expressAsyncHandler(CustomersController.getCustomersByType));

// GET /api/customers/:id - Get customer by ID
router.get('/:id', expressAsyncHandler(CustomersController.getCustomerById));

// POST /api/customers - Create new customer
router.post('/', 
  authenticate, 
  employeeAndAbove, // Employees and above can create customers
  validateRequest(createCustomerSchema), 
  expressAsyncHandler(CustomersController.createCustomer)
);

// PUT /api/customers/:id - Update customer
router.put('/:id', 
  authenticate, 
  managerAndAbove, // Only managers and above can update customers
  validateRequest(updateCustomerSchema), 
  expressAsyncHandler(CustomersController.updateCustomer)
);

// PATCH /api/customers/:id/toggle-status - Toggle customer status
router.patch('/:id/toggle-status', expressAsyncHandler(async (req, res, next) => {
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
router.patch('/:id/loyalty-points', expressAsyncHandler(async (req, res, next) => {
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

// DELETE /api/customers/:id - Soft delete customer (mark as inactive)
router.delete('/:id', 
  authenticate, 
  adminOnly, // Only admins can delete customers
  expressAsyncHandler(CustomersController.deleteCustomer)
);

// DELETE /api/customers/:id/hard - Hard delete customer (permanent)
router.delete('/:id/hard', expressAsyncHandler(async (req, res, next) => {
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
router.get('/:id/references', expressAsyncHandler(async (req, res, next) => {
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
