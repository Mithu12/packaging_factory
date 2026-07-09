import express from "express";
import { authenticate } from "@/middleware/auth";
import {
    requirePermission,
    PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import CostingReportController from "../controllers/costingReport.controller";

const router = express.Router();

router.get(
    "/summary",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_COST_ANALYSIS_READ),
    expressAsyncHandler(CostingReportController.getCostingSummary)
);

router.get(
    "/bom-details",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_BOMS_READ),
    expressAsyncHandler(CostingReportController.getBomDetails)
);

router.get(
    "/material-costs",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_COST_ANALYSIS_READ),
    expressAsyncHandler(CostingReportController.getMaterialCosts)
);

export default router;
