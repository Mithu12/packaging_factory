# Sales Rep Module - Backend

A comprehensive Sales Representative management module for the ERP system backend, providing REST API endpoints for managing customers, orders, invoices, payments, deliveries, notifications, and reports.

## Overview

The Sales Rep module provides a complete backend solution for sales representatives to manage their customer relationships, sales processes, and business operations. The module follows the existing codebase patterns and integrates with the RBAC system for proper access control.

## Features

### 🎯 Dashboard API (`/api/salesrep/dashboard/stats`)
- Real-time sales statistics and KPIs
- Monthly performance tracking
- Recent orders and upcoming deliveries
- Unread notifications count
- Sales target vs achievement tracking

### 👥 Customer Management (`/api/salesrep/customers`)
- Complete CRUD operations for customer accounts
- Advanced filtering and search capabilities
- Credit limit and balance tracking
- Customer contact information management
- Sales rep assignment

### 📦 Order Management (`/api/salesrep/orders`)
- Order lifecycle management (Draft → Confirmed → Processing → Shipped → Delivered)
- Automatic order number generation
- Product catalog integration
- Order status updates and tracking
- Discount and tax calculations

### 🧾 Invoice Management (`/api/salesrep/invoices`)
- Invoice generation from orders
- Invoice status management (Draft → Sent → Paid → Overdue)
- Automatic invoice number generation
- Payment tracking and balance calculations
- Email integration for sending invoices

### 💳 Payment Management (`/api/salesrep/payments`)
- Payment recording and tracking
- Multiple payment methods (Cash, Bank Transfer, Cheque, Credit Card)
- Automatic invoice balance updates
- Payment reference tracking
- Payment history and reconciliation

### 🚚 Delivery Management (`/api/salesrep/deliveries`)
- Delivery scheduling and management
- Tracking number and courier integration
- Delivery status tracking (Pending → In Transit → Delivered)
- Contact information management
- Automatic order status updates

### 📊 Reports API (`/api/salesrep/reports`)
- Custom report generation based on date ranges
- Multiple report types (Sales Summary, Customer Performance, Order Analysis, Payment Collection)
- Export functionality (PDF, Excel, CSV)
- Historical report storage
- Report data analytics

### 🔔 Notifications API (`/api/salesrep/notifications`)
- System notification management
- Read/unread status tracking
- Notification categorization (Info, Warning, Error, Success)
- Related entity linking
- Bulk operations for marking as read

## File Structure

```
backend/src/modules/salesrep/
├── controllers/
│   └── salesRepController.ts    # HTTP request handlers
├── services/
│   └── salesRepService.ts       # Business logic and database operations
├── routes/
│   └── salesRep.routes.ts       # API route definitions
├── validation/
│   ├── customerValidation.ts    # Customer validation schemas
│   ├── orderValidation.ts       # Order validation schemas
│   ├── invoiceValidation.ts     # Invoice validation schemas
│   ├── paymentValidation.ts     # Payment validation schemas
│   ├── deliveryValidation.ts    # Delivery validation schemas
│   ├── notificationValidation.ts # Notification validation schemas
│   └── reportValidation.ts      # Report validation schemas
├── types.ts                     # TypeScript type definitions
├── moduleInit.ts               # Module initialization
├── index.ts                    # Module exports
└── README.md                   # This documentation
```

## Database Schema

The module creates the following tables:

### `sales_rep_customers`
- Customer account information
- Credit limits and current balances
- Sales rep assignments
- Contact details (email, phone, address)

### `sales_rep_orders`
- Order management with status tracking
- Customer relationships
- Financial calculations (discounts, taxes, totals)
- Order items relationship

### `sales_rep_order_items`
- Line items for orders
- Product information and pricing
- Quantity and discount tracking

### `sales_rep_invoices`
- Invoice generation and management
- Payment status and balance tracking
- Order relationships

### `sales_rep_payments`
- Payment recording and tracking
- Multiple payment methods
- Invoice balance updates

### `sales_rep_deliveries`
- Delivery scheduling and tracking
- Courier integration
- Status management and updates

### `sales_rep_notifications`
- System notifications
- Read/unread status
- Entity relationship tracking

### `sales_rep_reports`
- Generated report storage
- Report metadata and data
- Generation tracking

## API Endpoints

### Dashboard
```
GET /api/salesrep/dashboard/stats
```

### Customers
```
GET    /api/salesrep/customers           # List customers with filters
GET    /api/salesrep/customers/:id       # Get customer details
POST   /api/salesrep/customers           # Create new customer
PUT    /api/salesrep/customers/:id       # Update customer
DELETE /api/salesrep/customers/:id       # Delete customer
```

### Orders
```
GET    /api/salesrep/orders              # List orders with filters
GET    /api/salesrep/orders/:id          # Get order details
POST   /api/salesrep/orders              # Create new order
PUT    /api/salesrep/orders/:id          # Update order
PATCH  /api/salesrep/orders/:id/status   # Update order status
DELETE /api/salesrep/orders/:id          # Delete order
```

### Invoices
```
GET    /api/salesrep/invoices            # List invoices with filters
GET    /api/salesrep/invoices/:id        # Get invoice details
POST   /api/salesrep/invoices            # Generate invoice
POST   /api/salesrep/invoices/:id/send   # Send invoice
```

### Payments
```
GET    /api/salesrep/payments            # List payments with filters
GET    /api/salesrep/payments/:id        # Get payment details
POST   /api/salesrep/payments            # Record payment
```

### Deliveries
```
GET    /api/salesrep/deliveries          # List deliveries with filters
GET    /api/salesrep/deliveries/:id      # Get delivery details
POST   /api/salesrep/deliveries          # Schedule delivery
PUT    /api/salesrep/deliveries/:id      # Update delivery
PATCH  /api/salesrep/deliveries/:id/status # Update delivery status
```

### Notifications
```
GET    /api/salesrep/notifications       # List notifications with filters
PATCH  /api/salesrep/notifications/:id/read # Mark notification as read
PATCH  /api/salesrep/notifications/mark-all-read # Mark all as read
DELETE /api/salesrep/notifications/:id   # Delete notification
```

### Reports
```
GET    /api/salesrep/reports             # List reports with filters
POST   /api/salesrep/reports/generate    # Generate new report
GET    /api/salesrep/reports/:id/export  # Export report
```

## Permissions

The module defines 22 permissions in the `Sales Rep` module:

### Dashboard
- `sales_rep_dashboard_read` - Access to dashboard statistics

### Customer Management
- `sales_rep_customers_create` - Create customer accounts
- `sales_rep_customers_read` - View customer information
- `sales_rep_customers_update` - Update customer information
- `sales_rep_customers_delete` - Delete customer accounts

### Order Management
- `sales_rep_orders_create` - Create orders
- `sales_rep_orders_read` - View orders
- `sales_rep_orders_update` - Update orders
- `sales_rep_orders_delete` - Delete orders

### Invoice Management
- `sales_rep_invoices_create` - Generate invoices
- `sales_rep_invoices_read` - View invoices
- `sales_rep_invoices_update` - Update invoices

### Payment Management
- `sales_rep_payments_create` - Record payments
- `sales_rep_payments_read` - View payments
- `sales_rep_payments_update` - Update payments

### Delivery Management
- `sales_rep_deliveries_create` - Schedule deliveries
- `sales_rep_deliveries_read` - View deliveries
- `sales_rep_deliveries_update` - Update deliveries

### Reports
- `sales_rep_reports_read` - View reports
- `sales_rep_reports_export` - Export reports

### Notifications
- `sales_rep_notifications_read` - View notifications
- `sales_rep_notifications_update` - Update notifications

## Role Configuration

### Sales Rep Role
The `sales_rep` role is created with level 4 and includes:
- All Sales Rep module permissions
- Basic sales permissions for compatibility
- Appropriate access to view customer, order, and payment information

### Role Hierarchy
- `admin` → `sales_rep` (admin inherits all sales rep permissions)
- `executive` → `sales_rep` (executive inherits all sales rep permissions)
- `sales_staff` → inherits sales rep permissions (for existing compatibility)

## Validation

All API endpoints use comprehensive validation with the following patterns:

- **Required fields** validation
- **Data type** validation (strings, numbers, emails, dates)
- **Format validation** (email formats, date formats)
- **Business logic** validation (positive numbers, valid status values)
- **Relationship validation** (valid customer IDs, order IDs, etc.)

## Error Handling

The module follows consistent error handling patterns:

- **400 Bad Request** - Validation errors with detailed messages
- **404 Not Found** - Entity not found errors
- **500 Internal Server Error** - Database or server errors
- **Audit logging** for all operations

## Integration Points

### RBAC Integration
- All endpoints require appropriate permissions
- User context is available in all operations
- Audit logging tracks all user actions

### Database Integration
- Uses existing database connection pool
- Follows transaction patterns for data consistency
- Proper foreign key relationships
- Automatic timestamp management

### Service Integration
- Integrates with existing audit service
- Follows established logging patterns
- Compatible with existing error handling

## Migration Files

### V60_add_sales_rep_permissions.sql
- Creates all Sales Rep module permissions
- Sets up sales_rep role with appropriate permissions
- Configures role hierarchy
- Adds audit event catalog entries

### V61_add_sales_rep_tables.sql
- Creates all necessary database tables
- Sets up proper indexes for performance
- Configures foreign key relationships
- Adds database triggers for timestamp updates

## Development Notes

### Code Patterns
- Follows existing module structure patterns
- Uses consistent naming conventions
- Implements proper TypeScript typing
- Follows established validation patterns

### Database Design
- Uses `BIGSERIAL` for primary keys (as per repo rules)
- Proper foreign key relationships
- Comprehensive indexing strategy
- Audit trail support

### API Design
- RESTful endpoint structure
- Consistent response formats
- Comprehensive error handling
- Proper HTTP status codes

### Security
- Permission-based access control
- Input validation and sanitization
- SQL injection prevention
- Audit logging for compliance

## Testing Considerations

### Unit Tests
- Service layer testing
- Controller logic testing
- Validation schema testing

### Integration Tests
- API endpoint testing
- Database operation testing
- Permission testing

### Performance Tests
- Large dataset handling
- Query optimization verification
- Concurrent operation testing

## Deployment

The module is automatically initialized when the server starts:

1. **Database Check** - Verifies all tables exist
2. **Permission Check** - Confirms permissions are loaded
3. **Role Check** - Ensures sales_rep role is available
4. **Route Registration** - Registers all API endpoints

## Future Enhancements

- Email integration for invoice sending
- SMS notifications for delivery updates
- Advanced reporting with charts and graphs
- Mobile API endpoints
- Integration with external shipping APIs
- Automated payment reminders
- Customer portal integration
- Advanced analytics and forecasting

## Maintenance

- Regular permission audits
- Database performance monitoring
- API usage analytics
- Error rate monitoring
- User feedback collection

