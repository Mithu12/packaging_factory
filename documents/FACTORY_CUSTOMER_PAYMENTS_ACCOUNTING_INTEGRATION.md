# Factory Customer Payments - Accounting Integration

## Overview

This document describes the implementation of accounting integration for factory customer payments. When a payment is received against a customer order, the system now automatically creates accounting vouchers to properly record the transaction.

## Business Flow

### Payment Recording Process

1. **User records payment** via the Customer Order Management UI
2. **Payment validation** ensures:
   - Order status is `completed` or `shipped`
   - Payment amount doesn't exceed outstanding amount
   - All required fields are provided
3. **Database transaction** updates:
   - Inserts payment record in `factory_customer_payments`
   - Updates order's `paid_amount` and `outstanding_amount`
   - Recalculates customer's financial summary
4. **Event emission** triggers `FACTORY_PAYMENT_RECEIVED` event
5. **Accounting integration** (if accounts module available):
   - Creates receipt voucher
   - Auto-approves voucher
   - Links voucher ID back to payment record

### Accounting Entries

When a customer payment is received, the following accounting voucher is created:

**Voucher Type**: `RECEIPT`

**Journal Entries**:
```
Debit:  Cash/Bank Account      [Payment Amount]
Credit: Accounts Receivable    [Payment Amount]
```

**Account Selection**:
- If `payment_method === 'cash'` → Uses "Cash" account
- Otherwise → Uses "Bank" account (for bank_transfer, card, cheque, mobile_payment, etc.)

**Cost Center**: Linked to the factory's cost center for proper departmental tracking

## Database Changes

### Migration V50: Add Payment Voucher Reference

**File**: `backend/migrations/V50_add_payment_voucher_reference.sql`

```sql
ALTER TABLE factory_customer_payments
    ADD COLUMN IF NOT EXISTS voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_factory_customer_payments_voucher_id
    ON factory_customer_payments(voucher_id);
```

**Purpose**: Store reference to the accounting voucher created for each payment.

## Backend Implementation

### 1. Factory Accounts Integration Service

**File**: `backend/src/services/factoryAccountsIntegrationService.ts`

**Key Method**: `createCustomerPaymentVoucher`

**Features**:
- Idempotency via event log (prevents duplicate vouchers)
- Dynamic account selection based on payment method
- Auto-approval of vouchers
- Updates payment record with voucher ID after creation
- Proper error handling and logging

**Account Mapping**:
```typescript
case 'cash':
case 'cash_in_hand':
  searchTerm = 'Cash';
  category = 'Assets';
  break;
case 'bank_account':
  searchTerm = 'Bank';
  category = 'Assets';
  break;
```

### 2. Event Listener

**Registration**: Automatic when accounts module is available

**Event**: `FACTORY_PAYMENT_RECEIVED`

**Handler**: Lines 1599-1646 in `factoryAccountsIntegrationService.ts`

```typescript
eventBus.on(EVENT_NAMES.FACTORY_PAYMENT_RECEIVED, async (payload: any) => {
  const paymentData: PaymentAccountingData = {
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    paymentId: payload.paymentId,
    amount: payload.amount,
    paymentMethod: payload.paymentMethod,
    paymentReference: payload.paymentReference,
    paymentDate: payload.paymentDate,
    factoryId: payload.factoryId,
    factoryName: payload.factoryName,
    factoryCostCenterId: payload.factoryCostCenterId,
    factoryCostCenterName: payload.factoryCostCenterName,
    customerId: payload.customerId,
    userId: payload.userId,
    timestamp: payload.timestamp
  };

  const result = await factoryAccountsIntegrationService.createCustomerPaymentVoucher(
    paymentData,
    payload.userId
  );
  // ... logging ...
});
```

### 3. Payment Mediator

**File**: `backend/src/modules/factory/mediators/customerOrders/FactoryCustomerPaymentsMediator.ts`

**Event Emission** (lines 135-150):
```typescript
eventBus.emit(EVENT_NAMES.FACTORY_PAYMENT_RECEIVED, {
  orderId: order.id,
  orderNumber: order.order_number,
  paymentId: payment.id,
  amount: data.payment_amount,
  paymentMethod: data.payment_method,
  paymentReference: data.payment_reference,
  paymentDate: payment.payment_date,
  factoryId: order.factory_id,
  factoryName: order.factory_name,
  factoryCostCenterId: order.factory_cost_center_id,
  factoryCostCenterName: order.factory_cost_center_name,
  customerId: order.factory_customer_id,
  userId,
  timestamp: new Date()
});
```

**Payment History Query** (lines 183-215):
- Now includes JOIN with `vouchers` table
- Returns `voucher_id` and `voucher_no` for each payment

### 4. TypeScript Types

**Backend**: `backend/src/types/factory.ts`

```typescript
export interface FactoryCustomerPayment {
  id: number;
  factory_customer_order_id: string;
  factory_customer_id: string;
  factory_id?: number;
  factory_sales_invoice_id?: number;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
  recorded_by: number;
  recorded_at: string;
  updated_at?: string;
  additional_metadata?: Record<string, unknown>;
  voucher_id?: number;      // NEW
  voucher_no?: string;      // NEW
}
```

**Service Interface**: `PaymentAccountingData`

```typescript
export interface PaymentAccountingData {
  orderId: string;
  orderNumber: string;
  paymentId: number;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentDate: Date;
  factoryId?: number;
  factoryName?: string;
  factoryCostCenterId?: number;
  factoryCostCenterName?: string;
  customerId: number;
  userId: number;
  timestamp: Date;
}
```

## Frontend Implementation

### 1. Types Update

**File**: `frontend/src/modules/factory/services/customer-orders-api.ts`

```typescript
export interface FactoryCustomerPayment {
  // ... existing fields ...
  voucher_id?: number;      // NEW
  voucher_no?: string;      // NEW
}
```

### 2. UI Display

**File**: `frontend/src/modules/factory/components/OrderDetailsDialog.tsx`

**Payment History Display** (lines 405-429):

```tsx
{paymentHistory.map((payment) => (
  <div key={payment.id} className="flex justify-between items-start p-3 bg-muted rounded-md text-sm">
    <div className="space-y-1">
      <div className="font-semibold">{formatCurrency(payment.payment_amount)}</div>
      <div className="text-xs text-muted-foreground">
        {payment.payment_method.replace('_', ' ').toUpperCase()}
        {payment.payment_reference && ` - ${payment.payment_reference}`}
      </div>
      {payment.voucher_no && (
        <div className="text-xs text-blue-600 font-medium">
          Voucher: {payment.voucher_no}
        </div>
      )}
      {payment.notes && (
        <div className="text-xs text-muted-foreground italic">{payment.notes}</div>
      )}
    </div>
    <div className="text-xs text-muted-foreground text-right">
      <div>{formatDate(payment.payment_date)}</div>
      {payment.recorded_by_username && (
        <div className="text-xs">by {payment.recorded_by_username}</div>
      )}
    </div>
  </div>
))}
```

**Visual Enhancement**:
- Voucher number displayed in blue color for easy identification
- Clear association between payment and accounting entry

## Error Handling

### Graceful Degradation

The system is designed to work with or without the accounts module:

1. **Accounts module not available**: 
   - Payment recording continues normally
   - No voucher is created
   - No errors thrown to user

2. **Voucher creation fails**:
   - Payment record is still saved
   - Error is logged for admin review
   - User sees payment as recorded
   - Can be retried via event log

3. **Account not configured**:
   - Returns descriptive error: "Required accounts not configured"
   - Admin can configure accounts and retry

### Idempotency

**Event Log System**: Prevents duplicate voucher creation

```typescript
const eventId = factoryEventLogService.generateEventId(
  'payment_received',
  paymentData.paymentId
);

const alreadyProcessed = await factoryEventLogService.isEventProcessed(eventId);
if (alreadyProcessed) {
  MyLogger.info(action, { 
    paymentId: paymentData.paymentId,
    message: 'Payment voucher already created',
    eventId 
  });
  return null;
}
```

## Testing Scenarios

### Happy Path

1. Create customer order
2. Approve order (creates A/R voucher)
3. Complete/ship order
4. Record payment
5. Verify:
   - Payment record created
   - Order outstanding updated
   - Customer summary updated
   - Receipt voucher created
   - Voucher auto-approved
   - Voucher ID stored in payment

### Edge Cases

1. **Partial payments**: Multiple payments against one order
2. **Payment methods**: Cash vs. bank transfer account selection
3. **Missing accounts**: Graceful error message
4. **Module unavailable**: Payment saved without voucher
5. **Concurrent payments**: Idempotency prevents duplicates

## Configuration Requirements

### Chart of Accounts Setup

For proper integration, the following accounts must exist:

| Account Name | Category | Type | Purpose |
|--------------|----------|------|---------|
| Cash | Assets | Current | Cash payments |
| Bank | Assets | Current | Non-cash payments |
| Accounts Receivable | Assets | Current | Customer receivables |

**Note**: Account matching is done via name search, so naming should be consistent.

### Cost Center Assignment

Factories should have a cost center assigned for proper departmental tracking:

1. Navigate to Factory management
2. Edit factory
3. Assign cost center
4. All payment vouchers will be tagged with this cost center

## Monitoring and Audit

### Event Logs

All payment voucher creation attempts are logged in `factory_accounting_event_log`:

```sql
SELECT * FROM factory_accounting_event_log 
WHERE event_type = 'payment_received' 
ORDER BY created_at DESC;
```

### Failed Vouchers

Query for failed voucher attempts:

```sql
SELECT * FROM factory_accounting_event_log 
WHERE event_type = 'payment_received' 
AND status = 'failed'
ORDER BY created_at DESC;
```

### Reconciliation

Find payments without vouchers (if accounts module was available):

```sql
SELECT fcp.*, fco.order_number
FROM factory_customer_payments fcp
JOIN factory_customer_orders fco ON fcp.factory_customer_order_id = fco.id
WHERE fcp.voucher_id IS NULL
ORDER BY fcp.payment_date DESC;
```

## Future Enhancements

1. **Bulk payment import**: Handle multiple payments at once
2. **Payment reversals**: Create reversal vouchers for refunds
3. **Bank reconciliation**: Match payments with bank statements
4. **Payment allocation**: Allocate payment across multiple orders
5. **Early payment discounts**: Auto-calculate and record discounts
6. **Payment reminders**: Notify customers of outstanding balances

## Related Documentation

- `FACTORY_ACCOUNTS_INTEGRATION_FLOWS.md` - Complete integration overview
- `AUDIT_SYSTEM_FIX_SUMMARY.md` - Audit trail implementation
- `FACTORY_ACCOUNTS_INTEGRATION_COMPLETE.md` - Full feature set

## Summary

Customer payment accounting integration is now fully operational:

✅ Automatic voucher creation on payment recording  
✅ Proper debit/credit entries (Cash/Bank → A/R reduction)  
✅ Cost center tracking for departmental accounting  
✅ Idempotency to prevent duplicate vouchers  
✅ Graceful degradation when accounts module unavailable  
✅ Voucher reference displayed in payment history  
✅ Full audit trail via event logging  

The system maintains data integrity while providing seamless integration between factory operations and financial accounting.

