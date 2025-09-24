-- Migration to add stock transfer permissions
-- These permissions should exist in the database for the transfer functionality to work

-- Add stock transfer permissions (auto-generated IDs)
INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at)
VALUES 
  ('stock_transfers.create', 'Create Stock Transfers', 'Allow users to create stock transfers between distribution centers', 'Inventory', 'create', 'stock_transfers', CURRENT_TIMESTAMP),
  ('stock_transfers.read', 'View Stock Transfers', 'Allow users to view stock transfers', 'Inventory', 'read', 'stock_transfers', CURRENT_TIMESTAMP),
  ('stock_transfers.approve', 'Approve Stock Transfers', 'Allow users to approve/reject stock transfers', 'Inventory', 'approve', 'stock_transfers', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Ensure permissions sequence is positioned after the current max id
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM public.permissions), true);

-- Grant stock transfer permissions to admin role (ID 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.name IN ('stock_transfers.create', 'stock_transfers.read', 'stock_transfers.approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant stock transfer permissions to inventory manager role (if exists)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
JOIN public.permissions p ON p.name IN ('stock_transfers.create', 'stock_transfers.read', 'stock_transfers.approve')
WHERE r.name = 'inventory_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant basic stock transfer permissions to warehouse staff/managers (if roles exist)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM public.roles r
JOIN public.permissions p ON p.name IN ('stock_transfers.create', 'stock_transfers.read')
WHERE r.name IN ('warehouse_staff', 'warehouse_manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure inventory.adjust permission exists
INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at)
VALUES 
  ('inventory.adjust', 'Adjust Inventory', 'Allow users to adjust inventory stock levels', 'Inventory', 'update', 'inventory', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Grant inventory.adjust to admin
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.name = 'inventory.adjust'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update sequence again to reflect possible new permission
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM public.permissions), true);
