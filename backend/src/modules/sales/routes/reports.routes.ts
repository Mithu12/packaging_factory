import express from 'express';
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import SalesReportsController from "../controllers/salesReports.controller";

const router = express.Router();

// GET /api/sales/reports/sales-summary - Get sales summary report
router.get('/sales-summary',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(SalesReportsController.getSalesSummary)
);

// GET /api/sales/reports/customer-performance - Get customer performance report
router.get('/customer-performance',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(SalesReportsController.getCustomerPerformance)
);

// GET /api/sales/reports/payment-analysis - Get payment analysis report
router.get('/payment-analysis',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(SalesReportsController.getPaymentAnalysis)
);

// GET /api/sales/reports/order-fulfillment - Get order fulfillment report
router.get('/order-fulfillment',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(SalesReportsController.getOrderFulfillment)
);

// GET /api/sales/reports/returns-analysis - Get returns analysis report
router.get('/returns-analysis',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(SalesReportsController.getReturnsAnalysis)
);

// GET /api/sales/reports/customer-statements/:customerId - Get customer statement
router.get('/customer-statements/:customerId',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_READ),
  expressAsyncHandler(SalesReportsController.getCustomerStatement)
);

// POST /api/sales/reports/export - Export report to PDF/Excel
router.post('/export',
  authenticate,
  requirePermission(PERMISSIONS.SALES_REPORTS_EXPORT),
  expressAsyncHandler(SalesReportsController.exportReport)
);

export default router;