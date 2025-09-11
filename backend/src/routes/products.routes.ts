import express, {NextFunction, Request, Response} from 'express';
import {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
    stockAdjustmentSchema
} from '@/validation/productValidation';
import { GetProductInfoMediator } from "@/mediators/products/GetProductInfo.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { AddProductMediator } from "@/mediators/products/AddProduct.mediator";
import { UpdateProductInfoMediator } from "@/mediators/products/UpdateProductInfo.mediator";
import { DeleteProductMediator } from "@/mediators/products/DeleteProduct.mediator";
import { StockAdjustmentMediator } from "@/mediators/stockAdjustments/StockAdjustmentMediator";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";

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

// GET /api/products - Get all products with pagination and filtering
router.get('/', validateQuery(productQuerySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products'
    try {
        MyLogger.info(action, { query: req.query })
        const result = await GetProductInfoMediator.getAllProducts(req.query);
        MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit })
        serializeSuccessResponse(res, result, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query })
        throw error;
    }
}));

// GET /api/products/stats - Get product statistics
router.get('/stats', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/stats'
    try {
        MyLogger.info(action)
        const stats = await GetProductInfoMediator.getProductStats();
        MyLogger.success(action, { stats })
        serializeSuccessResponse(res, stats, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error)
        throw error;
    }
}));

// GET /api/products/search - Search products
router.get('/search', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/search'
    try {
        const {q, limit} = req.query;
        MyLogger.info(action, { query: q, limit })
        const products = await GetProductInfoMediator.searchProducts(
            q as string,
            limit ? parseInt(limit as string) : 10
        );
        MyLogger.success(action, { query: q, resultsCount: products.length })
        serializeSuccessResponse(res, products, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query.q })
        throw error;
    }
}));

// GET /api/products/low-stock - Get low stock products
router.get('/low-stock', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/low-stock'
    try {
        MyLogger.info(action)
        const products = await GetProductInfoMediator.getLowStockProducts();
        MyLogger.success(action, { lowStockCount: products.length })
        serializeSuccessResponse(res, products, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error)
        throw error;
    }
}));

// GET /api/products/category/:categoryId - Get products by category
router.get('/category/:categoryId', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/category/:categoryId'
    try {
        const categoryId = parseInt(req.params.categoryId);
        MyLogger.info(action, { categoryId })
        const products = await GetProductInfoMediator.getProductsByCategory(categoryId);
        MyLogger.success(action, { categoryId, productsCount: products.length })
        serializeSuccessResponse(res, products, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { categoryId: req.params.categoryId })
        throw error;
    }
}));

// GET /api/products/supplier/:supplierId - Get products by supplier
router.get('/supplier/:supplierId', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/supplier/:supplierId'
    try {
        const supplierId = parseInt(req.params.supplierId);
        MyLogger.info(action, { supplierId })
        const products = await GetProductInfoMediator.getProductsBySupplier(supplierId);
        MyLogger.success(action, { supplierId, productsCount: products.length })
        serializeSuccessResponse(res, products, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { supplierId: req.params.supplierId })
        throw error;
    }
}));

// GET /api/products/:id - Get product by ID with details
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        const product = await GetProductInfoMediator.getProductById(id);
        MyLogger.success(action, { productId: id, productName: product.name })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// POST /api/products - Create new product
router.post('/', validateRequest(createProductSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/products'
    try {
        MyLogger.info(action, { productName: req.body.name, productSku: req.body.sku })
        const product = await AddProductMediator.createProduct(req.body);
        MyLogger.success(action, { productId: product.id, productName: product.name, productSku: product.sku })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productName: req.body.name, productSku: req.body.sku })
        throw error;
    }
}));

// PUT /api/products/:id - Update product
router.put('/:id', validateRequest(updateProductSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/products/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id, updateFields: Object.keys(req.body) })
        const product = await UpdateProductInfoMediator.updateProduct(id, req.body);
        MyLogger.success(action, { productId: id, productName: product.name, productSku: product.sku })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id, updateFields: Object.keys(req.body) })
        throw error;
    }
}));

// PATCH /api/products/:id/toggle-status - Toggle product status
router.patch('/:id/toggle-status', expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/products/:id/toggle-status'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        const product = await UpdateProductInfoMediator.toggleProductStatus(id);
        MyLogger.success(action, { productId: id, productName: product.name, newStatus: product.status })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// PATCH /api/products/:id/stock - Update product stock
router.patch('/:id/stock', validateRequest(stockAdjustmentSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/products/:id/stock'
    try {
        const id = parseInt(req.params.id);
        const { adjustment_type, quantity, reason, reference, notes } = req.body;
        MyLogger.info(action, { productId: id, adjustmentType: adjustment_type, quantity, reason })
        
        const adjustmentData = {
            product_id: id,
            adjustment_type,
            quantity,
            reason,
            reference,
            notes
        };
        
        const adjustment = await StockAdjustmentMediator.createStockAdjustment(adjustmentData);
        
        // Get updated product data
        const product = await GetProductInfoMediator.getProductById(id);
        
        MyLogger.success(action, { 
            productId: id, 
            adjustmentId: adjustment.id,
            productName: product.name, 
            newStock: product.current_stock 
        })
        serializeSuccessResponse(res, product, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id, quantity: req.body.quantity })
        throw error;
    }
}));

// DELETE /api/products/:id - Soft delete product (mark as discontinued)
router.delete('/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/products/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        await DeleteProductMediator.deleteProduct(id);
        MyLogger.success(action, { productId: id, message: 'Product marked as discontinued' })
        serializeSuccessResponse(res, { message: 'Product marked as discontinued' }, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// DELETE /api/products/:id/hard - Hard delete product (permanent)
router.delete('/:id/hard', expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/products/:id/hard'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        await DeleteProductMediator.hardDeleteProduct(id);
        MyLogger.success(action, { productId: id, message: 'Product permanently deleted' })
        serializeSuccessResponse(res, { message: 'Product permanently deleted' }, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

// GET /api/products/:id/references - Check product references
router.get('/:id/references', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/products/:id/references'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { productId: id })
        const references = await DeleteProductMediator.checkProductReferences(id);
        MyLogger.success(action, { productId: id, hasReferences: references.hasReferences })
        serializeSuccessResponse(res, references, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { productId: req.params.id })
        throw error;
    }
}));

export default router;
