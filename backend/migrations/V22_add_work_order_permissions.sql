-- V22: Add work order permissions for the factory module
-- This migration adds permissions for work order management

INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at) VALUES
-- Work order management permissions
('factory.work_orders.read', 'View Work Orders', 'View work order information and details', 'Factory', 'read', 'work_orders', CURRENT_TIMESTAMP),
('factory.work_orders.create', 'Create Work Orders', 'Create new work orders', 'Factory', 'create', 'work_orders', CURRENT_TIMESTAMP),
('factory.work_orders.update', 'Update Work Orders', 'Edit work order information and status', 'Factory', 'update', 'work_orders', CURRENT_TIMESTAMP),
('factory.work_orders.delete', 'Delete Work Orders', 'Delete work orders (draft and planned only)', 'Factory', 'delete', 'work_orders', CURRENT_TIMESTAMP),

-- Production line management permissions
('factory.production_lines.read', 'View Production Lines', 'View production line information', 'Factory', 'read', 'production_lines', CURRENT_TIMESTAMP),
('factory.production_lines.create', 'Create Production Lines', 'Create new production lines', 'Factory', 'create', 'production_lines', CURRENT_TIMESTAMP),
('factory.production_lines.update', 'Update Production Lines', 'Edit production line information', 'Factory', 'update', 'production_lines', CURRENT_TIMESTAMP),
('factory.production_lines.delete', 'Delete Production Lines', 'Delete production lines', 'Factory', 'delete', 'production_lines', CURRENT_TIMESTAMP),

-- Operator management permissions
('factory.operators.read', 'View Operators', 'View operator information', 'Factory', 'read', 'operators', CURRENT_TIMESTAMP),
('factory.operators.create', 'Create Operators', 'Create new operators', 'Factory', 'create', 'operators', CURRENT_TIMESTAMP),
('factory.operators.update', 'Update Operators', 'Edit operator information and availability', 'Factory', 'update', 'operators', CURRENT_TIMESTAMP),
('factory.operators.delete', 'Delete Operators', 'Delete operators', 'Factory', 'delete', 'operators', CURRENT_TIMESTAMP),

-- Work order assignment permissions
('factory.work_order_assignments.read', 'View Work Order Assignments', 'View work order operator assignments', 'Factory', 'read', 'work_order_assignments', CURRENT_TIMESTAMP),
('factory.work_order_assignments.create', 'Create Work Order Assignments', 'Assign operators to work orders', 'Factory', 'create', 'work_order_assignments', CURRENT_TIMESTAMP),
('factory.work_order_assignments.update', 'Update Work Order Assignments', 'Update work order assignments', 'Factory', 'update', 'work_order_assignments', CURRENT_TIMESTAMP),
('factory.work_order_assignments.delete', 'Delete Work Order Assignments', 'Remove operator assignments from work orders', 'Factory', 'delete', 'work_order_assignments', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Grant work order permissions to admin role (ID 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Factory' AND p.name LIKE 'factory.work_orders.%'
   OR p.name LIKE 'factory.production_lines.%'
   OR p.name LIKE 'factory.operators.%'
   OR p.name LIKE 'factory.work_order_assignments.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant work order permissions to factory manager role (assuming ID 2 exists)
-- This would need to be adjusted based on your actual role structure
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 2, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Factory' AND p.name LIKE 'factory.work_orders.%'
   OR p.name LIKE 'factory.production_lines.%'
   OR p.name LIKE 'factory.operators.%'
   OR p.name LIKE 'factory.work_order_assignments.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;
