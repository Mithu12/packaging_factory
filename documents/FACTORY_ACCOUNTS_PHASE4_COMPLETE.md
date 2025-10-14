# Factory-Accounts Integration: Phase 4 Complete

**Date:** October 8, 2025  
**Status:** ✅ Database Schema Created - Ready for Service Layer Implementation

## 🎯 Phase 4: Idempotency & Failed Voucher Queue

### What Was Implemented

#### ✅ Migration V33: Event Log & Failed Voucher Queue

**1. factory_event_log Table**
- Tracks all processed events with unique `event_id`
- Prevents duplicate voucher creation
- Stores voucher IDs created by each event
- Tracks processing status and retry attempts

**2. failed_voucher_queue Table**
- Queues failed voucher creations for retry
- Categorizes failures for easier troubleshooting
- Implements exponential backoff for retries
- Supports manual resolution by finance team

**3. Helper Functions**
- `generate_factory_event_id()` - Creates unique event IDs
- `is_factory_event_processed()` - Checks idempotency
- `calculate_next_retry()` - Exponential backoff calculation

**4. Monitoring Views**
- `failed_vouchers_pending_retry` - Vouchers ready for retry
- `factory_event_processing_stats` - Event processing statistics
- `recent_failed_vouchers` - Last 50 failures for dashboard

---

## 📊 Database Schema

### factory_event_log

```sql
CREATE TABLE factory_event_log (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,  -- "order_approved_123_1696800000"
    event_type VARCHAR(100) NOT NULL,        -- "FACTORY_ORDER_APPROVED"
    event_source VARCHAR(100) NOT NULL,      -- "customer_order"
    source_id BIGINT NOT NULL,              -- 123
    payload JSONB NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending',    -- pending, processing, completed, failed
    processed_at TIMESTAMP WITH TIME ZONE,
    
    voucher_ids INTEGER[],                   -- [456, 457]
    voucher_count INTEGER DEFAULT 0,
    
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### failed_voucher_queue

```sql
CREATE TABLE failed_voucher_queue (
    id BIGSERIAL PRIMARY KEY,
    event_log_id BIGINT REFERENCES factory_event_log(id),
    
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(100) NOT NULL,
    source_id BIGINT NOT NULL,
    event_payload JSONB NOT NULL,
    
    failure_reason TEXT NOT NULL,
    failure_category VARCHAR(50) NOT NULL,  -- missing_accounts, validation_error, etc.
    stack_trace TEXT,
    
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    last_retry_error TEXT,
    
    status VARCHAR(50) DEFAULT 'pending',   -- pending, in_progress, resolved, abandoned
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    voucher_id INTEGER REFERENCES vouchers(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 How It Works

### Event ID Generation

```typescript
// Event ID format: {event_type}_{source_id}_{unix_timestamp}
// Example: "order_approved_12345_1696800000"

const eventId = generate_factory_event_id(
    'order_approved',
    12345,
    new Date()
);
```

### Idempotency Check Flow

```
1. Event emitted → eventBus.emit(EVENT_NAMES.FACTORY_ORDER_APPROVED, ...)
2. Integration service receives event
3. Generate event_id from event data
4. Check: is_factory_event_processed(event_id)?
   ├─ YES → Skip processing (already done)
   └─ NO  → Continue to step 5
5. Insert event_log with status='processing'
6. Create voucher(s)
7. Update event_log:
   ├─ SUCCESS → status='completed', voucher_ids=[...]
   └─ FAILURE → status='failed', error_message, add to failed_voucher_queue
```

### Retry Mechanism with Exponential Backoff

```
Retry 0: Immediate (on failure)
Retry 1: +5 minutes  (5 * 2^1 = 5 min)
Retry 2: +10 minutes (5 * 2^2 = 10 min)
Retry 3: +20 minutes (5 * 2^3 = 20 min)
Retry 4: +40 minutes (5 * 2^4 = 40 min)
...
Max: 24 hours
```

---

## 🎯 Benefits

### ✅ Idempotency
- **Problem:** Event replayed → duplicate vouchers
- **Solution:** Check event_id before processing
- **Result:** Same event processed only once

### ✅ Fault Tolerance
- **Problem:** Voucher creation fails (network issue, missing account)
- **Solution:** Log failure, schedule retry with backoff
- **Result:** Temporary failures auto-recovered

### ✅ Visibility
- **Problem:** Can't see why vouchers fail to create
- **Solution:** Detailed error messages, categorization, stack traces
- **Result:** Finance team can quickly identify and fix issues

### ✅ Manual Resolution
- **Problem:** Persistent failures need human intervention
- **Solution:** Failed voucher queue with manual resolution UI
- **Result:** Finance can review, fix accounts, and retry

---

## 📝 Next Steps

### Service Layer Implementation (Not Yet Done)

The database schema is ready, but the service layer needs updates:

**1. Add Event Logging to Integration Service**
```typescript
class FactoryAccountsIntegrationService {
  async createCustomerOrderReceivable(orderData, userId) {
    // Generate event ID
    const eventId = `order_approved_${orderData.orderId}_${Date.now()}`;
    
    // Check idempotency
    if (await isEventProcessed(eventId)) {
      return; // Already processed
    }
    
    // Log event start
    const eventLogId = await logEventStart(eventId, 'FACTORY_ORDER_APPROVED', orderData, userId);
    
    try {
      // Create voucher
      const voucher = await ...;
      
      // Log success
      await logEventSuccess(eventLogId, [voucher.id]);
      
      return voucher;
    } catch (error) {
      // Log failure and queue for retry
      await logEventFailure(eventLogId, error);
      await addToFailedVoucherQueue(eventLogId, error);
      throw error;
    }
  }
}
```

**2. Create Retry Job**
```typescript
// Scheduled job (runs every 5 minutes)
async function processFailedVoucherQueue() {
  const failedVouchers = await getVouchersPendingRetry();
  
  for (const failed of failedVouchers) {
    if (failed.retry_count >= failed.max_retries) {
      // Mark as abandoned
      await markFailedVoucherAbandoned(failed.id);
      continue;
    }
    
    try {
      // Retry voucher creation
      const result = await retryVoucherCreation(failed);
      
      if (result.success) {
        // Mark as resolved
        await markFailedVoucherResolved(failed.id, result.voucherId);
      }
    } catch (error) {
      // Update retry count and next_retry_at
      await updateFailedVoucherRetry(failed.id, error);
    }
  }
}
```

**3. Create Finance UI**
- View failed voucher queue
- See error messages and stack traces
- Manually retry after fixing issues (e.g., creating missing accounts)
- Add resolution notes
- View event processing statistics

---

## 🧪 Testing Scenarios

### Test 1: Idempotency
1. Approve customer order
2. Event emitted, voucher created
3. Manually replay event (same order ID, timestamp)
4. Result: No duplicate voucher created

### Test 2: Automatic Retry
1. Delete "Accounts Receivable" from Chart of Accounts
2. Approve customer order
3. Voucher creation fails → Added to failed_voucher_queue
4. Re-create "Accounts Receivable" account
5. Wait for retry job (or manually trigger)
6. Result: Voucher created successfully on retry

### Test 3: Manual Resolution
1. Approve order with invalid data (e.g., negative amount)
2. Voucher creation fails → Added to failed_voucher_queue
3. Finance user opens failed voucher queue UI
4. Reviews error message
5. Manually creates correct voucher
6. Marks failed voucher as "resolved" with voucher ID
7. Result: Event log updated, no more retries

---

## 📊 Monitoring Queries

### Check Event Processing Stats
```sql
SELECT * FROM factory_event_processing_stats;
```

### View Pending Retries
```sql
SELECT * FROM failed_vouchers_pending_retry;
```

### Recent Failures
```sql
SELECT * FROM recent_failed_vouchers;
```

### Events for Specific Order
```sql
SELECT * FROM factory_event_log 
WHERE event_source = 'customer_order' 
AND source_id = 12345;
```

---

## 🚀 Summary

✅ **Database Schema Complete**
- Event log table with idempotency tracking
- Failed voucher queue with retry mechanism
- Helper functions for event ID generation and retry calculation
- Monitoring views for dashboard

⏳ **Service Layer Implementation (TODO)**
- Update integration service to log events
- Implement idempotency checks
- Create retry job/worker
- Build Finance UI for failed voucher management

📊 **Build Status**
```bash
Migration V33: ✅ Applied successfully
Tables Created: 2 (factory_event_log, failed_voucher_queue)
Views Created: 3 (monitoring views)
Functions Created: 3 (helper functions)
```

---

**Status:** ✅ Database Ready - Service Layer Implementation Next  
**Next Action:** Update `factoryAccountsIntegrationService.ts` to use event logging

