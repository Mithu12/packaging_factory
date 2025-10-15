import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { eventBus, EVENT_NAMES, EventPayload } from '@/utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import { VoucherType } from '@/types/accounts';
import pool from '@/database/connection';

/**
 * Inventory Accounts Integration Service
 * Provides optional integration between inventory and accounts modules
 * This service only works if the accounts module is available
 */

export interface PurchaseOrderAccountingData {
  purchaseOrderId: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  totalAmount: number;
  receivedDate: string;
  currency: string;
  lineItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface StockAdjustmentAccountingData {
  adjustmentId: number;
  productId: number;
  productName: string;
  productSku: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  notes?: string;
  adjustmentDate: string;
}

export interface VoucherCreationResult {
  voucherId: number;
  voucherNo: string;
  success: boolean;
  error?: string;
}

class InventoryAccountsIntegrationService {
  private isAccountsAvailable(): boolean {
    return moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS);
  }

  /**
   * Create accounting voucher for purchase order receipt
   * Debit: Inventory (asset increase), Credit: Accounts Payable (liability increase)
   */
  async createPurchaseOrderReceiptVoucher(
    purchaseOrderData: PurchaseOrderAccountingData,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Purchase Order Receipt Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, {
        message: 'Accounts module not available, skipping voucher creation',
        purchaseOrderId: purchaseOrderData.purchaseOrderId
      });
      return null;
    }

    try {
      MyLogger.info(action, { purchaseOrderId: purchaseOrderData.purchaseOrderId });

      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) {
        MyLogger.warn(action, {
          message: 'Voucher mediator not available in accounts services',
          purchaseOrderId: purchaseOrderData.purchaseOrderId
        });
        return { voucherId: 0, voucherNo: '', success: false, error: 'Accounts services unavailable' };
      }

      // Get required accounts
      const inventoryAccount = await this.getDefaultAccount('inventory');
      const accountsPayableAccount = await this.getDefaultAccount('accounts_payable');

      if (!inventoryAccount || !accountsPayableAccount) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured (Inventory, Accounts Payable)'
        };
      }

      // Calculate total inventory value
      const totalInventoryValue = purchaseOrderData.lineItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(purchaseOrderData.receivedDate),
        reference: purchaseOrderData.poNumber,
        payee: purchaseOrderData.supplierName,
        amount: totalInventoryValue,
        currency: purchaseOrderData.currency,
        narration: `Purchase Order Receipt - ${purchaseOrderData.poNumber} from ${purchaseOrderData.supplierName} - Received ${purchaseOrderData.lineItems.length} items`,
        lines: [
          {
            accountId: inventoryAccount.id,
            debit: totalInventoryValue,
            credit: 0,
            description: `Inventory increase - ${purchaseOrderData.poNumber}`
          },
          {
            accountId: accountsPayableAccount.id,
            debit: 0,
            credit: totalInventoryValue,
            description: `Accounts Payable - ${purchaseOrderData.poNumber}`
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);

      // Auto-approve the voucher
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      // Update purchase order with voucher reference
      await this.updatePurchaseOrderVoucherReference(purchaseOrderData.purchaseOrderId, voucher.id);

      MyLogger.success(action, {
        purchaseOrderId: purchaseOrderData.purchaseOrderId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        totalInventoryValue
      });

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };

    } catch (error: any) {
      MyLogger.error(action, error, { purchaseOrderData });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create voucher'
      };
    }
  }

  /**
   * Create accounting voucher for stock adjustments
   * Handles inventory increases and decreases with proper accounting entries
   */
  async createStockAdjustmentVoucher(
    adjustmentData: StockAdjustmentAccountingData,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Stock Adjustment Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, {
        message: 'Accounts module not available, skipping voucher creation',
        adjustmentId: adjustmentData.adjustmentId
      });
      return null;
    }

    try {
      MyLogger.info(action, { adjustmentId: adjustmentData.adjustmentId });

      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) {
        MyLogger.warn(action, {
          message: 'Voucher mediator not available in accounts services',
          adjustmentId: adjustmentData.adjustmentId
        });
        return { voucherId: 0, voucherNo: '', success: false, error: 'Accounts services unavailable' };
      }

      // Get required accounts
      const inventoryAccount = await this.getDefaultAccount('inventory');
      const inventoryAdjustmentAccount = await this.getDefaultAccount('inventory_adjustment');

      if (!inventoryAccount || !inventoryAdjustmentAccount) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured (Inventory, Inventory Adjustment)'
        };
      }

      // Calculate adjustment amount (simplified - assuming unit cost of $1 for demo)
      // In production, this should use actual product costs
      const adjustmentAmount = Math.abs(adjustmentData.quantity);

      const lines: Array<{ accountId: number; debit: number; credit: number; description?: string }> = [];

      if (adjustmentData.adjustmentType === 'increase') {
        // Debit Inventory, Credit Inventory Adjustment Income
        lines.push(
          {
            accountId: inventoryAccount.id,
            debit: adjustmentAmount,
            credit: 0,
            description: `Inventory increase - ${adjustmentData.productName} (${adjustmentData.quantity} units)`
          },
          {
            accountId: inventoryAdjustmentAccount.id,
            debit: 0,
            credit: adjustmentAmount,
            description: `Inventory adjustment income - ${adjustmentData.reason}`
          }
        );
      } else if (adjustmentData.adjustmentType === 'decrease') {
        // Debit Inventory Adjustment Expense, Credit Inventory
        lines.push(
          {
            accountId: inventoryAdjustmentAccount.id,
            debit: adjustmentAmount,
            credit: 0,
            description: `Inventory adjustment expense - ${adjustmentData.reason}`
          },
          {
            accountId: inventoryAccount.id,
            debit: 0,
            credit: adjustmentAmount,
            description: `Inventory decrease - ${adjustmentData.productName} (${adjustmentData.quantity} units)`
          }
        );
      } else if (adjustmentData.adjustmentType === 'set') {
        // Calculate difference between previous and new stock
        const stockDifference = adjustmentData.newStock - adjustmentData.previousStock;

        if (stockDifference > 0) {
          // Increase: Debit Inventory, Credit Inventory Adjustment Income
          lines.push(
            {
              accountId: inventoryAccount.id,
              debit: stockDifference,
              credit: 0,
              description: `Inventory set increase - ${adjustmentData.productName}`
            },
            {
              accountId: inventoryAdjustmentAccount.id,
              debit: 0,
              credit: stockDifference,
              description: `Inventory adjustment income - ${adjustmentData.reason}`
            }
          );
        } else if (stockDifference < 0) {
          // Decrease: Debit Inventory Adjustment Expense, Credit Inventory
          const decreaseAmount = Math.abs(stockDifference);
          lines.push(
            {
              accountId: inventoryAdjustmentAccount.id,
              debit: decreaseAmount,
              credit: 0,
              description: `Inventory adjustment expense - ${adjustmentData.reason}`
            },
            {
              accountId: inventoryAccount.id,
              debit: 0,
              credit: decreaseAmount,
              description: `Inventory set decrease - ${adjustmentData.productName}`
            }
          );
        }
      }

      // Skip if no adjustment amount
      if (lines.length === 0) {
        MyLogger.info(action, {
          message: 'No adjustment amount to process',
          adjustmentId: adjustmentData.adjustmentId
        });
        return { voucherId: 0, voucherNo: '', success: true };
      }

      const totalDebits = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lines.reduce((s, l) => s + l.credit, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Voucher lines not balanced'
        };
      }

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(adjustmentData.adjustmentDate),
        reference: adjustmentData.reference || `ADJ-${adjustmentData.adjustmentId}`,
        payee: 'Stock Adjustment',
        amount: totalDebits,
        narration: `Stock Adjustment - ${adjustmentData.productName} (${adjustmentData.adjustmentType}) - ${adjustmentData.reason}${adjustmentData.notes ? ` - ${adjustmentData.notes}` : ''}`,
        lines
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);

      // Auto-approve the voucher
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      // Update stock adjustment with voucher reference
      await this.updateStockAdjustmentVoucherReference(adjustmentData.adjustmentId, voucher.id);

      MyLogger.success(action, {
        adjustmentId: adjustmentData.adjustmentId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        adjustmentAmount: totalDebits
      });

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };

    } catch (error: any) {
      MyLogger.error(action, error, { adjustmentData });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create voucher'
      };
    }
  }

  /**
   * Get default account by type for inventory operations
   */
  private async getDefaultAccount(accountType: string): Promise<any> {
    if (!this.isAccountsAvailable()) return null;

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.chartOfAccountsMediator) return null;

      let searchTerm = '';
      let category = '';

      switch (accountType) {
        case 'inventory':
          searchTerm = 'Inventory';
          category = 'Assets';
          break;
        case 'accounts_payable':
          searchTerm = 'Accounts Payable';
          category = 'Liabilities';
          break;
        case 'inventory_adjustment':
          searchTerm = 'Inventory Adjustment';
          category = 'Income';
          break;
        default:
          return null;
      }

      const accounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
        category,
        status: 'Active',
        search: searchTerm,
        limit: 1
      });

      return accounts.data?.[0] || null;

    } catch (error) {
      MyLogger.error('Get Default Account', error, { accountType });
      return null;
    }
  }

  /**
   * Update purchase order with voucher reference
   */
  private async updatePurchaseOrderVoucherReference(
    purchaseOrderId: number,
    voucherId: number
  ): Promise<void> {
    try {
      // Check if column exists first
      const columnCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'purchase_orders'
        AND column_name = 'receipt_voucher_id'
      `);

      if (columnCheck.rows.length === 0) {
        MyLogger.warn('Update Purchase Order Voucher Reference', {
          message: 'Column receipt_voucher_id does not exist yet - will be added in migration',
          purchaseOrderId,
          voucherId
        });
        return;
      }

      await pool.query(
        'UPDATE purchase_orders SET receipt_voucher_id = $1 WHERE id = $2',
        [voucherId, purchaseOrderId]
      );

      MyLogger.info('Update Purchase Order Voucher Reference', {
        purchaseOrderId,
        voucherId
      });
    } catch (error) {
      MyLogger.error('Update Purchase Order Voucher Reference', error, {
        purchaseOrderId,
        voucherId
      });
    }
  }

  /**
   * Update stock adjustment with voucher reference
   */
  private async updateStockAdjustmentVoucherReference(
    adjustmentId: number,
    voucherId: number
  ): Promise<void> {
    try {
      // Check if column exists first
      const columnCheck = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'stock_adjustments'
        AND column_name = 'voucher_id'
      `);

      if (columnCheck.rows.length === 0) {
        MyLogger.warn('Update Stock Adjustment Voucher Reference', {
          message: 'Column voucher_id does not exist yet - will be added in migration',
          adjustmentId,
          voucherId
        });
        return;
      }

      await pool.query(
        'UPDATE stock_adjustments SET voucher_id = $1 WHERE id = $2',
        [voucherId, adjustmentId]
      );

      MyLogger.info('Update Stock Adjustment Voucher Reference', {
        adjustmentId,
        voucherId
      });
    } catch (error) {
      MyLogger.error('Update Stock Adjustment Voucher Reference', error, {
        adjustmentId,
        voucherId
      });
    }
  }

  /**
   * Check if purchase order can be integrated with accounts
   */
  canIntegratePurchaseOrder(purchaseOrderData: PurchaseOrderAccountingData): boolean {
    return this.isAccountsAvailable() &&
           purchaseOrderData.totalAmount > 0 &&
           purchaseOrderData.lineItems.length > 0 &&
           !!purchaseOrderData.receivedDate;
  }

  /**
   * Check if stock adjustment can be integrated with accounts
   */
  canIntegrateStockAdjustment(adjustmentData: StockAdjustmentAccountingData): boolean {
    return this.isAccountsAvailable() &&
           adjustmentData.quantity !== 0 &&
           !!adjustmentData.adjustmentDate;
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
export const inventoryAccountsIntegrationService = new InventoryAccountsIntegrationService();

/**
 * Event listeners for inventory events
 * These will only be registered if accounts module is available
 */
export const registerInventoryAccountingListeners = (): void => {
  if (!moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS)) {
    MyLogger.info('Inventory Accounting Listeners', {
      message: 'Accounts module not available, skipping listener registration'
    });
    return;
  }

  // Listen for purchase order receipt events
  eventBus.on(EVENT_NAMES.PURCHASE_ORDER_RECEIVED, async (payload: EventPayload) => {
    try {
      const purchaseOrderData = payload.purchaseOrderData as PurchaseOrderAccountingData;
      const userId = payload.userId as number;

      if (purchaseOrderData && inventoryAccountsIntegrationService.canIntegratePurchaseOrder(purchaseOrderData)) {
        const result = await inventoryAccountsIntegrationService.createPurchaseOrderReceiptVoucher(purchaseOrderData, userId);

        if (result?.success) {
          MyLogger.success('Inventory Accounting Integration', {
            event: 'PURCHASE_ORDER_RECEIVED',
            purchaseOrderId: purchaseOrderData.purchaseOrderId,
            voucherId: result.voucherId,
            voucherNo: result.voucherNo
          });
        } else if (result?.error) {
          MyLogger.warn('Inventory Accounting Integration', {
            event: 'PURCHASE_ORDER_RECEIVED',
            purchaseOrderId: purchaseOrderData.purchaseOrderId,
            error: result.error
          });
        }
      }
    } catch (error) {
      MyLogger.error('Inventory Accounting Integration', error, { payload });
    }
  });

  // Listen for stock adjustment events
  eventBus.on(EVENT_NAMES.STOCK_ADJUSTMENT_CREATED, async (payload: EventPayload) => {
    try {
      const adjustmentData = payload.adjustmentData as StockAdjustmentAccountingData;
      const userId = payload.userId as number;

      if (adjustmentData && inventoryAccountsIntegrationService.canIntegrateStockAdjustment(adjustmentData)) {
        const result = await inventoryAccountsIntegrationService.createStockAdjustmentVoucher(adjustmentData, userId);

        if (result?.success) {
          MyLogger.success('Inventory Accounting Integration', {
            event: 'STOCK_ADJUSTMENT_CREATED',
            adjustmentId: adjustmentData.adjustmentId,
            voucherId: result.voucherId,
            voucherNo: result.voucherNo
          });
        } else if (result?.error) {
          MyLogger.warn('Inventory Accounting Integration', {
            event: 'STOCK_ADJUSTMENT_CREATED',
            adjustmentId: adjustmentData.adjustmentId,
            error: result.error
          });
        }
      }
    } catch (error) {
      MyLogger.error('Inventory Accounting Integration', error, { payload });
    }
  });

  MyLogger.success('Inventory Accounting Listeners', {
    message: 'Event listeners registered successfully',
    events: ['PURCHASE_ORDER_RECEIVED', 'STOCK_ADJUSTMENT_CREATED']
  });
};
