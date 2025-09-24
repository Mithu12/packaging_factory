-- Migration to add stock transfer permissions
-- These permissions should exist in the database for the transfer functionality to work

-- Add stock transfer permissions
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) 
VALUES 
  (2256, 'stock_transfers.create', 'Create Stock Transfers', 'Allow users to create stock transfers between distribution centers', 'Inventory', 'create', 'stock_transfers', CURRENT_TIMESTAMP),
  (2257, 'stock_transfers.read', 'View Stock Transfers', 'Allow users to view stock transfers', 'Inventory', 'read', 'stock_transfers', CURRENT_TIMESTAMP),
  (2258, 'stock_transfers.approve', 'Approve Stock Transfers', 'Allow users to approve/reject stock transfers', 'Inventory', 'approve', 'stock_transfers', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Update permissions sequence
SELECT setval('permissions_id_seq', 2258, true);

-- Grant stock transfer permissions to admin role (ID 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
VALUES 
  (1, 2256, CURRENT_TIMESTAMP), -- Admin can create stock transfers
  (1, 2257, CURRENT_TIMESTAMP), -- Admin can read stock transfers  
  (1, 2258, CURRENT_TIMESTAMP)  -- Admin can approve stock transfers
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant stock transfer permissions to inventory manager role (if exists)
-- First check if inventory_manager role exists, then grant permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM roles r, permissions p
WHERE r.name = 'inventory_manager' 
  AND p.name IN ('stock_transfers.create', 'stock_transfers.read', 'stock_transfers.approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant basic stock transfer read permission to warehouse staff (if exists)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP
FROM roles r, permissions p
WHERE r.name IN ('warehouse_staff', 'warehouse_manager') 
  AND p.name IN ('stock_transfers.create', 'stock_transfers.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update inventory.adjust permission if it doesn't exist (legacy support)
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) 
VALUES 
  (2259, 'inventory.adjust', 'Adjust Inventory', 'Allow users to adjust inventory stock levels', 'Inventory', 'update', 'inventory', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Grant inventory.adjust to admin
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
VALUES 
  (1, 2259, CURRENT_TIMESTAMP) -- Admin can adjust inventory
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update sequence again to include inventory.adjust
SELECT setval('permissions_id_seq', 2259, true);
