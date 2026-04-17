-- =========================================
-- Migration: V128_grant_machines_permissions_to_roles
-- Description: Grant FACTORY_MACHINES_* permissions to the actual lowercase role
-- names used in this DB (V127 used Title Case that matched zero roles).
-- =========================================

-- admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_CREATE',
    'FACTORY_MACHINES_UPDATE',
    'FACTORY_MACHINES_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_manager: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_manager'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_CREATE',
    'FACTORY_MACHINES_UPDATE',
    'FACTORY_MACHINES_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- head_of_department: read + create + update (supervisor-like)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'head_of_department'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_CREATE',
    'FACTORY_MACHINES_UPDATE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_worker: read + update (log maintenance, can't create/delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_worker'
AND p.name IN (
    'FACTORY_MACHINES_READ',
    'FACTORY_MACHINES_UPDATE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_viewer: read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_viewer'
AND p.name = 'FACTORY_MACHINES_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;
