import express, { NextFunction, Request, Response } from "express";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  receiveGoodsSchema,
  purchaseOrderQuerySchema,
} from "../validation/purchaseOrderValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  requireSystemAdmin,
  PERMISSIONS,
} from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import PurchaseOrdersController from "../controllers/purchaseOrders.controller";
import GetPurchaseOrderInfoMediator from "../mediators/purchaseOrders/GetPurchaseOrderInfo.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import UpdatePurchaseOrderInfoMediator from "../mediators/purchaseOrders/UpdatePurchaseOrderInfo.mediator";
import DeletePurchaseOrderMediator from "../mediators/purchaseOrders/DeletePurchaseOrder.mediator";
import { PDFGenerator } from "@/services/pdf-generator";
import purchaseOrdersController from "../controllers/purchaseOrders.controller";

const router = express.Router();

const validateRequest = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    let action = "Validate Request Body";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.body);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        return res.status(400).json({
          error: {
            message: "Validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
      }
      req.body = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method });
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method });
      throw err;
    }
  };
};

const validateQuery = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    let action = "Validate Query Parameters";
    try {
      MyLogger.info(action, {
        endpoint: req.path,
        method: req.method,
        query: req.query,
      });
      const { error, value } = schema.validate(req.query);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        return res.status(400).json({
          error: {
            message: "Query validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
      }
      req.query = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method });
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method });
      throw err;
    }
  };
};

router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  validateQuery(purchaseOrderQuerySchema),
  expressAsyncHandler(PurchaseOrdersController.getAllPurchaseOrders)
);

router.get(
  "/stats",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(PurchaseOrdersController.getPurchaseOrderStats)
);

router.get(
  "/search",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(PurchaseOrdersController.searchPurchaseOrders)
);

router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error("Invalid purchase order ID");
    }
    const purchaseOrder =
      await GetPurchaseOrderInfoMediator.getPurchaseOrderById(id);
    serializeSuccessResponse(res, purchaseOrder, "SUCCESS");
  })
);

router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_CREATE),
  validateRequest(createPurchaseOrderSchema),
  expressAsyncHandler(purchaseOrdersController.createPurchaseOrder)
);

router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  validateRequest(updatePurchaseOrderSchema),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error("Invalid purchase order ID");
    }
    const purchaseOrder =
      await UpdatePurchaseOrderInfoMediator.updatePurchaseOrder(id, req.body);
    serializeSuccessResponse(res, purchaseOrder, "SUCCESS");
  })
);

router.patch(
  "/:id/status",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  validateRequest(updatePurchaseOrderStatusSchema),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error("Invalid purchase order ID");
    }
    const purchaseOrder =
      await UpdatePurchaseOrderInfoMediator.updatePurchaseOrderStatus(
        id,
        req.body
      );
    serializeSuccessResponse(res, purchaseOrder, "SUCCESS");
  })
);

router.post(
  "/:id/receive",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_UPDATE),
  validateRequest(receiveGoodsSchema),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error("Invalid purchase order ID");
    }
    const purchaseOrder = await UpdatePurchaseOrderInfoMediator.receiveGoods(
      id,
      req.body
    );
    serializeSuccessResponse(res, purchaseOrder, "SUCCESS");
  })
);

router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_DELETE),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error("Invalid purchase order ID");
    }
    await DeletePurchaseOrderMediator.deletePurchaseOrder(id);
    serializeSuccessResponse(res, {}, "Deleted Successfully");
  })
);

router.patch(
  "/:id/cancel",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_CANCEL),
  expressAsyncHandler(async (req, res, next) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error("Invalid purchase order ID");
    }
    const { reason } = req.body;
    await DeletePurchaseOrderMediator.cancelPurchaseOrder(id, reason);
    serializeSuccessResponse(res, {}, "Purchase Order Cancelled Successfully");
  })
);

router.get(
  "/:id/pdf",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    let action = "GET /api/purchase-orders/:id/pdf";
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new Error("Invalid purchase order ID");
      }

      MyLogger.info(action, { purchaseOrderId: id });

      const purchaseOrder =
        await GetPurchaseOrderInfoMediator.getPurchaseOrderById(id);
      const pdfBuffer = await PDFGenerator.generatePurchaseOrderPDF(
        purchaseOrder
      );

      const filename = `Purchase_Order_${purchaseOrder.po_number}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);

      MyLogger.success(action, {
        purchaseOrderId: id,
        poNumber: purchaseOrder.po_number,
        filename,
        pdfSize: pdfBuffer.length,
      });
    } catch (error: any) {
      MyLogger.error(action, error, { purchaseOrderId: req.params.id });
      throw error;
    }
  })
);

export default router;
