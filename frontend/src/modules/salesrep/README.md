# Sales Rep Module

A comprehensive Sales Representative management module for the ERP system, providing tools for managing customers, orders, invoices, payments, deliveries, and reports.

## Features

### 🎯 Dashboard (`/sr/dashboard`)
- Real-time sales statistics and KPIs
- Recent orders and upcoming deliveries
- Quick action buttons for common tasks
- Performance tracking against monthly targets
- Notification summary

### 👥 Customers (`/sr/customers`)
- Customer management with CRUD operations
- Advanced filtering and search capabilities
- Credit limit and balance tracking
- Customer contact information management
- Bulk operations support

### 📦 Orders (`/sr/orders`)
- Order creation and management
- Order status tracking (Draft, Confirmed, Processing, Shipped, Delivered, Cancelled)
- Product catalog integration
- Discount and pricing management
- Order history and modifications

### 🧾 Invoices (`/sr/invoices`)
- Invoice generation from orders
- Invoice status management (Draft, Sent, Paid, Overdue, Cancelled)
- Payment tracking and balance management
- Invoice document generation
- Email integration for sending invoices

### 💳 Payments (`/sr/payments`)
- Payment recording and tracking
- Multiple payment methods (Cash, Bank Transfer, Cheque, Credit Card)
- Payment history and reconciliation
- Outstanding payment management
- Payment method analytics

### 🚚 Deliveries (`/sr/deliveries`)
- Delivery scheduling and management
- Tracking number and courier integration
- Delivery status tracking (Pending, In Transit, Delivered, Cancelled)
- Contact information management
- Delivery history and updates

### 📊 Reports (`/sr/reports`)
- Sales performance reports
- Customer analysis reports
- Order and payment analytics
- Custom date range reporting
- Export functionality (PDF, Excel, CSV)

### 🔔 Notifications (`/sr/notifications`)
- Real-time notification system
- Notification categorization (Info, Warning, Error, Success)
- Read/unread status management
- Notification history
- Bulk mark as read functionality

## File Structure

```
src/modules/salesrep/
├── components/          # Reusable UI components
├── pages/              # Page components
│   ├── SalesRepDashboard.tsx
│   ├── SalesRepCustomers.tsx
│   ├── SalesRepOrders.tsx
│   ├── SalesRepInvoices.tsx
│   ├── SalesRepPayments.tsx
│   ├── SalesRepDeliveries.tsx
│   ├── SalesRepReports.tsx
│   └── SalesRepNotifications.tsx
├── services/           # API services
│   └── salesrep-api.ts
├── types/              # TypeScript type definitions
│   └── types.ts
├── index.ts           # Module exports
└── README.md          # This documentation
```

## API Integration

The module uses the `salesRepApi` service for backend communication:

```typescript
import { salesRepApi } from '@/modules/salesrep';

// Get dashboard stats
const stats = await salesRepApi.getDashboardStats();

// Get customers with filters
const customers = await salesRepApi.getCustomers(
  { search: 'john', city: 'New York' },
  { page: 1, limit: 10 }
);

// Create new customer
const newCustomer = await salesRepApi.createCustomer(customerData);
```

## Permissions

The module uses RBAC (Role-Based Access Control) with the following permissions:

- `SALES_REP_DASHBOARD_READ` - Access to dashboard
- `SALES_REP_CUSTOMERS_*` - Customer management permissions
- `SALES_REP_ORDERS_*` - Order management permissions
- `SALES_REP_INVOICES_*` - Invoice management permissions
- `SALES_REP_PAYMENTS_*` - Payment management permissions
- `SALES_REP_DELIVERIES_*` - Delivery management permissions
- `SALES_REP_REPORTS_*` - Reports access and export
- `SALES_REP_NOTIFICATIONS_*` - Notifications management

## Navigation

All pages are accessible through the sidebar navigation under the "Sales Rep" section:

- Dashboard: `/sr/dashboard`
- Customers: `/sr/customers`
- Orders: `/sr/orders`
- Invoices & Payments: `/sr/invoices`
- Payments: `/sr/payments`
- Deliveries: `/sr/deliveries`
- Reports: `/sr/reports`
- Notifications: `/sr/notifications`

## Backend Integration

The module expects the following backend endpoints:

- `GET /api/salesrep/dashboard/stats` - Dashboard statistics
- `GET /api/salesrep/customers` - Customer listing with filters
- `POST /api/salesrep/customers` - Create customer
- `PUT /api/salesrep/customers/:id` - Update customer
- `DELETE /api/salesrep/customers/:id` - Delete customer
- `GET /api/salesrep/orders` - Order listing with filters
- `POST /api/salesrep/orders` - Create order
- `PUT /api/salesrep/orders/:id` - Update order
- `DELETE /api/salesrep/orders/:id` - Delete order
- And similar endpoints for invoices, payments, deliveries, reports, and notifications

## Database Schema

The module expects the following database tables:

- `sales_rep_customers` - Customer information
- `sales_rep_orders` - Order management
- `sales_rep_order_items` - Order line items
- `sales_rep_invoices` - Invoice management
- `sales_rep_payments` - Payment tracking
- `sales_rep_deliveries` - Delivery management
- `sales_rep_notifications` - Notification system
- `sales_rep_reports` - Generated reports

## Future Enhancements

- Real-time notifications with WebSocket integration
- Advanced reporting with charts and graphs
- Mobile-responsive design improvements
- Integration with external shipping APIs
- Automated email notifications
- Document template customization
- Advanced customer analytics
- Sales forecasting features

## Development Notes

- All components follow the existing UI design patterns
- API calls use React Query for caching and state management
- Forms include comprehensive validation
- Tables support pagination and filtering
- Components are fully typed with TypeScript
- Error handling follows established patterns
- Loading states are implemented throughout
