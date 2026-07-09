import express from "express";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import SalesReportsController from "../controllers/salesReports.controller";

const router = express.Router();

router.get(
  "/reports/sales-summary",
  authenticate,
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(SalesReportsController.getSalesSummary)
);

router.get(
  "/reports/customer-performance",
  authenticate,
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(SalesReportsController.getCustomerPerformance)
);

router.get(
  "/reports/payment-analysis",
  authenticate,
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(SalesReportsController.getPaymentAnalysis)
);

router.get(
  "/reports/order-fulfillment",
  authenticate,
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(SalesReportsController.getOrderFulfillment)
);

router.get(
  "/reports/returns-analysis",
  authenticate,
  requirePermission(PERMISSIONS.SALES_ORDERS_READ),
  expressAsyncHandler(SalesReportsController.getReturnsAnalysis)
);

router.get(
  "/reports/customer-due",
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_READ),
  expressAsyncHandler(SalesReportsController.getCustomerDueReport)
);

export default router;
