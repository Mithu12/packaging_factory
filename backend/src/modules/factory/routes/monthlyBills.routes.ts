import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { monthlyBillsController } from "../controllers/monthlyBills.controller";
import { auditMiddleware } from "@/middleware/audit";

const router = express.Router();
router.use(authenticate);

// GET /api/factory/monthly-bills — list saved bills
router.get(
  "/",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  auditMiddleware,
  expressAsyncHandler(monthlyBillsController.listMonthlyBills.bind(monthlyBillsController)),
);

// GET /api/factory/monthly-bills/:id — get saved bill with line items
router.get(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  auditMiddleware,
  expressAsyncHandler(monthlyBillsController.getMonthlyBill.bind(monthlyBillsController)),
);

// GET /api/factory/monthly-bills/:id/pdf — download saved bill PDF
router.get(
  "/:id/pdf",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_READ),
  auditMiddleware,
  expressAsyncHandler(monthlyBillsController.exportSavedMonthlyBillPdf.bind(monthlyBillsController)),
);

// DELETE /api/factory/monthly-bills/:id — delete saved bill
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.FACTORY_ORDERS_DELETE),
  auditMiddleware,
  expressAsyncHandler(monthlyBillsController.deleteMonthlyBill.bind(monthlyBillsController)),
);

export default router;
