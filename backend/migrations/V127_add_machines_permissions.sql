-- =========================================
-- Migration: V127_add_machines_permissions
-- Description: Adds RBAC permissions for factory machines + maintenance logs
-- =========================================

-- Machine Permissions
INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at) VALUES
('FACTORY_MACHINES_READ',   'View Machines',   'View machines and maintenance logs', 'Factory', 'read',   'machines', CURRENT_TIMESTAMP),
('FACTORY_MACHINES_CREATE', 'Create Machines', 'Create new machines',                'Factory', 'create', 'machines', CURRENT_TIMESTAMP),
('FACTORY_MACHINES_UPDATE', 'Update Machines', 'Update machines and add maintenance logs', 'Factory', 'update', 'machines', CURRENT_TIMESTAMP),
('FACTORY_MACHINES_DELETE', 'Delete Machines', 'Delete machines',                    'Factory', 'delete', 'machines', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- Assign Permissions to Existing Roles
-- =========================================

-- Admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_CREATE',
    'FACTORY_MACHINES_UPDATE',
    'FACTORY_MACHINES_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Manager: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Manager'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_CREATE',
    'FACTORY_MACHINES_UPDATE',
    'FACTORY_MACHINES_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Supervisor: read, create, update (no delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Supervisor'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_CREATE',
    'FACTORY_MACHINES_UPDATE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Worker: read and update (so they can log maintenance without managing machines)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Worker'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_UPDATE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
