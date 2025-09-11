import express, {NextFunction, Request, Response} from 'express';
import {
    createStockAdjustmentSchema,
    stockAdjustmentQuerySchema
} from '@/validation/stockAdjustmentValidation';
import { StockAdjustmentMediator } from "@/mediators/stockAdjustments/StockAdjustmentMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
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

// GET /api/stock-adjustments - Get stock adjustments with filtering
router.get('/', validateQuery(stockAdjustmentQuerySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/stock-adjustments'
    try {
        MyLogger.info(action, { query: req.query })
        const adjustments = await StockAdjustmentMediator.getStockAdjustments(req.query);
        MyLogger.success(action, { count: adjustments.length })
        serializeSuccessResponse(res, adjustments, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query })
        throw error;
    }
}));

// GET /api/stock-adjustments/stats - Get stock adjustment statistics
router.get('/stats', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/stock-adjustments/stats'
    try {
        const { product_id } = req.query;
        MyLogger.info(action, { productId: product_id })
        const stats = await StockAdjustmentMediator.getStockAdjustmentStats(
            product_id ? parseInt(product_id as string) : undefined
        );
        MyLogger.success(action, { stats })
        serializeSuccessResponse(res, stats, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error)
        throw error;
    }
}));

// GET /api/stock-adjustments/:id - Get stock adjustment by ID
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/stock-adjustments/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { adjustmentId: id })
        const adjustment = await StockAdjustmentMediator.getStockAdjustmentById(id);
        MyLogger.success(action, { adjustmentId: id })
        serializeSuccessResponse(res, adjustment, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { adjustmentId: req.params.id })
        throw error;
    }
}));

// POST /api/stock-adjustments - Create new stock adjustment
router.post('/', validateRequest(createStockAdjustmentSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/stock-adjustments'
    try {
        MyLogger.info(action, { 
            productId: req.body.product_id, 
            adjustmentType: req.body.adjustment_type,
            quantity: req.body.quantity 
        })
        const adjustment = await StockAdjustmentMediator.createStockAdjustment(req.body);
        MyLogger.success(action, { 
            adjustmentId: adjustment.id,
            productId: req.body.product_id 
        })
        serializeSuccessResponse(res, adjustment, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { 
            productId: req.body.product_id, 
            adjustmentType: req.body.adjustment_type 
        })
        throw error;
    }
}));

export default router;
