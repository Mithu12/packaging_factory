# Implementation Plan

- [x] 1. Database schema enhancements for workflow tracking
  - Add workflow-related columns to factory_customer_orders table
  - Create factory_order_workflow_history table for audit trail
  - Add database indexes for efficient querying by status and user
  - _Requirements: 1.1, 2.1, 5.1, 5.2_

- [x] 2. Enhanced order status management system
  - [x] 2.1 Update FactoryCustomerOrderStatus enum with new workflow statuses
    - Add pending_approval, approved, rejected, routed statuses
    - Update status validation logic in existing code
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [x] 2.2 Implement order status transition validation
    - Create status transition rules and validation functions
    - Prevent invalid status changes based on current state
    - _Requirements: 2.2, 2.3, 3.2_

- [x] 3. Permission system extensions for sales rep workflow
  - [x] 3.1 Add new workflow-specific permissions to PERMISSIONS constant
    - Add FACTORY_ORDERS_SUBMIT, FACTORY_ORDERS_APPROVE_WORKFLOW, FACTORY_ORDERS_ROUTE permissions
    - Update permission middleware to handle new permissions
    - _Requirements: 1.5, 2.4, 3.4_
  
  - [x] 3.2 Implement role-based order access control
    - Modify GetCustomerOrderInfoMediator to filter orders by user role
    - Sales reps see only their own orders, admins see all orders
    - _Requirements: 1.5, 4.1_

- [x] 4. Enhanced order creation workflow for sales representatives
  - [x] 4.1 Modify AddCustomerOrderMediator for role-based order creation
    - Set order status to pending_approval for sales reps
    - Generate SR- prefixed order numbers for sales rep orders
    - Record submitted_by and submitted_at fields
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 4.2 Update order validation to restrict sales rep capabilities
    - Prevent sales reps from setting factory_id during creation
    - Validate that sales reps can only create orders, not approve
    - _Requirements: 1.5_

- [x] 5. Admin approval and rejection workflow implementation
  - [x] 5.1 Enhance existing approval mediator for workflow management
    - Update UpdateCustomerOrderInfoMediator.approveOrder method
    - Add rejection capability with mandatory rejection_reason
    - Record approved_by/approved_at or rejection details
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 5.2 Create workflow history tracking system
    - Implement OrderWorkflowHistoryMediator for audit trail
    - Log all status changes with user, timestamp, and notes
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Factory routing system for approved orders
  - [x] 6.1 Implement factory assignment functionality
    - Create factory routing method in UpdateCustomerOrderInfoMediator
    - Validate factory selection and update order status to routed
    - Record routed_by and routed_at fields
    - _Requirements: 3.1, 3.2, 3.4_
  
  - [x] 6.2 Add factory capacity validation
    - Create factory capacity checking utility
    - Display warnings for over-capacity factory assignments
    - _Requirements: 3.5_

- [x] 7. API endpoint enhancements for workflow support
  - [x] 7.1 Update existing customer order routes with role-based access
    - Modify GET /api/factory/customer-orders to filter by user role
    - Enhance POST /api/factory/customer-orders for workflow status setting
    - Update existing approval endpoint for rejection capability
    - _Requirements: 1.5, 2.1, 2.3, 4.1_
  
  - [x] 7.2 Add factory routing endpoint functionality
    - Create or enhance endpoint for factory assignment
    - Add validation for factory routing permissions
    - _Requirements: 3.1, 3.4_

- [x] 8. Frontend role-based UI modifications
  - [x] 8.1 Update existing order list component with workflow status filters
    - Add pending_approval, approved, rejected, routed status filters
    - Implement role-based visibility (sales reps see own orders only)
    - Enhance status badges with new workflow states
    - _Requirements: 4.1, 4.2_
  
  - [x] 8.2 Enhance existing order detail view with approval actions
    - Add approve/reject buttons for admin users
    - Add factory routing dropdown for approved orders
    - Display workflow history in existing order detail modal
    - _Requirements: 2.1, 2.5, 3.1, 4.3_
  
  - [x] 8.3 Modify existing order creation form for sales rep restrictions
    - Hide factory selection field for sales rep users
    - Add role-based field validation and restrictions
    - Update form submission to handle workflow status
    - _Requirements: 1.1, 1.3, 4.4_

- [ ] 9. Notification system integration for status updates
  - [ ] 9.1 Implement order status change notifications
    - Create notification service for workflow status changes
    - Send notifications to sales reps when orders are approved/rejected
    - Notify factory managers when orders are routed to their factory
    - _Requirements: 2.5, 4.2_
  
  - [ ]* 9.2 Add email notification templates for workflow events
    - Create email templates for approval, rejection, and routing notifications
    - Integrate with existing notification infrastructure
    - _Requirements: 2.5, 4.2_

- [ ] 10. Enhanced audit trail and reporting
  - [ ] 10.1 Implement comprehensive workflow audit logging
    - Enhance existing audit middleware for workflow events
    - Log all approval, rejection, and routing actions
    - Create audit reports for workflow compliance
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 10.2 Create workflow analytics and reporting dashboard
    - Add workflow metrics to existing dashboard
    - Track approval times, rejection rates, and processing efficiency
    - _Requirements: 5.4_

- [ ] 11. Integration testing and validation
  - [ ] 11.1 Test complete sales rep to factory workflow
    - Verify end-to-end order creation, approval, and routing process
    - Test role-based access controls and permissions
    - Validate workflow history and audit trail accuracy
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_
  
  - [ ]* 11.2 Performance testing for workflow queries
    - Test database query performance with workflow filters
    - Validate efficient loading of role-based order lists
    - _Requirements: 4.1_

- [ ] 12. Documentation and deployment preparation
  - [ ] 12.1 Update API documentation for workflow endpoints
    - Document new workflow-related API parameters and responses
    - Update existing endpoint documentation with role-based behavior
    - _Requirements: All requirements_
  
  - [ ]* 12.2 Create user training materials for new workflow
    - Document sales rep order creation process
    - Create admin approval workflow guide
    - _Requirements: 1.1, 2.1, 3.1_