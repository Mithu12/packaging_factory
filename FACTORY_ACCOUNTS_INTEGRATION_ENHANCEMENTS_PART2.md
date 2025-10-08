# Factory-Accounts Integration - Production-Grade Enhancements (Part 2)

**Date:** October 8, 2025  
**Document Type:** Addendum to Implementation Plan (Continuation)  
**Related:** `FACTORY_ACCOUNTS_INTEGRATION_ENHANCEMENTS.md` (Part 1)

---

## Continuation: Sections 4-9

This document continues the production-grade enhancements with the remaining critical features.

---

## 4. Returns & Credit Notes

### 4.1 Business Requirement

When customers return goods or orders are cancelled after shipment, the accounting entries must be reversed:

**Scenarios:**
1. **Full Return** - Customer returns entire order
2. **Partial Return** - Customer returns some items
3. **Order Cancellation After Approval** - Cancel before shipment
4. **Order Cancellation After Shipment** - Cancel after goods delivered

**Required Accounting Reversals:**
- Reverse Accounts Receivable
- Reverse Revenue Recognition
- Reverse COGS (return goods to inventory)
- Issue Credit Note to customer

### 4.2 Database Schema

#### Migration V36: Returns & Credit Notes

```sql
-- Customer returns/credit notes
CREATE TABLE customer_order_returns (
  id BIGSERIAL PRIMARY KEY,
  return_number VARCHAR(50) UNIQUE NOT NULL,
  original_order_id BIGINT NOT NULL REFERENCES factory_customer_orders(id) ON DELETE RESTRICT,
  original_order_number VARCHAR(50) NOT NULL,
  
  -- Return details
  return_type VARCHAR(20) NOT NULL CHECK (return_type IN ('full_return', 'partial_return', 'cancellation')),
  return_reason VARCHAR(255) NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Financial impact
  total_return_value DECIMAL(15,2) NOT NULL CHECK (total_return_value >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'completed')) DEFAULT 'draft',
  
  -- Vouchers created
  credit_note_voucher_id INTEGER REFERENCES vouchers(id),
  revenue_reversal_voucher_id INTEGER REFERENCES vouchers(id),
  cogs_reversal_voucher_id INTEGER REFERENCES vouchers(id),
  inventory_return_voucher_id INTEGER REFERENCES vouchers(id),
  
  -- Approvals
  requested_by INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  factory_id BIGINT REFERENCES factories(id),
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Return line items
CREATE TABLE customer_order_return_items (
  id BIGSERIAL PRIMARY KEY,
  return_id BIGINT NOT NULL REFERENCES customer_order_returns(id) ON DELETE CASCADE,
  original_line_item_id BIGINT REFERENCES factory_customer_order_line_items(id),
  
  -- Item details
  product_id BIGINT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  
  -- Quantities
  returned_quantity DECIMAL(15,3) NOT NULL CHECK (returned_quantity > 0),
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  
  -- Cost (for COGS reversal)
  unit_cost DECIMAL(15,2),
  cost_total DECIMAL(15,2),
  
  -- Condition
  item_condition VARCHAR(20) CHECK (item_condition IN ('new', 'used', 'damaged', 'defective')),
  return_to_stock BOOLEAN DEFAULT true,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_order_returns_order ON customer_order_returns(original_order_id);
CREATE INDEX idx_customer_order_returns_status ON customer_order_returns(status);
CREATE INDEX idx_customer_order_returns_return_date ON customer_order_returns(return_date);
CREATE INDEX idx_customer_order_returns_factory ON customer_order_returns(factory_id);
CREATE INDEX idx_customer_order_return_items_return ON customer_order_return_items(return_id);

-- Create sequence for return numbers
CREATE SEQUENCE IF NOT EXISTS customer_return_sequence START WITH 1000;

COMMENT ON TABLE customer_order_returns IS 'Tracks customer returns and order cancellations with accounting reversals';
COMMENT ON TABLE customer_order_return_items IS 'Line items for returned goods';
```

### 4.3 Backend Implementation

#### Return Processing Service

**File:** `backend/src/modules/factory/mediators/returns/ProcessReturn.mediator.ts` (NEW)

```typescript
import { pool } from '@/config/database';
import { MyLogger } from '@/utils/new-logger';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { IdempotencyUtils } from '@/utils/idempotencyUtils';

export interface CreateReturnRequest {
  originalOrderId: string;
  returnType: 'full_return' | 'partial_return' | 'cancellation';
  returnReason: string;
  returnItems: Array<{
    originalLineItemId?: string;
    productId: number;
    productName: string;
    productSku: string;
    returnedQuantity: number;
    unitPrice: number;
    itemCondition: 'new' | 'used' | 'damaged' | 'defective';
    returnToStock: boolean;
  }>;
  notes?: string;
}

export class ProcessReturnMediator {
  /**
   * Create return/cancellation request
   */
  static async createReturn(
    returnData: CreateReturnRequest,
    userId: number
  ): Promise<any> {
    const action = 'ProcessReturnMediator.createReturn';
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { returnData, userId });
      
      // 1. Get original order
      const orderQuery = await client.query(
        `SELECT * FROM factory_customer_orders WHERE id = $1`,
        [returnData.originalOrderId]
      );
      
      if (orderQuery.rows.length === 0) {
        throw new Error('Original order not found');
      }
      
      const order = orderQuery.rows[0];
      
      // Validate order can be returned
      if (order.status === 'cancelled') {
        throw new Error('Cannot return a cancelled order');
      }
      
      // 2. Generate return number
      const returnNumberResult = await client.query(
        "SELECT nextval('customer_return_sequence')"
      );
      const returnNumber = `RET-${String(returnNumberResult.rows[0].nextval).padStart(6, '0')}`;
      
      // 3. Calculate total return value
      const totalReturnValue = returnData.returnItems.reduce(
        (sum, item) => sum + (item.returnedQuantity * item.unitPrice),
        0
      );
      
      // 4. Get item costs for COGS reversal
      const itemsWithCosts = await this.getItemCosts(client, returnData.returnItems);
      
      // 5. Insert return record
      const returnQuery = `
        INSERT INTO customer_order_returns (
          return_number, original_order_id, original_order_number,
          return_type, return_reason, return_date,
          total_return_value, currency, status,
          requested_by, factory_id, notes
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const returnResult = await client.query(returnQuery, [
        returnNumber,
        returnData.originalOrderId,
        order.order_number,
        returnData.returnType,
        returnData.returnReason,
        totalReturnValue,
        order.currency,
        'draft',
        userId,
        order.factory_id,
        returnData.notes
      ]);
      
      const returnRecord = returnResult.rows[0];
      
      // 6. Insert return line items
      for (const item of itemsWithCosts) {
        await client.query(
          `INSERT INTO customer_order_return_items (
            return_id, original_line_item_id, product_id, product_name, product_sku,
            returned_quantity, unit_price, line_total,
            unit_cost, cost_total, item_condition, return_to_stock, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            returnRecord.id,
            item.originalLineItemId,
            item.productId,
            item.productName,
            item.productSku,
            item.returnedQuantity,
            item.unitPrice,
            item.returnedQuantity * item.unitPrice,
            item.unitCost,
            item.returnedQuantity * item.unitCost,
            item.itemCondition,
            item.returnToStock,
            item.notes
          ]
        );
      }
      
      await client.query('COMMIT');
      
      MyLogger.success(action, {
        returnId: returnRecord.id,
        returnNumber: returnRecord.return_number,
        totalValue: totalReturnValue
      });
      
      return returnRecord;
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { returnData });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Approve return - creates accounting reversals
   */
  static async approveReturn(
    returnId: string,
    userId: number
  ): Promise<any> {
    const action = 'ProcessReturnMediator.approveReturn';
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Get return details
      const returnQuery = await client.query(
        `SELECT * FROM customer_order_returns WHERE id = $1 AND status = 'draft'`,
        [returnId]
      );
      
      if (returnQuery.rows.length === 0) {
        throw new Error('Return not found or already processed');
      }
      
      const returnRecord = returnQuery.rows[0];
      
      // 2. Get return items
      const itemsQuery = await client.query(
        `SELECT * FROM customer_order_return_items WHERE return_id = $1`,
        [returnId]
      );
      
      const returnItems = itemsQuery.rows;
      
      // 3. Update return status
      await client.query(
        `UPDATE customer_order_returns 
         SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [userId, returnId]
      );
      
      // 4. Update inventory (return to stock)
      for (const item of returnItems) {
        if (item.return_to_stock) {
          await client.query(
            `UPDATE products 
             SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [item.returned_quantity, item.product_id]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // 5. Emit event for accounting reversals
      const idempotencyKey = IdempotencyUtils.generateEventId(
        'RETURN_APPROVED',
        'return',
        returnId,
        new Date()
      );
      
      eventBus.emit(EVENT_NAMES.FACTORY_RETURN_APPROVED, {
        returnData: {
          returnId: returnRecord.id,
          returnNumber: returnRecord.return_number,
          originalOrderId: returnRecord.original_order_id,
          originalOrderNumber: returnRecord.original_order_number,
          returnType: returnRecord.return_type,
          totalReturnValue: returnRecord.total_return_value,
          currency: returnRecord.currency,
          returnItems: returnItems,
          factoryId: returnRecord.factory_id,
          idempotencyKey: idempotencyKey
        },
        userId: userId
      });
      
      MyLogger.success(action, {
        returnId: returnRecord.id,
        returnNumber: returnRecord.return_number
      });
      
      return returnRecord;
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { returnId });
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get item costs for COGS reversal
   */
  private static async getItemCosts(client: any, returnItems: any[]): Promise<any[]> {
    const itemsWithCosts = [];
    
    for (const item of returnItems) {
      // Get product cost (from finished goods inventory or product record)
      const costQuery = await client.query(
        `SELECT unit_cost FROM products WHERE id = $1`,
        [item.productId]
      );
      
      const unitCost = costQuery.rows[0]?.unit_cost || 0;
      
      itemsWithCosts.push({
        ...item,
        unitCost: unitCost,
        lineTotal: item.returnedQuantity * item.unitPrice
      });
    }
    
    return itemsWithCosts;
  }
}

export default ProcessReturnMediator;
```

#### Integration Service - Return Reversals

**File:** `backend/src/services/factoryAccountsIntegrationService.ts` (add methods)

```typescript
/**
 * Process return/credit note - reverse all accounting entries
 */
async processReturn(returnData: ReturnAccountingData, userId: number): Promise<VoucherCreationResult | null> {
  const action = 'Process Return Accounting';
  
  if (!this.isAccountsAvailable()) return null;
  
  try {
    MyLogger.info(action, { returnId: returnData.returnId });
    
    const vouchersCreated = [];
    
    // 1. Create Credit Note (reverse A/R)
    const creditNoteVoucher = {
      type: VoucherType.JOURNAL,
      date: new Date(),
      reference: returnData.returnNumber,
      narration: `Credit Note for Return ${returnData.returnNumber} - ${returnData.originalOrderNumber}`,
      lines: [
        {
          accountId: await this.getDefaultAccount('sales_revenue'),
          debit: returnData.totalReturnValue,
          credit: 0,
          description: 'Revenue reversal for return'
        },
        {
          accountId: await this.getDefaultAccount('accounts_receivable'),
          debit: 0,
          credit: returnData.totalReturnValue,
          description: 'A/R reversal - credit to customer'
        }
      ],
      costCenterId: await this.getCostCenterForFactory(returnData.factoryId)
    };
    
    const creditNote = await this.createVoucher(creditNoteVoucher, userId, returnData.idempotencyKey + '_credit');
    vouchersCreated.push(creditNote);
    
    // 2. Reverse COGS (return goods to inventory)
    const totalCost = returnData.returnItems.reduce((sum, item) => sum + item.costTotal, 0);
    
    if (totalCost > 0) {
      const cogsReversalVoucher = {
        type: VoucherType.JOURNAL,
        date: new Date(),
        reference: returnData.returnNumber,
        narration: `COGS Reversal for Return ${returnData.returnNumber}`,
        lines: [
          {
            accountId: await this.getDefaultAccount('finished_goods_inventory'),
            debit: totalCost,
            credit: 0,
            description: 'Return goods to inventory'
          },
          {
            accountId: await this.getDefaultAccount('cost_of_goods_sold'),
            debit: 0,
            credit: totalCost,
            description: 'COGS reversal'
          }
        ],
        costCenterId: await this.getCostCenterForFactory(returnData.factoryId)
      };
      
      const cogsReversal = await this.createVoucher(cogsReversalVoucher, userId, returnData.idempotencyKey + '_cogs');
      vouchersCreated.push(cogsReversal);
    }
    
    // Update return record with voucher IDs
    await pool.query(
      `UPDATE customer_order_returns 
       SET credit_note_voucher_id = $1, cogs_reversal_voucher_id = $2
       WHERE id = $3`,
      [creditNote.id, vouchersCreated[1]?.id, returnData.returnId]
    );
    
    MyLogger.success(action, {
      returnId: returnData.returnId,
      vouchersCreated: vouchersCreated.map(v => v.id)
    });
    
    return {
      voucherId: creditNote.id,
      voucherNo: creditNote.voucherNo,
      success: true
    };
    
  } catch (error: any) {
    MyLogger.error(action, error, { returnData });
    throw error;
  }
}
```

### 4.4 Frontend - Returns Management UI

**File:** `frontend/src/modules/factory/pages/CustomerOrderReturns.tsx` (NEW)

```tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerOrderReturns() {
  const { toast } = useToast();
  
  // Fetch returns
  const { data: returns } = useQuery({
    queryKey: ['customerReturns'],
    queryFn: async () => {
      const response = await fetch('/api/factory/returns');
      return response.json();
    }
  });
  
  // Approve return
  const approveMutation = useMutation({
    mutationFn: async (returnId: string) => {
      const response = await fetch(`/api/factory/returns/${returnId}/approve`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Return Approved',
        description: `Return ${data.returnNumber} approved successfully. Accounting entries created.`
      });
    }
  });
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Returns & Credit Notes</h1>
          <p className="text-muted-foreground">
            Process returns and automatically create accounting reversals
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Return
        </Button>
      </div>
      
      {/* Returns table - similar to customer orders */}
      {/* ... */}
    </div>
  );
}
```

---

## 5. Inventory Valuation Methods

### 5.1 Business Requirement

Different businesses use different inventory valuation methods:

1. **FIFO** (First In, First Out) - Oldest inventory sold first
2. **LIFO** (Last In, First Out) - Newest inventory sold first
3. **Weighted Average** - Average cost across all inventory
4. **Specific Identification** - Track individual item costs

**Impact on COGS Calculation:** The valuation method determines which cost is used when goods are sold.

### 5.2 Database Schema

Already added in V33 (`accounting_policies` table with `inventory_valuation_method` key)

### 5.3 Backend Implementation

#### Inventory Costing Service

**File:** `backend/src/services/inventoryCostingService.ts` (NEW)

```typescript
import { pool } from '@/config/database';
import { accountingPoliciesService, InventoryValuationMethod } from './accountingPoliciesService';

export interface InventoryTransaction {
  productId: number;
  quantity: number;
  unitCost: number;
  transactionDate: Date;
  transactionType: 'receipt' | 'consumption' | 'sale';
}

class InventoryCostingService {
  /**
   * Calculate COGS for product sale based on valuation method
   */
  async calculateCOGS(
    productId: number,
    quantity: number,
    factoryId?: number
  ): Promise<{ totalCost: number; unitCost: number }> {
    const valuationMethod = await accountingPoliciesService.getInventoryValuationMethod(factoryId);
    
    switch (valuationMethod) {
      case InventoryValuationMethod.FIFO:
        return await this.calculateFIFO(productId, quantity);
      
      case InventoryValuationMethod.LIFO:
        return await this.calculateLIFO(productId, quantity);
      
      case InventoryValuationMethod.WEIGHTED_AVERAGE:
        return await this.calculateWeightedAverage(productId, quantity);
      
      case InventoryValuationMethod.SPECIFIC_IDENTIFICATION:
        return await this.calculateSpecificIdentification(productId, quantity);
      
      default:
        throw new Error(`Unsupported valuation method: ${valuationMethod}`);
    }
  }
  
  /**
   * FIFO: Take cost from oldest inventory first
   */
  private async calculateFIFO(productId: number, quantity: number): Promise<{ totalCost: number; unitCost: number }> {
    // Query inventory transactions ordered by date (oldest first)
    const result = await pool.query(
      `SELECT unit_cost, quantity_remaining 
       FROM inventory_cost_layers 
       WHERE product_id = $1 AND quantity_remaining > 0 
       ORDER BY transaction_date ASC`,
      [productId]
    );
    
    let remainingQty = quantity;
    let totalCost = 0;
    
    for (const layer of result.rows) {
      if (remainingQty <= 0) break;
      
      const qtyFromLayer = Math.min(remainingQty, layer.quantity_remaining);
      totalCost += qtyFromLayer * layer.unit_cost;
      remainingQty -= qtyFromLayer;
    }
    
    if (remainingQty > 0) {
      throw new Error(`Insufficient inventory for product ${productId}`);
    }
    
    return {
      totalCost: totalCost,
      unitCost: totalCost / quantity
    };
  }
  
  /**
   * LIFO: Take cost from newest inventory first
   */
  private async calculateLIFO(productId: number, quantity: number): Promise<{ totalCost: number; unitCost: number }> {
    // Query inventory transactions ordered by date (newest first)
    const result = await pool.query(
      `SELECT unit_cost, quantity_remaining 
       FROM inventory_cost_layers 
       WHERE product_id = $1 AND quantity_remaining > 0 
       ORDER BY transaction_date DESC`,
      [productId]
    );
    
    let remainingQty = quantity;
    let totalCost = 0;
    
    for (const layer of result.rows) {
      if (remainingQty <= 0) break;
      
      const qtyFromLayer = Math.min(remainingQty, layer.quantity_remaining);
      totalCost += qtyFromLayer * layer.unit_cost;
      remainingQty -= qtyFromLayer;
    }
    
    if (remainingQty > 0) {
      throw new Error(`Insufficient inventory for product ${productId}`);
    }
    
    return {
      totalCost: totalCost,
      unitCost: totalCost / quantity
    };
  }
  
  /**
   * Weighted Average: Average cost of all inventory
   */
  private async calculateWeightedAverage(productId: number, quantity: number): Promise<{ totalCost: number; unitCost: number }> {
    // Calculate weighted average
    const result = await pool.query(
      `SELECT 
        SUM(unit_cost * quantity_remaining) / NULLIF(SUM(quantity_remaining), 0) as avg_cost,
        SUM(quantity_remaining) as total_qty
       FROM inventory_cost_layers 
       WHERE product_id = $1 AND quantity_remaining > 0`,
      [productId]
    );
    
    const avgCost = result.rows[0]?.avg_cost || 0;
    const totalQty = result.rows[0]?.total_qty || 0;
    
    if (quantity > totalQty) {
      throw new Error(`Insufficient inventory for product ${productId}`);
    }
    
    return {
      totalCost: avgCost * quantity,
      unitCost: avgCost
    };
  }
  
  /**
   * Specific Identification: Use specific item cost (for serialized items)
   */
  private async calculateSpecificIdentification(productId: number, quantity: number): Promise<{ totalCost: number; unitCost: number }> {
    // This requires tracking specific serial numbers/lot numbers
    // Implementation depends on whether product is serialized
    throw new Error('Specific identification method requires serial number tracking');
  }
  
  /**
   * Record inventory layer when goods are received/produced
   */
  async recordInventoryLayer(transaction: InventoryTransaction): Promise<void> {
    await pool.query(
      `INSERT INTO inventory_cost_layers 
       (product_id, quantity, quantity_remaining, unit_cost, transaction_date, transaction_type)
       VALUES ($1, $2, $2, $3, $4, $5)`,
      [
        transaction.productId,
        transaction.quantity,
        transaction.unitCost,
        transaction.transactionDate,
        transaction.transactionType
      ]
    );
  }
  
  /**
   * Reduce inventory layer quantities when consumed/sold
   */
  async consumeInventory(productId: number, quantity: number, valuationMethod: InventoryValuationMethod): Promise<void> {
    // Update quantities in layers based on valuation method
    if (valuationMethod === InventoryValuationMethod.FIFO) {
      // Reduce from oldest layers first
      await this.consumeFIFO(productId, quantity);
    } else if (valuationMethod === InventoryValuationMethod.LIFO) {
      // Reduce from newest layers first
      await this.consumeLIFO(productId, quantity);
    } else {
      // For weighted average, reduce proportionally from all layers
      await this.consumeWeightedAverage(productId, quantity);
    }
  }
  
  private async consumeFIFO(productId: number, quantity: number): Promise<void> {
    let remaining = quantity;
    
    const layers = await pool.query(
      `SELECT id, quantity_remaining 
       FROM inventory_cost_layers 
       WHERE product_id = $1 AND quantity_remaining > 0 
       ORDER BY transaction_date ASC
       FOR UPDATE`,
      [productId]
    );
    
    for (const layer of layers.rows) {
      if (remaining <= 0) break;
      
      const toConsume = Math.min(remaining, layer.quantity_remaining);
      
      await pool.query(
        `UPDATE inventory_cost_layers 
         SET quantity_remaining = quantity_remaining - $1 
         WHERE id = $2`,
        [toConsume, layer.id]
      );
      
      remaining -= toConsume;
    }
  }
  
  private async consumeLIFO(productId: number, quantity: number): Promise<void> {
    let remaining = quantity;
    
    const layers = await pool.query(
      `SELECT id, quantity_remaining 
       FROM inventory_cost_layers 
       WHERE product_id = $1 AND quantity_remaining > 0 
       ORDER BY transaction_date DESC
       FOR UPDATE`,
      [productId]
    );
    
    for (const layer of layers.rows) {
      if (remaining <= 0) break;
      
      const toConsume = Math.min(remaining, layer.quantity_remaining);
      
      await pool.query(
        `UPDATE inventory_cost_layers 
         SET quantity_remaining = quantity_remaining - $1 
         WHERE id = $2`,
        [toConsume, layer.id]
      );
      
      remaining -= toConsume;
    }
  }
  
  private async consumeWeightedAverage(productId: number, quantity: number): Promise<void> {
    // For weighted average, consume proportionally from all layers
    await pool.query(
      `UPDATE inventory_cost_layers 
       SET quantity_remaining = quantity_remaining * (1 - $1 / (SELECT SUM(quantity_remaining) FROM inventory_cost_layers WHERE product_id = $2 AND quantity_remaining > 0))
       WHERE product_id = $2 AND quantity_remaining > 0`,
      [quantity, productId]
    );
  }
}

export const inventoryCostingService = new InventoryCostingService();
```

#### Migration for Inventory Cost Layers

```sql
-- Track inventory cost layers for FIFO/LIFO
CREATE TABLE inventory_cost_layers (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Quantities
  quantity DECIMAL(15,3) NOT NULL, -- Original quantity received
  quantity_remaining DECIMAL(15,3) NOT NULL, -- Remaining after consumption
  
  -- Cost
  unit_cost DECIMAL(15,4) NOT NULL,
  
  -- Transaction details
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('receipt', 'production', 'adjustment')),
  transaction_reference VARCHAR(100),
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (quantity_remaining >= 0 AND quantity_remaining <= quantity)
);

CREATE INDEX idx_inventory_cost_layers_product ON inventory_cost_layers(product_id);
CREATE INDEX idx_inventory_cost_layers_date ON inventory_cost_layers(transaction_date);
CREATE INDEX idx_inventory_cost_layers_remaining ON inventory_cost_layers(product_id, quantity_remaining) WHERE quantity_remaining > 0;

COMMENT ON TABLE inventory_cost_layers IS 'Tracks cost layers for FIFO/LIFO inventory valuation';
COMMENT ON COLUMN inventory_cost_layers.quantity_remaining IS 'Quantity not yet consumed - used for FIFO/LIFO calculations';
```

---

## 6. Tax & Foreign Exchange Handling

### 6.1 Tax Handling

**Requirements:**
- Support inclusive and exclusive tax on invoices
- Track tax liability in separate accounts
- Generate tax reports

#### Database Schema

```sql
-- Add tax fields to customer orders
ALTER TABLE factory_customer_orders 
ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN tax_account_id INTEGER REFERENCES chart_of_accounts(id);

-- Tax ledger tracking
CREATE TABLE tax_transactions (
  id BIGSERIAL PRIMARY KEY,
  voucher_id INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES factory_customer_orders(id),
  
  -- Tax details
  tax_type VARCHAR(50) NOT NULL, -- 'VAT', 'GST', 'Sales Tax', etc.
  tax_rate DECIMAL(5,2) NOT NULL,
  taxable_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  
  -- Classification
  tax_category VARCHAR(50), -- 'Output Tax', 'Input Tax'
  
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_transactions_voucher ON tax_transactions(voucher_id);
CREATE INDEX idx_tax_transactions_order ON tax_transactions(order_id);
CREATE INDEX idx_tax_transactions_date ON tax_transactions(transaction_date);
```

#### Integration Service Tax Handling

```typescript
// In createCustomerOrderReceivable method:
async createCustomerOrderReceivable(orderData: OrderAccountingData, userId: number): Promise<VoucherCreationResult | null> {
  // ... existing code ...
  
  // Handle tax
  const taxAmount = orderData.taxAmount || 0;
  const orderAmountExclTax = orderData.totalValue - (orderData.taxInclusive ? taxAmount : 0);
  const totalWithTax = orderData.taxInclusive ? orderData.totalValue : orderData.totalValue + taxAmount;
  
  const voucherLines = [
    {
      accountId: await this.getAccountForCustomer(orderData.customerId) || await this.getDefaultAccount('accounts_receivable'),
      debit: totalWithTax,
      credit: 0,
      description: `A/R for Order ${orderData.orderNumber}`
    },
    {
      accountId: await this.getDefaultAccount('deferred_revenue'),
      debit: 0,
      credit: orderAmountExclTax,
      description: `Revenue for Order ${orderData.orderNumber}`
    }
  ];
  
  // Add tax line if applicable
  if (taxAmount > 0) {
    voucherLines.push({
      accountId: await this.getDefaultAccount('tax_payable'),
      debit: 0,
      credit: taxAmount,
      description: `Tax on Order ${orderData.orderNumber}`
    });
  }
  
  // Create voucher with tax lines
  // ...
}
```

### 6.2 Foreign Exchange (FX) Handling

**Requirements:**
- Support multi-currency orders
- Track FX gains/losses
- Periodic revaluation of foreign currency balances

#### Database Schema

```sql
-- Track exchange rates
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency, effective_date)
);

-- FX revaluation history
CREATE TABLE fx_revaluations (
  id BIGSERIAL PRIMARY KEY,
  revaluation_date DATE NOT NULL,
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
  currency VARCHAR(3) NOT NULL,
  
  -- Balances
  foreign_currency_balance DECIMAL(15,2) NOT NULL,
  exchange_rate_old DECIMAL(12,6) NOT NULL,
  exchange_rate_new DECIMAL(12,6) NOT NULL,
  functional_currency_old DECIMAL(15,2) NOT NULL,
  functional_currency_new DECIMAL(15,2) NOT NULL,
  
  -- Gain/Loss
  fx_gain_loss DECIMAL(15,2) NOT NULL,
  
  -- Voucher created
  voucher_id INTEGER REFERENCES vouchers(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fx_revaluations_date ON fx_revaluations(revaluation_date);
CREATE INDEX idx_fx_revaluations_account ON fx_revaluations(account_id);
```

---

*Due to length, continuing with remaining sections...*

## 7-9 Summary (Brief)

### 7. Per-Factory Account Configuration

**Enhancement:** Allow each factory to override default account mappings

```sql
-- Already partially addressed in factory_accounting_policies table
-- Add factory-specific account mappings:
ALTER TABLE factory_account_mappings 
ADD COLUMN factory_id BIGINT REFERENCES factories(id);

-- Lookup priority: factory-specific → global → default
```

### 8. Voucher Numbering Scheme

**Enhancement:** Support global or per-factory voucher numbering

```sql
-- Add to factories table
ALTER TABLE factories 
ADD COLUMN voucher_prefix VARCHAR(10), -- e.g., 'FA', 'FB'
ADD COLUMN voucher_sequence_current INTEGER DEFAULT 0;

-- Voucher numbers: 
-- Global: JV-000001, JV-000002
-- Per-factory: FA-JV-000001, FB-JV-000001
```

### 9. Automated Reconciliation System

**Enhancement:** Daily automated reconciliation with alerts

#### Reconciliation Job

**File:** `backend/src/jobs/factoryAccountsReconciliation.job.ts` (NEW)

```typescript
import cron from 'node-cron';
import { pool } from '@/config/database';
import { MyLogger } from '@/utils/new-logger';

class FactoryAccountsReconciliationJob {
  /**
   * Run daily reconciliation at 2 AM
   */
  start(): void {
    cron.schedule('0 2 * * *', async () => {
      await this.runReconciliation();
    });
  }
  
  async runReconciliation(): Promise<void> {
    const action = 'Daily Factory Accounts Reconciliation';
    
    try {
      MyLogger.info(action, { message: 'Starting daily reconciliation' });
      
      // 1. Check for factory operations without vouchers
      const missingVouchers = await this.findMissingVouchers();
      
      // 2. Check for vouchers without factory operations
      const orphanedVouchers = await this.findOrphanedVouchers();
      
      // 3. Check WIP balance vs. GL
      const wipDiscrepancies = await this.checkWIPBalance();
      
      // 4. Check inventory balance vs. GL
      const inventoryDiscrepancies = await this.checkInventoryBalance();
      
      // 5. Generate report
      const report = {
        date: new Date(),
        missingVouchers: missingVouchers.length,
        orphanedVouchers: orphanedVouchers.length,
        wipDiscrepancies: wipDiscrepancies.length,
        inventoryDiscrepancies: inventoryDiscrepancies.length,
        details: {
          missingVouchers,
          orphanedVouchers,
          wipDiscrepancies,
          inventoryDiscrepancies
        }
      };
      
      // 6. Store report
      await this.storeReconciliationReport(report);
      
      // 7. Send alerts if discrepancies found
      if (report.missingVouchers > 0 || report.orphanedVouchers > 0 || 
          report.wipDiscrepancies.length > 0 || report.inventoryDiscrepancies.length > 0) {
        await this.sendAlert(report);
      }
      
      MyLogger.success(action, { report });
      
    } catch (error: any) {
      MyLogger.error(action, error);
    }
  }
  
  private async findMissingVouchers(): Promise<any[]> {
    // Find approved orders without vouchers
    const result = await pool.query(`
      SELECT 
        'customer_order' as entity_type,
        id as entity_id,
        order_number as reference,
        'approved' as expected_voucher
      FROM factory_customer_orders
      WHERE status = 'approved' 
        AND receivable_voucher_id IS NULL
        AND approved_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
      
      UNION ALL
      
      SELECT 
        'material_consumption' as entity_type,
        id as entity_id,
        CONCAT('MC-', id) as reference,
        'wip_voucher' as expected_voucher
      FROM work_order_material_consumptions
      WHERE voucher_id IS NULL
        AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
      
      -- Add more checks...
    `);
    
    return result.rows;
  }
  
  private async findOrphanedVouchers(): Promise<any[]> {
    // Find vouchers with invalid references
    const result = await pool.query(`
      SELECT 
        v.id as voucher_id,
        v.voucher_no,
        v.reference
      FROM vouchers v
      WHERE v.reference LIKE 'CO-%'
        AND NOT EXISTS (
          SELECT 1 FROM factory_customer_orders 
          WHERE order_number = v.reference
        )
      
      UNION ALL
      
      SELECT 
        v.id as voucher_id,
        v.voucher_no,
        v.reference
      FROM vouchers v
      WHERE v.reference LIKE 'WO-%'
        AND NOT EXISTS (
          SELECT 1 FROM work_orders 
          WHERE work_order_number = v.reference
        )
    `);
    
    return result.rows;
  }
  
  private async checkWIPBalance(): Promise<any[]> {
    // Compare WIP in factory tables vs. GL account balance
    const result = await pool.query(`
      WITH factory_wip AS (
        SELECT 
          wo.factory_id,
          SUM(wmc.consumed_quantity * wmc.unit_cost) as total_wip
        FROM work_orders wo
        JOIN work_order_material_consumptions wmc ON wo.id = wmc.work_order_id
        WHERE wo.status IN ('planned', 'released', 'in_progress')
        GROUP BY wo.factory_id
      ),
      gl_wip AS (
        SELECT 
          vl.cost_center_id,
          SUM(vl.debit - vl.credit) as balance
        FROM voucher_lines vl
        JOIN chart_of_accounts coa ON vl.account_id = coa.id
        WHERE coa.code = '1220' -- WIP account
        GROUP BY vl.cost_center_id
      )
      SELECT 
        f.id as factory_id,
        f.name as factory_name,
        COALESCE(fw.total_wip, 0) as factory_wip,
        COALESCE(gw.balance, 0) as gl_wip,
        ABS(COALESCE(fw.total_wip, 0) - COALESCE(gw.balance, 0)) as discrepancy
      FROM factories f
      LEFT JOIN factory_wip fw ON f.id = fw.factory_id
      LEFT JOIN gl_wip gw ON f.cost_center_id = gw.cost_center_id
      WHERE ABS(COALESCE(fw.total_wip, 0) - COALESCE(gw.balance, 0)) > 10 -- Tolerance: $10
    `);
    
    return result.rows;
  }
  
  private async checkInventoryBalance(): Promise<any[]> {
    // Compare inventory in products table vs. GL
    // Similar to WIP check...
    return [];
  }
  
  private async storeReconciliationReport(report: any): Promise<void> {
    await pool.query(
      `INSERT INTO reconciliation_reports (report_date, report_data, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [report.date, JSON.stringify(report)]
    );
  }
  
  private async sendAlert(report: any): Promise<void> {
    // Send email or create notification for finance team
    MyLogger.warn('Reconciliation Discrepancies Found', { report });
    // ... email service integration
  }
}

export const factoryAccountsReconciliationJob = new FactoryAccountsReconciliationJob();
```

#### Reconciliation Reports Table

```sql
CREATE TABLE reconciliation_reports (
  id BIGSERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  report_type VARCHAR(50) DEFAULT 'daily_reconciliation',
  report_data JSONB NOT NULL,
  issues_found INTEGER DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('completed', 'issues_found', 'failed')) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliation_reports_date ON reconciliation_reports(report_date DESC);
```

---

## 10. Updated Database Schema Summary

**New Migrations Required:**

| Migration | Description | Tables Created/Modified |
|-----------|-------------|------------------------|
| V33 | Accounting Policies | accounting_policies, factory_accounting_policies |
| V34 | Event Processing & Idempotency | factory_event_log |
| V35 | Failed Voucher Queue | failed_voucher_queue |
| V36 | Returns & Credit Notes | customer_order_returns, customer_order_return_items |
| V37 | Inventory Cost Layers | inventory_cost_layers |
| V38 | Tax Tracking | tax_transactions, exchange_rates, fx_revaluations |
| V39 | Reconciliation Reports | reconciliation_reports |

**Total New Tables:** 10  
**Total Table Modifications:** 5 (factories, customer_orders, vouchers, etc.)

---

## 11. Updated Implementation Timeline

### Original Timeline: 10-12 weeks

### Enhanced Timeline: 13-16 weeks

| Phase | Duration | Original Features | + Enhancements |
|-------|----------|------------------|----------------|
| **Phase 1** | Week 1-2 | Customer Orders | + Revenue policy config, Idempotency |
| **Phase 2** | Week 3-4 | Material Consumption | + Inventory valuation, Cost layers |
| **Phase 3** | Week 5-6 | Production Execution | + Tax handling |
| **Phase 4** | Week 7 | Order Shipment & COGS | + Returns/Credit notes |
| **Phase 5** | Week 8-9 | Cost Centers | + Per-factory accounts |
| **Phase 6** | Week 10-11 | Factory Expenses | + Failed voucher queue UI |
| **Phase 7** | Week 12 | Reporting | + FX handling |
| **Phase 8** | Week 13 | Testing & QA | + Reconciliation system |
| **Deployment** | Week 14-15 | Production rollout | + Daily reconciliation job |
| **Stabilization** | Week 16+ | Monitoring | + Ongoing optimization |

### Budget Impact

**Original:** ~$58,000  
**Enhanced:** ~$75,000-80,000 (+30% for additional features)

### ROI Update

**Enhanced Annual Benefit:** ~$130,000 (additional $28k from reduced errors, better compliance)  
**Payback Period:** ~7-8 months (still excellent)  
**5-Year ROI:** ~800%+

---

## 12. Conclusion

These enhancements transform the factory-accounts integration from a basic implementation to a **production-grade, enterprise-ready system** with:

✅ **Configurability** - Adapt to different business policies  
✅ **Reliability** - Idempotency and retry mechanisms  
✅ **Visibility** - Failed voucher queue and reconciliation  
✅ **Compliance** - Returns, tax, FX handling  
✅ **Accuracy** - Inventory valuation methods  
✅ **Scalability** - Per-factory configuration  
✅ **Audit-Ready** - Complete event log and reconciliation

**Recommendation:** Implement these enhancements as part of the core integration, not as "phase 2" features. They are essential for production use.

---

**END OF ENHANCEMENTS DOCUMENT (PART 2)**

**Related Documents:**
- `FACTORY_ACCOUNTS_INTEGRATION_PLAN.md` - Original implementation plan
- `FACTORY_ACCOUNTS_INTEGRATION_ENHANCEMENTS.md` - Part 1 (sections 1-3)
- `FACTORY_ACCOUNTS_INTEGRATION_SUMMARY.md` - Executive summary

**Version:** 1.0  
**Last Updated:** October 8, 2025  
**Status:** ✅ READY FOR REVIEW & APPROVAL

