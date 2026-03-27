import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { MyLogger } from '@/utils/new-logger';
import { VoucherType } from '@/types/accounts';
import { logVoucherFailureFromError } from '@/services/voucherFailureLogService';

/**
 * Optional integration: HRM payroll cash payments → Accounts PAYMENT voucher.
 * Requires an active Expenses account whose name matches "Salaries" or "Payroll" (chart search),
 * plus Cash or Bank accounts (same naming convention as factory customer payments).
 */

export interface PayrollPaymentAccountingData {
  payrollRunId: number;
  payrollDetailIds: number[];
  totalNetPay: number;
  paymentMethod: string;
  paymentDate: string;
  paymentReference: string;
  periodName?: string | null;
  notes?: string | null;
}

export interface VoucherCreationResult {
  voucherId: number;
  voucherNo: string;
  success: boolean;
  error?: string;
}

/** Resolved chart lines for payroll PAYMENT voucher (preview before submit). */
export interface PayrollPaymentAccountPreview {
  accounts_module_available: boolean;
  ready: boolean;
  debit: { id: number; code: string; name: string } | null;
  credit: { id: number; code: string; name: string } | null;
  credit_side: 'cash' | 'bank';
  warning: string | null;
  /** True when Accounts is available but no Salaries/Payroll expense account was found */
  missing_payroll_expense_account: boolean;
  /** True when Accounts is available but no Cash (cash pay) or Bank (non-cash) asset account was found */
  missing_payment_account: boolean;
  /** Ordered instructions for what to add under Chart of Accounts (empty when nothing to fix here) */
  setup_steps: string[];
}

class HrmAccountsIntegrationService {
  private isAccountsAvailable(): boolean {
    return moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS);
  }

  private async getExpenseAccountBySearch(searchTerm: string): Promise<{ id: number; name: string; code: string } | null> {
    const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
    if (!accountsServices?.chartOfAccountsMediator) return null;

    const accounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
      category: 'Expenses',
      status: 'Active',
      search: searchTerm,
      limit: 1,
    });

    if (accounts.data && accounts.data.length > 0) {
      const acc = accounts.data[0];
      return { id: acc.id, name: acc.name, code: acc.code };
    }
    return null;
  }

  private async getSalaryExpenseAccount(): Promise<{ id: number; name: string; code: string } | null> {
    const primary = await this.getExpenseAccountBySearch('Salaries');
    if (primary) return primary;
    return this.getExpenseAccountBySearch('Payroll');
  }

  /**
   * Which accounts will be used when recording this payroll batch (same resolution as createPayrollPaymentVoucher).
   */
  async previewPayrollPaymentAccounts(paymentMethod: string): Promise<PayrollPaymentAccountPreview> {
    const credit_side: 'cash' | 'bank' = paymentMethod === 'cash' ? 'cash' : 'bank';

    if (!this.isAccountsAvailable()) {
      return {
        accounts_module_available: false,
        ready: false,
        debit: null,
        credit: null,
        credit_side,
        warning: null,
        missing_payroll_expense_account: false,
        missing_payment_account: false,
        setup_steps: [],
      };
    }

    const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
    if (!accountsServices?.chartOfAccountsMediator) {
      return {
        accounts_module_available: true,
        ready: false,
        debit: null,
        credit: null,
        credit_side,
        warning: 'Chart of accounts is not available.',
        missing_payroll_expense_account: true,
        missing_payment_account: true,
        setup_steps: [
          'Verify the Accounts module is running and your user can access Chart of Accounts. If the problem continues, ask an administrator to check server logs for the accounts service.',
        ],
      };
    }

    const expenseAccount = await this.getSalaryExpenseAccount();
    const cashBankAccount = await this.getCashOrBankAccount(paymentMethod);

    const missingPayrollExpense = !expenseAccount;
    const missingPayment = !cashBankAccount;

    const setup_steps: string[] = [];
    if (missingPayrollExpense) {
      setup_steps.push(
        'Payroll expense (debit): add an active account under category Expenses whose name includes Salaries or Payroll — for example “Salaries Expense”, “Salaries and Wages”, or “Payroll Expense”. The system picks the first active match when searching those keywords.'
      );
    }
    if (missingPayment) {
      if (credit_side === 'cash') {
        setup_steps.push(
          'Cash (credit): add an active account under category Assets whose name includes Cash — for example “Cash in Hand” or “Cash”. Required because the payment method is Cash.'
        );
      } else {
        setup_steps.push(
          'Bank (credit): add an active account under category Assets whose name includes Bank — for example “Bank Account” or “Bank - Operating”. Required for bank transfer, check, and other non-cash methods.'
        );
      }
    }

    let warning: string | null = null;
    if (missingPayrollExpense && missingPayment) {
      warning =
        'Two accounts are missing: a payroll expense account (Expenses: Salaries or Payroll) and a payment account (Assets: Cash or Bank, depending on method). See the checklist below.';
    } else if (missingPayrollExpense) {
      warning = 'No expense account found whose name matches Salaries or Payroll. Add one under Chart of Accounts (see below).';
    } else if (missingPayment) {
      warning =
        credit_side === 'cash'
          ? 'No Cash account found under Assets. Add one under Chart of Accounts (see below).'
          : 'No Bank account found under Assets. Add one under Chart of Accounts (see below).';
    }

    const ready = !!(expenseAccount && cashBankAccount);

    return {
      accounts_module_available: true,
      ready,
      debit: expenseAccount,
      credit: cashBankAccount,
      credit_side,
      warning,
      missing_payroll_expense_account: missingPayrollExpense,
      missing_payment_account: missingPayment,
      setup_steps,
    };
  }

  private async getCashOrBankAccount(paymentMethod: string): Promise<{ id: number; name: string; code: string } | null> {
    if (!this.isAccountsAvailable()) return null;

    const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
    if (!accountsServices?.chartOfAccountsMediator) return null;

    const useCash = paymentMethod === 'cash';
    const searchTerm = useCash ? 'Cash' : 'Bank';
    const category = 'Assets';

    const accounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
      category,
      status: 'Active',
      search: searchTerm,
      limit: 1,
    });

    if (accounts.data && accounts.data.length > 0) {
      const acc = accounts.data[0];
      return { id: acc.id, name: acc.name, code: acc.code };
    }
    return null;
  }

  /**
   * Debit salary/payroll expense (net pay), Credit cash/bank (net pay).
   */
  async createPayrollPaymentVoucher(
    data: PayrollPaymentAccountingData,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'HrmAccountsIntegration.createPayrollPaymentVoucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { message: 'Accounts module not available' });
      return null;
    }

    const amount = Math.round(Number(data.totalNetPay) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: 'Invalid or zero payment amount for voucher',
      };
    }

    if (!data.payrollDetailIds?.length) {
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: 'No payroll detail lines for voucher',
      };
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator || !accountsServices.updateVoucherMediator) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Accounts voucher services unavailable',
        };
      }

      const expenseAccount = await this.getSalaryExpenseAccount();
      const cashBankAccount = await this.getCashOrBankAccount(data.paymentMethod);

      if (!expenseAccount || !cashBankAccount) {
        const errMsg = 'Required accounts not configured (Salaries/Payroll expense, Cash/Bank)';
        logVoucherFailureFromError({
          sourceModule: 'hrm',
          operationType: 'addPayrollPaymentVoucher',
          sourceEntityType: 'payroll_run',
          sourceEntityId: data.payrollRunId,
          errorMessage: errMsg,
          payload: {
            paymentMethod: data.paymentMethod,
            hasExpense: !!expenseAccount,
            hasCashBank: !!cashBankAccount,
          },
          userId,
        });
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: errMsg,
        };
      }

      const periodPart = data.periodName ? ` — ${data.periodName}` : '';
      const notesPart = data.notes ? ` ${data.notes}` : '';
      const narration = `Payroll payment (run #${data.payrollRunId})${periodPart}. Net pay ${amount}. Via ${data.paymentMethod}.${notesPart}`.trim();

      const reference = `PR-${data.payrollRunId}|${data.paymentReference}`.slice(0, 200);

      const voucherData = {
        type: VoucherType.PAYMENT,
        date: new Date(data.paymentDate),
        reference,
        payee: `Payroll run ${data.payrollRunId}`,
        amount,
        narration,
        lines: [
          {
            accountId: expenseAccount.id,
            debit: amount,
            credit: 0,
            description: `Payroll expense${periodPart}`,
          },
          {
            accountId: cashBankAccount.id,
            debit: 0,
            credit: amount,
            description: `Paid via ${data.paymentMethod}`,
          },
        ],
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);

      MyLogger.success(action, {
        payrollRunId: data.payrollRunId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
      });

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { payrollRunId: data.payrollRunId });
      logVoucherFailureFromError({
        sourceModule: 'hrm',
        operationType: 'addPayrollPaymentVoucher',
        sourceEntityType: 'payroll_run',
        sourceEntityId: data.payrollRunId,
        errorMessage: error.message || 'Failed to create payroll payment voucher',
        payload: { paymentMethod: data.paymentMethod },
        userId,
      });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create payroll payment voucher',
      };
    }
  }
}

export const hrmAccountsIntegrationService = new HrmAccountsIntegrationService();
