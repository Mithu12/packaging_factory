import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { registerExpenseAccountingListeners } from '@/services/accountsIntegrationService';
import { MyLogger } from '@/utils/new-logger';

// Import mediators
import ExpenseMediator from '../../mediators/expenses/ExpenseMediator';

/**
 * Initialize the expenses module and set up optional accounts integration
 * This demonstrates how a module can work independently while optionally integrating with other modules
 */
export const initializeExpensesModule = (): void => {
  try {
    // Register the expenses module
    const expensesServices = {
      expenseMediator: ExpenseMediator,
    };

    moduleRegistry.registerModule(MODULE_NAMES.EXPENSES, expensesServices);

    // Set up optional accounts integration
    // This will only work if accounts module is already registered
    registerExpenseAccountingListeners();

    MyLogger.success('Expenses Module Initialization', {
      module: MODULE_NAMES.EXPENSES,
      services: Object.keys(expensesServices),
      accountsIntegration: moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS),
      message: 'Expenses module initialized successfully'
    });

  } catch (error) {
    MyLogger.error('Expenses Module Initialization', error, {
      module: MODULE_NAMES.EXPENSES
    });
    throw error;
  }
};
