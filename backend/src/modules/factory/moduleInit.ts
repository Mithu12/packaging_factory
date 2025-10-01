import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { MyLogger } from '@/utils/new-logger';

// Import mediators
import AddCustomerOrderMediator from './mediators/customerOrders/AddCustomerOrder.mediator';
import GetCustomerOrderInfoMediator from './mediators/customerOrders/GetCustomerOrderInfo.mediator';
import UpdateCustomerOrderInfoMediator from './mediators/customerOrders/UpdateCustomerOrderInfo.mediator';
import DeleteCustomerOrderMediator from './mediators/customerOrders/DeleteCustomerOrder.mediator';

/**
 * Initialize the factory module and register it with the module registry
 * This enables other modules to optionally integrate with factory operations
 */
export const initializeFactoryModule = (): void => {
  try {
    // Register the factory module with its services
    const factoryServices = {
      addCustomerOrderMediator: AddCustomerOrderMediator,
      getCustomerOrderInfoMediator: GetCustomerOrderInfoMediator,
      updateCustomerOrderInfoMediator: UpdateCustomerOrderInfoMediator,
      deleteCustomerOrderMediator: DeleteCustomerOrderMediator,
    };

    MyLogger.info('Factory Module Services', {
      services: Object.keys(factoryServices),
      addCustomerOrderMediatorAvailable: !!AddCustomerOrderMediator,
      getCustomerOrderInfoMediatorAvailable: !!GetCustomerOrderInfoMediator,
      updateCustomerOrderInfoMediatorAvailable: !!UpdateCustomerOrderInfoMediator,
      deleteCustomerOrderMediatorAvailable: !!DeleteCustomerOrderMediator
    });

    moduleRegistry.registerModule(MODULE_NAMES.FACTORY, factoryServices);

    MyLogger.success('Factory Module Initialization', {
      module: MODULE_NAMES.FACTORY,
      services: Object.keys(factoryServices),
      message: 'Factory module initialized and registered successfully'
    });

  } catch (error) {
    MyLogger.error('Factory Module Initialization', error, {
      module: MODULE_NAMES.FACTORY
    });
    throw error;
  }
};
