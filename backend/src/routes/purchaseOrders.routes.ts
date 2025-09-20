import express, { NextFunction, Request, Response } from 'express';
import {
    createPurchaseOrderSchema,
    updatePurchaseOrderSchema,
    updatePurchaseOrderStatusSchema,
    receiveGoodsSchema,
    purchaseOrderQuerySchema
} from '@/validation/purchaseOrderValidation';
import { authenticate } from "@/middleware/auth";
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import PurchaseOrdersController from "@/controllers/purchaseOrders/purchaseOrders.controller";
import GetPurchaseOrderInfoMediator from "@/mediators/purchaseOrders/GetPurchaseOrderInfo.mediator";
import {serializeSuccessResponse} from "@/utils/responseHelper";
import AddPurchaseOrderMediator from "@/mediators/purchaseOrders/AddPurchaseOrder.mediator";
import UpdatePurchaseOrderInfoMediator from "@/mediators/purchaseOrders/UpdatePurchaseOrderInfo.mediator";
import DeletePurchaseOrderMediator from "@/mediators/purchaseOrders/DeletePurchaseOrder.mediator";
import {PDFGenerator} from "@/services/pdf-generator";

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
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  validateQuery(purchaseOrderQuerySchema), 
  expressAsyncHandler(PurchaseOrdersController.getAllPurchaseOrders)
);

// GET /api/purchase-orders/stats - Get purchase order statistics
router.get('/stats', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(PurchaseOrdersController.getPurchaseOrderStats)
);

// GET /api/purchase-orders/search - Search purchase orders
router.get('/search', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    const { q, limit } = req.query;
    const purchaseOrders = await GetPurchaseOrderInfoMediator.searchPurchaseOrders(
        q as string,
        limit ? parseInt(limit as string) : 10
    );
    serializeSuccessResponse(res, purchaseOrders, 'SUCCESS')
}));

// GET /api/purchase-orders/:id - Get purchase order by ID
router.get('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        throw new Error('Invalid purchase order ID')
    }
    const purchaseOrder = await GetPurchaseOrderInfoMediator.getPurchaseOrderById(id);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// POST /api/purchase-orders - Create new purchase order
router.post('/', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_CREATE),
  validateRequest(createPurchaseOrderSchema), 
  expressAsyncHandler(async (req, res, next) => {
    const purchaseOrder = await AddPurchaseOrderMediator.createPurchaseOrder(req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// PUT /api/purchase-orders/:id - Update purchase order
router.put('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  validateRequest(updatePurchaseOrderSchema), 
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        throw new Error('Invalid purchase order ID')
    }
    const purchaseOrder = await UpdatePurchaseOrderInfoMediator.updatePurchaseOrder(id, req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// PATCH /api/purchase-orders/:id/status - Update purchase order status
// todo: l1 add authorization
router.patch('/:id/status', validateRequest(updatePurchaseOrderStatusSchema), expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        throw new Error('Invalid purchase order ID')
    }
    const purchaseOrder = await UpdatePurchaseOrderInfoMediator.updatePurchaseOrderStatus(id, req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// POST /api/purchase-orders/:id/receive - Receive goods for purchase order
router.post('/:id/receive', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  validateRequest(receiveGoodsSchema), 
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        throw new Error('Invalid purchase order ID')
    }
    const purchaseOrder = await UpdatePurchaseOrderInfoMediator.receiveGoods(id, req.body);
    serializeSuccessResponse(res, purchaseOrder, 'SUCCESS')
}));

// DELETE /api/purchase-orders/:id - Delete purchase order
router.delete('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_DELETE),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        throw new Error('Invalid purchase order ID')
    }
    await DeletePurchaseOrderMediator.deletePurchaseOrder(id);
    serializeSuccessResponse(res, {}, 'Deleted Successfully')
}));

// PATCH /api/purchase-orders/:id/cancel - Cancel purchase order
// todo: l1 add authorization
router.patch('/:id/cancel', expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        throw new Error('Invalid purchase order ID')
    }
    const { reason } = req.body;
    await DeletePurchaseOrderMediator.cancelPurchaseOrder(id, reason);
    serializeSuccessResponse(res, {}, 'Purchase Order Cancelled Successfully')
}));

// GET /api/purchase-orders/:id/pdf - Download purchase order as PDF
router.get('/:id/pdf', 
  authenticate, 
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/purchase-orders/:id/pdf'
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            throw new Error('Invalid purchase order ID')
        }

        MyLogger.info(action, { purchaseOrderId: id });

        // Get purchase order data
        const purchaseOrder = await GetPurchaseOrderInfoMediator.getPurchaseOrderById(id);

        // Generate PDF
        const pdfBuffer = await PDFGenerator.generatePurchaseOrderPDF(purchaseOrder);

        // Set response headers for PDF download
        const filename = `Purchase_Order_${purchaseOrder.po_number}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF buffer
        res.send(pdfBuffer);

        MyLogger.success(action, { 
            purchaseOrderId: id, 
            poNumber: purchaseOrder.po_number,
            filename,
            pdfSize: pdfBuffer.length 
        });
    } catch (error: any) {
        MyLogger.error(action, error, { purchaseOrderId: req.params.id });
        throw error;
    }
}));

export default router;
