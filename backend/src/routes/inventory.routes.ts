import express, {NextFunction, Request, Response} from 'express';
import {InventoryMediator} from "@/mediators/inventory/InventoryMediator";
import {serializeSuccessResponse} from "@/utils/responseHelper";
import expressAsyncHandler from "express-async-handler";
import {MyLogger} from "@/utils/new-logger";
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const inventoryQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().max(255).optional(),
    category_id: Joi.number().integer().min(1).optional(),
    subcategory_id: Joi.number().integer().min(1).optional(),
    supplier_id: Joi.number().integer().min(1).optional(),
    status: Joi.string().valid('active', 'inactive', 'discontinued', 'out_of_stock').optional(),
    stock_status: Joi.string().valid('low', 'critical', 'optimal', 'overstock', 'out_of_stock').optional(),
    sortBy: Joi.string().valid('product_name', 'product_sku', 'category_name', 'supplier_name', 'current_stock', 'total_value', 'last_movement_date').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const stockMovementQuerySchema = Joi.object({
    product_id: Joi.number().integer().min(1).optional(),
    movement_type: Joi.string().valid('receipt', 'issue', 'adjustment', 'transfer').optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().valid('created_at', 'product_name', 'movement_type', 'quantity').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional()
});

// Validation middleware
const validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Query Parameters'
        try {
            MyLogger.info(action, {endpoint: req.path, method: req.method, query: req.query})
            const {error, value} = schema.validate(req.query);
            if (error) {
                MyLogger.warn(action, {endpoint: req.path, method: req.method, validationErrors: error.details})
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        details: error.details.map((detail: any) => detail.message)
                    }
                });
            }
            req.query = value;
            MyLogger.success(action, {endpoint: req.path, method: req.method})
            return next();
        } catch (err: any) {
            MyLogger.error(action, err, {endpoint: req.path, method: req.method})
            throw err;
        }
    };
};

// GET /api/inventory - Get inventory items with filtering and pagination
router.get('/', validateQuery(inventoryQuerySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/inventory'
    try {
        MyLogger.info(action, {query: req.query})
        const inventoryItems = await InventoryMediator.getInventoryItems(req.query);
        MyLogger.success(action, {count: inventoryItems.length})
        serializeSuccessResponse(res, inventoryItems, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, {query: req.query})
        throw error;
    }
}));

// GET /api/inventory/stats - Get inventory statistics
router.get('/stats', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/inventory/stats'
    try {
        MyLogger.info(action)
        const stats = await InventoryMediator.getInventoryStats();
        MyLogger.success(action, stats)
        serializeSuccessResponse(res, stats, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error)
        throw error;
    }
}));

// GET /api/inventory/movements - Get stock movements with filtering
router.get('/movements', validateQuery(stockMovementQuerySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/inventory/movements'
    try {
        MyLogger.info(action, {query: req.query})
        const movements = await InventoryMediator.getStockMovements(req.query);
        MyLogger.success(action, {count: movements.length})
        serializeSuccessResponse(res, movements, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, {query: req.query})
        throw error;
    }
}));

// GET /api/inventory/:id - Get specific inventory item
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/inventory/:id'
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        throw new Error('Invalid inventory item ID');
    }

    MyLogger.info(action, {inventoryItemId: id})
    const inventoryItem = await InventoryMediator.getInventoryItemById(id);

    if (!inventoryItem) {
        res.status(404)
        throw new Error('Inventory item not found')
    }

    MyLogger.success(action, {inventoryItemId: id, productName: inventoryItem.product_name})
    serializeSuccessResponse(res, inventoryItem, 'SUCCESS')
}));

export default router;
