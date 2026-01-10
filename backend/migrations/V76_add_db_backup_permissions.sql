-- Migration V76: Add DB Backup Permissions
-- Description: Adds database backup management permissions and assigns them to the admin role

-- Insert backup permission
INSERT INTO permissions (name, display_name, description, module, action, resource)
VALUES (
    'system_manage_backup', 
    'Manage Database Backups', 
    'Ability to create, download, and restore database backups', 
    'System', 
    'manage', 
    'backup'
)
ON CONFLICT (name) DO NOTHING;

-- Assign backup permission to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.name = 'system_manage_backup'
ON CONFLICT (role_id, permission_id) DO NOTHING;
