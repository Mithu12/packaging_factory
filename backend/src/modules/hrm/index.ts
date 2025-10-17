// HRM Module Index
// Main entry point for the Human Resource Management module

export { default as EmployeeController } from './controllers/employees.controller';
export { default as PayrollController } from './controllers/payroll.controller';
export { default as LeaveController } from './controllers/leave.controller';
export { default as AttendanceController } from './controllers/attendance.controller';

export { default as EmployeeMediator } from './mediators/employees/EmployeeMediator';
export { default as PayrollMediator } from './mediators/payroll/PayrollMediator';
export { default as LeaveMediator } from './mediators/leave/LeaveMediator';
export { default as AttendanceMediator } from './mediators/attendance/AttendanceMediator';

// Export types
export  * from '../../types/hrm';

// Export routes
export  * from './routes';
