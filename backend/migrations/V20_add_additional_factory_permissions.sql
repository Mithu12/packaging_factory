-- V20: Add additional factory permissions for factory management
-- This migration adds permissions for factory management, customers, products, and reports

INSERT INTO public.permissions (name, display_name, description, module, action, resource, created_at) VALUES
-- Factory management permissions
('factory.factories.read', 'View Factories', 'View factory information and details', 'Factory', 'read', 'factories', CURRENT_TIMESTAMP),
('factory.factories.update', 'Update Factories', 'Edit factory information and settings', 'Factory', 'update', 'factories', CURRENT_TIMESTAMP),
('factory.factories.assign_users', 'Assign Users to Factories', 'Assign and manage user access to factories', 'Factory', 'manage', 'factories', CURRENT_TIMESTAMP),

-- Factory customer management permissions
('factory.customers.read', 'View Factory Customers', 'View factory customer information', 'Factory', 'read', 'customers', CURRENT_TIMESTAMP),
('factory.customers.create', 'Create Factory Customers', 'Create new factory customers', 'Factory', 'create', 'customers', CURRENT_TIMESTAMP),
('factory.customers.update', 'Update Factory Customers', 'Edit factory customer information', 'Factory', 'update', 'customers', CURRENT_TIMESTAMP),

-- Factory product management permissions
('factory.products.read', 'View Factory Products', 'View factory product information', 'Factory', 'read', 'products', CURRENT_TIMESTAMP),
('factory.products.create', 'Create Factory Products', 'Create new factory products', 'Factory', 'create', 'products', CURRENT_TIMESTAMP),
('factory.products.update', 'Update Factory Products', 'Edit factory product information', 'Factory', 'update', 'products', CURRENT_TIMESTAMP),

-- Factory reports permissions
('factory.reports.read', 'View Factory Reports', 'View factory reports and analytics', 'Factory', 'read', 'reports', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Grant factory permissions to admin role (ID 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Factory' AND p.name NOT LIKE 'factory_customer_orders.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;
