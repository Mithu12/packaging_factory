import express from 'express';
import { salesInvoicesController } from '../controllers/salesInvoices.controller';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permission';
import { PERMISSIONS } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';
import expressAsyncHandler from 'express-async-handler';

const router = express.Router();

/**
 * @route   GET /api/factory/sales-invoices/stats
 * @desc    Get sales invoice statistics
 * @access  Private (FACTORY_ORDERS_VIEW)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(salesInvoicesController.getSalesInvoiceStats.bind(salesInvoicesController))
);

/**
 * @route   GET /api/factory/sales-invoices
 * @desc    Get all sales invoices with filtering
 * @access  Private (FACTORY_ORDERS_VIEW)
 */
router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(salesInvoicesController.getAllSalesInvoices.bind(salesInvoicesController))
);

/**
 * @route   GET /api/factory/sales-invoices/:id/pdf
 * @desc    Download sales invoice as PDF
 * @access  Private (FACTORY_ORDERS_READ)
 */
router.get(
  '/:id/pdf',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(salesInvoicesController.downloadInvoicePDF.bind(salesInvoicesController))
);

/**
 * @route   GET /api/factory/sales-invoices/:id
 * @desc    Get sales invoice by ID
 * @access  Private (FACTORY_ORDERS_VIEW)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  expressAsyncHandler(salesInvoicesController.getSalesInvoiceById.bind(salesInvoicesController))
);

/**
 * @route   POST /api/factory/sales-invoices
 * @desc    Create sales invoice from customer order
 * @access  Private (FACTORY_ORDERS_UPDATE)
 */
router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  auditMiddleware,
  expressAsyncHandler(salesInvoicesController.createSalesInvoice.bind(salesInvoicesController))
);

/**
 * @route   PUT /api/factory/sales-invoices/:id
 * @desc    Update sales invoice
 * @access  Private (FACTORY_ORDERS_UPDATE)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  auditMiddleware,
  expressAsyncHandler(salesInvoicesController.updateSalesInvoice.bind(salesInvoicesController))
);

/**
 * @route   POST /api/factory/sales-invoices/:id/payments
 * @desc    Record payment against invoice
 * @access  Private (FACTORY_ORDERS_UPDATE)
 */
router.post(
  '/:id/payments',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  auditMiddleware,
  expressAsyncHandler(salesInvoicesController.recordPayment.bind(salesInvoicesController))
);

/**
 * @route   POST /api/factory/sales-invoices/:id/cancel
 * @desc    Cancel sales invoice
 * @access  Private (FACTORY_ORDERS_UPDATE)
 */
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission(PERMISSIONS.FACTORY_ORDERS_UPDATE),
  auditMiddleware,
  expressAsyncHandler(salesInvoicesController.cancelSalesInvoice.bind(salesInvoicesController))
);

export default router;

