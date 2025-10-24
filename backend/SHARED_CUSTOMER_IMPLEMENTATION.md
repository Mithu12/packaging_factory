# Shared Customer Implementation

## Overview

This implementation enables customer sharing between the factory and sales-rep modules when both modules are available. When both modules are present, customers are shared between them, allowing seamless customer management across both business functions.

## Key Features

### 1. Module Detection

- The system automatically detects when both factory and sales-rep modules are available
- Uses the module registry to check module availability
- Falls back to module-specific customer management when only one module is available

### 2. Shared Customer Service

- **Location**: `backend/src/services/sharedCustomerService.ts`
- Provides unified customer management across both modules
- Handles data mapping between different customer table structures
- Supports both factory and sales-rep specific fields

### 3. Database Schema Updates

- **Migration**: `V62_add_shared_customer_support.sql`
- Adds cross-module fields to both customer tables
- Creates indexes for better performance
- Provides a unified view for shared customers

### 4. Controller Updates

- **Factory Controller**: `backend/src/modules/factory/controllers/customers.controller.ts`
- **Sales-Rep Controller**: `backend/src/modules/salesrep/controllers/salesRepController.ts`
- Both controllers now check for module availability and use shared service when appropriate

### 5. Frontend Indicators

- **Sales-Rep Customers Page**: `frontend/src/modules/salesrep/pages/SalesRepCustomers.tsx`
- Shows "Shared with Factory" badge when customers are shared
- Indicates shared status in both header and individual customer rows

## Implementation Details

### Database Changes

#### Factory Customers Table Additions

```sql
ALTER TABLE factory_customers
  ADD COLUMN city VARCHAR(100),
  ADD COLUMN state VARCHAR(100),
  ADD COLUMN postal_code VARCHAR(20),
  ADD COLUMN current_balance DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN sales_rep_id INTEGER REFERENCES users(id);
```

#### Sales-Rep Customers Table Additions

```sql
ALTER TABLE sales_rep_customers
  ADD COLUMN company VARCHAR(255),
  ADD COLUMN payment_terms VARCHAR(50) DEFAULT 'net_30',
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN total_order_value DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN total_paid_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN total_outstanding_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN order_count INTEGER DEFAULT 0;
```

### Shared Customer Service

The `SharedCustomerService` provides:

1. **Unified Customer Interface**: Single interface for both module types
2. **Automatic Module Detection**: Checks which modules are available
3. **Data Mapping**: Handles differences between table structures
4. **Cross-Module Operations**: Creates/updates customers in both tables when needed

### API Behavior

#### When Both Modules Available

- Factory customers API returns shared customers with sales-rep data
- Sales-rep customers API returns shared customers with factory data
- New customers are created in factory_customers (primary) and optionally in sales_rep_customers
- Updates are synchronized across both tables

#### When Only One Module Available

- Falls back to module-specific customer management
- No shared functionality, works as before

### Frontend Changes

- **Shared Indicator**: Shows when customers are shared between modules
- **Visual Feedback**: Badges and indicators inform users about shared status
- **Seamless Experience**: No changes to user workflow, just additional information

## Usage Examples

### Creating a Shared Customer

```typescript
// When both modules are available
const customer = await sharedCustomerService.createCustomer({
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  company: "Acme Corp",
  city: "New York",
  state: "NY",
  postal_code: "10001",
  credit_limit: 10000,
  sales_rep_id: 123,
});
```

### Querying Shared Customers

```typescript
// Returns customers from both modules with unified data
const customers = await sharedCustomerService.getAllCustomers();
```

## Benefits

1. **Unified Customer Management**: Single source of truth for customer data
2. **Cross-Module Visibility**: Factory and sales-rep teams see the same customers
3. **Data Consistency**: Prevents duplicate customers across modules
4. **Backward Compatibility**: Works with existing single-module setups
5. **Automatic Detection**: No manual configuration required

## Migration Notes

- Run migration `V62_add_shared_customer_support.sql` to add shared customer support
- Existing customers will continue to work as before
- New customers will be shared when both modules are available
- No data loss or breaking changes

## Testing

To test the shared customer functionality:

1. Ensure both factory and sales-rep modules are available
2. Create a customer through either module's API
3. Verify the customer appears in both modules
4. Check that updates are synchronized across modules
5. Verify frontend shows shared indicators

## Future Enhancements

- Customer synchronization triggers
- Conflict resolution for simultaneous updates
- Customer merge functionality
- Advanced filtering for shared vs module-specific customers
