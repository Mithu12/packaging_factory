import { MyLogger } from "./new-logger";

/**
 * InterModuleConnector - A wrapper for explicit inter-module communication.
 * This class provides a central location for modules to register their public integration points.
 * It uses namespaces for each module and provides placeholder methods with warnings
 * when a module or method is not yet implemented or registered.
 */
class InterModuleConnector {
  /**
    * Accounts Module Interface
    */
  public accModule = {
    /**
     * Create a sales voucher in the accounts module
     */
    addSalesVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addSalesVoucher");
      return null;
    },

    /**
     * Create an expense voucher in the accounts module
     */
    addExpenseVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addExpenseVoucher");
      return null;
    },

    /**
     * Create a purchase order receipt voucher (Inventory)
     */
    addPurchaseVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addPurchaseVoucher");
      return null;
    },

    /**
     * Create a stock adjustment voucher (Inventory)
     */
    addStockAdjustmentVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addStockAdjustmentVoucher");
      return null;
    },

    /**
     * Create a customer order receivable voucher (Factory)
     */
    addFactoryOrderReceivable: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addFactoryOrderReceivable");
      return null;
    },

    /**
     * Create a material consumption voucher (Factory)
     */
    addMaterialConsumptionVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addMaterialConsumptionVoucher");
      return null;
    },

    /**
     * Create a wastage voucher (Factory)
     */
    addWastageVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addWastageVoucher");
      return null;
    },

    /**
     * Create production run vouchers (Factory)
     */
    addProductionRunVouchers: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addProductionRunVouchers");
      return null;
    },

    /**
     * Create work order completion voucher (Factory)
     */
    addWorkOrderCompletionVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addWorkOrderCompletionVoucher");
      return null;
    },

    /**
     * Create order shipment voucher (Factory)
     */
    addFactoryOrderShipmentVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addFactoryOrderShipmentVoucher");
      return null;
    },

    /**
     * Create factory return voucher (Factory)
     */
    addFactoryReturnVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addFactoryReturnVoucher");
      return null;
    },

    /**
     * Create factory payment voucher (Factory)
     */
    addFactoryPaymentVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "addFactoryPaymentVoucher");
      return null;
    },

    /**
     * Reverse a voucher entry
     */
    reverseVoucher: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("accModule", "reverseVoucher");
      return null;
    }
  };

  /**
   * Inventory Module Interface
   */
  public invModule = {
    /**
     * Add stock to a product from a purchase order
     */
    addPurchaseStock: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("invModule", "addPurchaseStock");
      return null;
    },

    /**
     * Adjust stock for a product
     */
    adjustStock: async (...args: any[]): Promise<any> => {
      this.logNotImplemented("invModule", "adjustStock");
      return null;
    }
  };

  /**
   * Helper to log when a method is called but not implemented/registered
   */
  private logNotImplemented(moduleName: string, methodName: string): void {
    MyLogger.warn(`InterModuleConnector: [${moduleName}.${methodName}] called but not implemented or module not available.`, {
      module: moduleName,
      method: methodName,
      timestamp: new Date().toISOString()
    });
  }

  /**
  /**
   * Register implementations for a module namespace
   * This should be called by each module's initialization logic
   */
  public register(moduleName: keyof InterModuleConnector & ("accModule" | "invModule"), implementations: any): void {
    if (this[moduleName]) {
      // Merge implementations, preserving existing structure but overriding placeholders
      Object.assign(this[moduleName], implementations);
      
      MyLogger.success(`InterModuleConnector: Registered updated implementations for module [${moduleName}]`, {
        module: moduleName,
        methods: Object.keys(implementations)
      });
    } else {
      MyLogger.error(`InterModuleConnector: Attempted to register unknown module [${moduleName}]`, new Error(`Unknown module: ${moduleName}`));
    }
  }
}

// Export a singleton instance
export const interModuleConnector = new InterModuleConnector();
export default interModuleConnector;
