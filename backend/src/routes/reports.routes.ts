import express from 'express';
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import ReportsController from "@/controllers/reports/reports.controller";

const router = express.Router();

// GET /api/reports/sales-summary - Get sales summary report
router.get('/sales-summary',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(ReportsController.getSalesSummary)
);

// GET /api/reports/customer-performance - Get customer performance report
router.get('/customer-performance',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(ReportsController.getCustomerPerformance)
);

// GET /api/reports/payment-analysis - Get payment analysis report
router.get('/payment-analysis',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(ReportsController.getPaymentAnalysis)
);

// GET /api/reports/order-fulfillment - Get order fulfillment report
router.get('/order-fulfillment',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(ReportsController.getOrderFulfillment)
);

// GET /api/reports/returns-analysis - Get returns analysis report
router.get('/returns-analysis',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(ReportsController.getReturnsAnalysis)
);

// GET /api/reports/customer-statements/:customerId - Get customer statement
router.get('/customer-statements/:customerId',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(ReportsController.getCustomerStatement)
);

// POST /api/reports/export - Export report to PDF/Excel
router.post('/export',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_EXPORT),
  expressAsyncHandler(ReportsController.exportReport)
);

export default router;