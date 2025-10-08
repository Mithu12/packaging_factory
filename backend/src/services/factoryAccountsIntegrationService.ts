import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { eventBus, EVENT_NAMES, EventPayload } from '@/utils/eventBus';
import { MyLogger } from '@/utils/new-logger';
import { VoucherType } from '@/types/accounts';
import pool from '@/database/connection';
import { factoryEventLogService } from './factoryEventLogService';

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
   * 
   * WITH IDEMPOTENCY: Checks event log to prevent duplicate vouchers
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

    // Generate event ID for idempotency
    const eventId = factoryEventLogService.generateEventId(
      'order_approved',
      parseInt(orderData.orderId)
    );

    // Check if already processed (idempotency)
    const alreadyProcessed = await factoryEventLogService.isEventProcessed(eventId);
    if (alreadyProcessed) {
      MyLogger.info(action, {
        message: 'Event already processed, skipping',
        eventId,
        orderId: orderData.orderId
      });
      return { voucherId: 0, voucherNo: '', success: true }; // Return success but no new voucher
    }

    // Log event start
    let eventLogId: number | null = null;
    try {
      eventLogId = await factoryEventLogService.logEventStart(
        eventId,
        'FACTORY_ORDER_APPROVED',
        'customer_order',
        parseInt(orderData.orderId),
        orderData,
        userId
      );
    } catch (logError) {
      MyLogger.error(`${action}.logEventStart`, logError, { eventId, orderId: orderData.orderId });
      // Continue even if logging fails
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

      // Log success
      if (eventLogId) {
        await factoryEventLogService.logEventSuccess(eventLogId, [voucher.id]);
      }

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };

    } catch (error: any) {
      MyLogger.error(action, error, { orderId: orderData.orderId });

      // Log failure and add to failed voucher queue
      if (eventLogId) {
        const failureCategory = factoryEventLogService.determineFailureCategory(error);
        await factoryEventLogService.logEventFailure(
          eventLogId,
          error,
          'FACTORY_ORDER_APPROVED',
          'customer_order',
          parseInt(orderData.orderId),
          orderData,
          failureCategory
        );
      }

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
        case 'wip':
          searchTerm = 'Work in Progress';
          category = 'Assets';
          break;
        case 'raw_materials':
          searchTerm = 'Raw Materials';
          category = 'Assets';
          break;
        case 'wastage_expense':
          searchTerm = 'Wastage';
          category = 'Expenses';
          break;
        case 'wages_payable':
          searchTerm = 'Wages Payable';
          category = 'Liabilities';
          break;
        case 'factory_overhead_applied':
          searchTerm = 'Factory Overhead';
          category = 'Liabilities';
          break;
        case 'finished_goods':
          searchTerm = 'Finished Goods';
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

  // ========================================
  // PHASE 2: Material Consumption & Wastage
  // ========================================

  /**
   * Create voucher for material consumption
   * Debit: WIP, Credit: Raw Materials Inventory
   */
  async createMaterialConsumptionVoucher(
    consumptionData: any,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Material Consumption Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { 
        message: 'Accounts module not available',
        consumptionId: consumptionData.consumptionId
      });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) return null;

      // Get accounts
      const wipAccount = await this.getDefaultAccount('wip');
      const rawMaterialsAccount = await this.getDefaultAccount('raw_materials');

      if (!wipAccount || !rawMaterialsAccount) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured (WIP, Raw Materials)'
        };
      }

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(consumptionData.consumptionDate),
        reference: `WO-${consumptionData.workOrderId}`,
        payee: 'Material Consumption',
        amount: consumptionData.cost,
        narration: `Material Consumed: ${consumptionData.materialName} (${consumptionData.quantity} units) for Work Order ${consumptionData.workOrderId}`,
        lines: [
          {
            accountId: wipAccount.id,
            debit: consumptionData.cost,
            credit: 0,
            description: `WIP - Material: ${consumptionData.materialName}`
          },
          {
            accountId: rawMaterialsAccount.id,
            debit: 0,
            credit: consumptionData.cost,
            description: `Raw Materials - ${consumptionData.materialName}`
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      
      // Auto-approve
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      // Update consumption record with voucher reference
      await pool.query(
        'UPDATE work_order_material_consumptions SET voucher_id = $1 WHERE id = $2',
        [voucher.id, consumptionData.consumptionId]
      );

      // Update work order WIP cost
      await pool.query(
        `UPDATE work_orders 
         SET total_material_cost = COALESCE(total_material_cost, 0) + $1,
             total_wip_cost = COALESCE(total_material_cost, 0) + COALESCE(total_labor_cost, 0) + COALESCE(total_overhead_cost, 0) + $1
         WHERE id = $2`,
        [consumptionData.cost, consumptionData.workOrderId]
      );

      MyLogger.success(action, {
        consumptionId: consumptionData.consumptionId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo
      });

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };

    } catch (error: any) {
      MyLogger.error(action, error, { consumptionData });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create voucher'
      };
    }
  }

  /**
   * Create voucher for approved wastage
   * Debit: Wastage Expense, Credit: Raw Materials Inventory
   */
  async createWastageVoucher(
    wastageData: any,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Wastage Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { 
        message: 'Accounts module not available',
        wastageId: wastageData.wastageId
      });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) return null;

      // Get accounts
      const wastageExpenseAccount = await this.getDefaultAccount('wastage_expense');
      const rawMaterialsAccount = await this.getDefaultAccount('raw_materials');

      if (!wastageExpenseAccount || !rawMaterialsAccount) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured (Wastage Expense, Raw Materials)'
        };
      }

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(wastageData.approvedDate),
        reference: `WO-${wastageData.workOrderId}`,
        payee: 'Material Wastage',
        amount: wastageData.cost,
        narration: `Wastage Approved: ${wastageData.materialName} (${wastageData.quantity} units) - Reason: ${wastageData.reason}${wastageData.notes ? ` - ${wastageData.notes}` : ''}`,
        lines: [
          {
            accountId: wastageExpenseAccount.id,
            debit: wastageData.cost,
            credit: 0,
            description: `Wastage Expense - ${wastageData.materialName}`
          },
          {
            accountId: rawMaterialsAccount.id,
            debit: 0,
            credit: wastageData.cost,
            description: `Raw Materials - ${wastageData.materialName}`
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      
      // Auto-approve
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      // Update wastage record with voucher reference
      await pool.query(
        'UPDATE material_wastage SET voucher_id = $1 WHERE id = $2',
        [voucher.id, wastageData.wastageId]
      );

      MyLogger.success(action, {
        wastageId: wastageData.wastageId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo
      });

      return {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        success: true
      };

    } catch (error: any) {
      MyLogger.error(action, error, { wastageData });
      return {
        voucherId: 0,
        voucherNo: '',
        success: false,
        error: error.message || 'Failed to create voucher'
      };
    }
  }

  // ========================================
  // PHASE 3: Production Runs & Work Orders
  // ========================================

  /**
   * Create vouchers for completed production run (labor and overhead)
   * Returns both voucher creation results
   */
  async createProductionRunVouchers(
    productionRunData: any,
    userId: number
  ): Promise<{ labor: VoucherCreationResult | null; overhead: VoucherCreationResult | null }> {
    const laborResult = await this.createProductionRunLaborVoucher(productionRunData, userId);
    const overheadResult = await this.createProductionRunOverheadVoucher(productionRunData, userId);
    
    // Update production run with costs and voucher IDs
    if (laborResult?.success || overheadResult?.success) {
      try {
        await pool.query(
          `UPDATE production_runs 
           SET labor_cost = $1, 
               overhead_cost = $2,
               labor_voucher_id = $3,
               overhead_voucher_id = $4
           WHERE id = $5`,
          [
            productionRunData.laborCost,
            productionRunData.overheadCost,
            laborResult?.voucherId || null,
            overheadResult?.voucherId || null,
            productionRunData.runId
          ]
        );

        // Update work order total costs
        await pool.query(
          `UPDATE work_orders 
           SET total_labor_cost = COALESCE(total_labor_cost, 0) + $1,
               total_overhead_cost = COALESCE(total_overhead_cost, 0) + $2,
               total_wip_cost = COALESCE(total_material_cost, 0) + COALESCE(total_labor_cost, 0) + $1 + COALESCE(total_overhead_cost, 0) + $2
           WHERE id = $3`,
          [productionRunData.laborCost, productionRunData.overheadCost, productionRunData.workOrderId]
        );
      } catch (error) {
        MyLogger.error('Update Production Run Costs', error, { runId: productionRunData.runId });
      }
    }

    return { labor: laborResult, overhead: overheadResult };
  }

  /**
   * Create voucher for production run labor cost
   * Debit: WIP, Credit: Wages Payable
   */
  private async createProductionRunLaborVoucher(
    productionRunData: any,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Production Run Labor Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { message: 'Accounts module not available', runId: productionRunData.runId });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) return null;

      const wipAccount = await this.getDefaultAccount('wip');
      const wagesPayableAccount = await this.getDefaultAccount('wages_payable');

      if (!wipAccount || !wagesPayableAccount) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured (WIP, Wages Payable)'
        };
      }

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(productionRunData.completedDate),
        reference: `PR-${productionRunData.runNumber}`,
        payee: 'Production Labor',
        amount: productionRunData.laborCost,
        narration: `Labor Cost - Production Run ${productionRunData.runNumber} (${productionRunData.runtimeMinutes} minutes)`,
        lines: [
          {
            accountId: wipAccount.id,
            debit: productionRunData.laborCost,
            credit: 0,
            description: `WIP - Labor for Run ${productionRunData.runNumber}`
          },
          {
            accountId: wagesPayableAccount.id,
            debit: 0,
            credit: productionRunData.laborCost,
            description: `Wages Payable - Run ${productionRunData.runNumber}`
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      MyLogger.success(action, { runId: productionRunData.runId, voucherId: voucher.id });

      return { voucherId: voucher.id, voucherNo: voucher.voucherNo, success: true };
    } catch (error: any) {
      MyLogger.error(action, error, { productionRunData });
      return { voucherId: 0, voucherNo: '', success: false, error: error.message || 'Failed to create voucher' };
    }
  }

  /**
   * Create voucher for production run overhead cost
   * Debit: WIP, Credit: Factory Overhead Applied
   */
  private async createProductionRunOverheadVoucher(
    productionRunData: any,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Production Run Overhead Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { message: 'Accounts module not available', runId: productionRunData.runId });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) return null;

      const wipAccount = await this.getDefaultAccount('wip');
      const overheadAppliedAccount = await this.getDefaultAccount('factory_overhead_applied');

      if (!wipAccount || !overheadAppliedAccount) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured (WIP, Factory Overhead Applied)'
        };
      }

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(productionRunData.completedDate),
        reference: `PR-${productionRunData.runNumber}`,
        payee: 'Factory Overhead',
        amount: productionRunData.overheadCost,
        narration: `Overhead Cost - Production Run ${productionRunData.runNumber}`,
        lines: [
          {
            accountId: wipAccount.id,
            debit: productionRunData.overheadCost,
            credit: 0,
            description: `WIP - Overhead for Run ${productionRunData.runNumber}`
          },
          {
            accountId: overheadAppliedAccount.id,
            debit: 0,
            credit: productionRunData.overheadCost,
            description: `Factory Overhead - Run ${productionRunData.runNumber}`
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      MyLogger.success(action, { runId: productionRunData.runId, voucherId: voucher.id });

      return { voucherId: voucher.id, voucherNo: voucher.voucherNo, success: true };
    } catch (error: any) {
      MyLogger.error(action, error, { productionRunData });
      return { voucherId: 0, voucherNo: '', success: false, error: error.message || 'Failed to create voucher' };
    }
  }

  /**
   * Create voucher for work order completion - transfer WIP to Finished Goods
   * Debit: Finished Goods, Credit: WIP
   */
  async createWorkOrderFGTransferVoucher(
    workOrderData: any,
    userId: number
  ): Promise<VoucherCreationResult | null> {
    const action = 'Create Work Order FG Transfer Voucher';

    if (!this.isAccountsAvailable()) {
      MyLogger.info(action, { message: 'Accounts module not available', workOrderId: workOrderData.workOrderId });
      return null;
    }

    try {
      const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
      if (!accountsServices?.voucherMediator) return null;

      const finishedGoodsAccount = await this.getDefaultAccount('finished_goods');
      const wipAccount = await this.getDefaultAccount('wip');

      if (!finishedGoodsAccount || !wipAccount) {
        return {
          voucherId: 0,
          voucherNo: '',
          success: false,
          error: 'Required accounts not configured (Finished Goods, WIP)'
        };
      }

      const totalCost = workOrderData.totalWipCost;

      const voucherData = {
        type: VoucherType.JOURNAL,
        date: new Date(workOrderData.completedDate),
        reference: workOrderData.workOrderNumber,
        payee: 'Finished Goods Transfer',
        amount: totalCost,
        narration: `Work Order Completed - ${workOrderData.productName} (${workOrderData.quantity} ${workOrderData.unitOfMeasure}) - Cost: $${totalCost}`,
        lines: [
          {
            accountId: finishedGoodsAccount.id,
            debit: totalCost,
            credit: 0,
            description: `FG - ${workOrderData.productName} (${workOrderData.quantity} units)`
          },
          {
            accountId: wipAccount.id,
            debit: 0,
            credit: totalCost,
            description: `WIP Transfer - ${workOrderData.workOrderNumber}`
          }
        ]
      };

      const voucher = await accountsServices.voucherMediator.createVoucher(voucherData, userId);
      if (accountsServices.updateVoucherMediator) {
        await accountsServices.updateVoucherMediator.approveVoucher(voucher.id, userId);
      }

      // Update work order with voucher reference
      await pool.query(
        'UPDATE work_orders SET finished_goods_voucher_id = $1 WHERE id = $2',
        [voucher.id, workOrderData.workOrderId]
      );

      // Update product stock (add to finished goods inventory)
      await pool.query(
        `UPDATE products 
         SET current_stock = current_stock + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [workOrderData.quantity, workOrderData.productId]
      );

      MyLogger.success(action, {
        workOrderId: workOrderData.workOrderId,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        totalCost
      });

      return { voucherId: voucher.id, voucherNo: voucher.voucherNo, success: true };
    } catch (error: any) {
      MyLogger.error(action, error, { workOrderData });
      return { voucherId: 0, voucherNo: '', success: false, error: error.message || 'Failed to create voucher' };
    }
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

  // Listen for material consumption events
  eventBus.on(EVENT_NAMES.MATERIAL_CONSUMED, async (payload: EventPayload) => {
    try {
      const consumptionData = payload.consumptionData as any;
      const userId = payload.userId as number;
      
      if (consumptionData) {
        const result = await factoryAccountsIntegrationService.createMaterialConsumptionVoucher(consumptionData, userId);
        
        if (result?.success) {
          MyLogger.success('Factory Accounting Integration', {
            event: 'MATERIAL_CONSUMED',
            consumptionId: consumptionData.consumptionId,
            voucherId: result.voucherId,
            voucherNo: result.voucherNo
          });
        } else if (result?.error) {
          MyLogger.warn('Factory Accounting Integration', {
            event: 'MATERIAL_CONSUMED',
            consumptionId: consumptionData.consumptionId,
            error: result.error
          });
        }
      }
    } catch (error) {
      MyLogger.error('Factory Accounting Integration', error, { 
        event: 'MATERIAL_CONSUMED',
        payload 
      });
    }
  });

  // Listen for wastage approval events
  eventBus.on(EVENT_NAMES.MATERIAL_WASTAGE_APPROVED, async (payload: EventPayload) => {
    try {
      const wastageData = payload.wastageData as any;
      const userId = payload.userId as number;
      
      if (wastageData) {
        const result = await factoryAccountsIntegrationService.createWastageVoucher(wastageData, userId);
        
        if (result?.success) {
          MyLogger.success('Factory Accounting Integration', {
            event: 'MATERIAL_WASTAGE_APPROVED',
            wastageId: wastageData.wastageId,
            voucherId: result.voucherId,
            voucherNo: result.voucherNo
          });
        } else if (result?.error) {
          MyLogger.warn('Factory Accounting Integration', {
            event: 'MATERIAL_WASTAGE_APPROVED',
            wastageId: wastageData.wastageId,
            error: result.error
          });
        }
      }
    } catch (error) {
      MyLogger.error('Factory Accounting Integration', error, { 
        event: 'MATERIAL_WASTAGE_APPROVED',
        payload 
      });
    }
  });

  // Listen for production run completion events
  eventBus.on(EVENT_NAMES.PRODUCTION_RUN_COMPLETED, async (payload: EventPayload) => {
    try {
      const productionRunData = payload.productionRunData as any;
      const userId = payload.userId as number;
      
      if (productionRunData) {
        const result = await factoryAccountsIntegrationService.createProductionRunVouchers(productionRunData, userId);
        
        if (result.labor?.success || result.overhead?.success) {
          MyLogger.success('Factory Accounting Integration', {
            event: 'PRODUCTION_RUN_COMPLETED',
            runId: productionRunData.runId,
            laborVoucherId: result.labor?.voucherId,
            overheadVoucherId: result.overhead?.voucherId
          });
        } else {
          MyLogger.warn('Factory Accounting Integration', {
            event: 'PRODUCTION_RUN_COMPLETED',
            runId: productionRunData.runId,
            laborError: result.labor?.error,
            overheadError: result.overhead?.error
          });
        }
      }
    } catch (error) {
      MyLogger.error('Factory Accounting Integration', error, { 
        event: 'PRODUCTION_RUN_COMPLETED',
        payload 
      });
    }
  });

  // Listen for work order completion events
  eventBus.on(EVENT_NAMES.WORK_ORDER_COMPLETED, async (payload: EventPayload) => {
    try {
      const workOrderData = payload.workOrderData as any;
      const userId = payload.userId as number;
      
      if (workOrderData) {
        const result = await factoryAccountsIntegrationService.createWorkOrderFGTransferVoucher(workOrderData, userId);
        
        if (result?.success) {
          MyLogger.success('Factory Accounting Integration', {
            event: 'WORK_ORDER_COMPLETED',
            workOrderId: workOrderData.workOrderId,
            voucherId: result.voucherId,
            voucherNo: result.voucherNo,
            totalWipCost: workOrderData.totalWipCost
          });
        } else if (result?.error) {
          MyLogger.warn('Factory Accounting Integration', {
            event: 'WORK_ORDER_COMPLETED',
            workOrderId: workOrderData.workOrderId,
            error: result.error
          });
        }
      }
    } catch (error) {
      MyLogger.error('Factory Accounting Integration', error, { 
        event: 'WORK_ORDER_COMPLETED',
        payload 
      });
    }
  });

  MyLogger.success('Factory Accounting Listeners', { 
    message: 'Event listeners registered successfully',
    events: [
      'FACTORY_ORDER_APPROVED', 
      'MATERIAL_CONSUMED', 
      'MATERIAL_WASTAGE_APPROVED',
      'PRODUCTION_RUN_COMPLETED',
      'WORK_ORDER_COMPLETED'
    ]
  });
};

