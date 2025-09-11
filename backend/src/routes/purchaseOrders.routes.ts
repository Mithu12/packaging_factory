import express, { NextFunction, Request, Response } from 'express';
import {
    createPurchaseOrderSchema,
    updatePurchaseOrderSchema,
    updatePurchaseOrderStatusSchema,
    receiveGoodsSchema,
    purchaseOrderQuerySchema
} from '@/validation/purchaseOrderValidation';
import GetPurchaseOrderInfoMediator from "@/mediators/purchaseOrders/GetPurchaseOrderInfo.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import AddPurchaseOrderMediator from "@/mediators/purchaseOrders/AddPurchaseOrder.mediator";
import UpdatePurchaseOrderInfoMediator from "@/mediators/purchaseOrders/UpdatePurchaseOrderInfo.mediator";
import DeletePurchaseOrderMediator from "@/mediators/purchaseOrders/DeletePurchaseOrder.mediator";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";

const router = express.Router();

// Validation middleware
const validateRequest = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Request Body'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method })
            const { error, value } = schema.validate(req.body);
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
            const { error, value } = schema.validate(req.query);
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

// GET /api/purchase-orders - Get all purchase orders with pagination and filtering
router.get('/', validateQuery(purchaseOrderQuerySchema), expressAsyncHandler(async (req, res) => {
    const result = await GetPurchaseOrderInfoMediator.getPurchaseOrderList(req.query);
    serializeSuccessResponse(res, result, 'SUCCESS')
}));

// GET /api/purchase-orders/stats - Get purchase order statistics
router.get('/stats', expressAsyncHandler(async (req, res, next) => {
    const stats = await GetPurchaseOrderInfoMediator.getPurchaseOrderStats();
    serializeSuccessResponse(res, stats, 'SUCCESS')
}));

// GET /api/purchase-orders/search - Search purchase orders
router.get('/search', expressAsyncHandler(async (req, res, next) => {
    const { q, limit } = req.query;
    const purchaseOrders = await GetPurchaseOrderInfoMediator.searchPurchaseOrders(
        q as string,
        limit ? parseInt(limit as string) : 10
    );
    serializeSuccessResponse(res, purchaseOrders, 'SUCCESS')
}));

// GET /api/purchase-orders/:id - Get purchase order by ID
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            error: {
                message: 'Invalid purchase order ID'
            }
        });
    }
    const purchaseOrder = await GetPurchaseOrderInfoMediator.getPurchaseOrderById(id);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// POST /api/purchase-orders - Create new purchase order
router.post('/', validateRequest(createPurchaseOrderSchema), expressAsyncHandler(async (req, res, next) => {
    const purchaseOrder = await AddPurchaseOrderMediator.createPurchaseOrder(req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// PUT /api/purchase-orders/:id - Update purchase order
router.put('/:id', validateRequest(updatePurchaseOrderSchema), expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            error: {
                message: 'Invalid purchase order ID'
            }
        });
    }
    const purchaseOrder = await UpdatePurchaseOrderInfoMediator.updatePurchaseOrder(id, req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// PATCH /api/purchase-orders/:id/status - Update purchase order status
router.patch('/:id/status', validateRequest(updatePurchaseOrderStatusSchema), expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            error: {
                message: 'Invalid purchase order ID'
            }
        });
    }
    const purchaseOrder = await UpdatePurchaseOrderInfoMediator.updatePurchaseOrderStatus(id, req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// POST /api/purchase-orders/:id/receive - Receive goods for purchase order
router.post('/:id/receive', validateRequest(receiveGoodsSchema), expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            error: {
                message: 'Invalid purchase order ID'
            }
        });
    }
    const purchaseOrder = await UpdatePurchaseOrderInfoMediator.receiveGoods(id, req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// DELETE /api/purchase-orders/:id - Delete purchase order
router.delete('/:id', expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            error: {
                message: 'Invalid purchase order ID'
            }
        });
    }
    await DeletePurchaseOrderMediator.deletePurchaseOrder(id);
    serializeSuccessResponse(res, {}, 'Deleted Successfully')
}));

// PATCH /api/purchase-orders/:id/cancel - Cancel purchase order
router.patch('/:id/cancel', expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({
            error: {
                message: 'Invalid purchase order ID'
            }
        });
    }
    const { reason } = req.body;
    await DeletePurchaseOrderMediator.cancelPurchaseOrder(id, reason);
    serializeSuccessResponse(res, {}, 'Purchase Order Cancelled Successfully')
}));

export default router;
