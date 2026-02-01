import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { MyLogger } from '@/utils/new-logger';
import pool from '@/database/connection';
import { VoucherType } from '@/types/accounts';

export interface SalesOrderAccountingData {
  id: number;
  order_number: string;
  customer_id?: number;
  customer_name?: string;
  order_date: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  cash_received: number;
  change_given: number;
  due_amount: number;
  voucher_id?: number;
  distribution_center_id?: number;
  notes?: string;
}

export interface VoucherCreationResult {
  voucherId: number;
  voucherNo: string;
  success: boolean;
  error?: string;
}

class SalesAccountsIntegrationService {
  private isAccountsAvailable(): boolean {
    return moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS);
  }

  canIntegrate(order: SalesOrderAccountingData): boolean {
    return (
      this.isAccountsAvailable() &&
      order.status === 'completed' &&
      (order.total_amount ?? 0) > 0
    );
  }

  canReverse(order: SalesOrderAccountingData): boolean {
    return (
      this.isAccountsAvailable() &&
      (order.status === 'cancelled' || order.status === 'refunded') &&
      !!order.voucher_id
    );
  }

  async createSalesOrderVoucher(order: SalesOrderAccountingData, userId: number): Promise<VoucherCreationResult | null> {
    const action = 'Create Sales Order Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { message: 'Accounts module not available, skipping voucher creation', orderId: order.id });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator || !accountsServices?.updateVoucherMediator) {
        MyLogger.warn(action, { message: 'Voucher mediators not available', availableServices: accountsServices ? Object.keys(accountsServices) : [] });
        return { voucherId: 0, voucherNo: '', success: false, error: 'Accounts services unavailable' };
      }

      const cashAccount = await this.findAccount('Assets', 'Cash');
      const receivableAccount = await this.findAccount('Assets', 'Receivable');
      const revenueAccount = await this.findAccount('Revenue', 'Sales Revenue');
      const taxPayableAccount = await this.findAccount('Liabilities', 'Tax Payable');

      if (!revenueAccount || (!cashAccount && !receivableAccount)) {
        return { voucherId: 0, voucherNo: '', success: false, error: 'Required accounts not configured' };
      }

      const cashDebit = Math.max((order.cash_received || 0) - (order.change_given || 0), 0);
      const receivableDebit = Math.max(order.due_amount || 0, 0);
      const revenueCredit = Math.max((order.total_amount || 0) - (order.tax_amount || 0), 0);
      const taxCredit = Math.max(order.tax_amount || 0, 0);

      const lines: Array<{ accountId: number; debit: number; credit: number; description?: string } > = [];
      if (cashDebit > 0 && cashAccount) {
        lines.push({ accountId: cashAccount.id, debit: cashDebit, credit: 0, description: `Cash received for ${order.order_number}` });
      }
      if (receivableDebit > 0 && receivableAccount) {
        lines.push({ accountId: receivableAccount.id, debit: receivableDebit, credit: 0, description: `A/R for ${order.order_number}` });
      }
      if (revenueCredit > 0) {
        lines.push({ accountId: revenueAccount.id, debit: 0, credit: revenueCredit, description: `Revenue for ${order.order_number}` });
      }
      if (taxCredit > 0 && taxPayableAccount) {
        lines.push({ accountId: taxPayableAccount.id, debit: 0, credit: taxCredit, description: `Tax for ${order.order_number}` });
      }

      const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return { voucherId: 0, voucherNo: '', success: false, error: 'Voucher lines not balanced' };
      }
      
      let costCenterId = undefined;
      if (order.distribution_center_id) {
        const dcResult = await pool.query(
          'SELECT cost_center_id FROM distribution_centers WHERE id = $1',
          [order.distribution_center_id]
        );
        costCenterId = dcResult.rows[0]?.cost_center_id || undefined;
      }

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(order.order_date),
        reference: order.order_number,
        payee: order.customer_name || undefined,
        amount: totalDebits,
        narration: `Sales Order Completed - ${order.order_number}${order.notes ? ` - ${order.notes}` : ''}`,
        costCenterId: costCenterId,
        lines: lines.map(line => ({ ...line, costCenterId })),
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);

      // Store back-reference on sales_orders
      await pool.query(
        `UPDATE sales_orders
         SET voucher_id = $1,
             accounting_integrated = TRUE,
             accounting_integration_error = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [voucher.id, order.id]
      );

      MyLogger.success(action, { orderId: order.id, voucherId: voucher.id, voucherNo: voucher.voucherNo });
      return { voucherId: voucher.id, voucherNo: voucher.voucherNo, success: true };
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: order.id });
      try {
        await pool.query(
          `UPDATE sales_orders
           SET accounting_integrated = FALSE,
               accounting_integration_error = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error?.message || 'Failed to create voucher', order.id]
        );
      } catch (persistError) {
        MyLogger.error(`${action}.persistError`, persistError, { orderId: order.id });
      }
      return { voucherId: 0, voucherNo: '', success: false, error: error?.message || 'Failed to create voucher' };
    }
  }

  async createCustomerPaymentVoucher(payment: {
    id: number;
    customer_id: number;
    customer_name?: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    reference?: string;
    notes?: string;
    distribution_center_id?: number;
  }, userId: number): Promise<VoucherCreationResult | null> {
    const action = 'Create Customer Payment Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { message: 'Accounts module not available, skipping voucher creation', paymentId: payment.id });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator || !accountsServices?.updateVoucherMediator) {
        return { voucherId: 0, voucherNo: '', success: false, error: 'Accounts services unavailable' };
      }

      const cashAccount = await this.findAccount('Assets', 'Cash');
      const receivableAccount = await this.findAccount('Assets', 'Receivable');

      if (!cashAccount || !receivableAccount) {
        return { voucherId: 0, voucherNo: '', success: false, error: 'Required accounts (Cash/Receivable) not configured' };
      }

      const lines = [
        { 
          accountId: cashAccount.id, 
          debit: payment.amount, 
          credit: 0, 
          description: `Payment received from ${payment.customer_name || `Customer ${payment.customer_id}`}` 
        },
        { 
          accountId: receivableAccount.id, 
          debit: 0, 
          credit: payment.amount, 
          description: `Due payment collection for ${payment.customer_name || `Customer ${payment.customer_id}`}` 
        }
      ];

      let costCenterId = undefined;
      if (payment.distribution_center_id) {
        const dcResult = await pool.query(
          'SELECT cost_center_id FROM distribution_centers WHERE id = $1',
          [payment.distribution_center_id]
        );
        costCenterId = dcResult.rows[0]?.cost_center_id || undefined;
      }

      const voucherData = {
        type: VoucherType.RECEIPT,
        date: new Date(payment.payment_date),
        reference: payment.reference || `CP-${payment.id}`,
        payee: payment.customer_name || undefined,
        amount: payment.amount,
        narration: `Customer Payment Received - ${payment.payment_method}${payment.notes ? ` - ${payment.notes}` : ''}`,
        costCenterId: costCenterId,
        lines: lines.map(line => ({ ...line, costCenterId })),
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);

      // Store back-reference on customer_payments
      await pool.query(
        `UPDATE customer_payments
         SET voucher_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [voucher.id, payment.id]
      );

      MyLogger.success(action, { paymentId: payment.id, voucherId: voucher.id, voucherNo: voucher.voucherNo });
      return { voucherId: voucher.id, voucherNo: voucher.voucherNo, success: true };
    } catch (error: any) {
      MyLogger.error(action, error, { paymentId: payment.id });
      return { voucherId: 0, voucherNo: '', success: false, error: error?.message || 'Failed to create payment voucher' };
    }
  }

  async createReversingVoucher(order: SalesOrderAccountingData, userId: number): Promise<VoucherCreationResult | null> {
    const action = 'Create Reversing Sales Voucher';

    if (!this.isAccountsAvailable() || !order.voucher_id) {
      MyLogger.info(action, { message: 'Accounts not available or no original voucher', orderId: order.id });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.updateVoucherMediator) {
        MyLogger.warn(action, { message: 'Update voucher mediator not available' });
        return { voucherId: 0, voucherNo: '', success: false, error: 'Accounts services unavailable' };
      }

      // Create reversing entry for the original voucher
      const reversingVoucher = await accountsServices.updateVoucherMediator.createReversingEntry(order.voucher_id, userId);

      // Update order to reference the reversing voucher
      await pool.query(
        `UPDATE sales_orders
         SET reversing_voucher_id = $1,
             accounting_integrated = FALSE,
             accounting_integration_error = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [reversingVoucher.id, order.id]
      );

      MyLogger.success(action, {
        orderId: order.id,
        originalVoucherId: order.voucher_id,
        reversingVoucherId: reversingVoucher.id,
        reversingVoucherNo: reversingVoucher.voucherNo
      });

      return { voucherId: reversingVoucher.id, voucherNo: reversingVoucher.voucherNo, success: true };
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: order.id });

      try {
        await pool.query(
          `UPDATE sales_orders
           SET accounting_integrated = FALSE,
               accounting_integration_error = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error?.message || 'Failed to create reversing voucher', order.id]
        );
      } catch (persistError) {
        MyLogger.error(`${action}.persistError`, persistError, { orderId: order.id });
      }

      return { voucherId: 0, voucherNo: '', success: false, error: error?.message || 'Failed to create reversing voucher' };
    }
  }

  private async findAccount(category: string, search: string): Promise<any | null> {
    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.chartOfAccountsMediator) return null;
      const res = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
        category,
        status: 'Active',
        search,
        limit: 1,
      });
      return res?.data?.[0] || null;
    } catch (err) {
      MyLogger.error('Find Account', err, { category, search });
      return null;
    }
  }
}

export const salesAccountsIntegrationService = new SalesAccountsIntegrationService();


