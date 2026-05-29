-- =========================================
-- Migration: V154__add_plates_permissions
-- Description: Adds RBAC permissions for plates and plate types, and grants them
-- to the lowercase role names used in this DB (matches V137).
-- Recording plate usage happens inside production-run completion and is gated by
-- the existing FACTORY_PRODUCTION_RUNS_UPDATE permission, so it adds none here.
-- =========================================

-- Permissions
INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at) VALUES
('FACTORY_PLATES_READ',         'View Plates',         'View plates and their usage/breakage history', 'Factory', 'read',   'plates',       CURRENT_TIMESTAMP),
('FACTORY_PLATES_CREATE',       'Create Plates',       'Register new physical plates',                 'Factory', 'create', 'plates',       CURRENT_TIMESTAMP),
('FACTORY_PLATES_UPDATE',       'Update Plates',       'Update plates (retire, edit details)',         'Factory', 'update', 'plates',       CURRENT_TIMESTAMP),
('FACTORY_PLATES_DELETE',       'Delete Plates',       'Delete plates',                                'Factory', 'delete', 'plates',       CURRENT_TIMESTAMP),
('FACTORY_PLATE_TYPES_READ',    'View Plate Types',    'View plate types',                             'Factory', 'read',   'plate_types',  CURRENT_TIMESTAMP),
('FACTORY_PLATE_TYPES_CREATE',  'Create Plate Types',  'Create new plate types',                       'Factory', 'create', 'plate_types',  CURRENT_TIMESTAMP),
('FACTORY_PLATE_TYPES_UPDATE',  'Update Plate Types',  'Update plate types',                           'Factory', 'update', 'plate_types',  CURRENT_TIMESTAMP),
('FACTORY_PLATE_TYPES_DELETE',  'Delete Plate Types',  'Delete plate types',                           'Factory', 'delete', 'plate_types',  CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- admin & factory_manager: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'factory_manager')
AND p.name IN (
    'FACTORY_PLATES_READ', 'FACTORY_PLATES_CREATE', 'FACTORY_PLATES_UPDATE', 'FACTORY_PLATES_DELETE',
    'FACTORY_PLATE_TYPES_READ', 'FACTORY_PLATE_TYPES_CREATE', 'FACTORY_PLATE_TYPES_UPDATE', 'FACTORY_PLATE_TYPES_DELETE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- head_of_department: read + create + update (no delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'head_of_department'
AND p.name IN (
    'FACTORY_PLATES_READ', 'FACTORY_PLATES_CREATE', 'FACTORY_PLATES_UPDATE',
    'FACTORY_PLATE_TYPES_READ', 'FACTORY_PLATE_TYPES_CREATE', 'FACTORY_PLATE_TYPES_UPDATE'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_worker: read + update plates (can retire a broken plate), read types
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_worker'
AND p.name IN (
    'FACTORY_PLATES_READ', 'FACTORY_PLATES_UPDATE', 'FACTORY_PLATE_TYPES_READ'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- factory_viewer: read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_viewer'
AND p.name IN ('FACTORY_PLATES_READ', 'FACTORY_PLATE_TYPES_READ')
ON CONFLICT (role_id, permission_id) DO NOTHING;
