# Sales Rep Draft Order Approval Workflow

## Overview

This document describes the implementation of the draft order approval workflow for the Sales Rep module that allows draft orders to be submitted for admin approval, with admin selecting factories during approval, and factory managers accepting orders.

## Workflow Steps

### 1. Draft Order Creation

- Sales representatives create orders in `draft` status
- Orders remain in draft status until submitted for approval
- Sales reps can modify draft orders before submission

### 2. Submission for Admin Approval

- Sales representatives can submit draft orders for admin approval
- Status changes from `draft` to `submitted_for_approval`
- Endpoint: `POST /api/salesrep/orders/:id/submit-for-approval`
- Permission: `SALES_REP_ORDERS_CREATE`

### 3. Admin Approval/Rejection

- Admins can approve or reject submitted orders
- **When approving**: Admin must select a factory for the order
- **When rejecting**: Admin can provide a rejection reason
- Status changes to `approved` or `rejected`
- Endpoint: `POST /api/salesrep/orders/:id/admin-approve`
- Permission: `SALES_REP_ORDERS_UPDATE`

### 4. Factory Manager Acceptance

- Factory managers can accept or reject approved orders assigned to their factory
- **When accepting**: Order moves to `factory_accepted` status
- **When rejecting**: Order moves to `rejected` status with reason
- Endpoint: `POST /api/salesrep/orders/:id/factory-accept`
- Permission: `SALES_REP_ORDERS_UPDATE`

## Database Changes

### New Status Values

- `submitted_for_approval` - Order submitted for admin approval
- `approved` - Order approved by admin
- `factory_accepted` - Order accepted by factory manager

### New Columns Added to `sales_rep_orders`

- `submitted_for_approval_at` - When order was submitted for approval
- `submitted_for_approval_by` - User who submitted the order
- `admin_approved_by` - Admin who approved/rejected the order
- `admin_approved_at` - When admin made the decision
- `admin_rejection_reason` - Reason for admin rejection
- `assigned_factory_id` - Factory assigned by admin during approval
- `factory_manager_accepted_by` - Factory manager who accepted the order
- `factory_manager_accepted_at` - When factory manager accepted
- `factory_manager_rejection_reason` - Reason for factory manager rejection

## API Endpoints

### Submit Draft Order for Approval

```
POST /api/salesrep/orders/:id/submit-for-approval
```

**Request Body:** None (order_id from URL)
**Response:** Updated order object

### Admin Approval/Rejection

```
POST /api/salesrep/orders/:id/admin-approve
```

**Request Body:**

```json
{
  "approved": true,
  "assigned_factory_id": 1,
  "rejection_reason": "Optional reason for rejection"
}
```

### Factory Manager Acceptance

```
POST /api/salesrep/orders/:id/factory-accept
```

**Request Body:**

```json
{
  "accepted": true,
  "rejection_reason": "Optional reason for rejection"
}
```

## Frontend Components

### OrderApprovalWorkflow Component

A React component that provides the UI for the approval workflow:

- **Props:**

  - `order`: The order object
  - `onOrderUpdated`: Callback when order is updated
  - `userRole`: Current user's role ('admin', 'factory_manager', 'sales_rep')
  - `availableFactories`: List of available factories for admin selection

- **Features:**
  - Status badges showing current workflow state
  - Action buttons based on user role and order status
  - Dialogs for approval/rejection with factory selection
  - Real-time status updates

## User Roles and Permissions

### Sales Representative

- Can create draft orders
- Can submit draft orders for approval
- Cannot approve or reject orders

### Admin

- Can approve/reject submitted orders
- Must select factory when approving
- Can provide rejection reasons

### Factory Manager

- Can accept/reject orders assigned to their factory
- Can provide rejection reasons
- Cannot approve orders from other factories

## Status Flow

```
draft → submitted_for_approval → approved → factory_accepted → confirmed → processing → shipped → delivered
  ↓           ↓                    ↓
rejected ← rejected ← rejected
```

## Implementation Files

### Backend

- `backend/migrations/V68_add_sales_rep_draft_order_approval_workflow.sql` - Database migration
- `backend/src/modules/salesrep/mediators/orders/OrderApprovalWorkflow.mediator.ts` - Business logic
- `backend/src/modules/salesrep/controllers/salesRepController.ts` - API controllers
- `backend/src/modules/salesrep/routes/salesRep.routes.ts` - Route definitions
- `backend/src/modules/salesrep/validation/orderValidation.ts` - Validation schemas
- `backend/src/modules/salesrep/types.ts` - Type definitions

### Frontend

- `frontend/src/modules/salesrep/types.ts` - Type definitions
- `frontend/src/modules/salesrep/services/salesrep-api.ts` - API service methods
- `frontend/src/modules/salesrep/components/OrderApprovalWorkflow.tsx` - React component

## Usage Example

```typescript
// Submit draft order for approval
const updatedOrder = await salesRepApi.submitDraftOrderForApproval(orderId);

// Admin approval with factory selection
const approvedOrder = await salesRepApi.adminApproveOrder(orderId, {
  approved: true,
  assigned_factory_id: 1,
});

// Factory manager acceptance
const acceptedOrder = await salesRepApi.factoryManagerAcceptOrder(orderId, {
  accepted: true,
});
```

## Security Considerations

- All endpoints require authentication
- Role-based permissions control access to different actions
- Factory managers can only access orders assigned to their factory
- Audit logging tracks all approval actions
- Input validation prevents invalid data submission

## Integration with Existing Sales Rep Module

The approval workflow integrates seamlessly with the existing Sales Rep module:

- **Order Management**: Extends existing order status flow
- **Customer Management**: No changes to customer functionality
- **Invoice Management**: Approved orders can proceed to invoice generation
- **Payment Management**: No changes to payment processing
- **Delivery Management**: Factory accepted orders can proceed to delivery

## Future Enhancements

- Email notifications for status changes
- Bulk approval/rejection capabilities
- Approval history tracking
- Integration with work order generation
- Dashboard for tracking approval metrics
- Mobile app support for factory managers
