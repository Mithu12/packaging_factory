import express from "express";
import { authenticate } from "@/middleware/auth";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import EmployeeController from "../controllers/employees.controller";
import { auditMiddleware } from "@/middleware/audit";

const router = express.Router();
router.use(authenticate);

// Apply audit middleware to all routes
// TODO: Re-enable after fixing audit middleware issue
router.use(auditMiddleware);

// =====================================================
// Employee CRUD Routes
// =====================================================

// Get all employees
router.get(
  "/",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployees)
);


// Create new employee
router.post(
  "/",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_CREATE),
  auditMiddleware,
  expressAsyncHandler(EmployeeController.createEmployee)
);

// Update employee
router.put(
  "/:id",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_UPDATE),
  auditMiddleware,
  expressAsyncHandler(EmployeeController.updateEmployee)
);

// Delete employee
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_DELETE),
  auditMiddleware,
  expressAsyncHandler(EmployeeController.deleteEmployee)
);

// =====================================================
// Employee Dashboard Routes
// =====================================================

// Get employee dashboard
router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployeeDashboard)
);


// Get employee by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployeeById)
);

// =====================================================
// Employee Query Routes
// =====================================================

// Get employees by department
router.get(
  "/department/:departmentId",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployeesByDepartment)
);

// Get employees by designation
router.get(
  "/designation/:designationId",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployeesByDesignation)
);

// Get employee hierarchy
router.get(
  "/hierarchy/:employeeId?",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployeeHierarchy)
);

// Search employees
router.get(
  "/search",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.searchEmployees)
);

// =====================================================
// Employee Data Management Routes
// =====================================================

// Bulk import employees
router.post(
  "/bulk-import",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_CREATE),
  auditMiddleware,
  expressAsyncHandler(EmployeeController.bulkImportEmployees)
);

// Export employees
router.get(
  "/export",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.exportEmployees)
);

// =====================================================
// Employee Document Routes
// =====================================================

// Get employee documents
router.get(
  "/:id/documents",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployeeDocuments)
);

// Upload employee document
router.post(
  "/:id/documents",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_CREATE),
  auditMiddleware,
  expressAsyncHandler(EmployeeController.uploadEmployeeDocument)
);

// =====================================================
// Employee Salary Routes
// =====================================================

// Get employee salary history
router.get(
  "/:id/salary-history",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_READ),
  expressAsyncHandler(EmployeeController.getEmployeeSalaryHistory)
);

// Update employee salary
router.put(
  "/:id/salary",
  requirePermission(PERMISSIONS.HR_EMPLOYEES_UPDATE),
  auditMiddleware,
  expressAsyncHandler(EmployeeController.updateEmployeeSalary)
);

export default router;
