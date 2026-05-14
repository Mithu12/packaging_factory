-- =========================================
-- Migration: V137__add_machine_parts_permissions
-- Description: Adds RBAC permissions for machine parts and part replacements,
-- and grants them to the lowercase role names used in this DB (matches V128).
-- =========================================

-- Permissions
INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at) VALUES
('FACTORY_MACHINE_PARTS_READ',                'View Machine Parts',         'View parts catalog and replacement history',         'Factory', 'read',   'machine_parts',              CURRENT_TIMESTAMP),
('FACTORY_MACHINE_PARTS_CREATE',              'Create Machine Parts',       'Create new machine parts',                           'Factory', 'create', 'machine_parts',              CURRENT_TIMESTAMP),
('FACTORY_MACHINE_PARTS_UPDATE',              'Update Machine Parts',       'Update machine parts',                               'Factory', 'update', 'machine_parts',              CURRENT_TIMESTAMP),
('FACTORY_MACHINE_PARTS_DELETE',              'Delete Machine Parts',       'Delete machine parts',                               'Factory', 'delete', 'machine_parts',              CURRENT_TIMESTAMP),
('FACTORY_MACHINE_PART_REPLACEMENTS_CREATE',  'Log Part Replacements',      'Record replacement of a machine part',               'Factory', 'create', 'machine_part_replacements',  CURRENT_TIMESTAMP),
('FACTORY_MACHINE_PART_REPLACEMENTS_DELETE',  'Delete Part Replacements',   'Delete a recorded part replacement',                 'Factory', 'delete', 'machine_part_replacements',  CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.name IN (
    'FACTORY_MACHINE_PARTS_READ',
    'FACTORY_MACHINE_PARTS_CREATE',
    'FACTORY_MACHINE_PARTS_UPDATE',
    'FACTORY_MACHINE_PARTS_DELETE',
    'FACTORY_MACHINE_PART_REPLACEMENTS_CREATE',
    'FACTORY_MACHINE_PART_REPLACEMENTS_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_manager: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_manager'
AND p.name IN (
    'FACTORY_MACHINE_PARTS_READ',
    'FACTORY_MACHINE_PARTS_CREATE',
    'FACTORY_MACHINE_PARTS_UPDATE',
    'FACTORY_MACHINE_PARTS_DELETE',
    'FACTORY_MACHINE_PART_REPLACEMENTS_CREATE',
    'FACTORY_MACHINE_PART_REPLACEMENTS_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- head_of_department: read + create + update parts, log replacements
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'head_of_department'
AND p.name IN (
    'FACTORY_MACHINE_PARTS_READ',
    'FACTORY_MACHINE_PARTS_CREATE',
    'FACTORY_MACHINE_PARTS_UPDATE',
    'FACTORY_MACHINE_PART_REPLACEMENTS_CREATE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_worker: read + update parts, log replacements (can swap, can't add/delete part definitions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_worker'
AND p.name IN (
    'FACTORY_MACHINE_PARTS_READ',
    'FACTORY_MACHINE_PARTS_UPDATE',
    'FACTORY_MACHINE_PART_REPLACEMENTS_CREATE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_viewer: read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_viewer'
AND p.name = 'FACTORY_MACHINE_PARTS_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;
