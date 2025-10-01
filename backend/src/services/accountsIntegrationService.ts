import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { eventBus, EVENT_NAMES, EventPayload } from '@/utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import { VoucherType } from '@/types/accounts';

/**
 * Accounts Integration Service
 * Provides optional integration between expenses and accounts modules
 * This service only works if the accounts module is available
 */

export interface ExpenseAccountingData {
  expenseId: number;
  expenseNumber: string;
  title: string;
  amount: number;
  currency: string;
  expenseDate: string;
  categoryName: string;
  vendorName?: string;
  department?: string;
  project?: string;
  notes?: string;
  createdBy: number;
}

export interface VoucherCreationResult {
  voucherId: number;
  voucherNo: string;
  success: boolean;
  error?: string;
}

class AccountsIntegrationService {
  private isAccountsAvailable(): boolean {
    return moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS);
  }

  /**
   * Create accounting voucher for an expense
   * Only works if accounts module is available
   */
  async createExpenseVoucher(expenseData: ExpenseAccountingData): Promise<VoucherCreationResult | null> {
    const action = 'Create Expense Voucher';
    
    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { 
        message: 'Accounts module not available, skipping voucher creation',
        expenseId: expenseData.expenseId 
      });
      return null;
    }

    try {
      MyLogger.info(action, { expenseId: expenseData.expenseId });

      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) {
        MyLogger.warn(action, { 
          message: 'Voucher mediator not available in accounts services',
          expenseId: expenseData.expenseId,
          availableServices: accountsServices ? Object.keys(accountsServices) : []
        });
        return null;
      }

      // Get default expense account from accounts module
      MyLogger.info(action, { 
        message: 'Getting default accounts',
        categoryName: expenseData.categoryName,
        expenseId: expenseData.expenseId
      });
      
      const expenseAccount = await this.getDefaultExpenseAccount(expenseData.categoryName);
      const cashAccount = await this.getDefaultCashAccount();

      MyLogger.info(action, { 
        message: 'Retrieved accounts',
        expenseId: expenseData.expenseId,
        expenseAccount: expenseAccount ? { id: expenseAccount.id, name: expenseAccount.name, code: expenseAccount.code } : null,
        cashAccount: cashAccount ? { id: cashAccount.id, name: cashAccount.name, code: cashAccount.code } : null
      });

      if (!expenseAccount || !cashAccount) {
        MyLogger.warn(action, { 
          message: 'Required accounts not found',
          expenseId: expenseData.expenseId,
          hasExpenseAccount: !!expenseAccount,
          hasCashAccount: !!cashAccount
        });
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured'
        };
      }

      // Create voucher data
      const voucherData = {
        type: VoucherType.PAYMENT,
        date: new Date(expenseData.expenseDate),
        reference: expenseData.expenseNumber,
        payee: expenseData.vendorName || 'Expense Payment',
        amount: expenseData.amount,
        currency: expenseData.currency,
        narration: `Expense: ${expenseData.title}${expenseData.notes ? ` - ${expenseData.notes}` : ''}`,
        lines: [
          {
            accountId: expenseAccount.id,
            debit: expenseData.amount,
            credit: 0,
            description: expenseData.title
          },
          {
            accountId: cashAccount.id,
            debit: 0,
            credit: expenseData.amount,
            description: `Payment for ${expenseData.title}`
          }
        ]
      };

      // Create the voucher
      MyLogger.info(action, { 
        message: 'Creating voucher with data',
        voucherData,
        expenseId: expenseData.expenseId
      });
      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, expenseData.createdBy);

      MyLogger.success(action, { 
        expenseId: expenseData.expenseId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo 
      });

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };

    } catch (error: any) {
      MyLogger.error(action, error, { expenseId: expenseData.expenseId });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create voucher'
      };
    }
  }

  /**
   * Get default expense account for a category
   */
  private async getDefaultExpenseAccount(categoryName: string): Promise<any> {
    if (!this.isAccountsAvailable()) return null;

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.chartOfAccountsMediator) return null;

      MyLogger.info('Get Default Expense Account', { 
        categoryName,
        searching: 'Expenses category accounts'
      });

      // Try to find an expense account that matches the category
      // This is a simplified approach - in practice, you might have a mapping table
      const accounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
        category: 'Expenses',
        status: 'Active',
        search: categoryName,
        limit: 1
      });

      MyLogger.info('Get Default Expense Account', { 
        categoryName,
        foundAccounts: accounts.data?.length || 0,
        accounts: accounts.data?.map((acc: { id: any; name: any; code: any; }) => ({ id: acc.id, name: acc.name, code: acc.code }))
      });

      if (accounts.data && accounts.data.length > 0) {
        return accounts.data[0];
      }

      // Fallback to general expense account
      MyLogger.info('Get Default Expense Account', { 
        categoryName,
        message: 'No specific category account found, trying general expense account'
      });

      const generalExpenseAccounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
        category: 'Expenses',
        status: 'Active',
        search: 'General',
        limit: 1
      });

      MyLogger.info('Get Default Expense Account', { 
        categoryName,
        generalAccounts: generalExpenseAccounts.data?.length || 0,
        accounts: generalExpenseAccounts.data?.map((acc: { id: any; name: any; code: any; }) => ({ id: acc.id, name: acc.name, code: acc.code }))
      });

      return generalExpenseAccounts.data?.[0] || null;

    } catch (error) {
      MyLogger.error('Get Default Expense Account', error, { categoryName });
      return null;
    }
  }

  /**
   * Get default cash account
   */
  private async getDefaultCashAccount(): Promise<any> {
    if (!this.isAccountsAvailable()) return null;

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.chartOfAccountsMediator) return null;

      MyLogger.info('Get Default Cash Account', { 
        searching: 'Assets category cash accounts'
      });

      const cashAccounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
        category: 'Assets',
        status: 'Active',
        search: 'Cash',
        limit: 1
      });

      MyLogger.info('Get Default Cash Account', { 
        foundAccounts: cashAccounts.data?.length || 0,
        accounts: cashAccounts.data?.map((acc: { id: any; name: any; code: any; }) => ({ id: acc.id, name: acc.name, code: acc.code }))
      });

      return cashAccounts.data?.[0] || null;

    } catch (error) {
      MyLogger.error('Get Default Cash Account', error);
      return null;
    }
  }

  /**
   * Check if expense can be integrated with accounts
   */
  canIntegrateExpense(expenseData: ExpenseAccountingData): boolean {
    return this.isAccountsAvailable() && 
           expenseData.amount > 0 && 
           (!!expenseData.expenseDate) &&
           (!!expenseData.title);
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
export const accountsIntegrationService = new AccountsIntegrationService();

/**
 * Event listeners for expense events
 * These will only be registered if accounts module is available
 */
export const registerExpenseAccountingListeners = (): void => {
  if (!moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS)) {
    MyLogger.info('Expense Accounting Listeners', { 
      message: 'Accounts module not available, skipping listener registration' 
    });
    return;
  }

  // Listen for expense approval events to create vouchers
  eventBus.on(EVENT_NAMES.EXPENSE_APPROVED, async (payload: EventPayload) => {
    try {
      const expenseData = payload.expenseData as ExpenseAccountingData;
      if (expenseData && accountsIntegrationService.canIntegrateExpense(expenseData)) {
        const result = await accountsIntegrationService.createExpenseVoucher(expenseData);
        if (result?.success) {
          MyLogger.success('Expense Accounting Integration', {
            expenseId: expenseData.expenseId,
            voucherId: result.voucherId,
            voucherNo: result.voucherNo
          });
        }
      }
    } catch (error) {
      MyLogger.error('Expense Accounting Integration', error, { payload });
    }
  });

  MyLogger.success('Expense Accounting Listeners', { 
    message: 'Event listeners registered successfully' 
  });
};
