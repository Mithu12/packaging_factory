-- Migration V60: Sales Rep Module Permissions
-- Description: Adds Sales Rep module permissions, roles, and audit events to the RBAC system

-- Insert Sales Rep module permissions
INSERT INTO permissions (name, display_name, description, module, action, resource)
VALUES
    -- Dashboard Permissions
    ('sales_rep_dashboard_read', 'View Sales Rep Dashboard', 'Access to sales rep dashboard with stats and overview', 'Sales Rep', 'read', 'dashboard'),

    -- Customer Management Permissions
    ('sales_rep_customers_create', 'Create Sales Rep Customers', 'Create new customer accounts in sales rep module', 'Sales Rep', 'create', 'customers'),
    ('sales_rep_customers_read', 'View Sales Rep Customers', 'View customer information in sales rep module', 'Sales Rep', 'read', 'customers'),
    ('sales_rep_customers_update', 'Update Sales Rep Customers', 'Update customer information in sales rep module', 'Sales Rep', 'update', 'customers'),
    ('sales_rep_customers_delete', 'Delete Sales Rep Customers', 'Delete customer accounts in sales rep module', 'Sales Rep', 'delete', 'customers'),

    -- Order Management Permissions
    ('sales_rep_orders_create', 'Create Sales Rep Orders', 'Create new orders in sales rep module', 'Sales Rep', 'create', 'orders'),
    ('sales_rep_orders_read', 'View Sales Rep Orders', 'View order information in sales rep module', 'Sales Rep', 'read', 'orders'),
    ('sales_rep_orders_update', 'Update Sales Rep Orders', 'Update order information in sales rep module', 'Sales Rep', 'update', 'orders'),
    ('sales_rep_orders_delete', 'Delete Sales Rep Orders', 'Delete orders in sales rep module', 'Sales Rep', 'delete', 'orders'),

    -- Invoice Management Permissions
    ('sales_rep_invoices_create', 'Create Sales Rep Invoices', 'Generate invoices in sales rep module', 'Sales Rep', 'create', 'invoices'),
    ('sales_rep_invoices_read', 'View Sales Rep Invoices', 'View invoice information in sales rep module', 'Sales Rep', 'read', 'invoices'),
    ('sales_rep_invoices_update', 'Update Sales Rep Invoices', 'Update invoice information in sales rep module', 'Sales Rep', 'update', 'invoices'),

    -- Payment Management Permissions
    ('sales_rep_payments_create', 'Create Sales Rep Payments', 'Record payments in sales rep module', 'Sales Rep', 'create', 'payments'),
    ('sales_rep_payments_read', 'View Sales Rep Payments', 'View payment information in sales rep module', 'Sales Rep', 'read', 'payments'),
    ('sales_rep_payments_update', 'Update Sales Rep Payments', 'Update payment information in sales rep module', 'Sales Rep', 'update', 'payments'),

    -- Delivery Management Permissions
    ('sales_rep_deliveries_create', 'Create Sales Rep Deliveries', 'Schedule deliveries in sales rep module', 'Sales Rep', 'create', 'deliveries'),
    ('sales_rep_deliveries_read', 'View Sales Rep Deliveries', 'View delivery information in sales rep module', 'Sales Rep', 'read', 'deliveries'),
    ('sales_rep_deliveries_update', 'Update Sales Rep Deliveries', 'Update delivery information in sales rep module', 'Sales Rep', 'update', 'deliveries'),

    -- Reports and Analytics Permissions
    ('sales_rep_reports_read', 'View Sales Rep Reports', 'View sales rep reports and analytics', 'Sales Rep', 'read', 'reports'),
    ('sales_rep_reports_export', 'Export Sales Rep Reports', 'Export sales rep reports to PDF/Excel/CSV', 'Sales Rep', 'export', 'reports'),

    -- Notification Management Permissions
    ('sales_rep_notifications_read', 'View Sales Rep Notifications', 'View notifications in sales rep module', 'Sales Rep', 'read', 'notifications'),
    ('sales_rep_notifications_update', 'Update Sales Rep Notifications', 'Mark notifications as read in sales rep module', 'Sales Rep', 'update', 'notifications')

ON CONFLICT (name) DO NOTHING;

-- Create sales_rep role if it doesn't exist
INSERT INTO roles (name, display_name, description, level, department, is_active)
VALUES ('sales_rep', 'Sales Representative', 'Sales representative with access to customer management, orders, invoices, payments, and deliveries', 4, 'Sales', true)
ON CONFLICT (name) DO NOTHING;

-- Assign all Sales Rep permissions to sales_rep role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep'
AND p.module = 'Sales Rep'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign basic sales permissions to sales_rep role (for compatibility)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep'
AND p.name IN (
    'customers.read', 'customers.create', 'customers.update',
    'sales_orders.create', 'sales_orders.read', 'sales_orders.update',
    'invoices.read', 'invoices.create', 'invoices.update',
    'payments.create', 'payments.read', 'payments.update',
    'sales_reports.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign sales_rep permissions to admin and executive roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('admin', 'executive')
AND p.module = 'Sales Rep'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign sales_rep permissions to sales_staff role (if exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_staff'
AND p.module = 'Sales Rep'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update role hierarchy to include sales_rep role
INSERT INTO role_hierarchy (parent_role_id, child_role_id)
SELECT pr.id, cr.id
FROM roles pr, roles cr
WHERE pr.name = 'admin' AND cr.name = 'sales_rep'
ON CONFLICT (parent_role_id, child_role_id) DO NOTHING;

INSERT INTO role_hierarchy (parent_role_id, child_role_id)
SELECT pr.id, cr.id
FROM roles pr, roles cr
WHERE pr.name = 'executive' AND cr.name = 'sales_rep'
ON CONFLICT (parent_role_id, child_role_id) DO NOTHING;


-- Add comments for documentation
COMMENT ON COLUMN permissions.name IS 'Permission name in snake_case format (e.g., sales_rep_customers_read)';
COMMENT ON COLUMN permissions.display_name IS 'Human-readable permission name';
COMMENT ON COLUMN permissions.module IS 'Module name (e.g., Sales Rep, HR, Finance)';
COMMENT ON COLUMN permissions.action IS 'Action type (create, read, update, delete, manage, approve, etc.)';
COMMENT ON COLUMN permissions.resource IS 'Resource being acted upon (e.g., customers, orders, invoices)';

-- Add permission group documentation
COMMENT ON COLUMN roles.name IS 'Role name in snake_case format (e.g., sales_rep, admin, executive)';
COMMENT ON COLUMN roles.display_name IS 'Human-readable role name';
COMMENT ON COLUMN roles.level IS 'Role hierarchy level (1 = highest, 10 = lowest)';
COMMENT ON COLUMN roles.department IS 'Department this role belongs to';

