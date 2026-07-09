import express from "express";
import { authenticate } from "@/middleware/auth";
import {
    requirePermission,
    PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import ProductionReportController from "../controllers/productionReport.controller";

const router = express.Router();

router.get(
    "/summary",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
    expressAsyncHandler(ProductionReportController.getProductionSummary)
);

router.get(
    "/work-orders",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_WORK_ORDERS_READ),
    expressAsyncHandler(ProductionReportController.getWorkOrders)
);

router.get(
    "/runs",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_PRODUCTION_RUNS_READ),
    expressAsyncHandler(ProductionReportController.getProductionRuns)
);

router.get(
    "/line-utilization",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_PRODUCTION_LINES_READ),
    expressAsyncHandler(ProductionReportController.getLineUtilization)
);

router.get(
    "/wastage",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_WASTAGE_READ),
    expressAsyncHandler(ProductionReportController.getWastageSummary)
);

export default router;
