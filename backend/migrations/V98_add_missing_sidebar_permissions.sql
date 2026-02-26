-- Migration V98: Add Missing Sidebar Permissions
-- Description: Adds permissions for dashboards (System, Ecommerce, HR) and factory management.

-- Insert missing dashboard permissions
INSERT INTO permissions (name, display_name, description, module, action, resource)
VALUES
    ('system_dashboard_read', 'View System Dashboard', 'Can view the main system executive dashboard', 'System', 'read', 'dashboard'),
    ('ecommerce_dashboard_read', 'View Ecommerce Dashboard', 'Can view the ecommerce dashboard', 'Ecommerce', 'read', 'dashboard'),
    ('hrm_dashboard_read', 'View HR Dashboard', 'Can view the HRM dashboard', 'HR', 'read', 'dashboard'),
    ('factory_management_read', 'View Factory Management', 'Can view factory management and settings', 'Factory', 'read', 'factories')
ON CONFLICT (name) DO NOTHING;

-- Assign new permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.name IN (
    'system_dashboard_read',
    'ecommerce_dashboard_read',
    'hrm_dashboard_read',
    'factory_management_read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign HR dashboard to hr_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager'
AND p.name = 'hrm_dashboard_read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign Ecommerce dashboard to sales_staff and relevant roles if they exist
-- For now, focused on admin and manager roles
