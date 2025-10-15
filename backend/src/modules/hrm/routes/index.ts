// HRM Module Routes
import { Router } from 'express';
import { EmployeeController } from '../controllers/employees.controller';
import { PayrollController } from '../controllers/payroll.controller';
import { LeaveController } from '../controllers/leave.controller';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticate, requirePermission } from '../../../middleware/auth';
import { MODULES, ACTIONS } from '../../../types/rbac';

const router = Router();

// Initialize controllers
const employeeController = new EmployeeController();
const payrollController = new PayrollController();
const leaveController = new LeaveController();
const attendanceController = new AttendanceController();

// Employee routes
router.get('/employees', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployees.bind(employeeController));
router.get('/employees/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployeeById.bind(employeeController));
router.post('/employees', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'employees'), employeeController.createEmployee.bind(employeeController));
router.put('/employees/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.UPDATE, 'employees'), employeeController.updateEmployee.bind(employeeController));
router.delete('/employees/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.DELETE, 'employees'), employeeController.deleteEmployee.bind(employeeController));

// Employee-specific routes
router.get('/employees/dashboard', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployeeDashboard.bind(employeeController));
router.get('/employees/department/:departmentId', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployeesByDepartment.bind(employeeController));
router.get('/employees/designation/:designationId', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployeesByDesignation.bind(employeeController));
router.get('/employees/hierarchy/:employeeId?', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployeeHierarchy.bind(employeeController));
router.get('/employees/search', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.searchEmployees.bind(employeeController));
router.post('/employees/bulk-import', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'employees'), employeeController.bulkImportEmployees.bind(employeeController));
router.get('/employees/export', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.exportEmployees.bind(employeeController));
router.get('/employees/:id/documents', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployeeDocuments.bind(employeeController));
router.post('/employees/:id/documents', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'employees'), employeeController.uploadEmployeeDocument.bind(employeeController));
router.get('/employees/:id/salary-history', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'employees'), employeeController.getEmployeeSalaryHistory.bind(employeeController));
router.put('/employees/:id/salary', authenticate, requirePermission(MODULES.HR, ACTIONS.UPDATE, 'employees'), employeeController.updateEmployeeSalary.bind(employeeController));

// Payroll routes
router.get('/payroll/periods', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.getPayrollPeriods.bind(payrollController));
router.post('/payroll/periods', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'payroll'), payrollController.createPayrollPeriod.bind(payrollController));
router.get('/payroll/periods/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.getPayrollPeriodById.bind(payrollController));
router.put('/payroll/periods/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.UPDATE, 'payroll'), payrollController.updatePayrollPeriod.bind(payrollController));
router.delete('/payroll/periods/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.DELETE, 'payroll'), payrollController.deletePayrollPeriod.bind(payrollController));

router.get('/payroll/components', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.getPayrollComponents.bind(payrollController));
router.post('/payroll/components', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'payroll'), payrollController.createPayrollComponent.bind(payrollController));

router.post('/payroll/calculate', authenticate, requirePermission(MODULES.HR, ACTIONS.PROCESS, 'payroll'), payrollController.calculatePayroll.bind(payrollController));
router.get('/payroll/runs', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.getPayrollRuns.bind(payrollController));
router.get('/payroll/runs/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.getPayrollRunById.bind(payrollController));
router.post('/payroll/runs/:id/approve', authenticate, requirePermission(MODULES.HR, ACTIONS.APPROVE, 'payroll'), payrollController.approvePayrollRun.bind(payrollController));
router.get('/payroll/summary/:periodId', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.getPayrollSummary.bind(payrollController));
router.post('/payroll/employees/:employeeId/structure', authenticate, requirePermission(MODULES.HR, ACTIONS.UPDATE, 'payroll'), payrollController.setupEmployeeSalaryStructure.bind(payrollController));
router.get('/payroll/dashboard', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.getPayrollDashboard.bind(payrollController));
router.get('/payroll/export/:runId', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'payroll'), payrollController.exportPayroll.bind(payrollController));

// Leave routes
router.get('/leave/types', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.getLeaveTypes.bind(leaveController));
router.post('/leave/types', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'leave'), leaveController.createLeaveType.bind(leaveController));

router.get('/leave/applications', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.getLeaveApplications.bind(leaveController));
router.post('/leave/applications', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'leave'), leaveController.createLeaveApplication.bind(leaveController));
router.post('/leave/applications/:applicationId/process', authenticate, requirePermission(MODULES.HR, ACTIONS.APPROVE, 'leave'), leaveController.processLeaveApplication.bind(leaveController));
router.get('/leave/dashboard', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.getLeaveDashboard.bind(leaveController));
router.get('/leave/calendar/:year/:month', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.getLeaveCalendar.bind(leaveController));
router.get('/leave/my-applications', authenticate, requirePermission(MODULES.SELF_SERVICE, ACTIONS.READ, 'leave'), leaveController.getMyLeaveApplications.bind(leaveController));
router.get('/leave/applications/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.getLeaveApplicationById.bind(leaveController));
router.delete('/leave/applications/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.DELETE, 'leave'), leaveController.cancelLeaveApplication.bind(leaveController));
router.get('/leave/employees/:employeeId/summary', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.getLeaveSummary.bind(leaveController));
router.get('/leave/export', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.exportLeaveData.bind(leaveController));

// Employee-specific leave routes
router.get('/employees/:employeeId/leave-balances', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'leave'), leaveController.getLeaveBalances.bind(leaveController));
router.post('/employees/:employeeId/leave-balances/calculate', authenticate, requirePermission(MODULES.HR, ACTIONS.UPDATE, 'leave'), leaveController.calculateLeaveBalances.bind(leaveController));

// Attendance routes
router.get('/attendance/schedules', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.getWorkSchedules.bind(attendanceController));
router.post('/attendance/schedules', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'attendance'), attendanceController.createWorkSchedule.bind(attendanceController));

router.get('/attendance/records', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.getAttendanceRecords.bind(attendanceController));
router.post('/attendance/records', authenticate, requirePermission(MODULES.HR, ACTIONS.CREATE, 'attendance'), attendanceController.createAttendanceRecord.bind(attendanceController));
router.put('/attendance/records/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.UPDATE, 'attendance'), attendanceController.updateAttendanceRecord.bind(attendanceController));
router.delete('/attendance/records/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.DELETE, 'attendance'), attendanceController.deleteAttendanceRecord.bind(attendanceController));

router.post('/attendance/mark', authenticate, requirePermission(MODULES.SELF_SERVICE, ACTIONS.CREATE, 'attendance'), attendanceController.markAttendance.bind(attendanceController));
router.get('/attendance/summary/:employeeId', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.getAttendanceSummary.bind(attendanceController));
router.get('/attendance/dashboard', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.getAttendanceDashboard.bind(attendanceController));
router.get('/attendance/report', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.getAttendanceReport.bind(attendanceController));
router.get('/attendance/my-records', authenticate, requirePermission(MODULES.SELF_SERVICE, ACTIONS.READ, 'attendance'), attendanceController.getMyAttendanceRecords.bind(attendanceController));
router.get('/attendance/records/:id', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.getAttendanceRecordById.bind(attendanceController));
router.get('/attendance/export', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.exportAttendanceData.bind(attendanceController));
router.get('/attendance/calendar/:year/:month', authenticate, requirePermission(MODULES.HR, ACTIONS.READ, 'attendance'), attendanceController.getAttendanceCalendar.bind(attendanceController));

export default router;
