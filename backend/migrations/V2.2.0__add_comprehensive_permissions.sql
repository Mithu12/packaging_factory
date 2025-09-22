-- Comprehensive Permissions Assignment
-- Version: 2.2.0
-- Description: Assigns permissions to roles based on business logic and department needs

-- Grant permissions to System Admin (full access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'system_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Executive (read access to everything, some approvals)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'executive'
AND p.action IN ('read', 'approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Finance Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance_manager'
AND (
  p.module = 'Finance' 
  OR (p.module = 'Purchase' AND p.resource = 'purchase_orders' AND p.action IN ('read', 'approve'))
  OR (p.module = 'System' AND p.resource IN ('reports', 'settings'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Finance Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance_staff'
AND (
  (p.module = 'Finance' AND p.action IN ('create', 'read', 'update'))
  OR (p.module = 'Purchase' AND p.resource = 'purchase_orders' AND p.action = 'read')
  OR (p.module = 'System' AND p.resource = 'reports' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Purchase Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'purchase_manager'
AND (
  p.module = 'Purchase'
  OR (p.module = 'Inventory' AND p.resource = 'products' AND p.action IN ('read', 'update'))
  OR (p.module = 'Finance' AND p.resource = 'invoices' AND p.action IN ('create', 'read'))
  OR (p.module = 'System' AND p.resource = 'reports' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Purchase Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'purchase_staff'
AND (
  (p.module = 'Purchase' AND p.action IN ('create', 'read', 'update'))
  OR (p.module = 'Inventory' AND p.resource = 'products' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Sales Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_manager'
AND (
  p.module = 'Sales'
  OR (p.module = 'Inventory' AND p.resource = 'products' AND p.action = 'read')
  OR (p.module = 'System' AND p.resource = 'reports' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Sales Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_staff'
AND (
  (p.module = 'Sales' AND p.action IN ('create', 'read', 'update'))
  OR (p.module = 'Inventory' AND p.resource = 'products' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Inventory Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'inventory_manager'
AND (
  p.module = 'Inventory'
  OR (p.module = 'Purchase' AND p.resource IN ('suppliers', 'purchase_orders') AND p.action = 'read')
  OR (p.module = 'Sales' AND p.resource = 'sales_orders' AND p.action = 'read')
  OR (p.module = 'System' AND p.resource = 'reports' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Warehouse Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'warehouse_staff'
AND (
  (p.module = 'Inventory' AND p.action IN ('create', 'read', 'update'))
  OR (p.module = 'Sales' AND p.resource = 'sales_orders' AND p.action IN ('read', 'update'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to HR Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager'
AND (
  p.module = 'HR'
  OR (p.module = 'System' AND p.resource IN ('reports', 'audit_logs') AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Call Center Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'call_center_manager'
AND (
  (p.module = 'Sales' AND p.action IN ('read', 'update'))
  OR (p.module = 'Inventory' AND p.resource = 'products' AND p.action = 'read')
  OR (p.module = 'System' AND p.resource = 'reports' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Call Center Operator
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'call_center_operator'
AND (
  (p.module = 'Sales' AND p.resource = 'customers' AND p.action IN ('read', 'update'))
  OR (p.module = 'Sales' AND p.resource = 'sales_orders' AND p.action = 'read')
  OR (p.module = 'Inventory' AND p.resource = 'products' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Employee (basic self-service)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee'
AND (
  (p.module = 'Finance' AND p.resource = 'expenses' AND p.action IN ('create', 'read'))
  OR (p.module = 'System' AND p.resource = 'reports' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Auditor (read-only access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor'
AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant permissions to Viewer (basic read access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer'
AND (
  (p.module IN ('Sales', 'Purchase', 'Inventory') AND p.action = 'read')
  OR (p.module = 'System' AND p.resource = 'reports' AND p.action = 'read')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Set up role hierarchy relationships
INSERT INTO role_hierarchy (parent_role_id, child_role_id)
SELECT p.id, c.id
FROM roles p, roles c
WHERE (p.name, c.name) IN (
  ('system_admin', 'executive'),
  ('executive', 'finance_manager'),
  ('executive', 'purchase_manager'),
  ('executive', 'sales_manager'),
  ('executive', 'inventory_manager'),
  ('executive', 'hr_manager'),
  ('finance_manager', 'finance_staff'),
  ('purchase_manager', 'purchase_staff'),
  ('sales_manager', 'sales_staff'),
  ('sales_manager', 'call_center_manager'),
  ('inventory_manager', 'warehouse_staff'),
  ('call_center_manager', 'call_center_operator')
)
ON CONFLICT (parent_role_id, child_role_id) DO NOTHING;
