import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { MyLogger } from '@/utils/new-logger';

// Import mediators
import EmployeeMediator from './mediators/employees/EmployeeMediator';
import AttendanceMediator from './mediators/attendance/AttendanceMediator';
import LeaveMediator from './mediators/leave/LeaveMediator';
import PayrollMediator from './mediators/payroll/PayrollMediator';

/**
 * Initialize the HRM module and register it with the module registry
 * This enables other modules to optionally integrate with HRM operations
 */
export const initializeHRMModule = (): void => {
  try {
    // Register the HRM module with its services
    const hrmServices = {
      employeeMediator: EmployeeMediator,
      attendanceMediator: AttendanceMediator,
      leaveMediator: LeaveMediator,
      payrollMediator: PayrollMediator,
    };

    MyLogger.info('HRM Module Services', {
      services: Object.keys(hrmServices),
      employeeMediatorAvailable: !!EmployeeMediator,
      attendanceMediatorAvailable: !!AttendanceMediator,
      leaveMediatorAvailable: !!LeaveMediator,
      payrollMediatorAvailable: !!PayrollMediator
    });

    moduleRegistry.registerModule(MODULE_NAMES.HRM, hrmServices);

    MyLogger.success('HRM Module Initialization', {
      module: MODULE_NAMES.HRM,
      services: Object.keys(hrmServices),
      message: 'HRM module initialized and registered successfully'
    });

  } catch (error) {
    MyLogger.error('HRM Module Initialization', error, {
      module: MODULE_NAMES.HRM
    });
    throw error;
  }
};
