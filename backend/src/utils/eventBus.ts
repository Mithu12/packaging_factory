import { MyLogger } from './new-logger';

/**
 * Event Bus - Enables loose coupling between modules through events
 * Modules can emit events without knowing who (if anyone) is listening
 */

export interface EventPayload {
  [key: string]: any;
}

export interface EventListener {
  (payload: EventPayload): Promise<void> | void;
}

class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();

  /**
   * Subscribe to an event
   */
  on(eventName: string, listener: EventListener): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(listener);
    MyLogger.info('Event Bus', { 
      action: 'subscribe', 
      event: eventName, 
      listenersCount: this.listeners.get(eventName)!.length 
    });
  }

  /**
   * Unsubscribe from an event
   */
  off(eventName: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
        MyLogger.info('Event Bus', { 
          action: 'unsubscribe', 
          event: eventName, 
          listenersCount: eventListeners.length 
        });
      }
    }
  }

  /**
   * Emit an event to all listeners
   */
  async emit(eventName: string, payload: EventPayload = {}): Promise<void> {
    const eventListeners = this.listeners.get(eventName) || [];
    
    if (eventListeners.length === 0) {
      MyLogger.info('Event Bus', { 
        action: 'emit', 
        event: eventName, 
        listenersCount: 0,
        message: 'No listeners for event'
      });
      return;
    }

    MyLogger.info('Event Bus', { 
      action: 'emit', 
      event: eventName, 
      listenersCount: eventListeners.length 
    });

    // Execute all listeners in parallel
    const promises = eventListeners.map(async (listener) => {
      try {
        await listener(payload);
      } catch (error) {
        MyLogger.error('Event Bus', error, { 
          event: eventName, 
          listener: listener.name || 'anonymous' 
        });
        // Don't throw - we don't want one listener failure to affect others
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get all event names that have listeners
   */
  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.length || 0;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName);
      MyLogger.info('Event Bus', { 
        action: 'removeAllListeners', 
        event: eventName 
      });
    } else {
      this.listeners.clear();
      MyLogger.info('Event Bus', { 
        action: 'removeAllListeners', 
        message: 'All listeners removed' 
      });
    }
  }
}

// Export class and singleton instance
export { EventBus };
export const eventBus = new EventBus();

// Event names constants
export const EVENT_NAMES = {
  // Expense events
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_APPROVED: 'expense.approved',
  EXPENSE_PAID: 'expense.paid',
  EXPENSE_REJECTED: 'expense.rejected',
  EXPENSE_DELETED: 'expense.deleted',
  
  // Account events
  VOUCHER_CREATED: 'voucher.created',
  VOUCHER_POSTED: 'voucher.posted',
  ACCOUNT_BALANCE_UPDATED: 'account.balance.updated',
  
  // Factory events - Customer Orders
  FACTORY_ORDER_APPROVED: 'factory.order.approved',
  FACTORY_ORDER_SHIPPED: 'factory.order.shipped',
  FACTORY_PAYMENT_RECEIVED: 'factory.payment.received',
  
  // Factory events - Returns
  FACTORY_RETURN_APPROVED: 'factory.return.approved',
  
  // Factory events - Production
  MATERIAL_CONSUMED: 'factory.material.consumed',
  MATERIAL_WASTAGE_APPROVED: 'factory.wastage.approved',
  PRODUCTION_RUN_COMPLETED: 'factory.production.completed',
  WORK_ORDER_COMPLETED: 'factory.workorder.completed',
  
  // Factory events - Expenses
  FACTORY_EXPENSE_APPROVED: 'factory.expense.approved',

  // Inventory events
  PURCHASE_ORDER_CREATED: 'inventory.purchase.created',
  PURCHASE_ORDER_UPDATED: 'inventory.purchase.updated',
  PURCHASE_ORDER_RECEIVED: 'inventory.purchase.received',
  PURCHASE_ORDER_CANCELLED: 'inventory.purchase.cancelled',

  // Stock events
  STOCK_ADJUSTMENT_CREATED: 'inventory.stock.adjusted',
  STOCK_TRANSFER_RECEIVED: 'inventory.stock.transfer.received',
  SUPPLIER_PAYMENT_CREATED: 'inventory.supplier.payment.created',
} as const;

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES];
