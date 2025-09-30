import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { MyLogger } from '@/utils/new-logger';

// Import mediators
import AddVoucherMediator from './mediators/vouchers/AddVoucher.mediator';
import GetVoucherInfoMediator from './mediators/vouchers/GetVoucherInfo.mediator';
import GetChartOfAccountInfoMediator from './mediators/chartOfAccounts/GetChartOfAccountInfo.mediator';
import AddChartOfAccountMediator from './mediators/chartOfAccounts/AddChartOfAccount.mediator';

/**
 * Initialize the accounts module and register it with the module registry
 * This enables other modules to optionally integrate with accounts
 */
export const initializeAccountsModule = (): void => {
  try {
    // Register the accounts module with its services
    const accountsServices = {
      voucherMediator: AddVoucherMediator,
      getVoucherMediator: GetVoucherInfoMediator,
      chartOfAccountsMediator: GetChartOfAccountInfoMediator,
      addChartOfAccountMediator: AddChartOfAccountMediator,
    };

    moduleRegistry.registerModule(MODULE_NAMES.ACCOUNTS, accountsServices);

    MyLogger.success('Accounts Module Initialization', {
      module: MODULE_NAMES.ACCOUNTS,
      services: Object.keys(accountsServices),
      message: 'Accounts module initialized and registered successfully'
    });

  } catch (error) {
    MyLogger.error('Accounts Module Initialization', error, {
      module: MODULE_NAMES.ACCOUNTS
    });
    throw error;
  }
};
