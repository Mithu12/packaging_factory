import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { LeaveController } from "../controllers/leave.controller";
import { auditMiddleware } from "@/middleware/audit";

const router = express.Router();
router.use(authenticate);

// Apply audit middleware to all routes
router.use(auditMiddleware);

// =====================================================
// Leave Type Routes
// =====================================================

// Get all leave types
router.get(
  "/types",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.getLeaveTypes)
);

// Create new leave type
router.post(
  "/types",
  requirePermission(PERMISSIONS.HR_LEAVE_CREATE),
  expressAsyncHandler(LeaveController.createLeaveType)
);

// =====================================================
// Leave Application Routes
// =====================================================

// Get all leave applications
router.get(
  "/applications",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.getLeaveApplications)
);

// Create new leave application
router.post(
  "/applications",
  requirePermission(PERMISSIONS.HR_LEAVE_CREATE),
  expressAsyncHandler(LeaveController.createLeaveApplication)
);

// Get leave application by ID
router.get(
  "/applications/:id",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.getLeaveApplicationById)
);

// Process leave application (approve/reject)
router.post(
  "/applications/:applicationId/process",
  requirePermission(PERMISSIONS.HR_LEAVE_APPROVE),
  expressAsyncHandler(LeaveController.processLeaveApplication)
);

// Cancel leave application
router.delete(
  "/applications/:id",
  requirePermission(PERMISSIONS.HR_LEAVE_DELETE),
  expressAsyncHandler(LeaveController.cancelLeaveApplication)
);

// =====================================================
// Leave Dashboard and Calendar Routes
// =====================================================

// Get leave dashboard
router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.getLeaveDashboard)
);

// Get leave calendar for specific year/month
router.get(
  "/calendar/:year/:month",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.getLeaveCalendar)
);

// =====================================================
// Self-Service Leave Routes
// =====================================================

// Get my leave applications
router.get(
  "/my-applications",
  requirePermission(PERMISSIONS.SELF_SERVICE_LEAVE_READ),
  expressAsyncHandler(LeaveController.getMyLeaveApplications)
);

// =====================================================
// Leave Summary and Export Routes
// =====================================================

// Get leave summary for employee
router.get(
  "/employees/:employeeId/summary",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.getLeaveSummary)
);

// Export leave data
router.get(
  "/export",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.exportLeaveData)
);

// =====================================================
// Employee Leave Balance Routes
// =====================================================

// Get leave balances for employee
router.get(
  "/employees/:employeeId/leave-balances",
  requirePermission(PERMISSIONS.HR_LEAVE_READ),
  expressAsyncHandler(LeaveController.getLeaveBalances)
);

// Calculate leave balances for employee
router.post(
  "/employees/:employeeId/leave-balances/calculate",
  requirePermission(PERMISSIONS.HR_LEAVE_UPDATE),
  expressAsyncHandler(LeaveController.calculateLeaveBalances)
);

export default router;
