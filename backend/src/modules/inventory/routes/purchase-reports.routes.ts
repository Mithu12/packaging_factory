import express from "express";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import PurchaseReportsController from "../controllers/purchaseReports.controller";

const router = express.Router();

router.get(
  "/purchase-summary",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(PurchaseReportsController.getPurchaseSummary)
);

router.get(
  "/supplier-performance",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(PurchaseReportsController.getSupplierPerformance)
);

router.get(
  "/purchase-payments",
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_ORDERS_READ),
  expressAsyncHandler(PurchaseReportsController.getPurchasePayments)
);

export default router;
