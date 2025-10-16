// HRM Module Index
// Main entry point for the Human Resource Management module

export { EmployeeController } from './controllers/employees.controller';
export { PayrollController } from './controllers/payroll.controller';
export { LeaveController } from './controllers/leave.controller';
export { default as AttendanceController } from './controllers/attendance.controller';

export { EmployeeMediator } from './mediators/employees/EmployeeMediator';
export { PayrollMediator } from './mediators/payroll/PayrollMediator';
export { LeaveMediator } from './mediators/leave/LeaveMediator';
export { AttendanceMediator } from './mediators/attendance/AttendanceMediator';

// Export types
export * from '../../types/hrm';

// Export routes
export * from './routes';
