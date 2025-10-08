# Factory-Accounts Integration - Production-Grade Enhancements

**Date:** October 8, 2025  
**Document Type:** Addendum to Implementation Plan  
**Status:** Critical Enhancements - Must Implement  
**Related:** `FACTORY_ACCOUNTS_INTEGRATION_PLAN.md`

---

## Executive Summary

This document details **critical production-grade enhancements** to the factory-accounts integration that were identified during review. These features ensure **robustness, flexibility, and audit compliance** in real-world operations.

**Key Additions:**
1. ✅ Configurable revenue recognition policy
2. ✅ Idempotency for event processing
3. ✅ Retry/backoff with failed voucher queue & UI
4. ✅ Returns/credit notes flows
5. ✅ Inventory valuation method configuration
6. ✅ Tax and FX handling
7. ✅ Per-factory account configuration
8. ✅ Voucher numbering scheme
9. ✅ Automated reconciliation reports

---

## Table of Contents

1. [Configurable Revenue Recognition Policy](#1-configurable-revenue-recognition-policy)
2. [Idempotency & Event Deduplication](#2-idempotency--event-deduplication)
3. [Retry Logic & Failed Voucher Queue](#3-retry-logic--failed-voucher-queue)
4. [Returns & Credit Notes](#4-returns--credit-notes)
5. [Inventory Valuation Methods](#5-inventory-valuation-methods)
6. [Tax & Foreign Exchange Handling](#6-tax--foreign-exchange-handling)
7. [Per-Factory Account Configuration](#7-per-factory-account-configuration)
8. [Voucher Numbering Scheme](#8-voucher-numbering-scheme)
9. [Automated Reconciliation System](#9-automated-reconciliation-system)
10. [Updated Database Schema](#10-updated-database-schema)
11. [Updated Implementation Timeline](#11-updated-implementation-timeline)

---

## 1. Configurable Revenue Recognition Policy

### 1.1 Business Requirement

Different businesses have different revenue recognition policies based on accounting standards (GAAP, IFRS) and business models:

**Option A: Revenue Recognition on Order Approval (Conservative)**
- Creates A/R immediately when order is approved
- Revenue still deferred until shipment
- Common for: Make-to-order businesses, long production cycles

**Option B: Revenue Recognition on Invoice/Shipment (Standard)**
- Creates A/R only when goods are shipped and invoice generated
- Revenue recognized simultaneously with A/R
- Common for: Standard manufacturing, shorter lead times

### 1.2 Database Schema

#### Migration V33: Add Revenue Recognition Configuration

```sql
-- System-wide accounting policies
CREATE TABLE accounting_policies (
  id SERIAL PRIMARY KEY,
  policy_key VARCHAR(100) UNIQUE NOT NULL,
  policy_value VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Insert default policies
INSERT INTO accounting_policies (policy_key, policy_value, description) VALUES
('revenue_recognition_trigger', 'shipment', 'When to create A/R and recognize revenue: "approval" or "shipment"'),
('inventory_valuation_method', 'weighted_average', 'Inventory costing method: "fifo", "lifo", "weighted_average", "specific_identification"'),
('wip_cost_allocation', 'actual', 'WIP costing: "actual", "standard", or "activity_based"'),
('default_tax_treatment', 'inclusive', 'Tax treatment: "inclusive", "exclusive", or "none"'),
('fx_revaluation_frequency', 'monthly', 'FX revaluation: "daily", "weekly", "monthly", "quarterly"'),
('voucher_numbering_scheme', 'global', 'Voucher numbers: "global" or "per_factory"');

-- Factory-specific policy overrides (optional)
CREATE TABLE factory_accounting_policies (
  id SERIAL PRIMARY KEY,
  factory_id BIGINT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  policy_key VARCHAR(100) NOT NULL,
  policy_value VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  UNIQUE(factory_id, policy_key)
);

CREATE INDEX idx_factory_accounting_policies_factory ON factory_accounting_policies(factory_id);
CREATE INDEX idx_factory_accounting_policies_key ON factory_accounting_policies(policy_key);

COMMENT ON TABLE accounting_policies IS 'System-wide accounting and integration policies';
COMMENT ON TABLE factory_accounting_policies IS 'Factory-specific overrides for accounting policies';
```

### 1.3 Backend Implementation

#### Policy Service

**File:** `backend/src/services/accountingPoliciesService.ts`

```typescript
export enum RevenueRecognitionTrigger {
  APPROVAL = 'approval',
  SHIPMENT = 'shipment'
}

export enum InventoryValuationMethod {
  FIFO = 'fifo',
  LIFO = 'lifo',
  WEIGHTED_AVERAGE = 'weighted_average',
  SPECIFIC_IDENTIFICATION = 'specific_identification'
}

export enum VoucherNumberingScheme {
  GLOBAL = 'global',
  PER_FACTORY = 'per_factory'
}

class AccountingPoliciesService {
  private policyCache: Map<string, string> = new Map();
  
  /**
   * Get accounting policy value (checks factory override first, then global)
   */
  async getPolicyValue(
    policyKey: string, 
    factoryId?: number
  ): Promise<string> {
    const cacheKey = `${factoryId || 'global'}_${policyKey}`;
    
    // Check cache
    if (this.policyCache.has(cacheKey)) {
      return this.policyCache.get(cacheKey)!;
    }
    
    // Check factory-specific override
    if (factoryId) {
      const factoryPolicy = await pool.query(
        'SELECT policy_value FROM factory_accounting_policies WHERE factory_id = $1 AND policy_key = $2',
        [factoryId, policyKey]
      );
      
      if (factoryPolicy.rows.length > 0) {
        const value = factoryPolicy.rows[0].policy_value;
        this.policyCache.set(cacheKey, value);
        return value;
      }
    }
    
    // Fall back to global policy
    const globalPolicy = await pool.query(
      'SELECT policy_value FROM accounting_policies WHERE policy_key = $1',
      [policyKey]
    );
    
    if (globalPolicy.rows.length === 0) {
      throw new Error(`Accounting policy not found: ${policyKey}`);
    }
    
    const value = globalPolicy.rows[0].policy_value;
    this.policyCache.set(cacheKey, value);
    return value;
  }
  
  async getRevenueRecognitionTrigger(factoryId?: number): Promise<RevenueRecognitionTrigger> {
    const value = await this.getPolicyValue('revenue_recognition_trigger', factoryId);
    return value as RevenueRecognitionTrigger;
  }
  
  async getInventoryValuationMethod(factoryId?: number): Promise<InventoryValuationMethod> {
    const value = await this.getPolicyValue('inventory_valuation_method', factoryId);
    return value as InventoryValuationMethod;
  }
  
  async getVoucherNumberingScheme(): Promise<VoucherNumberingScheme> {
    const value = await this.getPolicyValue('voucher_numbering_scheme');
    return value as VoucherNumberingScheme;
  }
  
  /**
   * Update policy value
   */
  async updatePolicy(
    policyKey: string, 
    policyValue: string, 
    userId: number,
    factoryId?: number
  ): Promise<void> {
    if (factoryId) {
      await pool.query(
        `INSERT INTO factory_accounting_policies (factory_id, policy_key, policy_value, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (factory_id, policy_key) 
         DO UPDATE SET policy_value = $3, updated_by = $4, created_at = CURRENT_TIMESTAMP`,
        [factoryId, policyKey, policyValue, userId]
      );
    } else {
      await pool.query(
        'UPDATE accounting_policies SET policy_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE policy_key = $3',
        [policyValue, userId, policyKey]
      );
    }
    
    // Clear cache
    this.policyCache.clear();
  }
  
  /**
   * Clear policy cache (call after configuration changes)
   */
  clearCache(): void {
    this.policyCache.clear();
  }
}

export const accountingPoliciesService = new AccountingPoliciesService();
```

#### Updated Integration Service

**File:** `backend/src/services/factoryAccountsIntegrationService.ts` (update)

```typescript
import { accountingPoliciesService, RevenueRecognitionTrigger } from './accountingPoliciesService';

// In createCustomerOrderReceivable method:
async createCustomerOrderReceivable(orderData: OrderAccountingData, userId: number): Promise<VoucherCreationResult | null> {
  const action = 'Create Customer Order Receivable';
  
  if (!this.isAccountsAvailable()) return null;
  
  try {
    // Check revenue recognition policy
    const revenuePolicy = await accountingPoliciesService.getRevenueRecognitionTrigger(orderData.factoryId);
    
    if (revenuePolicy === RevenueRecognitionTrigger.SHIPMENT) {
      MyLogger.info(action, { 
        message: 'Revenue recognition on shipment - skipping A/R creation on approval',
        orderId: orderData.orderId,
        policy: revenuePolicy
      });
      return null; // Don't create A/R yet
    }
    
    // Policy is APPROVAL - create A/R with deferred revenue
    const voucherData = {
      type: VoucherType.JOURNAL,
      date: new Date(orderData.orderDate),
      reference: orderData.orderNumber,
      narration: `Customer Order Approved - ${orderData.customerName}`,
      lines: [
        {
          accountId: await this.getAccountForCustomer(orderData.customerId) || await this.getDefaultAccount('accounts_receivable'),
          debit: orderData.totalValue,
          credit: 0,
          description: `A/R for Order ${orderData.orderNumber}`
        },
        {
          accountId: await this.getDefaultAccount('deferred_revenue'),
          debit: 0,
          credit: orderData.totalValue,
          description: `Deferred revenue for Order ${orderData.orderNumber}`
        }
      ],
      costCenterId: await this.getCostCenterForFactory(orderData.factoryId)
    };
    
    const voucher = await this.createVoucher(voucherData, userId, orderData.idempotencyKey);
    
    return {
      voucherId: voucher.id,
      voucherNo: voucher.voucherNo,
      success: true
    };
    
  } catch (error: any) {
    MyLogger.error(action, error, { orderData });
    throw error;
  }
}

// When order is shipped:
async recognizeRevenue(orderData: OrderAccountingData, userId: number): Promise<VoucherCreationResult | null> {
  const revenuePolicy = await accountingPoliciesService.getRevenueRecognitionTrigger(orderData.factoryId);
  
  if (revenuePolicy === RevenueRecognitionTrigger.APPROVAL) {
    // A/R already created on approval, just recognize revenue
    const voucherData = {
      // ... debit deferred revenue, credit sales revenue
    };
  } else {
    // Create A/R AND recognize revenue simultaneously
    const voucherData = {
      // ... debit A/R, credit sales revenue (no deferred revenue)
    };
  }
  
  // ... rest of implementation
}
```

### 1.4 Frontend Configuration UI

**File:** `frontend/src/modules/factory/pages/FactoryAccountingConfig.tsx` (add section)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Revenue Recognition Policy</CardTitle>
    <CardDescription>
      Configure when accounts receivable and revenue are recognized
    </CardDescription>
  </CardHeader>
  <CardContent>
    <RadioGroup 
      value={revenuePolicy} 
      onValueChange={handleRevenuePolicyChange}
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <RadioGroupItem value="shipment" id="shipment" />
          <div className="flex-1">
            <Label htmlFor="shipment" className="font-medium">
              On Shipment/Invoice (Recommended)
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Creates A/R and recognizes revenue when order is shipped and invoice is generated.
              This is the standard approach for most manufacturing businesses.
            </p>
            <div className="mt-2 text-xs text-gray-500">
              <strong>Accounting Entry on Shipment:</strong><br/>
              Debit: Accounts Receivable | Credit: Sales Revenue
            </div>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <RadioGroupItem value="approval" id="approval" />
          <div className="flex-1">
            <Label htmlFor="approval" className="font-medium">
              On Order Approval (Conservative)
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Creates A/R immediately when order is approved, but defers revenue until shipment.
              Use for make-to-order with long production cycles.
            </p>
            <div className="mt-2 text-xs text-gray-500">
              <strong>Accounting Entry on Approval:</strong><br/>
              Debit: Accounts Receivable | Credit: Deferred Revenue<br/>
              <strong>Accounting Entry on Shipment:</strong><br/>
              Debit: Deferred Revenue | Credit: Sales Revenue
            </div>
          </div>
        </div>
      </div>
    </RadioGroup>
    
    <Alert className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Important</AlertTitle>
      <AlertDescription>
        Changing this policy affects all future orders. Existing orders will follow the policy
        that was active when they were created. Consult with your accountant before changing.
      </AlertDescription>
    </Alert>
  </CardContent>
</Card>
```

---

## 2. Idempotency & Event Deduplication

### 2.1 Why Idempotency is Critical

**Problem:** If an event is processed twice (due to retries, system errors, or race conditions), it could create duplicate vouchers, leading to:
- Incorrect account balances
- Duplicate A/R entries
- Inflated COGS
- Audit failures

**Solution:** Idempotency ensures that processing the same event multiple times produces the same result (only one voucher created).

### 2.2 Database Schema

#### Migration V34: Event Processing Tracking

```sql
-- Track processed events to prevent duplicates
CREATE TABLE factory_event_log (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(100) UNIQUE NOT NULL, -- Idempotency key
  event_type VARCHAR(100) NOT NULL,
  event_payload JSONB NOT NULL,
  factory_id BIGINT REFERENCES factories(id),
  
  -- Processing status
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  processing_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  
  -- Result
  voucher_id INTEGER REFERENCES vouchers(id),
  error_message TEXT,
  
  -- Metadata
  emitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_factory_event_log_event_id ON factory_event_log(event_id);
CREATE INDEX idx_factory_event_log_status ON factory_event_log(status);
CREATE INDEX idx_factory_event_log_event_type ON factory_event_log(event_type);
CREATE INDEX idx_factory_event_log_factory ON factory_event_log(factory_id);
CREATE INDEX idx_factory_event_log_emitted_at ON factory_event_log(emitted_at);
CREATE INDEX idx_factory_event_log_voucher ON factory_event_log(voucher_id);

COMMENT ON TABLE factory_event_log IS 'Tracks all factory events for idempotency and audit trail';
COMMENT ON COLUMN factory_event_log.event_id IS 'Idempotency key - prevents duplicate processing';
COMMENT ON COLUMN factory_event_log.voucher_id IS 'Voucher created from this event (if applicable)';
```

### 2.3 Backend Implementation

#### Event ID Generation

**File:** `backend/src/utils/idempotencyUtils.ts`

```typescript
import crypto from 'crypto';

export class IdempotencyUtils {
  /**
   * Generate idempotency key for factory event
   * Format: {eventType}_{entityType}_{entityId}_{timestamp}_{hash}
   */
  static generateEventId(
    eventType: string,
    entityType: string,
    entityId: string | number,
    timestamp: Date = new Date()
  ): string {
    const timestampMs = timestamp.getTime();
    const dataStr = `${eventType}_${entityType}_${entityId}_${timestampMs}`;
    const hash = crypto.createHash('sha256').update(dataStr).digest('hex').substring(0, 8);
    
    return `${eventType}_${entityType}_${entityId}_${timestampMs}_${hash}`;
  }
  
  /**
   * Generate shorter idempotency key for specific use cases
   */
  static generateShortEventId(
    eventType: string,
    entityId: string | number
  ): string {
    return `${eventType}_${entityId}_${Date.now()}`;
  }
  
  /**
   * Validate event ID format
   */
  static isValidEventId(eventId: string): boolean {
    // Basic validation - should match pattern
    return /^[A-Z_]+_[a-z_]+_\d+_\d+_[a-z0-9]+$/.test(eventId);
  }
}
```

#### Event Processing Service with Idempotency

**File:** `backend/src/services/factoryEventProcessor.ts`

```typescript
import { pool } from '@/config/database';
import { MyLogger } from '@/utils/new-logger';

export interface FactoryEvent {
  eventId: string; // Idempotency key
  eventType: string;
  eventPayload: any;
  factoryId?: number;
  emittedAt: Date;
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

class FactoryEventProcessor {
  /**
   * Process event with idempotency check
   * Returns voucher ID if already processed, or processes and returns new voucher ID
   */
  async processEventIdempotent(
    event: FactoryEvent,
    processorFn: () => Promise<{ voucherId?: number; voucherNo?: string }>
  ): Promise<{ voucherId?: number; voucherNo?: string; isNew: boolean }> {
    const action = 'Process Event Idempotent';
    
    try {
      // 1. Check if event already processed
      const existingEvent = await pool.query(
        `SELECT id, status, voucher_id, error_message, processing_attempts
         FROM factory_event_log 
         WHERE event_id = $1`,
        [event.eventId]
      );
      
      if (existingEvent.rows.length > 0) {
        const eventLog = existingEvent.rows[0];
        
        if (eventLog.status === EventStatus.COMPLETED) {
          MyLogger.info(action, {
            message: 'Event already processed (idempotent return)',
            eventId: event.eventId,
            voucherId: eventLog.voucher_id
          });
          
          // Return existing voucher ID
          return {
            voucherId: eventLog.voucher_id,
            voucherNo: await this.getVoucherNo(eventLog.voucher_id),
            isNew: false
          };
        }
        
        if (eventLog.status === EventStatus.PROCESSING) {
          // Event is currently being processed by another instance
          MyLogger.warn(action, {
            message: 'Event is currently being processed - skipping',
            eventId: event.eventId
          });
          
          // Wait a bit and check again
          await this.sleep(1000);
          return this.processEventIdempotent(event, processorFn);
        }
        
        if (eventLog.status === EventStatus.FAILED && eventLog.processing_attempts >= 3) {
          MyLogger.error(action, new Error('Max retry attempts reached'), {
            eventId: event.eventId,
            attempts: eventLog.processing_attempts,
            lastError: eventLog.error_message
          });
          
          // Don't retry - move to failed queue
          return { isNew: false };
        }
      }
      
      // 2. Record event as processing
      const eventLogId = await this.recordEventStart(event);
      
      try {
        // 3. Process event
        MyLogger.info(action, {
          message: 'Processing new event',
          eventId: event.eventId,
          eventType: event.eventType
        });
        
        const result = await processorFn();
        
        // 4. Mark as completed
        await this.recordEventCompletion(eventLogId, result.voucherId);
        
        MyLogger.success(action, {
          eventId: event.eventId,
          voucherId: result.voucherId,
          voucherNo: result.voucherNo
        });
        
        return { ...result, isNew: true };
        
      } catch (error: any) {
        // 5. Mark as failed and record error
        await this.recordEventFailure(eventLogId, error.message);
        throw error;
      }
      
    } catch (error: any) {
      MyLogger.error(action, error, { event });
      throw error;
    }
  }
  
  private async recordEventStart(event: FactoryEvent): Promise<number> {
    const result = await pool.query(
      `INSERT INTO factory_event_log 
       (event_id, event_type, event_payload, factory_id, status, processing_attempts, emitted_at, last_attempt_at)
       VALUES ($1, $2, $3, $4, $5, 
         COALESCE((SELECT processing_attempts FROM factory_event_log WHERE event_id = $1), 0) + 1,
         $6, CURRENT_TIMESTAMP)
       ON CONFLICT (event_id) 
       DO UPDATE SET 
         status = $5,
         processing_attempts = factory_event_log.processing_attempts + 1,
         last_attempt_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        event.eventId,
        event.eventType,
        JSON.stringify(event.eventPayload),
        event.factoryId,
        EventStatus.PROCESSING,
        event.emittedAt
      ]
    );
    
    return result.rows[0].id;
  }
  
  private async recordEventCompletion(eventLogId: number, voucherId?: number): Promise<void> {
    await pool.query(
      `UPDATE factory_event_log 
       SET status = $1, voucher_id = $2, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [EventStatus.COMPLETED, voucherId, eventLogId]
    );
  }
  
  private async recordEventFailure(eventLogId: number, errorMessage: string): Promise<void> {
    await pool.query(
      `UPDATE factory_event_log 
       SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [EventStatus.FAILED, errorMessage, eventLogId]
    );
  }
  
  private async getVoucherNo(voucherId: number): Promise<string | undefined> {
    if (!voucherId) return undefined;
    
    const result = await pool.query(
      'SELECT voucher_no FROM vouchers WHERE id = $1',
      [voucherId]
    );
    
    return result.rows[0]?.voucher_no;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const factoryEventProcessor = new FactoryEventProcessor();
```

#### Updated Integration Service with Idempotency

**File:** `backend/src/services/factoryAccountsIntegrationService.ts` (update)

```typescript
import { factoryEventProcessor } from './factoryEventProcessor';
import { IdempotencyUtils } from '@/utils/idempotencyUtils';

// Update all voucher creation methods to use idempotency

async createCustomerOrderReceivable(orderData: OrderAccountingData, userId: number): Promise<VoucherCreationResult | null> {
  // Generate idempotency key if not provided
  if (!orderData.idempotencyKey) {
    orderData.idempotencyKey = IdempotencyUtils.generateEventId(
      'ORDER_APPROVED',
      'order',
      orderData.orderId,
      new Date(orderData.orderDate)
    );
  }
  
  const event: FactoryEvent = {
    eventId: orderData.idempotencyKey,
    eventType: 'FACTORY_ORDER_APPROVED',
    eventPayload: orderData,
    factoryId: orderData.factoryId,
    emittedAt: new Date()
  };
  
  // Process with idempotency
  const result = await factoryEventProcessor.processEventIdempotent(event, async () => {
    // Actual voucher creation logic
    return await this._createCustomerOrderReceivableVoucher(orderData, userId);
  });
  
  if (!result.isNew) {
    MyLogger.info('Create Customer Order Receivable', {
      message: 'Returned existing voucher (idempotent)',
      eventId: event.eventId,
      voucherId: result.voucherId
    });
  }
  
  return {
    voucherId: result.voucherId || 0,
    voucherNo: result.voucherNo || '',
    success: !!result.voucherId
  };
}

// Extract actual creation logic to separate method
private async _createCustomerOrderReceivableVoucher(orderData: OrderAccountingData, userId: number): Promise<{ voucherId?: number; voucherNo?: string }> {
  // ... actual voucher creation logic (existing code)
}

// Repeat for all other voucher creation methods
```

#### Update Event Emission

**File:** `backend/src/modules/factory/mediators/customerOrders/UpdateCustomerOrderInfo.mediator.ts` (update)

```typescript
import { IdempotencyUtils } from '@/utils/idempotencyUtils';

// When emitting event, include idempotency key
if (newStatus === 'approved' && oldStatus !== 'approved') {
  const idempotencyKey = IdempotencyUtils.generateEventId(
    'FACTORY_ORDER_APPROVED',
    'order',
    order.id,
    new Date()
  );
  
  eventBus.emit(EVENT_NAMES.FACTORY_ORDER_APPROVED, {
    orderData: {
      orderId: order.id,
      orderNumber: order.order_number,
      idempotencyKey: idempotencyKey, // ← Add this
      // ... rest of order data
    },
    userId: userId
  });
}
```

---

## 3. Retry Logic & Failed Voucher Queue

### 3.1 Retry Strategy

**Exponential Backoff with Jitter:**
- Attempt 1: Immediate
- Attempt 2: Wait 1-2 seconds (random jitter)
- Attempt 3: Wait 5-10 seconds
- After 3 attempts: Move to failed queue for manual intervention

### 3.2 Database Schema

#### Migration V35: Failed Voucher Queue

```sql
-- Failed voucher queue for manual intervention
CREATE TABLE failed_voucher_queue (
  id BIGSERIAL PRIMARY KEY,
  event_log_id BIGINT NOT NULL REFERENCES factory_event_log(id) ON DELETE CASCADE,
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  factory_id BIGINT REFERENCES factories(id),
  
  -- Failure details
  failure_reason TEXT NOT NULL,
  failure_category VARCHAR(50) CHECK (failure_category IN (
    'mapping_not_found',
    'account_not_found',
    'database_error',
    'validation_error',
    'balance_mismatch',
    'permission_denied',
    'other'
  )),
  
  -- Resolution
  status VARCHAR(20) CHECK (status IN ('pending', 'investigating', 'resolved', 'cancelled')) DEFAULT 'pending',
  assigned_to INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by INTEGER REFERENCES users(id),
  
  -- Created voucher (if manually resolved)
  created_voucher_id INTEGER REFERENCES vouchers(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_failed_voucher_queue_status ON failed_voucher_queue(status);
CREATE INDEX idx_failed_voucher_queue_factory ON failed_voucher_queue(factory_id);
CREATE INDEX idx_failed_voucher_queue_assigned ON failed_voucher_queue(assigned_to);
CREATE INDEX idx_failed_voucher_queue_event_type ON failed_voucher_queue(event_type);
CREATE INDEX idx_failed_voucher_queue_created_at ON failed_voucher_queue(created_at DESC);

COMMENT ON TABLE failed_voucher_queue IS 'Queue of failed voucher creations requiring manual intervention';
COMMENT ON COLUMN failed_voucher_queue.failure_category IS 'Category of failure for reporting and resolution';
```

### 3.3 Backend Implementation

#### Retry Service

**File:** `backend/src/services/voucherRetryService.ts`

```typescript
import { pool } from '@/config/database';
import { MyLogger } from '@/utils/new-logger';
import { factoryEventProcessor } from './factoryEventProcessor';

class VoucherRetryService {
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [0, 2000, 10000]; // ms: immediate, 2s, 10s
  
  /**
   * Retry failed events with exponential backoff
   */
  async retryFailedEvent(eventLogId: number): Promise<boolean> {
    const action = 'Retry Failed Event';
    
    try {
      // Get event details
      const eventResult = await pool.query(
        `SELECT event_id, event_type, event_payload, factory_id, processing_attempts
         FROM factory_event_log 
         WHERE id = $1 AND status = 'failed'`,
        [eventLogId]
      );
      
      if (eventResult.rows.length === 0) {
        MyLogger.warn(action, { message: 'Event not found or not in failed status', eventLogId });
        return false;
      }
      
      const event = eventResult.rows[0];
      
      if (event.processing_attempts >= this.MAX_ATTEMPTS) {
        MyLogger.error(action, new Error('Max retries exceeded'), {
          eventLogId,
          attempts: event.processing_attempts
        });
        
        // Move to failed queue
        await this.moveToFailedQueue(event);
        return false;
      }
      
      // Calculate delay with jitter
      const attemptIndex = Math.min(event.processing_attempts, this.RETRY_DELAYS.length - 1);
      const baseDelay = this.RETRY_DELAYS[attemptIndex];
      const jitter = Math.random() * baseDelay * 0.5; // 0-50% jitter
      const delay = baseDelay + jitter;
      
      MyLogger.info(action, {
        message: `Retrying event after delay`,
        eventLogId,
        attempt: event.processing_attempts + 1,
        delay: Math.round(delay)
      });
      
      // Wait with delay
      await this.sleep(delay);
      
      // Retry processing
      // (Integration service will handle the retry via factoryEventProcessor)
      return true;
      
    } catch (error: any) {
      MyLogger.error(action, error, { eventLogId });
      return false;
    }
  }
  
  /**
   * Move event to failed voucher queue for manual intervention
   */
  private async moveToFailedQueue(event: any): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Categorize failure
      const failureCategory = this.categorizeFailure(event.event_payload);
      
      // Insert into failed queue
      await client.query(
        `INSERT INTO failed_voucher_queue 
         (event_log_id, event_id, event_type, factory_id, failure_reason, failure_category)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          event.id,
          event.event_id,
          event.event_type,
          event.factory_id,
          event.error_message || 'Unknown error',
          failureCategory
        ]
      );
      
      await client.query('COMMIT');
      
      MyLogger.info('Move to Failed Queue', {
        eventId: event.event_id,
        category: failureCategory
      });
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Categorize failure for better reporting
   */
  private categorizeFailure(errorMessage: string): string {
    if (!errorMessage) return 'other';
    
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('mapping not found') || msg.includes('no mapping')) {
      return 'mapping_not_found';
    }
    if (msg.includes('account not found')) {
      return 'account_not_found';
    }
    if (msg.includes('database') || msg.includes('connection')) {
      return 'database_error';
    }
    if (msg.includes('validation') || msg.includes('invalid')) {
      return 'validation_error';
    }
    if (msg.includes('balance') || msg.includes('debit') || msg.includes('credit')) {
      return 'balance_mismatch';
    }
    if (msg.includes('permission') || msg.includes('unauthorized')) {
      return 'permission_denied';
    }
    
    return 'other';
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const voucherRetryService = new VoucherRetryService();
```

### 3.4 Frontend - Failed Voucher Queue UI

**File:** `frontend/src/modules/factory/pages/FailedVoucherQueue.tsx` (NEW)

```tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface FailedVoucher {
  id: number;
  event_id: string;
  event_type: string;
  factory_name: string;
  failure_reason: string;
  failure_category: string;
  status: 'pending' | 'investigating' | 'resolved' | 'cancelled';
  created_at: string;
  assigned_to_name?: string;
}

export default function FailedVoucherQueue() {
  const [selectedVoucher, setSelectedVoucher] = useState<FailedVoucher | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const queryClient = useQueryClient();
  
  // Fetch failed vouchers
  const { data: failedVouchers, isLoading } = useQuery({
    queryKey: ['failedVouchers'],
    queryFn: async () => {
      const response = await fetch('/api/factory/failed-vouchers');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Retry voucher creation
  const retryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/factory/failed-vouchers/${id}/retry`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failedVouchers'] });
    }
  });
  
  // Mark as resolved
  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const response = await fetch(`/api/factory/failed-vouchers/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: notes })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failedVouchers'] });
      setSelectedVoucher(null);
      setResolutionNotes('');
    }
  });
  
  const getCategoryColor = (category: string) => {
    const colors = {
      mapping_not_found: 'bg-yellow-100 text-yellow-800',
      account_not_found: 'bg-red-100 text-red-800',
      database_error: 'bg-purple-100 text-purple-800',
      validation_error: 'bg-orange-100 text-orange-800',
      balance_mismatch: 'bg-red-100 text-red-800',
      permission_denied: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };
  
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-red-100 text-red-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Failed Voucher Queue</h1>
          <p className="text-muted-foreground">
            Review and resolve voucher creation failures
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>{failedVouchers?.filter((v: FailedVoucher) => v.status === 'pending').length || 0} Pending</span>
          </Badge>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Failed Vouchers Requiring Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Factory</TableHead>
                  <TableHead>Failure Category</TableHead>
                  <TableHead>Failure Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedVouchers?.map((voucher: FailedVoucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-mono text-xs">{voucher.event_id}</TableCell>
                    <TableCell>{voucher.event_type}</TableCell>
                    <TableCell>{voucher.factory_name}</TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(voucher.failure_category)}>
                        {voucher.failure_category.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{voucher.failure_reason}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(voucher.status)}>
                        {voucher.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(voucher.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVoucher(voucher)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate(voucher.id)}
                          disabled={retryMutation.isPending || voucher.status === 'resolved'}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Resolution Dialog */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Failed Voucher Details</DialogTitle>
            <DialogDescription>
              Review details and resolve this failed voucher creation
            </DialogDescription>
          </DialogHeader>
          
          {selectedVoucher && (
            <div className="space-y-4">
              <div>
                <Label>Event ID</Label>
                <div className="font-mono text-sm">{selectedVoucher.event_id}</div>
              </div>
              
              <div>
                <Label>Failure Reason</Label>
                <div className="text-sm text-red-600">{selectedVoucher.failure_reason}</div>
              </div>
              
              <div>
                <Label>Resolution Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how you resolved this issue..."
                  rows={4}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => retryMutation.mutate(selectedVoucher.id)}
                  disabled={retryMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Automatic Creation
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => resolveMutation.mutate({ 
                    id: selectedVoucher.id, 
                    notes: resolutionNotes 
                  })}
                  disabled={resolveMutation.isPending || !resolutionNotes}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### 3.5 Backend Controller for Failed Queue

**File:** `backend/src/modules/factory/controllers/failedVoucherQueue.controller.ts` (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { pool } from '@/config/database';
import { MyLogger } from '@/utils/new-logger';
import { voucherRetryService } from '@/services/voucherRetryService';

class FailedVoucherQueueController {
  async getFailedVouchers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, factoryId } = req.query;
      
      let query = `
        SELECT 
          fvq.id,
          fvq.event_id,
          fvq.event_type,
          fvq.failure_reason,
          fvq.failure_category,
          fvq.status,
          fvq.created_at,
          f.name as factory_name,
          u.full_name as assigned_to_name
        FROM failed_voucher_queue fvq
        LEFT JOIN factories f ON fvq.factory_id = f.id
        LEFT JOIN users u ON fvq.assigned_to = u.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (status) {
        params.push(status);
        query += ` AND fvq.status = $${params.length}`;
      }
      
      if (factoryId) {
        params.push(factoryId);
        query += ` AND fvq.factory_id = $${params.length}`;
      }
      
      query += ` ORDER BY fvq.created_at DESC LIMIT 100`;
      
      const result = await pool.query(query, params);
      
      res.json(result.rows);
      
    } catch (error) {
      next(error);
    }
  }
  
  async retryFailedVoucher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // Get event log ID
      const result = await pool.query(
        'SELECT event_log_id FROM failed_voucher_queue WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Failed voucher not found' });
        return;
      }
      
      const eventLogId = result.rows[0].event_log_id;
      
      // Retry
      const success = await voucherRetryService.retryFailedEvent(eventLogId);
      
      if (success) {
        res.json({ message: 'Retry initiated successfully' });
      } else {
        res.status(400).json({ error: 'Retry failed - max attempts reached' });
      }
      
    } catch (error) {
      next(error);
    }
  }
  
  async resolveFailedVoucher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { resolutionNotes } = req.body;
      const userId = req.user?.user_id;
      
      await pool.query(
        `UPDATE failed_voucher_queue 
         SET status = 'resolved', 
             resolution_notes = $1, 
             resolved_by = $2, 
             resolved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [resolutionNotes, userId, id]
      );
      
      res.json({ message: 'Failed voucher marked as resolved' });
      
    } catch (error) {
      next(error);
    }
  }
}

export default new FailedVoucherQueueController();
```

---

*Due to length constraints, I'll create a separate addendum document to continue with the remaining enhancements (4-9). Let me create that now.*

---

**Status:** Sections 1-3 complete (Revenue Recognition, Idempotency, Retry Logic)  
**Next:** Sections 4-9 in separate document

**Estimated Additional Implementation Time:** +3-4 weeks to original 10-week timeline

