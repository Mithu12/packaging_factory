import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import PayrollController from "../controllers/payroll.controller";
import { auditMiddleware } from "@/middleware/audit";

const router = express.Router();
router.use(authenticate);

// Apply audit middleware to all routes
router.use(auditMiddleware);

// =====================================================
// Payroll Period Routes
// =====================================================

// Get all payroll periods
router.get(
  "/periods",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.getPayrollPeriods)
);

// Create new payroll period
router.post(
  "/periods",
  requirePermission(PERMISSIONS.HR_PAYROLL_CREATE),
  expressAsyncHandler(PayrollController.createPayrollPeriod)
);

// Get payroll period by ID
router.get(
  "/periods/:id",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.getPayrollPeriodById)
);

// Update payroll period
router.put(
  "/periods/:id",
  requirePermission(PERMISSIONS.HR_PAYROLL_UPDATE),
  expressAsyncHandler(PayrollController.updatePayrollPeriod)
);

// Delete payroll period
router.delete(
  "/periods/:id",
  requirePermission(PERMISSIONS.HR_PAYROLL_DELETE),
  expressAsyncHandler(PayrollController.deletePayrollPeriod)
);

// =====================================================
// Payroll Component Routes
// =====================================================

// Get all payroll components
router.get(
  "/components",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.getPayrollComponents)
);

// Create new payroll component
router.post(
  "/components",
  requirePermission(PERMISSIONS.HR_PAYROLL_CREATE),
  expressAsyncHandler(PayrollController.createPayrollComponent)
);

// =====================================================
// Payroll Processing Routes
// =====================================================

// Calculate payroll
router.post(
  "/calculate",
  requirePermission(PERMISSIONS.HR_PAYROLL_PROCESS),
  expressAsyncHandler(PayrollController.calculatePayroll)
);

// Get all payroll runs
router.get(
  "/runs",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.getPayrollRuns)
);

// Get payroll run by ID
router.get(
  "/runs/:id",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.getPayrollRunById)
);

// Approve payroll run
router.post(
  "/runs/:id/approve",
  requirePermission(PERMISSIONS.HR_PAYROLL_APPROVE),
  expressAsyncHandler(PayrollController.approvePayrollRun)
);

// Record payments for selected employees (updates payroll_details; may mark run paid)
router.post(
  "/runs/:id/pay",
  requirePermission(PERMISSIONS.HR_PAYROLL_PROCESS),
  expressAsyncHandler(PayrollController.recordPayrollPayments)
);

// =====================================================
// Payroll Summary and Dashboard Routes
// =====================================================

// Get payroll summary for period
router.get(
  "/summary/:periodId",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.getPayrollSummary)
);

// Get payroll dashboard
router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.getPayrollDashboard)
);

// =====================================================
// Employee Salary Structure Routes
// =====================================================

// Setup employee salary structure
router.post(
  "/employees/:employeeId/structure",
  requirePermission(PERMISSIONS.HR_PAYROLL_UPDATE),
  expressAsyncHandler(PayrollController.setupEmployeeSalaryStructure)
);

// =====================================================
// Payroll Export Routes
// =====================================================

// Export payroll by period (must be before /export/:runId)
router.get(
  "/export/period/:periodId",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.exportPayrollByPeriod)
);

// Export payroll by run ID
router.get(
  "/export/:runId",
  requirePermission(PERMISSIONS.HR_PAYROLL_READ),
  expressAsyncHandler(PayrollController.exportPayroll)
);

export default router;
