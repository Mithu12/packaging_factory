-- V24: Add BOM (Bill of Materials) permissions for the factory module
-- This migration adds permissions for BOM management

INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at) VALUES
-- BOM management permissions
('factory.boms.read', 'View BOMs', 'View bill of materials information and details', 'Factory', 'read', 'boms', CURRENT_TIMESTAMP),
('factory.boms.create', 'Create BOMs', 'Create new bills of materials', 'Factory', 'create', 'boms', CURRENT_TIMESTAMP),
('factory.boms.update', 'Update BOMs', 'Edit bill of materials information and components', 'Factory', 'update', 'boms', CURRENT_TIMESTAMP),
('factory.boms.delete', 'Delete BOMs', 'Delete bills of materials', 'Factory', 'delete', 'boms', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Grant BOM permissions to admin role (ID 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Factory' AND p.name LIKE 'factory.boms.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant BOM permissions to factory manager role (assuming ID 2 exists)
-- This would need to be adjusted based on your actual role structure
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 2, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Factory' AND p.name LIKE 'factory.boms.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant BOM permissions to factory operator role (assuming ID 3 exists)
-- This would need to be adjusted based on your actual role structure
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 3, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Factory' AND p.name LIKE 'factory.boms.read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN permissions.name IS 'Permission names follow the pattern: module.resource.action';
COMMENT ON COLUMN permissions.module IS 'Module this permission belongs to (e.g., Factory, Inventory, Finance)';
COMMENT ON COLUMN permissions.action IS 'Action this permission allows (e.g., read, create, update, delete)';
COMMENT ON COLUMN permissions.resource IS 'Resource this permission applies to (e.g., boms, work_orders, products)';

COMMENT ON COLUMN role_permissions.role_id IS 'Role ID that has this permission';
COMMENT ON COLUMN role_permissions.permission_id IS 'Permission ID being granted';
COMMENT ON COLUMN role_permissions.granted_at IS 'When this permission was granted to the role';
