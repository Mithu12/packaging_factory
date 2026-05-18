import express from "express";
import { authenticate } from "@/middleware/auth";
import {
    requirePermission,
    PERMISSIONS,
} from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import FactoryReportsController from "../controllers/reports.controller";

const router = express.Router();

router.get(
    "/stock-vs-order-demand",
    authenticate,
    requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
    expressAsyncHandler(FactoryReportsController.getStockVsOrderDemand)
);

router.get(
    "/customer-payment-reminders",
    authenticate,
    requirePermission(PERMISSIONS.PAYMENTS_READ),
    expressAsyncHandler(FactoryReportsController.getCustomerPaymentReminders)
);

router.get(
    "/customer-payment-reminders/:id",
    authenticate,
    requirePermission(PERMISSIONS.PAYMENTS_READ),
    expressAsyncHandler(FactoryReportsController.getCustomerPaymentReminderDetail)
);

export default router;
