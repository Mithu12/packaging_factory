import express from "express";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import StockReportsController from "../controllers/stockReports.controller";

const router = express.Router();

router.get(
  "/stock-summary",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_READ),
  expressAsyncHandler(StockReportsController.getStockSummary)
);

router.get(
  "/stock-overview",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_READ),
  expressAsyncHandler(StockReportsController.getStockOverview)
);

router.get(
  "/stock-by-category",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_READ),
  expressAsyncHandler(StockReportsController.getStockByCategory)
);

router.get(
  "/low-stock",
  authenticate,
  requirePermission(PERMISSIONS.INVENTORY_READ),
  expressAsyncHandler(StockReportsController.getLowStockProducts)
);

export default router;
