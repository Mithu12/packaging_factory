# Design Document

## Overview

This design transforms the existing factory customer order system from an admin-centric workflow to a sales representative initiated workflow with administrative approval and factory routing. The solution leverages the existing RBAC system, order management infrastructure, and audit capabilities while introducing new workflow states and permissions.

## Architecture

### High-Level Flow
```
Sales Rep Creates Order → Admin Reviews & Approves → Admin Routes to Factory → Factory Processes Order
```

### System Components
- **Sales Rep Interface**: Enhanced order creation with restricted permissions
- **Admin Approval Dashboard**: New approval workflow interface
- **Factory Routing System**: Factory assignment and workload management
- **Notification System**: Status change notifications
- **Audit Trail**: Enhanced logging for approval workflow

## Components and Interfaces

### 1. Enhanced Order Status Management

#### New Order Statuses
- `pending_approval`: Orders created by sales reps awaiting admin review
- `approved`: Orders approved by admin, ready for factory routing
- `rejected`: Orders rejected by admin with rejection notes
- `routed`: Orders assigned to specific factory for production

#### Status Transition Rules
```
draft → pending_approval (Sales Rep submits)
pending_approval → approved (Admin approves)
pending_approval → rejected (Admin rejects)
approved → routed (Admin assigns factory)
routed → in_production (Factory starts work)
```

### 2. Permission System Extensions

#### New Permissions
- `FACTORY_ORDERS_SUBMIT`: Sales reps can create and submit orders
- `FACTORY_ORDERS_APPROVE_WORKFLOW`: Admins can approve/reject orders
- `FACTORY_ORDERS_ROUTE`: Admins can assign orders to factories
- `FACTORY_ORDERS_VIEW_OWN`: Sales reps can view their own orders only

#### Role-Based Access Control
- **Sales Representatives**: Create, view own orders, submit for approval
- **Admins/Managers**: View all orders, approve/reject, route to factories
- **Factory Staff**: View routed orders for their factory

### 3. Database Schema Enhancements

#### Order Table Modifications
```sql
ALTER TABLE factory_customer_orders ADD COLUMN IF NOT EXISTS:
- submitted_by INTEGER REFERENCES users(id)
- submitted_at TIMESTAMP
- approved_by INTEGER REFERENCES users(id) 
- approved_at TIMESTAMP
- rejection_reason TEXT
- routed_by INTEGER REFERENCES users(id)
- routed_at TIMESTAMP
- order_prefix VARCHAR(10) DEFAULT 'ORD'
```

#### Order Workflow History Table
```sql
CREATE TABLE factory_order_workflow_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES factory_customer_orders(id),
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  metadata JSONB
);
```

### 4. API Endpoints Design (Enhancing Existing Endpoints)

#### Enhanced Existing Endpoints
- `GET /api/factory/customer-orders` - Add role-based filtering (sales reps see only own orders)
- `POST /api/factory/customer-orders` - Enhanced with automatic status setting based on user role
- `POST /api/factory/customer-orders/:id/approve` - Enhanced existing approval endpoint
- `PUT /api/factory/customer-orders/:id` - Add role-based edit restrictions

#### Minimal New Endpoints (Only if Required)
- `POST /api/factory/customer-orders/:id/submit` - Submit draft order for approval (if needed)
- `POST /api/factory/customer-orders/:id/reject` - Reject with reason (enhance existing approve endpoint)
- `POST /api/factory/customer-orders/:id/route` - Factory assignment (could use existing update endpoint)

### 5. Frontend Components (Leveraging Existing UIs)

#### Enhanced Existing Order Management Interface
- **Order List View**: Add status filters for `pending_approval`, `approved`, `rejected`, `routed`
- **Order Creation Form**: Existing form with role-based field restrictions for sales reps
- **Order Detail View**: Enhanced with approval/rejection actions for admins
- **Factory Selection**: Utilize existing factory dropdown in order form for routing

#### Role-Based UI Modifications
- **Sales Rep View**: Hide admin-only actions, show only own orders by default
- **Admin View**: Add approval/rejection buttons to existing order detail modal
- **Factory Routing**: Use existing factory assignment field with enhanced validation
- **Status Indicators**: Enhance existing status badges with new workflow states

## Data Models

### Enhanced Order Model
```typescript
interface FactoryCustomerOrderWorkflow extends FactoryCustomerOrder {
  // Workflow fields
  submitted_by?: number;
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  routed_by?: number;
  routed_at?: string;
  order_prefix: string;
  
  // Computed fields
  workflow_history?: OrderWorkflowHistory[];
  can_edit?: boolean;
  can_approve?: boolean;
  can_route?: boolean;
}

interface OrderWorkflowHistory {
  id: number;
  order_id: number;
  from_status: string;
  to_status: string;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  notes?: string;
  metadata?: Record<string, any>;
}
```

### Factory Capacity Model
```typescript
interface FactoryCapacity {
  factory_id: number;
  factory_name: string;
  current_orders: number;
  capacity_utilization: number;
  estimated_completion_date: string;
  active_work_orders: number;
  available_production_lines: number;
}
```

## Error Handling

### Validation Rules
- Sales reps can only create orders, not approve or route
- Orders can only be edited in `draft` or `pending_approval` status
- Factory assignment requires active factory with available capacity
- Rejection requires mandatory reason text

### Error Scenarios
- **Insufficient Permissions**: Clear error messages for role-based restrictions
- **Invalid Status Transitions**: Prevent invalid workflow state changes
- **Factory Capacity**: Warning when routing to over-capacity factories
- **Concurrent Modifications**: Optimistic locking for order updates

## Testing Strategy

### Unit Tests
- Order status transition validation
- Permission checking for different user roles
- Order number generation with prefixes
- Workflow history tracking

### Integration Tests
- End-to-end order approval workflow
- Factory routing with capacity checks
- Notification delivery for status changes
- Audit trail completeness

### User Acceptance Tests
- Sales rep order creation and submission
- Admin approval/rejection workflows
- Factory order processing
- Cross-role permission validation

## Implementation Phases

### Phase 1: Core Workflow Infrastructure
- Database schema updates
- Enhanced order status management
- Basic permission extensions
- Workflow history tracking

### Phase 2: API and Business Logic
- New mediator classes for workflow operations
- Enhanced controller methods
- Permission middleware updates
- Validation rule implementations

### Phase 3: Frontend Integration
- Role-based UI modifications to existing order management interface
- Enhanced status filters and indicators in existing order list
- Approval/rejection actions in existing order detail view
- Factory routing enhancements in existing order form

### Phase 4: Advanced Features
- Bulk operations for admins
- Factory capacity management
- Advanced reporting and analytics
- Performance optimizations

## Security Considerations

- **Role-Based Access**: Strict enforcement of sales rep vs admin permissions
- **Data Isolation**: Sales reps can only access their own orders
- **Audit Compliance**: Complete workflow history for regulatory requirements
- **Input Validation**: Comprehensive validation for all workflow transitions
- **Factory Access Control**: Users can only route to factories they have access to

## Performance Considerations

- **Database Indexing**: Indexes on status, submitted_by, factory_id for efficient queries
- **Caching Strategy**: Cache factory capacity data and user permissions
- **Pagination**: Efficient pagination for large order lists
- **Background Processing**: Async notification delivery
- **Query Optimization**: Optimized queries for dashboard data aggregation