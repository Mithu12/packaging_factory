import express, {NextFunction, Request, Response} from 'express';
import {SupplierService} from '@/services/supplierService';
import {
    createSupplierSchema,
    updateSupplierSchema,
    supplierQuerySchema
} from '@/validation/supplierValidation';
import GetSuppliersMediator from "@/mediators/suppliers/GetSupplierInfo.mediator";
import {serializeSuccessResponse} from "@/utils/responseHelper";
import AddSupplierMediator from "@/mediators/suppliers/AddSupplier.mediator";
import UpdateSupplierInfoMediator from "@/mediators/suppliers/UpdateSupplierInfo.mediator";
import DeleteSupplierMediator from "@/mediators/suppliers/DeleteSupplier.mediator";
import expressAsyncHandler from "express-async-handler";

const router = express.Router();
const supplierService = new SupplierService();

// Validation middleware
const validateRequest = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const {error, value} = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: {
                    message: 'Validation error',
                    details: error.details.map((detail: any) => detail.message)
                }
            });
        }
        req.body = value;
        return next();
    };
};

const validateQuery = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const {error, value} = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                error: {
                    message: 'Query validation error',
                    details: error.details.map((detail: any) => detail.message)
                }
            });
        }
        req.query = value;
        return next();
    };
};

// GET /api/suppliers - Get all suppliers with pagination and filtering
router.get('/', validateQuery(supplierQuerySchema), expressAsyncHandler(async (req, res) => {
    const result = await GetSuppliersMediator.getSupplierList(req.query);
    serializeSuccessResponse(res, result, 'SUCCESS')
}));

// GET /api/suppliers/stats - Get supplier statistics
router.get('/stats', expressAsyncHandler(async (req, res, next) => {
    const stats = await GetSuppliersMediator.getSupplierStats();
    serializeSuccessResponse(res, stats, 'SUCCESS')
}));

// GET /api/suppliers/categories - Get all supplier categories
router.get('/categories', expressAsyncHandler(async (req, res, next) => {
    const categories = await GetSuppliersMediator.getSupplierCategories();
    serializeSuccessResponse(res, categories, 'SUCCESS')
}));

// GET /api/suppliers/search - Search suppliers
router.get('/search', expressAsyncHandler(async (req, res, next) => {
    const {q, limit} = req.query;
    const suppliers = await GetSuppliersMediator.searchSuppliers(
        q as string,
        limit ? parseInt(limit as string) : 10
    );
    serializeSuccessResponse(res, suppliers, 'SUCCESS')
}));

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    const supplier = await GetSuppliersMediator.getSupplierById(id);
    serializeSuccessResponse(res, supplier, 'SUCCESS')
}));

// POST /api/suppliers - Create new supplier
router.post('/', validateRequest(createSupplierSchema), expressAsyncHandler(async (req, res, next) => {
    const supplier = await AddSupplierMediator.createSupplier(req.body);
    serializeSuccessResponse(res, supplier, 'SUCCESS')
}));

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', validateRequest(updateSupplierSchema), expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    const supplier = await UpdateSupplierInfoMediator.updateSupplier(id, req.body);
    serializeSuccessResponse(res, supplier, 'SUCCESS')
}));

// PATCH /api/suppliers/:id/toggle-status - Toggle supplier status
router.patch('/:id/toggle-status', expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    const supplier = await UpdateSupplierInfoMediator.toggleSupplierStatus(id);
    serializeSuccessResponse(res, supplier, 'SUCCESS')
}));

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    await DeleteSupplierMediator.deleteSupplier(id);
    serializeSuccessResponse(res, {}, 'Deleted Successfully')

}));

export default router;
