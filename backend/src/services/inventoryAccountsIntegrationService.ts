import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { eventBus, EVENT_NAMES, EventPayload } from '@/utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import { VoucherType } from '@/types/accounts';
import pool from '@/database/connection';
import { logVoucherFailureFromError } from './voucherFailureLogService';

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
  distributionCenterId?: number;
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
  distributionCenterId?: number;
}

export interface StockTransferAccountingData {
  transferId: number;
  transferNumber: string;
  productId: number;
  productName: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  fromCenterId?: number;
  fromCenterName?: string;
  toCenterId: number;
  toCenterName: string;
  transferDate: string;
}

export interface SupplierPaymentAccountingData {
  paymentId: number;
  paymentNumber: string;
  supplierId: number;
  supplierName: string;
  amount: number;
  // Supplier discount received; the settled amount is amount + discountAmount.
  discountAmount?: number;
  paymentDate: string;
  paymentMethod: string;
  bankName?: string;
  reference?: string;
  notes?: string;
  invoiceId?: number;
  invoiceNumber?: string;
  // Populated when a single payment settles several invoices.
  invoiceNumbers?: string[];
}

export interface PurchaseReturnAccountingData {
  purchaseReturnId: number;
  returnNumber: string;
  purchaseOrderId: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  originalVoucherId: number;
  totalAmount: number;
  currency: string;
  returnDate: string;
  distributionCenterId?: number;
  lineItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
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
      // Resolve cost center for the DC (Inventory is location-specific)
      let costCenterId = undefined;
      if (purchaseOrderData.distributionCenterId) {
        costCenterId = await this.getDcCostCenter(purchaseOrderData.distributionCenterId);
      }

      // Get required accounts
      const inventoryAccount = await this.getDefaultAccount('inventory', costCenterId);
      const accountsPayableAccount = await this.getDefaultAccount('accounts_payable', costCenterId);

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
        costCenterId: costCenterId,
        lines: [
          {
            accountId: inventoryAccount.id,
            debit: totalInventoryValue,
            credit: 0,
            description: `Inventory increase - ${purchaseOrderData.poNumber}`,
            costCenterId
          },
          {
            accountId: accountsPayableAccount.id,
            debit: 0,
            credit: totalInventoryValue,
            description: `Accounts Payable - ${purchaseOrderData.poNumber}`,
            costCenterId
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

      // Resolve cost center
      let costCenterId = undefined;
      if (adjustmentData.distributionCenterId) {
        costCenterId = await this.getDcCostCenter(adjustmentData.distributionCenterId);
      }

      // Get required accounts
      const inventoryAccount = await this.getDefaultAccount('inventory', costCenterId);
      const inventoryAdjustmentAccount = await this.getDefaultAccount('inventory_adjustment', costCenterId);

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
        costCenterId,
        lines: lines.map(line => ({ ...line, costCenterId }))
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
   * Create accounting voucher for stock transfer between distribution centers
   * Debit: Inventory (Destination DC), Credit: Inventory (Source DC)
   */
  async createStockTransferVoucher(
    transferData: StockTransferAccountingData,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Stock Transfer Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, {
        message: 'Accounts module not available, skipping voucher creation',
        transferId: transferData.transferId
      });
      return null;
    }

    try {
      MyLogger.info(action, { transferId: transferData.transferId });

      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) {
        return { voucherId: 0, voucherNo: '', success: false, error: 'Accounts services unavailable' };
      }

      // Resolve cost centers
      const toCostCenterId = await this.getDcCostCenter(transferData.toCenterId);
      const fromCostCenterId = transferData.fromCenterId ? await this.getDcCostCenter(transferData.fromCenterId) : undefined;

      // Get Inventory Accounts for each center
      const toInventoryAccount = await this.getDefaultAccount('inventory', toCostCenterId);
      const fromInventoryAccount = await this.getDefaultAccount('inventory', fromCostCenterId);

      if (!toInventoryAccount || !fromInventoryAccount) {
        return { voucherId: 0, voucherNo: '', success: false, error: 'Required inventory accounts not configured' };
      }

      // Use actual cost if available, otherwise fallback to $1 for demo
      const totalValue = transferData.totalCost || transferData.quantity * (transferData.unitCost || 1);

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(transferData.transferDate),
        reference: transferData.transferNumber,
        payee: 'Internal Transfer',
        amount: totalValue,
        narration: `Internal Transfer - ${transferData.transferNumber}: ${transferData.productName} (${transferData.quantity} units) from ${transferData.fromCenterName || 'Source'} to ${transferData.toCenterName}`,
        lines: [
          {
            accountId: toInventoryAccount.id,
            debit: totalValue,
            credit: 0,
            description: `Stock In - ${transferData.toCenterName}`,
            costCenterId: toCostCenterId
          },
          {
            accountId: fromInventoryAccount.id,
            debit: 0,
            credit: totalValue,
            description: `Stock Out - ${transferData.fromCenterName || 'Source'}`,
            costCenterId: fromCostCenterId
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);

      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      MyLogger.success(action, {
        transferId: transferData.transferId,
        voucherId: voucher.id,
        totalValue
      });

      return { voucherId: voucher.id, voucherNo: voucher.voucherNo, success: true };

    } catch (error: any) {
      MyLogger.error(action, error, { transferData });
      return { voucherId: 0, voucherNo: '', success: false, error: error.message || 'Failed' };
    }
  }

  /**
   * Create accounting voucher for supplier payment
   * Debit: Accounts Payable, Credit: Cash/Bank
   */
  async createSupplierPaymentVoucher(
    paymentData: SupplierPaymentAccountingData,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Supplier Payment Voucher';

    if (!this.isAccountsAvailable()) {
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) {
        return { voucherId: 0, voucherNo: '', success: false, error: 'Accounts services unavailable' };
      }

      const apAccount = await this.getDefaultAccount('accounts_payable');
      const cashAccount = await this.getDefaultAccount('cash');
      // Supplier payments usually happen at head office, so CC is often central.
      // But if we have a DC context for the payment, we should use it.

      if (!apAccount || !cashAccount) {
        const errMsg = 'Accounts not configured (Accounts Payable, Cash)';
        logVoucherFailureFromError({
          sourceModule: 'inventory',
          operationType: 'addSupplierPaymentVoucher',
          sourceEntityType: 'payment',
          sourceEntityId: paymentData.paymentId,
          errorMessage: errMsg,
          payload: { paymentNumber: paymentData.paymentNumber, supplierName: paymentData.supplierName },
          userId,
        });
        return { voucherId: 0, voucherNo: '', success: false, error: errMsg };
      }

      // A supplier discount fully settles the invoice while less cash is paid:
      // Debit AP (settled) / Credit Cash (net) / Credit Discount Received (discount).
      const discountAmount = Number(paymentData.discountAmount || 0);
      const settledAmount = paymentData.amount + discountAmount;
      let discountAccount: any = null;
      if (discountAmount > 0) {
        discountAccount = await this.getDefaultAccount('purchase_discount');
        if (!discountAccount) {
          const errMsg = 'Discount Received account not configured (Income)';
          logVoucherFailureFromError({
            sourceModule: 'inventory',
            operationType: 'addSupplierPaymentVoucher',
            sourceEntityType: 'payment',
            sourceEntityId: paymentData.paymentId,
            errorMessage: errMsg,
            payload: { paymentNumber: paymentData.paymentNumber, supplierName: paymentData.supplierName },
            userId,
          });
          return { voucherId: 0, voucherNo: '', success: false, error: errMsg };
        }
      }

      const costCenterId = await this.getCostCenterForPayment(
        paymentData.paymentId,
        paymentData.invoiceId
      );

      // Build the invoice reference text from all settled invoices (or the
      // single invoice / nothing for advance payments).
      const invoiceList =
        paymentData.invoiceNumbers && paymentData.invoiceNumbers.length > 0
          ? paymentData.invoiceNumbers
          : paymentData.invoiceNumber
          ? [paymentData.invoiceNumber]
          : [];
      const invoiceText =
        invoiceList.length > 0
          ? ` for Invoice${invoiceList.length > 1 ? 's' : ''} ${invoiceList.join(', ')}`
          : '';
      const bankText = paymentData.bankName ? ` via ${paymentData.bankName}` : '';

      const voucherData = {
        type: VoucherType.PAYMENT,
        date: new Date(paymentData.paymentDate),
        reference: paymentData.reference || paymentData.paymentNumber,
        payee: paymentData.supplierName,
        amount: settledAmount,
        narration: `Payment to ${paymentData.supplierName}${invoiceText}${bankText}`,
        costCenterId,
        lines: [
          {
            accountId: apAccount.id,
            debit: settledAmount,
            credit: 0,
            description: `Settle ${invoiceList.length > 0 ? invoiceList.join(', ') : 'Account'}`,
            costCenterId
          },
          {
            accountId: cashAccount.id,
            debit: 0,
            credit: paymentData.amount,
            description: `Paid via ${paymentData.paymentMethod}`,
            costCenterId
          },
          ...(discountAmount > 0
            ? [
                {
                  accountId: discountAccount.id,
                  debit: 0,
                  credit: discountAmount,
                  description: `Discount received${invoiceList.length > 0 ? ` on ${invoiceList.join(', ')}` : ''}`,
                  costCenterId
                }
              ]
            : [])
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);

      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      // Update payment record with voucher ID
      await pool.query('UPDATE payments SET voucher_id = $1 WHERE id = $2', [voucher.id, paymentData.paymentId]);

      return { voucherId: voucher.id, voucherNo: voucher.voucherNo, success: true };
    } catch (error: any) {
      MyLogger.error(action, error, { paymentData });
      logVoucherFailureFromError({
        sourceModule: 'inventory',
        operationType: 'addSupplierPaymentVoucher',
        sourceEntityType: 'payment',
        sourceEntityId: paymentData.paymentId,
        errorMessage: error.message || 'Failed to create voucher',
        payload: { paymentNumber: paymentData.paymentNumber, supplierName: paymentData.supplierName },
        userId,
      });
      return { voucherId: 0, voucherNo: '', success: false, error: error.message };
    }
  }

  /**
   * Create accounting voucher for a purchase return (debit note)
   * Debit: Accounts Payable (liability reduction), Credit: Inventory (asset reduction)
   * Links to the original GRN voucher via vouchers.reverses_voucher_id (V39).
   */
  async createPurchaseReturnVoucher(
    returnData: PurchaseReturnAccountingData,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Purchase Return Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, {
        message: 'Accounts module not available, skipping voucher creation',
        purchaseReturnId: returnData.purchaseReturnId
      });
      return null;
    }

    try {
      MyLogger.info(action, {
        purchaseReturnId: returnData.purchaseReturnId,
        originalVoucherId: returnData.originalVoucherId
      });

      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) {
        return {
          voucherId: 0, voucherNo: '', success: false,
          error: 'Accounts services unavailable'
        };
      }

      // Resolve cost center from DC
      let costCenterId: number | undefined = undefined;
      if (returnData.distributionCenterId) {
        costCenterId = await this.getDcCostCenter(returnData.distributionCenterId);
      }

      // Read the original GRN voucher to reuse its AP + Inventory accounts.
      // The original posted: Debit Inventory, Credit AP.
      let inventoryAccountId: number | null = null;
      let apAccountId: number | null = null;
      let originalVoucherNo = '';

      if (accountsServices.getVoucherMediator) {
        try {
          const originalVoucher = await accountsServices.getVoucherMediator.getVoucherById(
            returnData.originalVoucherId
          );
          originalVoucherNo = originalVoucher.voucherNo || '';
          for (const line of (originalVoucher.lines || [])) {
            if (Number(line.debit) > 0 && inventoryAccountId == null) {
              inventoryAccountId = Number(line.accountId);
            }
            if (Number(line.credit) > 0 && apAccountId == null) {
              apAccountId = Number(line.accountId);
            }
          }
        } catch (err) {
          MyLogger.warn(action, {
            message: 'Could not load original GRN voucher; falling back to default account lookup',
            originalVoucherId: returnData.originalVoucherId
          });
        }
      }

      if (!inventoryAccountId || !apAccountId) {
        const inventoryAccount = await this.getDefaultAccount('inventory', costCenterId);
        const apAccount = await this.getDefaultAccount('accounts_payable', costCenterId);
        if (!inventoryAccount || !apAccount) {
          return {
            voucherId: 0, voucherNo: '', success: false,
            error: 'Required accounts not configured (Inventory, Accounts Payable)'
          };
        }
        inventoryAccountId = inventoryAccountId ?? inventoryAccount.id;
        apAccountId = apAccountId ?? apAccount.id;
      }

      const totalAmount = Number(returnData.totalAmount);
      if (!(totalAmount > 0)) {
        return {
          voucherId: 0, voucherNo: '', success: false,
          error: 'Return total must be greater than zero'
        };
      }

      const narration =
        `Purchase Return ${returnData.returnNumber} – ${returnData.supplierName}` +
        (originalVoucherNo
          ? ` (debit note, reverses ${originalVoucherNo})`
          : ' (debit note)');

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(returnData.returnDate),
        reference: returnData.returnNumber,
        payee: returnData.supplierName,
        amount: totalAmount,
        currency: returnData.currency,
        narration,
        costCenterId,
        lines: [
          {
            accountId: apAccountId,
            debit: totalAmount,
            credit: 0,
            description: `Debit Note - ${returnData.returnNumber}`,
            costCenterId
          },
          {
            accountId: inventoryAccountId,
            debit: 0,
            credit: totalAmount,
            description: `Inventory return - ${returnData.returnNumber}`,
            costCenterId
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);

      // Link the new voucher to the original GRN voucher.
      // AddVoucher.createVoucher does not accept reversesVoucherId in its payload,
      // so we set it directly here (column added in V39).
      try {
        await pool.query(
          `UPDATE vouchers SET reverses_voucher_id = $1 WHERE id = $2`,
          [returnData.originalVoucherId, voucher.id]
        );
      } catch (linkErr) {
        MyLogger.warn(action, {
          message: 'Failed to set reverses_voucher_id on new voucher',
          newVoucherId: voucher.id,
          originalVoucherId: returnData.originalVoucherId
        });
      }

      // Auto-approve
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      MyLogger.success(action, {
        purchaseReturnId: returnData.purchaseReturnId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        totalAmount
      });

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };
    } catch (error: any) {
      MyLogger.error(action, error, { returnData });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create purchase return voucher'
      };
    }
  }

  /**
   * Get Cost Center associated with a Distribution Center
   */
  private async getDcCostCenter(dcId: number): Promise<number | undefined> {
    try {
      const result = await pool.query('SELECT cost_center_id FROM distribution_centers WHERE id = $1', [dcId]);
      return result.rows[0]?.cost_center_id || undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Resolve cost center for a supplier payment.
   * Tiered: (1) Factory from invoice's PO when linked to work order/customer order, (2) Primary DC.
   * Works in factory-only setups (no distribution centers).
   */
  private async getCostCenterForPayment(
    _paymentId: number,
    invoiceId?: number
  ): Promise<number | undefined> {
    try {
      // Step A: Factory from invoice's PO (work_order_id or customer_order_id)
      if (invoiceId) {
        const factoryResult = await pool.query(
          `SELECT f.cost_center_id
           FROM invoices i
           JOIN purchase_orders po ON i.purchase_order_id = po.id
           LEFT JOIN work_orders wo ON po.work_order_id = wo.id
           LEFT JOIN factory_customer_orders fco_wo ON wo.customer_order_id = fco_wo.id
           LEFT JOIN production_lines pl ON wo.production_line_id = pl.id
           LEFT JOIN factory_customer_orders fco_po ON po.customer_order_id = fco_po.id
           LEFT JOIN factories f ON f.id = COALESCE(fco_wo.factory_id, pl.factory_id, fco_po.factory_id)
           WHERE i.id = $1 AND f.cost_center_id IS NOT NULL
           LIMIT 1`,
          [invoiceId]
        );
        const cc = factoryResult.rows[0]?.cost_center_id;
        if (cc != null) return cc;
      }

      // Step B: Primary distribution center
      const dcResult = await pool.query(
        'SELECT cost_center_id FROM distribution_centers WHERE is_primary = true LIMIT 1',
        []
      );
      return dcResult.rows[0]?.cost_center_id ?? undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get default account by type for inventory operations
   */
  private async getDefaultAccount(accountType: string, costCenterId?: number): Promise<any> {
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
        case 'cash':
          searchTerm = 'Cash';
          category = 'Assets';
          break;
        case 'purchase_discount':
          searchTerm = 'Discount Received';
          category = 'Income';
          break;
        default:
          return null;
      }

      const ccParams: any = {
        category,
        status: 'Active',
        search: searchTerm,
        limit: 1
      };

      // 1. Try to find CC-specific account
      if (costCenterId) {
        const ccAccounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList({
          ...ccParams,
          costCenterId
        });
        if (ccAccounts.data?.[0]) return ccAccounts.data[0];
      }

      // 2. Fall back to central account
      const accounts = await accountsServices.chartOfAccountsMediator.getChartOfAccountList(ccParams);

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

  // Listen for internal transfer events
  eventBus.on(EVENT_NAMES.STOCK_TRANSFER_RECEIVED, async (payload: EventPayload) => {
    try {
      const transferData = payload.transferData as StockTransferAccountingData;
      const userId = payload.userId as number;

      if (transferData) {
        const result = await inventoryAccountsIntegrationService.createStockTransferVoucher(transferData, userId);
        if (result?.success) {
          MyLogger.success('Inventory Accounting Integration', {
            event: 'STOCK_TRANSFER_RECEIVED',
            transferId: transferData.transferId,
            voucherId: result.voucherId
          });
        }
      }
    } catch (error) {
      MyLogger.error('Inventory Accounting Integration', error, { payload });
    }
  });

  // Listen for supplier payment events
  eventBus.on(EVENT_NAMES.SUPPLIER_PAYMENT_CREATED, async (payload: EventPayload) => {
    try {
      const paymentData = payload.paymentData as SupplierPaymentAccountingData;
      const userId = payload.userId as number;

      if (paymentData) {
        const result = await inventoryAccountsIntegrationService.createSupplierPaymentVoucher(paymentData, userId);
        if (result?.success) {
          MyLogger.success('Inventory Accounting Integration', {
            event: 'SUPPLIER_PAYMENT_CREATED',
            paymentId: paymentData.paymentId,
            voucherId: result.voucherId
          });
        }
      }
    } catch (error) {
      MyLogger.error('Inventory Accounting Integration', error, { payload });
    }
  });

  MyLogger.success('Inventory Accounting Listeners', {
    message: 'Event listeners registered successfully',
    events: ['PURCHASE_ORDER_RECEIVED', 'STOCK_ADJUSTMENT_CREATED', 'STOCK_TRANSFER_RECEIVED', 'SUPPLIER_PAYMENT_CREATED']
  });
};
