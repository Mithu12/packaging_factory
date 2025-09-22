-- Role-Based Access Control (RBAC) System
-- Version: 2.1.0
-- Description: Creates comprehensive RBAC system with roles, permissions, and hierarchies

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1, -- Hierarchy level (1=highest, 10=lowest)
  department VARCHAR(100), -- Finance, HR, Sales, Purchase, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  module VARCHAR(100) NOT NULL, -- Finance, HR, Sales, Purchase, Inventory, etc.
  action VARCHAR(50) NOT NULL, -- create, read, update, delete, approve, reject
  resource VARCHAR(100) NOT NULL, -- payments, invoices, users, products, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  UNIQUE(role_id, permission_id)
);

-- 4. Update users table to use role_id instead of simple role field
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

-- 5. Create user_permissions table for additional individual permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, permission_id)
);

-- 6. Create role_hierarchy table for role inheritance
CREATE TABLE IF NOT EXISTS role_hierarchy (
  id BIGSERIAL PRIMARY KEY,
  parent_role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  child_role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_role_id, child_role_id)
);

-- Insert core roles
INSERT INTO roles (name, display_name, description, level, department) VALUES
-- System Admin
('system_admin', 'System Administrator', 'Full system access', 1, 'IT'),

-- Executive/Management
('executive', 'Executive/Management', 'High-level management with reporting access', 2, 'Management'),

-- Finance
('finance_manager', 'Finance Manager', 'Finance department manager with approval rights', 3, 'Finance'),
('finance_staff', 'Finance Staff', 'Junior accountants with limited access', 4, 'Finance'),

-- HR
('hr_manager', 'HR Manager', 'Human resources management', 3, 'HR'),
('employee', 'Employee', 'Employee self-service access', 6, 'General'),

-- Purchase
('purchase_manager', 'Purchase Manager', 'Purchase department head with full access', 3, 'Purchase'),
('purchase_staff', 'Purchase Staff', 'Purchase officers with order creation rights', 4, 'Purchase'),

-- Sales
('sales_manager', 'Sales Manager', 'Sales department head', 3, 'Sales'),
('sales_staff', 'Sales Staff', 'Sales representatives', 4, 'Sales'),

-- Inventory
('inventory_manager', 'Inventory Manager', 'Inventory management with adjustment rights', 3, 'Inventory'),
('warehouse_staff', 'Warehouse Staff', 'Warehouse operations staff', 5, 'Inventory'),

-- Call Center
('call_center_manager', 'Call Center Manager', 'Customer service management', 4, 'Customer Service'),
('call_center_operator', 'Call Center Operator', 'Customer service representative', 5, 'Customer Service'),

-- Auditing
('auditor', 'Auditor', 'Read-only access for compliance and auditing', 7, 'Audit'),
('viewer', 'Viewer', 'Read-only access to reports and basic data', 8, 'General')
ON CONFLICT (name) DO NOTHING;

-- Insert comprehensive permissions
INSERT INTO permissions (name, display_name, description, module, action, resource) VALUES
-- Finance Module
('finance.payments.create', 'Create Payments', 'Create new payment records', 'Finance', 'create', 'payments'),
('finance.payments.read', 'View Payments', 'View payment records', 'Finance', 'read', 'payments'),
('finance.payments.update', 'Update Payments', 'Modify payment records', 'Finance', 'update', 'payments'),
('finance.payments.delete', 'Delete Payments', 'Delete payment records', 'Finance', 'delete', 'payments'),
('finance.payments.approve', 'Approve Payments', 'Approve payment transactions', 'Finance', 'approve', 'payments'),

('finance.invoices.create', 'Create Invoices', 'Create new invoice records', 'Finance', 'create', 'invoices'),
('finance.invoices.read', 'View Invoices', 'View invoice records', 'Finance', 'read', 'invoices'),
('finance.invoices.update', 'Update Invoices', 'Modify invoice records', 'Finance', 'update', 'invoices'),
('finance.invoices.delete', 'Delete Invoices', 'Delete invoice records', 'Finance', 'delete', 'invoices'),

('finance.expenses.create', 'Create Expenses', 'Create new expense records', 'Finance', 'create', 'expenses'),
('finance.expenses.read', 'View Expenses', 'View expense records', 'Finance', 'read', 'expenses'),
('finance.expenses.update', 'Update Expenses', 'Modify expense records', 'Finance', 'update', 'expenses'),
('finance.expenses.delete', 'Delete Expenses', 'Delete expense records', 'Finance', 'delete', 'expenses'),
('finance.expenses.approve', 'Approve Expenses', 'Approve expense claims', 'Finance', 'approve', 'expenses'),

-- Purchase Module  
('purchase.orders.create', 'Create Purchase Orders', 'Create new purchase orders', 'Purchase', 'create', 'purchase_orders'),
('purchase.orders.read', 'View Purchase Orders', 'View purchase order records', 'Purchase', 'read', 'purchase_orders'),
('purchase.orders.update', 'Update Purchase Orders', 'Modify purchase orders', 'Purchase', 'update', 'purchase_orders'),
('purchase.orders.delete', 'Delete Purchase Orders', 'Delete purchase orders', 'Purchase', 'delete', 'purchase_orders'),
('purchase.orders.approve', 'Approve Purchase Orders', 'Approve purchase requests', 'Purchase', 'approve', 'purchase_orders'),

('purchase.suppliers.create', 'Create Suppliers', 'Add new supplier records', 'Purchase', 'create', 'suppliers'),
('purchase.suppliers.read', 'View Suppliers', 'View supplier information', 'Purchase', 'read', 'suppliers'),
('purchase.suppliers.update', 'Update Suppliers', 'Modify supplier records', 'Purchase', 'update', 'suppliers'),
('purchase.suppliers.delete', 'Delete Suppliers', 'Remove supplier records', 'Purchase', 'delete', 'suppliers'),

-- Inventory Module
('inventory.products.create', 'Create Products', 'Add new product records', 'Inventory', 'create', 'products'),
('inventory.products.read', 'View Products', 'View product information', 'Inventory', 'read', 'products'),
('inventory.products.update', 'Update Products', 'Modify product records', 'Inventory', 'update', 'products'),
('inventory.products.delete', 'Delete Products', 'Remove product records', 'Inventory', 'delete', 'products'),

('inventory.adjustments.create', 'Create Stock Adjustments', 'Make inventory adjustments', 'Inventory', 'create', 'stock_adjustments'),
('inventory.adjustments.read', 'View Stock Adjustments', 'View adjustment history', 'Inventory', 'read', 'stock_adjustments'),

-- Sales Module
('sales.orders.create', 'Create Sales Orders', 'Create new sales orders', 'Sales', 'create', 'sales_orders'),
('sales.orders.read', 'View Sales Orders', 'View sales order records', 'Sales', 'read', 'sales_orders'),
('sales.orders.update', 'Update Sales Orders', 'Modify sales orders', 'Sales', 'update', 'sales_orders'),
('sales.orders.delete', 'Delete Sales Orders', 'Delete sales orders', 'Sales', 'delete', 'sales_orders'),

('sales.customers.create', 'Create Customers', 'Add new customer records', 'Sales', 'create', 'customers'),
('sales.customers.read', 'View Customers', 'View customer information', 'Sales', 'read', 'customers'),
('sales.customers.update', 'Update Customers', 'Modify customer records', 'Sales', 'update', 'customers'),
('sales.customers.delete', 'Delete Customers', 'Remove customer records', 'Sales', 'delete', 'customers'),

-- HR Module
('hr.users.create', 'Create Users', 'Add new user accounts', 'HR', 'create', 'users'),
('hr.users.read', 'View Users', 'View user information', 'HR', 'read', 'users'),
('hr.users.update', 'Update Users', 'Modify user accounts', 'HR', 'update', 'users'),
('hr.users.delete', 'Delete Users', 'Remove user accounts', 'HR', 'delete', 'users'),

-- System Module
('system.settings.read', 'View System Settings', 'View system configuration', 'System', 'read', 'settings'),
('system.settings.update', 'Update System Settings', 'Modify system configuration', 'System', 'update', 'settings'),
('system.reports.read', 'View Reports', 'Access system reports', 'System', 'read', 'reports'),
('system.audit.read', 'View Audit Logs', 'Access audit and activity logs', 'System', 'read', 'audit_logs')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_roles_department ON roles(department);

-- Create trigger for roles updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing users to new role system
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'system_admin')
WHERE role = 'admin' AND role_id IS NULL;

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'executive')
WHERE role = 'manager' AND role_id IS NULL;

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'finance_manager')
WHERE role = 'accounts' AND role_id IS NULL;

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'employee')
WHERE role = 'employee' AND role_id IS NULL;

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'viewer')
WHERE role = 'viewer' AND role_id IS NULL;
