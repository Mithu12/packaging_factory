import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { MyLogger } from '@/utils/new-logger';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { salesAccountsIntegrationService } from '@/services/salesAccountsIntegrationService';
import { accountsIntegrationService } from '@/services/accountsIntegrationService';
import { inventoryAccountsIntegrationService } from '@/services/inventoryAccountsIntegrationService';
import { factoryAccountsIntegrationService } from '@/services/factoryAccountsIntegrationService';

// Import mediators
import AddVoucherMediator from './mediators/vouchers/AddVoucher.mediator';
import GetVoucherInfoMediator from './mediators/vouchers/GetVoucherInfo.mediator';
import GetChartOfAccountInfoMediator from './mediators/chartOfAccounts/GetChartOfAccountInfo.mediator';
import AddChartOfAccountMediator from './mediators/chartOfAccounts/AddChartOfAccount.mediator';
import UpdateVoucherInfoMediator from './mediators/vouchers/UpdateVoucherInfo.mediator';

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
      updateVoucherMediator: UpdateVoucherInfoMediator,
      chartOfAccountsMediator: GetChartOfAccountInfoMediator,
      addChartOfAccountMediator: AddChartOfAccountMediator,
    };

    MyLogger.info('Accounts Module Services', {
      services: Object.keys(accountsServices),
      voucherMediatorAvailable: !!AddVoucherMediator,
      updateVoucherMediatorAvailable: !!UpdateVoucherInfoMediator,
      chartOfAccountsMediatorAvailable: !!GetChartOfAccountInfoMediator
    });

    moduleRegistry.registerModule(MODULE_NAMES.ACCOUNTS, accountsServices);

    // Register with InterModuleConnector for cross-module communication
    interModuleConnector.register('accModule', {
      addSalesVoucher: salesAccountsIntegrationService.createSalesOrderVoucher.bind(salesAccountsIntegrationService),
      addExpenseVoucher: accountsIntegrationService.createExpenseVoucher.bind(accountsIntegrationService),
      addPurchaseVoucher: inventoryAccountsIntegrationService.createPurchaseOrderReceiptVoucher.bind(inventoryAccountsIntegrationService),
      addStockAdjustmentVoucher: inventoryAccountsIntegrationService.createStockAdjustmentVoucher.bind(inventoryAccountsIntegrationService),
      addFactoryOrderReceivable: factoryAccountsIntegrationService.createCustomerOrderReceivable.bind(factoryAccountsIntegrationService),
      addMaterialConsumptionVoucher: factoryAccountsIntegrationService.createMaterialConsumptionVoucher.bind(factoryAccountsIntegrationService),
      addWastageVoucher: factoryAccountsIntegrationService.createWastageVoucher.bind(factoryAccountsIntegrationService),
      addProductionRunVouchers: factoryAccountsIntegrationService.createProductionRunVouchers.bind(factoryAccountsIntegrationService),
      addWorkOrderCompletionVoucher: factoryAccountsIntegrationService.createWorkOrderFGTransferVoucher.bind(factoryAccountsIntegrationService),
      addFactoryOrderShipmentVoucher: factoryAccountsIntegrationService.createCOGSVoucher.bind(factoryAccountsIntegrationService),
      addFactoryReturnVoucher: factoryAccountsIntegrationService.createReturnReversalVouchers.bind(factoryAccountsIntegrationService),
      addFactoryPaymentVoucher: factoryAccountsIntegrationService.createCustomerPaymentVoucher.bind(factoryAccountsIntegrationService),
      addCustomerPaymentVoucher: salesAccountsIntegrationService.createCustomerPaymentVoucher.bind(salesAccountsIntegrationService),
      addInternalTransferVoucher: inventoryAccountsIntegrationService.createStockTransferVoucher.bind(inventoryAccountsIntegrationService),
      addSupplierPaymentVoucher: inventoryAccountsIntegrationService.createSupplierPaymentVoucher.bind(inventoryAccountsIntegrationService),
      reverseVoucher: salesAccountsIntegrationService.createReversingVoucher.bind(salesAccountsIntegrationService)
    });

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
