import express from "express";
import {
    createCustomerOrderSchema,
    updateCustomerOrderSchema,
    orderQuerySchema,
    approveOrderSchema,
    convertOrderWithLinesSchema,
    updateOrderStatusSchema,
    orderIdSchema,
    bulkUpdateOrderStatusSchema,
    exportOrdersSchema,
    recordPaymentSchema
} from "../validation/customerOrderValidation";
import {
    createDeliverySchema,
    deliveryIdSchema,
    cancelDeliverySchema,
    customerIdSchema,
} from "../validation/deliveryValidation";
import {
    createDeliveryReturnSchema,
    returnIdSchema,
    deliveryIdParamSchema,
} from "../validation/deliveryReturnValidation";
import { authenticate } from "@/middleware/auth";
import {
    requirePermission,
    PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import CustomerOrdersController from "../controllers/customerOrders.controller";
import { deliveriesController } from "../controllers/deliveries.controller";
import { deliveryReturnsController } from "../controllers/deliveryReturns.controller";
import { monthlyBillsController } from "../controllers/monthlyBills.controller";
import { auditMiddleware } from "@/middleware/audit";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { createError } from "@/middleware/errorHandler";

const router = express.Router();
router.use(authenticate);
const validateRequest = (schema: any) => {
    return (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        const action = "Validate Request Body";
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method });
            const { error, value } = schema.validate(req.body, { stripUnknown: true });
            if (error) {
                MyLogger.warn(action, {
                    endpoint: req.path,
                    method: req.method,
                    validationErrors: error.details,
                });
                const detailMsg = error.details
                    .map((d: { message: string }) => d.message.replace(/"/g, ""))
                    .join("; ");
                return next(createError(detailMsg || "Invalid request body", 400));
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
                res.status(400)
                throw new Error("Query validation error");
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
                res.status(400)
                throw new Error("Parameter validation error");
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

// ---------------------------------------------------------------------------
// Delivery (challan) routes — declared BEFORE /:id so the literal `deliveries`
// segment doesn't get caught by the order-id route matcher.
// ---------------------------------------------------------------------------

// GET /api/factory/customer-orders/deliveries - paginated list across all customers/orders
router.get(
    "/deliveries",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.listAllDeliveries.bind(deliveriesController))
);

// GET /api/factory/customer-orders/deliveries/:deliveryId
router.get(
    "/deliveries/:deliveryId",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(deliveryIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.getDeliveryById.bind(deliveriesController))
);

// GET /api/factory/customer-orders/deliveries/:deliveryId/challan - per-delivery challan PDF
router.get(
    "/deliveries/:deliveryId/challan",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(deliveryIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.exportDeliveryChallan.bind(deliveriesController))
);

// GET /api/factory/customer-orders/deliveries/:deliveryId/invoice - per-delivery invoice PDF
router.get(
    "/deliveries/:deliveryId/invoice",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(deliveryIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.exportDeliveryInvoice.bind(deliveriesController))
);

// POST /api/factory/customer-orders/deliveries/:deliveryId/cancel
router.post(
    "/deliveries/:deliveryId/cancel",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(deliveryIdSchema),
    validateRequest(cancelDeliverySchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.cancelDelivery.bind(deliveriesController))
);

// POST /api/factory/customer-orders/deliveries/:deliveryId/generate-invoice
router.post(
    "/deliveries/:deliveryId/generate-invoice",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(deliveryIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.generateInvoiceForDelivery.bind(deliveriesController))
);

// PATCH /api/factory/customer-orders/deliveries/:deliveryId/bill-submitted
router.patch(
    "/deliveries/:deliveryId/bill-submitted",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(deliveryIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.setBillSubmitted.bind(deliveriesController))
);

// ---------------------------------------------------------------------------
// Delivery (challan) return routes — also declared BEFORE /:id.
// ---------------------------------------------------------------------------

// GET /api/factory/customer-orders/returns - paginated list of all returns
router.get(
    "/returns",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    auditMiddleware,
    expressAsyncHandler(deliveryReturnsController.listAllReturns.bind(deliveryReturnsController))
);

// GET /api/factory/customer-orders/returns/:returnId
router.get(
    "/returns/:returnId",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(returnIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveryReturnsController.getReturnById.bind(deliveryReturnsController))
);

// POST /api/factory/customer-orders/returns/:returnId/approve
router.post(
    "/returns/:returnId/approve",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(returnIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveryReturnsController.approveReturn.bind(deliveryReturnsController))
);

// POST /api/factory/customer-orders/returns/:returnId/reject
router.post(
    "/returns/:returnId/reject",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(returnIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveryReturnsController.rejectReturn.bind(deliveryReturnsController))
);

// POST /api/factory/customer-orders/returns/:returnId/cancel
router.post(
    "/returns/:returnId/cancel",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(returnIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveryReturnsController.cancelReturn.bind(deliveryReturnsController))
);

// GET /api/factory/customer-orders/deliveries/:deliveryId/returns
router.get(
    "/deliveries/:deliveryId/returns",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(deliveryIdParamSchema),
    auditMiddleware,
    expressAsyncHandler(deliveryReturnsController.listReturnsForDelivery.bind(deliveryReturnsController))
);

// POST /api/factory/customer-orders/deliveries/:deliveryId/returns
router.post(
    "/deliveries/:deliveryId/returns",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(deliveryIdParamSchema),
    validateRequest(createDeliveryReturnSchema),
    auditMiddleware,
    expressAsyncHandler(deliveryReturnsController.createReturn.bind(deliveryReturnsController))
);

// POST /api/factory/customer-orders/customers/:customerId/deliveries
// Customer-level entry: items may span multiple orders for this customer.
router.post(
    "/customers/:customerId/deliveries",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(customerIdSchema),
    validateRequest(createDeliverySchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.createCustomerDelivery.bind(deliveriesController))
);

// GET /api/factory/customer-orders/customers/:customerId/deliveries
// All deliveries (across orders) for a single customer — used by the
// customer-level deliveries list.
router.get(
    "/customers/:customerId/deliveries",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(customerIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.listDeliveriesForCustomer.bind(deliveriesController))
);

// GET /api/factory/customer-orders/customers/:customerId/monthly-bill/data
// JSON preview of the consolidated bill (challan list) for the on-screen table.
// Registered before the PDF route so "/data" isn't swallowed by the PDF handler.
router.get(
    "/customers/:customerId/monthly-bill/data",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(customerIdSchema),
    auditMiddleware,
    expressAsyncHandler(monthlyBillsController.getMonthlyBillData.bind(monthlyBillsController))
);

// GET /api/factory/customer-orders/customers/:customerId/monthly-bill
// Consolidated per-customer bill covering every challan in ?from=YYYY-MM-DD&to=YYYY-MM-DD.
// Optional ?vat=with|without splits into VAT-bearing vs without-VAT bills.
router.get(
    "/customers/:customerId/monthly-bill",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(customerIdSchema),
    auditMiddleware,
    expressAsyncHandler(monthlyBillsController.exportMonthlyBillPdf.bind(monthlyBillsController))
);

// GET /api/factory/customer-orders - Get all customer orders with filtering and pagination
router.get(
    "/",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateQuery(orderQuerySchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.getAllCustomerOrders)
);

// GET /api/factory/customer-orders/stats - Get order statistics
router.get(
    "/stats",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.getOrderStats)
);

// GET /api/factory/customer-orders/export - Export customer orders
router.get(
    "/export",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateQuery(exportOrdersSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.exportCustomerOrders)
);

// GET /api/factory/customer-orders/:id - Get customer order by ID
router.get(
    "/:id",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.getCustomerOrderById)
);

// GET /api/factory/customer-orders/:id/expenses-summary - rolled-up expense total across linked WOs
router.get(
    "/:id/expenses-summary",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.getCustomerOrderExpensesSummary)
);

// GET /api/factory/customer-orders/:id/pdf - Export quotation/order PDF
router.get(
    "/:id/pdf",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.exportQuotationPdf)
);

// GET /api/factory/customer-orders/:id/invoice - Export invoice (Bill) PDF
router.get(
    "/:id/invoice",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.exportInvoicePdf)
);

// GET /api/factory/customer-orders/:id/challan - Export challan PDF
router.get(
    "/:id/challan",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.exportChallanPdf)
);

// POST /api/factory/customer-orders - Create new customer order
router.post(
    "/",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_CREATE),
    validateRequest(createCustomerOrderSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.createCustomerOrder)
);

// PUT /api/factory/customer-orders/:id - Update customer order
router.put(
    "/:id",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(orderIdSchema),
    validateRequest(updateCustomerOrderSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.updateCustomerOrder)
);

// POST /api/factory/customer-orders/:id/convert-with-lines - Replace lines + approve in one transaction
router.post(
    "/:id/convert-with-lines",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_APPROVE),
    validateParams(orderIdSchema),
    validateRequest(convertOrderWithLinesSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.convertOrderWithLines)
);

// POST /api/factory/customer-orders/:id/approve - Approve/Reject customer order
router.post(
    "/:id/approve",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_APPROVE),
    validateParams(orderIdSchema),
    validateRequest(approveOrderSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.approveCustomerOrder)
);

// POST /api/factory/customer-orders/:id/status - Update order status
router.post(
    "/:id/status",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(orderIdSchema),
    validateRequest(updateOrderStatusSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.updateOrderStatus)
);

// POST /api/factory/customer-orders/:id/ship - Ship customer order (auto-generates invoice)
router.post(
    "/:id/ship",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.shipCustomerOrder)
);

// POST /api/factory/customer-orders/:id/deliveries - Create partial delivery
router.post(
    "/:id/deliveries",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(orderIdSchema),
    validateRequest(createDeliverySchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.createDelivery.bind(deliveriesController))
);

// GET /api/factory/customer-orders/:id/deliveries - List deliveries for an order
router.get(
    "/:id/deliveries",
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(deliveriesController.listDeliveriesForOrder.bind(deliveriesController))
);

// POST /api/factory/customer-orders/:id/generate-invoice - Manually generate invoice for order
router.post(
    "/:id/generate-invoice",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(async (req, res, next) => {
        try {
            const { SalesInvoiceMediator } = await import('../mediators/salesInvoices/SalesInvoiceMediator');
            const invoice = await SalesInvoiceMediator.createInvoiceFromOrder(
                { customer_order_id: req.params.id, ...req.body },
                req.user!.user_id
            );
            res.status(201);
            serializeSuccessResponse(res, invoice, 'Invoice generated successfully');
        } catch (error) {
            next(error);
        }
    })
);

// POST /api/factory/customer-orders/bulk/status - Bulk update order status
router.post(
    "/bulk/status",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateRequest(bulkUpdateOrderStatusSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.bulkUpdateOrderStatus)
);

// DELETE /api/factory/customer-orders/:id - Delete customer order
router.delete(
    "/:id",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_DELETE),
    validateParams(orderIdSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.deleteCustomerOrder)
);

// DELETE /api/factory/customer-orders/bulk - Bulk delete customer orders
router.delete(
    "/bulk",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_DELETE),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.bulkDeleteCustomerOrders)
);

// POST /api/factory/customer-orders/:id/payments - Record payment against customer order
router.post(
    "/:id/payments",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
    validateParams(orderIdSchema),
    validateRequest(recordPaymentSchema),
    auditMiddleware,
    expressAsyncHandler(CustomerOrdersController.recordPayment)
);

// GET /api/factory/customer-orders/:id/payments - Get payment history for customer order
router.get(
    "/:id/payments",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    expressAsyncHandler(CustomerOrdersController.getPaymentHistory)
);

// GET /api/factory/customer-orders/:id/payments/summary - Get payment summary for customer order
router.get(
    "/:id/payments/summary",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    validateParams(orderIdSchema),
    expressAsyncHandler(CustomerOrdersController.getPaymentSummary)
);

// GET /api/factory/customer-orders/payments/all - Get all customer payments across all orders
router.get(
    "/payments/all",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    expressAsyncHandler(CustomerOrdersController.getAllPayments)
);

export default router;
