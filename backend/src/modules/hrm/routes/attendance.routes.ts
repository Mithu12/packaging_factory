import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import AttendanceController from "../controllers/attendance.controller";
import { auditMiddleware } from "@/middleware/audit";

const router = express.Router();
router.use(authenticate);

// Apply audit middleware to all routes
router.use(auditMiddleware);

// =====================================================
// Work Schedule Routes
// =====================================================

// Get all work schedules
router.get(
  "/schedules",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.getWorkSchedules)
);

// Create new work schedule
router.post(
  "/schedules",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_CREATE),
  expressAsyncHandler(AttendanceController.createWorkSchedule)
);

// =====================================================
// Attendance Record Routes
// =====================================================

// Get all attendance records
router.get(
  "/records",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.getAttendanceRecords)
);

// Create new attendance record
router.post(
  "/records",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_CREATE),
  expressAsyncHandler(AttendanceController.createAttendanceRecord)
);

// Get attendance record by ID
router.get(
  "/records/:id",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.getAttendanceRecordById)
);

// Update attendance record
router.put(
  "/records/:id",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_UPDATE),
  expressAsyncHandler(AttendanceController.updateAttendanceRecord)
);

// Delete attendance record
router.delete(
  "/records/:id",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_DELETE),
  expressAsyncHandler(AttendanceController.deleteAttendanceRecord)
);

// =====================================================
// Attendance Marking Routes
// =====================================================

// Mark attendance (check-in/check-out)
router.post(
  "/mark",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_CREATE),
  expressAsyncHandler(AttendanceController.markAttendance)
);

// Mark attendance for specific employee (HR)
router.post(
  "/:employeeId/mark",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_CREATE),
  expressAsyncHandler(AttendanceController.markAttendance)
);

// =====================================================
// Attendance Summary and Dashboard Routes
// =====================================================

// Get attendance summary for employee
router.get(
  "/summary/:employeeId",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.getAttendanceSummary)
);

// Get attendance dashboard
router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.getAttendanceDashboard)
);

// Get attendance report
router.get(
  "/report",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.getAttendanceReport)
);

// =====================================================
// Self-Service Attendance Routes
// =====================================================

// Get my attendance records
router.get(
  "/my-records",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(AttendanceController.getMyAttendanceRecords)
);

// =====================================================
// Attendance Calendar and Export Routes
// =====================================================

// Get attendance calendar for specific year/month
router.get(
  "/calendar/:year/:month",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.getAttendanceCalendar)
);

// Export attendance data
router.get(
  "/export",
  requirePermission(PERMISSIONS.HR_ATTENDANCE_READ),
  expressAsyncHandler(AttendanceController.exportAttendanceData)
);

export default router;
