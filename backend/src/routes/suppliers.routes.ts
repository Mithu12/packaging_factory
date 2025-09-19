import express, {NextFunction, Request, Response} from 'express';
import {
    createSupplierSchema,
    updateSupplierSchema,
    supplierQuerySchema
} from '@/validation/supplierValidation';
import expressAsyncHandler from "express-async-handler";
import {MyLogger} from "@/utils/new-logger";
import SuppliersController from "@/controllers/suppliers/suppliers.controller";

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
                        message: 'Query validation error',
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

// GET /api/suppliers - Get all suppliers with pagination and filtering
router.get('/', validateQuery(supplierQuerySchema), expressAsyncHandler(SuppliersController.getAllSuppliers));

// GET /api/suppliers/stats - Get supplier statistics
router.get('/stats', expressAsyncHandler(SuppliersController.getSupplierStats));

// GET /api/suppliers/categories - Get all supplier categories
router.get('/categories', expressAsyncHandler(SuppliersController.getSupplierCategories));

// GET /api/suppliers/search - Search suppliers
router.get('/search', expressAsyncHandler(SuppliersController.searchSuppliers));

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', expressAsyncHandler(SuppliersController.getSupplierById));

// POST /api/suppliers - Create new supplier
router.post('/', validateRequest(createSupplierSchema), expressAsyncHandler(SuppliersController.createSupplier));

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', validateRequest(updateSupplierSchema), expressAsyncHandler(SuppliersController.updateSupplier));

// PATCH /api/suppliers/:id/toggle-status - Toggle supplier status
router.patch('/:id/toggle-status', expressAsyncHandler(SuppliersController.toggleSupplierStatus));

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', expressAsyncHandler(SuppliersController.deleteSupplier));

export default router;
