-- V19: Add Factory-specific RBAC roles
-- This migration adds factory manager and factory worker roles with appropriate permissions

-- Insert factory-specific roles
INSERT INTO roles (name, display_name, description, level, department) VALUES
-- Factory Manager role (level 3 - same as manager)
('factory_manager', 'Factory Manager', 'Can manage all aspects of assigned factories including orders, production, and staff', 3, 'Factory'),
-- Factory Worker role (level 2 - same as employee)
('factory_worker', 'Factory Worker', 'Can view and update factory orders and production data for assigned factories', 2, 'Factory'),
-- Factory Viewer role (level 1 - read-only access)
('factory_viewer', 'Factory Viewer', 'Read-only access to factory data for assigned factories', 1, 'Factory')
ON CONFLICT (name) DO NOTHING;

-- Get role IDs for factory roles
DO $$
DECLARE
    factory_manager_role_id INTEGER;
    factory_worker_role_id INTEGER;
    factory_viewer_role_id INTEGER;
BEGIN
    -- Get role IDs
    SELECT id INTO factory_manager_role_id FROM roles WHERE name = 'factory_manager';
    SELECT id INTO factory_worker_role_id FROM roles WHERE name = 'factory_worker';
    SELECT id INTO factory_viewer_role_id FROM roles WHERE name = 'factory_viewer';

    -- Insert factory-specific permissions for factory_manager role
    INSERT INTO role_permissions (role_id, permission_id) VALUES
    -- Customer order permissions (full access)
    (factory_manager_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.read')),
    (factory_manager_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.create')),
    (factory_manager_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.update')),
    (factory_manager_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.approve')),
    (factory_manager_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.delete'))
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Insert factory-specific permissions for factory_worker role
    INSERT INTO role_permissions (role_id, permission_id) VALUES
    -- Customer order permissions (limited to read and update)
    (factory_worker_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.read')),
    (factory_worker_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.update'))
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Insert factory-specific permissions for factory_viewer role
    INSERT INTO role_permissions (role_id, permission_id) VALUES
    -- Read-only permissions for customer orders
    (factory_viewer_role_id, (SELECT id FROM permissions WHERE name = 'factory_customer_orders.read'))
    ON CONFLICT (role_id, permission_id) DO NOTHING;

END $$;

-- Add comments for documentation
COMMENT ON COLUMN roles.department IS 'Department categorization for roles - Factory roles are tagged with "Factory"';
COMMENT ON COLUMN roles.level IS 'Role hierarchy level - higher numbers indicate more permissions';
