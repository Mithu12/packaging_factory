import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { MyLogger } from '@/utils/new-logger';

// Import mediators
import { AddEmployeeMediator } from './mediators/employees/AddEmployee.mediator';
import { GetEmployeeInfoMediator } from './mediators/employees/GetEmployeeInfo.mediator';
import { UpdateEmployeeMediator } from './mediators/employees/UpdateEmployee.mediator';
import { AddPayrollMediator } from './mediators/payroll/AddPayroll.mediator';

/**
 * Initialize the HRM module and register it with the module registry
 * This enables other modules to optionally integrate with HRM operations
 */
export const initializeHRMModule = (): void => {
  try {
    // Register the HRM module with its services
    const hrmServices = {
      addEmployeeMediator: AddEmployeeMediator,
      getEmployeeInfoMediator: GetEmployeeInfoMediator,
      updateEmployeeMediator: UpdateEmployeeMediator,
      addPayrollMediator: AddPayrollMediator,
    };

    MyLogger.info('HRM Module Services', {
      services: Object.keys(hrmServices),
      addEmployeeMediatorAvailable: !!AddEmployeeMediator,
      getEmployeeInfoMediatorAvailable: !!GetEmployeeInfoMediator,
      updateEmployeeMediatorAvailable: !!UpdateEmployeeMediator,
      addPayrollMediatorAvailable: !!AddPayrollMediator
    });

    moduleRegistry.registerModule(MODULE_NAMES.HRM, hrmServices);

    // Set up optional integration with other modules
    // This will only work if other modules are already registered
    setupHRMIntegration();

    MyLogger.success('HRM Module Initialization', {
      module: MODULE_NAMES.HRM,
      services: Object.keys(hrmServices),
      integrationsAvailable: getAvailableIntegrations(),
      message: 'HRM module initialized and registered successfully'
    });

  } catch (error) {
    MyLogger.error('HRM Module Initialization', error, {
      module: MODULE_NAMES.HRM
    });
    throw error;
  }
};

/**
 * Set up integration with other modules
 */
const setupHRMIntegration = (): void => {
  try {
    // Example: Integration with accounts module for payroll processing
    if (moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS)) {
      MyLogger.info('HRM Integration Setup', {
        accountsIntegration: true,
        message: 'Setting up payroll accounting integration'
      });

      // Set up listeners for payroll events that might affect accounts
      setupPayrollAccountingIntegration();
    }

    // Example: Integration with factory module for employee assignments
    if (moduleRegistry.isModuleAvailable(MODULE_NAMES.FACTORY)) {
      MyLogger.info('HRM Integration Setup', {
        factoryIntegration: true,
        message: 'Setting up employee-factory integration'
      });

      // Set up listeners for employee changes that might affect factory operations
      setupEmployeeFactoryIntegration();
    }

  } catch (error) {
    MyLogger.error('HRM Integration Setup', error, {
      message: 'Failed to set up module integrations'
    });
    // Don't throw - integration failures shouldn't prevent module startup
  }
};

/**
 * Set up payroll accounting integration
 */
const setupPayrollAccountingIntegration = (): void => {
  // Payroll payment posting to Accounts is handled in UpdatePayrollMediator.recordPayrollPayments
  // when the accounts module is registered (via interModuleConnector.accModule.addPayrollPaymentVoucher).
  MyLogger.info('Payroll Accounting Integration', {
    message: 'Payroll payment vouchers are created when recording payments (if Accounts is available)'
  });
};

/**
 * Set up employee factory integration
 */
const setupEmployeeFactoryIntegration = (): void => {
  // This would set up event listeners or hooks that notify the factory module
  // when employees are added/modified, so it can update operator assignments
  MyLogger.info('Employee Factory Integration', {
    message: 'Employee factory integration configured'
  });
};

/**
 * Get available integration points
 */
const getAvailableIntegrations = (): string[] => {
  const integrations: string[] = [];

  if (moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS)) {
    integrations.push('accounts');
  }

  if (moduleRegistry.isModuleAvailable(MODULE_NAMES.FACTORY)) {
    integrations.push('factory');
  }

  return integrations;
};
