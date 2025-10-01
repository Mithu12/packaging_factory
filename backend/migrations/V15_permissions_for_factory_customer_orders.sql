INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('factory_customer_orders.create','Create Factory Customer Orders','Create factory customer orders','Factory','create','factory_customer_orders',CURRENT_TIMESTAMP),
('factory_customer_orders.read','View Factory Customer Orders','View factory customer orders','Factory','read','factory_customer_orders',CURRENT_TIMESTAMP),
('factory_customer_orders.update','Update Factory Customer Orders','Edit factory customer orders','Factory','update','factory_customer_orders',CURRENT_TIMESTAMP),
('factory_customer_orders.delete','Delete Factory Customer Orders','Remove factory customer orders','Factory','delete','factory_customer_orders',CURRENT_TIMESTAMP),
('factory_customer_orders.approve','Approve Factory Customer Orders','Approve factory customer orders','Factory','approve','factory_customer_orders',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Grant factory permissions to admin role (ID 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Factory'
ON CONFLICT (role_id, permission_id) DO NOTHING;