import express, { NextFunction, Request, Response } from "express";
import {
  createCustomerOrderSchema,
  updateCustomerOrderSchema,
  orderQuerySchema,
  approveOrderSchema,
  updateOrderStatusSchema,
  orderIdSchema,
  bulkUpdateOrderStatusSchema,
  exportOrdersSchema
} from "../validation/customerOrderValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  requireSystemAdmin,
  PERMISSIONS,
} from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import CustomerOrdersController from "../controllers/customerOrders.controller";

const router = express.Router();

const validateRequest = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = "Validate Request Body";
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
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

const validateQuery = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = "Validate Query Parameters";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
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
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

const validateParams = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const action = "Validate Route Parameters";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.params);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        return res.status(400).json({
          error: {
            message: "Parameter validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
      }
      req.params = value;
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.path,
        method: req.method,
      });
      next(error);
    }
  };
};

// GET /api/factory/customer-orders - Get all customer orders with filtering and pagination
router.get(
  "/",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_READ), // TODO: Add factory permissions
  validateQuery(orderQuerySchema),
  auditMiddleware({
    action: "view",
    resource: "customer_orders",
    details: "Retrieved customer orders list"
  }),
  expressAsyncHandler(CustomerOrdersController.getAllCustomerOrders)
);

// GET /api/factory/customer-orders/stats - Get order statistics
router.get(
  "/stats",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  auditMiddleware({
    action: "view",
    resource: "customer_orders",
    details: "Retrieved customer order statistics"
  }),
  expressAsyncHandler(CustomerOrdersController.getOrderStats)
);

// GET /api/factory/customer-orders/export - Export customer orders
router.get(
  "/export",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  validateQuery(exportOrdersSchema),
  auditMiddleware({
    action: "export",
    resource: "customer_orders",
    details: "Exported customer orders"
  }),
  expressAsyncHandler(CustomerOrdersController.exportCustomerOrders)
);

// GET /api/factory/customer-orders/:id - Get customer order by ID
router.get(
  "/:id",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  validateParams(orderIdSchema),
  auditMiddleware({
    action: "view",
    resource: "customer_orders",
    details: "Retrieved customer order details"
  }),
  expressAsyncHandler(CustomerOrdersController.getCustomerOrderById)
);

// POST /api/factory/customer-orders - Create new customer order
router.post(
  "/",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_CREATE),
  validateRequest(createCustomerOrderSchema),
  auditMiddleware({
    action: "create",
    resource: "customer_orders",
    details: "Created new customer order"
  }),
  expressAsyncHandler(CustomerOrdersController.createCustomerOrder)
);

// PUT /api/factory/customer-orders/:id - Update customer order
router.put(
  "/:id",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  validateParams(orderIdSchema),
  validateRequest(updateCustomerOrderSchema),
  auditMiddleware({
    action: "update",
    resource: "customer_orders",
    details: "Updated customer order"
  }),
  expressAsyncHandler(CustomerOrdersController.updateCustomerOrder)
);

// POST /api/factory/customer-orders/:id/approve - Approve/Reject customer order
router.post(
  "/:id/approve",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_APPROVE),
  validateParams(orderIdSchema),
  validateRequest(approveOrderSchema),
  auditMiddleware({
    action: "approve",
    resource: "customer_orders",
    details: "Approved/rejected customer order"
  }),
  expressAsyncHandler(CustomerOrdersController.approveCustomerOrder)
);

// POST /api/factory/customer-orders/:id/status - Update order status
router.post(
  "/:id/status",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  validateParams(orderIdSchema),
  validateRequest(updateOrderStatusSchema),
  auditMiddleware({
    action: "update",
    resource: "customer_orders",
    details: "Updated customer order status"
  }),
  expressAsyncHandler(CustomerOrdersController.updateOrderStatus)
);

// POST /api/factory/customer-orders/bulk/status - Bulk update order status
router.post(
  "/bulk/status",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  validateRequest(bulkUpdateOrderStatusSchema),
  auditMiddleware({
    action: "bulk_update",
    resource: "customer_orders",
    details: "Bulk updated customer order statuses"
  }),
  expressAsyncHandler(CustomerOrdersController.bulkUpdateOrderStatus)
);

// DELETE /api/factory/customer-orders/:id - Delete customer order
router.delete(
  "/:id",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_DELETE),
  validateParams(orderIdSchema),
  auditMiddleware({
    action: "delete",
    resource: "customer_orders",
    details: "Deleted customer order"
  }),
  expressAsyncHandler(CustomerOrdersController.deleteCustomerOrder)
);

// DELETE /api/factory/customer-orders/bulk - Bulk delete customer orders
router.delete(
  "/bulk",
  authenticate,
  // requirePermission(PERMISSIONS.FACTORY_ORDERS_DELETE),
  auditMiddleware({
    action: "bulk_delete",
    resource: "customer_orders",
    details: "Bulk deleted customer orders"
  }),
  expressAsyncHandler(CustomerOrdersController.bulkDeleteCustomerOrders)
);

export default router;
