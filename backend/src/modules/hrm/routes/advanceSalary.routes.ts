import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { auditMiddleware } from "@/middleware/audit";
import AdvanceSalaryController from "../controllers/advanceSalary.controller";

const router = express.Router();
router.use(authenticate);
router.use(auditMiddleware);

// Get advance salary stats
router.get(
  "/stats",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(AdvanceSalaryController.getAdvanceSalaryStats)
);

// Get upcoming deductions per employee
router.get(
  "/deductions",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(AdvanceSalaryController.getUpcomingDeductions)
);

// Get all advance salaries
router.get(
  "/",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(AdvanceSalaryController.getAdvanceSalaries)
);

// Get advance salary by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(AdvanceSalaryController.getAdvanceSalaryById)
);

// Create new advance salary
router.post(
  "/",
  requirePermission(PERMISSIONS.HR_PAYROLL_CREATE),
  expressAsyncHandler(AdvanceSalaryController.createAdvanceSalary)
);

// Approve/reject advance salary
router.post(
  "/:id/approve",
  requirePermission(PERMISSIONS.HR_PAYROLL_APPROVE),
  expressAsyncHandler(AdvanceSalaryController.approveAdvanceSalary)
);

export default router;
