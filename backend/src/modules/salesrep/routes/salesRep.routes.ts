import { Router } from "express";
import salesRepController from "../controllers/salesRepController";
import { requirePermission } from "../../../middleware/permission";
import { PERMISSIONS } from "../../../middleware/permission";
import {
  validateRequest,
  validateQuery,
  validateParams,
} from "../../../middleware/validation";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerFiltersSchema,
  customerIdSchema,
} from "../validation/customerValidation";
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  orderFiltersSchema,
  orderIdSchema,
  submitDraftOrderSchema,
  adminApprovalSchema,
  factoryManagerAcceptanceSchema,
} from "../validation/orderValidation";
import {
  createInvoiceSchema,
  sendInvoiceSchema,
  invoiceFiltersSchema,
  invoiceIdSchema,
} from "../validation/invoiceValidation";
import {
  createPaymentSchema,
  paymentFiltersSchema,
  paymentIdSchema,
} from "../validation/paymentValidation";
import {
  createDeliverySchema,
  updateDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryFiltersSchema,
  deliveryIdSchema,
} from "../validation/deliveryValidation";
import {
  markNotificationAsReadSchema,
  markAllNotificationsAsReadSchema,
  notificationFiltersSchema,
  notificationIdSchema,
} from "../validation/notificationValidation";
import {
  generateReportSchema,
  exportReportSchema,
  reportFiltersSchema,
  reportIdSchema,
} from "../validation/reportValidation";
import { auditMiddleware } from "@/middleware/audit";
import { authenticate } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

// Dashboard routes
router.get(
  "/dashboard/stats",
  requirePermission(PERMISSIONS.SALES_REP_DASHBOARD_READ),
  salesRepController.getDashboardStats
);

// Customer routes
router.get(
  "/customers",
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_READ),
  validateQuery(customerFiltersSchema),
  salesRepController.getCustomers
);

router.get(
  "/customers/:id",
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_READ),
  validateParams(customerIdSchema),
  salesRepController.getCustomer
);

router.post(
  "/customers",
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_CREATE),
  validateRequest(createCustomerSchema),
  auditMiddleware,
  salesRepController.createCustomer
);

router.put(
  "/customers/:id",
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_UPDATE),
  validateParams(customerIdSchema),
  validateRequest(updateCustomerSchema),
  auditMiddleware,
  salesRepController.updateCustomer
);

router.delete(
  "/customers/:id",
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_DELETE),
  validateParams(customerIdSchema),
  auditMiddleware,
  salesRepController.deleteCustomer
);

// Order routes
router.get(
  "/orders",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_READ),
  validateQuery(orderFiltersSchema),
  salesRepController.getOrders
);

router.get(
  "/orders/:id",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_READ),
  validateParams(orderIdSchema),
  salesRepController.getOrder
);

router.post(
  "/orders",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_CREATE),
  validateRequest(createOrderSchema),
  auditMiddleware,
  salesRepController.createOrder
);

router.put(
  "/orders/:id",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_UPDATE),
  validateParams(orderIdSchema),
  validateRequest(updateOrderSchema),
  auditMiddleware,
  salesRepController.updateOrder
);

router.patch(
  "/orders/:id/status",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_UPDATE),
  validateParams(orderIdSchema),
  validateRequest(updateOrderStatusSchema),
  auditMiddleware,
  salesRepController.updateOrderStatus
);

router.delete(
  "/orders/:id",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_DELETE),
  validateParams(orderIdSchema),
  auditMiddleware,
  salesRepController.deleteOrder
);

// Invoice routes
router.get(
  "/invoices",
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_READ),
  validateQuery(invoiceFiltersSchema),
  salesRepController.getInvoices
);

router.get(
  "/invoices/:id",
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_READ),
  validateParams(invoiceIdSchema),
  salesRepController.getInvoice
);

router.post(
  "/invoices",
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_CREATE),
  validateRequest(createInvoiceSchema),
  auditMiddleware,
  salesRepController.createInvoice
);

router.post(
  "/invoices/:id/send",
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_UPDATE),
  validateParams(invoiceIdSchema),
  validateRequest(sendInvoiceSchema),
  auditMiddleware,
  salesRepController.sendInvoice
);

// Payment routes
router.get(
  "/payments",
  requirePermission(PERMISSIONS.SALES_REP_PAYMENTS_READ),
  validateQuery(paymentFiltersSchema),
  salesRepController.getPayments
);

router.get(
  "/payments/:id",
  requirePermission(PERMISSIONS.SALES_REP_PAYMENTS_READ),
  validateParams(paymentIdSchema),
  salesRepController.getPayment
);

router.post(
  "/payments",
  requirePermission(PERMISSIONS.SALES_REP_PAYMENTS_CREATE),
  validateRequest(createPaymentSchema),
  auditMiddleware,
  salesRepController.createPayment
);

// Delivery routes
router.get(
  "/deliveries",
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_READ),
  validateQuery(deliveryFiltersSchema),
  salesRepController.getDeliveries
);

router.get(
  "/deliveries/:id",
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_READ),
  validateParams(deliveryIdSchema),
  salesRepController.getDelivery
);

router.post(
  "/deliveries",
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_CREATE),
  validateRequest(createDeliverySchema),
  auditMiddleware,
  salesRepController.createDelivery
);

router.put(
  "/deliveries/:id",
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_UPDATE),
  validateParams(deliveryIdSchema),
  validateRequest(updateDeliverySchema),
  auditMiddleware,
  salesRepController.updateDelivery
);

router.patch(
  "/deliveries/:id/status",
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_UPDATE),
  validateParams(deliveryIdSchema),
  validateRequest(updateDeliveryStatusSchema),
  auditMiddleware,
  salesRepController.updateDeliveryStatus
);

// Notification routes
router.get(
  "/notifications",
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_READ),
  validateQuery(notificationFiltersSchema),
  salesRepController.getNotifications
);

router.patch(
  "/notifications/:id/read",
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_UPDATE),
  validateParams(notificationIdSchema),
  validateRequest(markNotificationAsReadSchema),
  auditMiddleware,
  salesRepController.markNotificationAsRead
);

router.patch(
  "/notifications/mark-all-read",
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_UPDATE),
  validateRequest(markAllNotificationsAsReadSchema),
  auditMiddleware,
  salesRepController.markAllNotificationsAsRead
);

router.delete(
  "/notifications/:id",
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_UPDATE),
  validateParams(notificationIdSchema),
  auditMiddleware,
  salesRepController.deleteNotification
);

// Report routes
router.get(
  "/reports",
  requirePermission(PERMISSIONS.SALES_REP_REPORTS_READ),
  validateQuery(reportFiltersSchema),
  salesRepController.getReports
);

router.post(
  "/reports/generate",
  requirePermission(PERMISSIONS.SALES_REP_REPORTS_READ),
  validateRequest(generateReportSchema),
  auditMiddleware,
  salesRepController.generateReport
);

router.get(
  "/reports/:id/export",
  requirePermission(PERMISSIONS.SALES_REP_REPORTS_EXPORT),
  validateParams(reportIdSchema),
  validateQuery(exportReportSchema),
  salesRepController.exportReport
);

// Draft Order Approval Workflow Routes

// POST /api/salesrep/orders/:id/submit-for-approval - Submit draft order for admin approval
router.post(
  "/orders/:id/submit-for-approval",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_CREATE),
  validateParams(orderIdSchema),
  validateRequest(submitDraftOrderSchema),
  auditMiddleware,
  salesRepController.submitDraftOrderForApproval
);

// POST /api/salesrep/orders/:id/admin-approve - Admin approval/rejection with factory selection (legacy)
router.post(
  "/orders/:id/admin-approve",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_UPDATE),
  validateParams(orderIdSchema),
  validateRequest(adminApprovalSchema),
  auditMiddleware,
  salesRepController.adminApproveOrder
);

// POST /api/salesrep/orders/:id/admin-approve-with-product-factories - Admin approval with per-product factory assignment
router.post(
  "/orders/:id/admin-approve-with-product-factories",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_UPDATE),
  validateParams(orderIdSchema),
  validateRequest(adminApprovalSchema), // Using same schema for now, will update validation later
  auditMiddleware,
  salesRepController.adminApproveOrderWithProductFactoryAssignment
);

// POST /api/salesrep/orders/:id/factory-accept - Factory manager acceptance
router.post(
  "/orders/:id/factory-accept",
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_UPDATE),
  validateParams(orderIdSchema),
  validateRequest(factoryManagerAcceptanceSchema),
  auditMiddleware,
  salesRepController.factoryManagerAcceptOrder
);

export default router;
