# Database Sequences Implementation for Sales Rep Module

## Overview

This document describes the implementation of database sequences for generating unique order numbers, invoice numbers, payment numbers, and delivery numbers in the Sales Rep module.

## Benefits of Using Database Sequences

1. **Guaranteed Uniqueness**: Database sequences provide atomic, thread-safe number generation
2. **Performance**: No need to count existing records or handle race conditions
3. **Consistency**: Sequential numbering across all sales rep entities
4. **Scalability**: Handles high-concurrency scenarios without conflicts

## Implementation Details

### Database Sequences Created

The following sequences have been created in migration `V69_add_sales_rep_order_number_sequence.sql`:

1. **`sales_rep_order_number_seq`** - For order numbers (SR-YYYYMMDD-XXXX)
2. **`sales_rep_invoice_number_seq`** - For invoice numbers (INV-YYYYMMDD-XXXX)
3. **`sales_rep_payment_number_seq`** - For payment numbers (PAY-YYYYMMDD-XXXX)
4. **`sales_rep_delivery_number_seq`** - For delivery numbers (DEL-YYYYMMDD-XXXX)

### Number Format

All numbers follow the pattern: `{PREFIX}-{YYYYMMDD}-{SEQUENCE}`

- **PREFIX**: Entity type (SR, INV, PAY, DEL)
- **YYYYMMDD**: Date in YYYYMMDD format
- **SEQUENCE**: 4-digit zero-padded sequence number

Examples:

- `SR-20241201-0001` (Sales Rep Order)
- `INV-20241201-0002` (Invoice)
- `PAY-20241201-0003` (Payment)
- `DEL-20241201-0004` (Delivery)

### Migration Logic

The migration includes smart initialization logic:

1. **Sequence Creation**: Creates all four sequences with proper configuration
2. **Existing Data Handling**: Analyzes existing records to determine the next sequence value
3. **Sequence Initialization**: Sets sequences to start from the highest existing number + 1
4. **Index Creation**: Adds performance indexes for number lookups

### Code Changes

#### Before (Count-based approach):

```typescript
private async generateOrderNumber(client: any): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  const countQuery = `
    SELECT COUNT(*) as count
    FROM sales_rep_orders
    WHERE order_date::date = $1
  `;

  const countResult = await client.query(countQuery, [today]);
  const count = parseInt(countResult.rows[0].count);

  return `SR-${dateStr}-${String(count + 1).padStart(4, "0")}`;
}
```

#### After (Sequence-based approach):

```typescript
private async generateOrderNumber(client: any): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  // Get next value from sequence
  const sequenceQuery = `SELECT nextval('sales_rep_order_number_seq') as seq_num`;
  const sequenceResult = await client.query(sequenceQuery);
  const sequenceNumber = sequenceResult.rows[0].seq_num;

  return `SR-${dateStr}-${String(sequenceNumber).padStart(4, "0")}`;
}
```

## Files Modified

### Backend Files

1. **Migration**: `backend/migrations/V69_add_sales_rep_order_number_sequence.sql`

   - Creates database sequences
   - Initializes sequences based on existing data
   - Adds performance indexes

2. **Order Mediator**: `backend/src/modules/salesrep/mediators/orders/AddOrder.mediator.ts`

   - Updated `generateOrderNumber()` method to use sequence

3. **Invoice Mediator**: `backend/src/modules/salesrep/mediators/invoices/AddInvoice.mediator.ts`

   - Updated `generateInvoiceNumber()` method to use sequence

4. **Payment Mediator**: `backend/src/modules/salesrep/mediators/payments/AddPayment.mediator.ts`

   - Updated `generatePaymentNumber()` method to use sequence

5. **Delivery Mediator**: `backend/src/modules/salesrep/mediators/deliveries/AddDelivery.mediator.ts`
   - Updated `generateDeliveryNumber()` method to use sequence

## Database Schema Changes

### Sequences Created

```sql
-- Order number sequence
CREATE SEQUENCE sales_rep_order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Invoice number sequence
CREATE SEQUENCE sales_rep_invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Payment number sequence
CREATE SEQUENCE sales_rep_payment_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Delivery number sequence
CREATE SEQUENCE sales_rep_delivery_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
```

### Indexes Added

```sql
CREATE INDEX idx_sales_rep_orders_order_number ON sales_rep_orders(order_number);
CREATE INDEX idx_sales_rep_invoices_invoice_number ON sales_rep_invoices(invoice_number);
CREATE INDEX idx_sales_rep_payments_payment_number ON sales_rep_payments(payment_number);
CREATE INDEX idx_sales_rep_deliveries_delivery_number ON sales_rep_deliveries(delivery_number);
```

## Usage Examples

### Creating a New Order

```typescript
// The sequence automatically generates the next number
const order = await salesRepApi.createOrder({
  customer_id: 1,
  order_date: new Date(),
  items: [...],
  // ... other fields
});

// Result: order.order_number = "SR-20241201-0001"
```

### Creating Multiple Orders Concurrently

```typescript
// Multiple orders created simultaneously will get unique numbers
const promises = [
  salesRepApi.createOrder(orderData1),
  salesRepApi.createOrder(orderData2),
  salesRepApi.createOrder(orderData3),
];

const orders = await Promise.all(promises);
// Results:
// orders[0].order_number = "SR-20241201-0001"
// orders[1].order_number = "SR-20241201-0002"
// orders[2].order_number = "SR-20241201-0003"
```

## Performance Benefits

1. **Atomic Operations**: `nextval()` is atomic and thread-safe
2. **No Locking**: No need to lock tables during number generation
3. **Cached Values**: Sequences use caching for better performance
4. **Indexed Lookups**: Fast searches by number with dedicated indexes

## Migration Safety

The migration is designed to be safe for existing data:

1. **Non-destructive**: Only adds sequences and indexes
2. **Backward Compatible**: Existing numbers remain unchanged
3. **Smart Initialization**: Sequences start from the highest existing number
4. **Rollback Safe**: Can be rolled back without data loss

## Monitoring and Maintenance

### Sequence Status Queries

```sql
-- Check current sequence values
SELECT
  'sales_rep_order_number_seq' as sequence_name,
  last_value,
  is_called
FROM sales_rep_order_number_seq;

-- Check sequence usage
SELECT
  schemaname,
  sequencename,
  last_value,
  start_value,
  increment_by,
  max_value,
  min_value,
  cache_value,
  log_cnt,
  is_cycled,
  is_called
FROM pg_sequences
WHERE sequencename LIKE 'sales_rep_%';
```

### Performance Monitoring

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_sales_rep_%';
```

## Future Enhancements

1. **Sequence Reset**: Annual sequence reset functionality
2. **Custom Prefixes**: Configurable prefixes per entity type
3. **Branch Sequences**: Separate sequences for different branches/regions
4. **Audit Trail**: Track sequence usage and number generation
5. **Bulk Generation**: Pre-generate number ranges for offline systems

## Troubleshooting

### Common Issues

1. **Sequence Not Found**: Ensure migration V69 has been applied
2. **Permission Errors**: Verify database user has sequence access
3. **Number Gaps**: Normal behavior due to transaction rollbacks
4. **Performance Issues**: Check sequence cache settings

### Recovery Procedures

```sql
-- Reset sequence to specific value
ALTER SEQUENCE sales_rep_order_number_seq RESTART WITH 1000;

-- Check for gaps in numbering
SELECT order_number,
       ROW_NUMBER() OVER (ORDER BY created_at) as expected_seq
FROM sales_rep_orders
WHERE order_date::date = CURRENT_DATE
ORDER BY created_at;
```

This implementation provides a robust, scalable solution for generating unique numbers across all Sales Rep module entities while maintaining data integrity and performance.
