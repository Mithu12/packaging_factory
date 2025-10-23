import { Router } from 'express';
import { body, param, query } from 'express-validator';
import salesRepController from '../controllers/salesRepController';
import { requirePermission } from '../../../middleware/permission';
import { PERMISSIONS } from '../../../middleware/permission';
import {
  createCustomerValidation,
  updateCustomerValidation,
  customerFiltersValidation,
} from '../validation/customerValidation';
import {
  createOrderValidation,
  updateOrderValidation,
  updateOrderStatusValidation,
  orderFiltersValidation,
} from '../validation/orderValidation';
import {
  createInvoiceValidation,
  sendInvoiceValidation,
  invoiceFiltersValidation,
} from '../validation/invoiceValidation';
import {
  createPaymentValidation,
  paymentFiltersValidation,
} from '../validation/paymentValidation';
import {
  createDeliveryValidation,
  updateDeliveryValidation,
  updateDeliveryStatusValidation,
  deliveryFiltersValidation,
} from '../validation/deliveryValidation';
import {
  markNotificationAsReadValidation,
  markAllNotificationsAsReadValidation,
  notificationFiltersValidation,
} from '../validation/notificationValidation';
import {
  generateReportValidation,
  exportReportValidation,
  reportFiltersValidation,
} from '../validation/reportValidation';

const router = Router();

// Dashboard routes
router.get(
  '/dashboard/stats',
  requirePermission(PERMISSIONS.SALES_REP_DASHBOARD_READ),
  salesRepController.getDashboardStats
);

// Customer routes
router.get(
  '/customers',
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_READ),
  customerFiltersValidation,
  salesRepController.getCustomers
);

router.get(
  '/customers/:id',
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_READ),
  param('id').isInt({ min: 1 }).withMessage('Invalid customer ID'),
  salesRepController.getCustomer
);

router.post(
  '/customers',
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_CREATE),
  createCustomerValidation,
  salesRepController.createCustomer
);

router.put(
  '/customers/:id',
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_UPDATE),
  updateCustomerValidation,
  salesRepController.updateCustomer
);

router.delete(
  '/customers/:id',
  requirePermission(PERMISSIONS.SALES_REP_CUSTOMERS_DELETE),
  param('id').isInt({ min: 1 }).withMessage('Invalid customer ID'),
  salesRepController.deleteCustomer
);

// Order routes
router.get(
  '/orders',
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_READ),
  orderFiltersValidation,
  salesRepController.getOrders
);

router.get(
  '/orders/:id',
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_READ),
  param('id').isInt({ min: 1 }).withMessage('Invalid order ID'),
  salesRepController.getOrder
);

router.post(
  '/orders',
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_CREATE),
  createOrderValidation,
  salesRepController.createOrder
);

router.put(
  '/orders/:id',
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_UPDATE),
  updateOrderValidation,
  salesRepController.updateOrder
);

router.patch(
  '/orders/:id/status',
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_UPDATE),
  updateOrderStatusValidation,
  salesRepController.updateOrderStatus
);

router.delete(
  '/orders/:id',
  requirePermission(PERMISSIONS.SALES_REP_ORDERS_DELETE),
  param('id').isInt({ min: 1 }).withMessage('Invalid order ID'),
  salesRepController.deleteOrder
);

// Invoice routes
router.get(
  '/invoices',
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_READ),
  invoiceFiltersValidation,
  salesRepController.getInvoices
);

router.get(
  '/invoices/:id',
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_READ),
  param('id').isInt({ min: 1 }).withMessage('Invalid invoice ID'),
  salesRepController.getInvoice
);

router.post(
  '/invoices',
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_CREATE),
  createInvoiceValidation,
  salesRepController.createInvoice
);

router.post(
  '/invoices/:id/send',
  requirePermission(PERMISSIONS.SALES_REP_INVOICES_UPDATE),
  sendInvoiceValidation,
  salesRepController.sendInvoice
);

// Payment routes
router.get(
  '/payments',
  requirePermission(PERMISSIONS.SALES_REP_PAYMENTS_READ),
  paymentFiltersValidation,
  salesRepController.getPayments
);

router.get(
  '/payments/:id',
  requirePermission(PERMISSIONS.SALES_REP_PAYMENTS_READ),
  param('id').isInt({ min: 1 }).withMessage('Invalid payment ID'),
  salesRepController.getPayment
);

router.post(
  '/payments',
  requirePermission(PERMISSIONS.SALES_REP_PAYMENTS_CREATE),
  createPaymentValidation,
  salesRepController.createPayment
);

// Delivery routes
router.get(
  '/deliveries',
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_READ),
  deliveryFiltersValidation,
  salesRepController.getDeliveries
);

router.get(
  '/deliveries/:id',
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_READ),
  param('id').isInt({ min: 1 }).withMessage('Invalid delivery ID'),
  salesRepController.getDelivery
);

router.post(
  '/deliveries',
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_CREATE),
  createDeliveryValidation,
  salesRepController.createDelivery
);

router.put(
  '/deliveries/:id',
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_UPDATE),
  updateDeliveryValidation,
  salesRepController.updateDelivery
);

router.patch(
  '/deliveries/:id/status',
  requirePermission(PERMISSIONS.SALES_REP_DELIVERIES_UPDATE),
  updateDeliveryStatusValidation,
  salesRepController.updateDeliveryStatus
);

// Notification routes
router.get(
  '/notifications',
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_READ),
  notificationFiltersValidation,
  salesRepController.getNotifications
);

router.patch(
  '/notifications/:id/read',
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_UPDATE),
  markNotificationAsReadValidation,
  salesRepController.markNotificationAsRead
);

router.patch(
  '/notifications/mark-all-read',
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_UPDATE),
  markAllNotificationsAsReadValidation,
  salesRepController.markAllNotificationsAsRead
);

router.delete(
  '/notifications/:id',
  requirePermission(PERMISSIONS.SALES_REP_NOTIFICATIONS_UPDATE),
  param('id').isInt({ min: 1 }).withMessage('Invalid notification ID'),
  salesRepController.deleteNotification
);

// Report routes
router.get(
  '/reports',
  requirePermission(PERMISSIONS.SALES_REP_REPORTS_READ),
  reportFiltersValidation,
  salesRepController.getReports
);

router.post(
  '/reports/generate',
  requirePermission(PERMISSIONS.SALES_REP_REPORTS_READ),
  generateReportValidation,
  salesRepController.generateReport
);

router.get(
  '/reports/:id/export',
  requirePermission(PERMISSIONS.SALES_REP_REPORTS_EXPORT),
  exportReportValidation,
  salesRepController.exportReport
);

export default router;

