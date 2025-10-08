import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { eventBus, EVENT_NAMES, EventPayload } from '@/utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import { VoucherType } from '@/types/accounts';
import pool from '@/database/connection';

/**
 * Factory Accounts Integration Service
 * Provides optional integration between factory and accounts modules
 * This service only works if the accounts module is available
 * 
 * Pattern: Same as accountsIntegrationService.ts (for expenses)
 */

export interface OrderAccountingData {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  totalValue: number;
  currency: string;
  orderDate: string;
  factoryId?: number;
  lineItems?: any[];
  notes?: string;
}

export interface VoucherCreationResult {
  voucherId: number;
  voucherNo: string;
  success: boolean;
  error?: string;
}

class FactoryAccountsIntegrationService {
  private isAccountsAvailable(): boolean {
    return moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS);
  }

  /**
   * Create accounting voucher for customer order approval
   * Creates A/R and Deferred Revenue
   * Only works if accounts module is available
   */
  async createCustomerOrderReceivable(
    orderData: OrderAccountingData, 
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Customer Order Receivable';
    
    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { 
        message: 'Accounts module not available, skipping voucher creation',
        orderId: orderData.orderId 
      });
      return null;
    }

    try {
      MyLogger.info(action, { orderId: orderData.orderId });

      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) {
        MyLogger.warn(action, { 
          message: 'Voucher mediator not available in accounts services',
          orderId: orderData.orderId,
          availableServices: accountsServices ? Object.keys(accountsServices) : []
        });
        return null;
      }

      // Get default accounts
      MyLogger.info(action, { 
        message: 'Getting default accounts',
        orderId: orderData.orderId
      });
      
      const receivableAccount = await this.getDefaultAccount('accounts_receivable');
      const deferredRevenueAccount = await this.getDefaultAccount('deferred_revenue');

      MyLogger.info(action, { 
        message: 'Retrieved accounts',
        orderId: orderData.orderId,
        receivableAccount: receivableAccount ? { id: receivableAccount.id, name: receivableAccount.name, code: receivableAccount.code } : null,
        deferredRevenueAccount: deferredRevenueAccount ? { id: deferredRevenueAccount.id, name: deferredRevenueAccount.name, code: deferredRevenueAccount.code } : null
      });

      if (!receivableAccount || !deferredRevenueAccount) {
        MyLogger.warn(action, { 
          message: 'Required accounts not found',
          orderId: orderData.orderId,
          hasReceivableAccount: !!receivableAccount,
          hasDeferredRevenueAccount: !!deferredRevenueAccount
        });
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured. Please set up Accounts Receivable and Deferred Revenue accounts.'
        };
      }

      // Create voucher data
      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(orderData.orderDate),
        reference: orderData.orderNumber,
        payee: orderData.customerName,
        amount: orderData.totalValue,
        currency: orderData.currency,
        narration: `Customer Order Approved - ${orderData.orderNumber} - ${orderData.customerName}${orderData.notes ? ` - ${orderData.notes}` : ''}`,
        lines: [
          {
            accountId: receivableAccount.id,
            debit: orderData.totalValue,
            credit: 0,
            description: `Accounts Receivable for Order ${orderData.orderNumber}`
          },
          {
            accountId: deferredRevenueAccount.id,
            debit: 0,
            credit: orderData.totalValue,
            description: `Deferred Revenue for Order ${orderData.orderNumber}`
          }
        ]
      };

      // Create the voucher
      MyLogger.info(action, { 
        message: 'Creating voucher',
        voucherData,
        orderId: orderData.orderId
      });
      
      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      
      // Auto-approve the voucher
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }
      
      MyLogger.success(action, { 
        orderId: orderData.orderId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo 
      });

      // Update order with voucher reference
      await this.updateOrderVoucherReference(orderData.orderId, voucher.id, 'receivable_voucher_id');

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };

    } catch (error: any) {
      MyLogger.error(action, error, { orderId: orderData.orderId });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create voucher'
      };
    }
  }

  /**
   * Get default account by type
   * In future, this will check factory_default_accounts table
   * For now, searches by account name pattern
   */
  private async getDefaultAccount(accountType: string): Promise<any> {
    if (!this.isAccountsAvailable()) return null;

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.chartOfAccountsMediator) return null;

      MyLogger.info('Get Default Account', { 
        accountType,
        searching: 'Chart of accounts'
      });

      let searchTerm = '';
      let category = '';

      switch (accountType) {
        case 'accounts_receivable':
          searchTerm = 'Receivable';
          category = 'Assets';
          break;
        case 'deferred_revenue':
          searchTerm = 'Deferred Revenue';
          category = 'Liabilities';
          break;
        case 'sales_revenue':
          searchTerm = 'Sales Revenue';
          category = 'Revenue';
          break;
        case 'cash':
          searchTerm = 'Cash';
          category = 'Assets';
          break;
        default:
          return null;
      }

      // Try to find matching account
      const accounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
        category: category,
        status: 'Active',
        search: searchTerm,
        limit: 1
      });

      MyLogger.info('Get Default Account', { 
        accountType,
        foundAccounts: accounts.data?.length || 0,
        accounts: accounts.data?.map((acc: any) => ({ id: acc.id, name: acc.name, code: acc.code }))
      });

      if (accounts.data && accounts.data.length > 0) {
        return accounts.data[0];
      }

      return null;

    } catch (error) {
      MyLogger.error('Get Default Account', error, { accountType });
      return null;
    }
  }

  /**
   * Update factory order with voucher reference
   */
  private async updateOrderVoucherReference(
    orderId: string, 
    voucherId: number,
    columnName: string = 'receivable_voucher_id'
  ): Promise<void> {
    try {
      // Check if column exists first
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'factory_customer_orders' 
        AND column_name = $1
      `, [columnName]);

      if (columnCheck.rows.length === 0) {
        MyLogger.warn('Update Order Voucher Reference', {
          message: `Column ${columnName} does not exist yet - will be added in migration`,
          orderId,
          voucherId
        });
        return;
      }

      await pool.query(
        `UPDATE factory_customer_orders SET ${columnName} = $1 WHERE id = $2`,
        [voucherId, orderId]
      );

      MyLogger.info('Update Order Voucher Reference', {
        orderId,
        voucherId,
        columnName
      });
    } catch (error) {
      MyLogger.error('Update Order Voucher Reference', error, {
        orderId,
        voucherId,
        columnName
      });
      // Don't throw - this is non-critical
    }
  }

  /**
   * Check if factory order can be integrated with accounts
   */
  canIntegrateOrder(orderData: OrderAccountingData): boolean {
    return this.isAccountsAvailable() && 
           orderData.totalValue > 0 && 
           !!orderData.orderDate &&
           !!orderData.orderNumber;
  }

  /**
   * Get accounts module status
   */
  getAccountsModuleStatus(): { available: boolean; services: string[] } {
    const available = this.isAccountsAvailable();
    const services: string[] = [];

    if (available) {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (accountsServices) {
        services.push(...Object.keys(accountsServices));
      }
    }

    return { available, services };
  }
}

// Export singleton instance
export const factoryAccountsIntegrationService = new FactoryAccountsIntegrationService();

/**
 * Event listeners for factory events
 * These will only be registered if accounts module is available
 */
export const registerFactoryAccountingListeners = (): void => {
  if (!moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS)) {
    MyLogger.info('Factory Accounting Listeners', { 
      message: 'Accounts module not available, skipping listener registration' 
    });
    return;
  }

  // Listen for order approval events to create vouchers
  eventBus.on(EVENT_NAMES.FACTORY_ORDER_APPROVED, async (payload: EventPayload) => {
    try {
      const orderData = payload.orderData as OrderAccountingData;
      const userId = payload.userId as number;
      
      if (orderData && factoryAccountsIntegrationService.canIntegrateOrder(orderData)) {
        const result = await factoryAccountsIntegrationService.createCustomerOrderReceivable(orderData, userId);
        
        if (result?.success) {
          MyLogger.success('Factory Accounting Integration', {
            event: 'ORDER_APPROVED',
            orderId: orderData.orderId,
            voucherId: result.voucherId,
            voucherNo: result.voucherNo
          });
        } else if (result?.error) {
          MyLogger.warn('Factory Accounting Integration', {
            event: 'ORDER_APPROVED',
            orderId: orderData.orderId,
            error: result.error
          });
        }
      }
    } catch (error) {
      MyLogger.error('Factory Accounting Integration', error, { 
        event: 'ORDER_APPROVED',
        payload 
      });
      // Don't throw - we don't want to break the factory operation
    }
  });

  MyLogger.success('Factory Accounting Listeners', { 
    message: 'Event listeners registered successfully',
    events: ['FACTORY_ORDER_APPROVED']
  });
};

