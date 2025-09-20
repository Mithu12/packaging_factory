import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export async function addRBACSystem(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    MyLogger.info('Creating RBAC system tables...');
    
    // 1. Create roles table
    await client.query(`
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
    `);

    // 2. Create permissions table
    await client.query(`
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
    `);

    // 3. Create role_permissions junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id BIGSERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        granted_by INTEGER REFERENCES users(id),
        UNIQUE(role_id, permission_id)
      );
    `);

    // 4. Update users table to use role_id instead of simple role field
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);
    `);

    // 5. Create user_permissions table for additional individual permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        granted_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, permission_id)
      );
    `);

    // 6. Create role_hierarchy table for role inheritance
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_hierarchy (
        id BIGSERIAL PRIMARY KEY,
        parent_role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        child_role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(parent_role_id, child_role_id)
      );
    `);

    MyLogger.info('Inserting core roles...');
    
    // Insert core roles based on the provided hierarchy
    const roles = [
      // System Admin
      { name: 'system_admin', display_name: 'System Administrator', description: 'Full system access', level: 1, department: 'IT' },
      
      // Executive/Management
      { name: 'executive', display_name: 'Executive/Management', description: 'High-level management with reporting access', level: 2, department: 'Management' },
      
      // Finance
      { name: 'finance_manager', display_name: 'Finance Manager', description: 'Finance department manager with approval rights', level: 3, department: 'Finance' },
      { name: 'finance_staff', display_name: 'Finance Staff', description: 'Junior accountants with limited access', level: 4, department: 'Finance' },
      
      // HR
      { name: 'hr_manager', display_name: 'HR Manager', description: 'Human resources management', level: 3, department: 'HR' },
      { name: 'employee', display_name: 'Employee', description: 'Employee self-service access', level: 6, department: 'General' },
      
      // Sales
      { name: 'sales_manager', display_name: 'Sales Manager', description: 'Sales department manager with approval rights', level: 3, department: 'Sales' },
      { name: 'sales_executive', display_name: 'Sales Executive', description: 'Sales staff with order management', level: 4, department: 'Sales' },
      
      // Purchase
      { name: 'purchase_manager', display_name: 'Purchase Manager', description: 'Purchase department manager with approval rights', level: 3, department: 'Purchase' },
      { name: 'purchase_staff', display_name: 'Purchase Staff', description: 'Purchase staff with order creation', level: 4, department: 'Purchase' },
      
      // Inventory/Warehouse
      { name: 'inventory_manager', display_name: 'Inventory Manager', description: 'Warehouse and inventory management', level: 3, department: 'Inventory' },
      { name: 'warehouse_staff', display_name: 'Warehouse Staff', description: 'Warehouse operations staff', level: 5, department: 'Inventory' },
      
      // Technician
      { name: 'technician_supervisor', display_name: 'Technician Supervisor', description: 'Field technician management', level: 4, department: 'Operations' },
      { name: 'technician', display_name: 'Technician', description: 'Field service technician', level: 5, department: 'Operations' },
      
      // Call Center
      { name: 'call_center_manager', display_name: 'Call Center Manager', description: 'Customer service management', level: 4, department: 'Customer Service' },
      { name: 'call_center_operator', display_name: 'Call Center Operator', description: 'Customer service representative', level: 5, department: 'Customer Service' },
      
      // Additional roles
      { name: 'customer_service', display_name: 'Customer Service', description: 'Customer feedback and service management', level: 5, department: 'Customer Service' },
      { name: 'marketing', display_name: 'Marketing', description: 'Marketing and communication', level: 4, department: 'Marketing' },
      { name: 'auditor', display_name: 'Auditor', description: 'Read-only audit access', level: 3, department: 'Compliance' }
    ];

    for (const role of roles) {
      await client.query(`
        INSERT INTO roles (name, display_name, description, level, department)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
      `, [role.name, role.display_name, role.description, role.level, role.department]);
    }

    MyLogger.info('Inserting core permissions...');

    // Define comprehensive permissions based on modules and actions
    const permissions = [
      // User Management
      { name: 'users.create', display_name: 'Create Users', module: 'User Management', action: 'create', resource: 'users' },
      { name: 'users.read', display_name: 'View Users', module: 'User Management', action: 'read', resource: 'users' },
      { name: 'users.update', display_name: 'Update Users', module: 'User Management', action: 'update', resource: 'users' },
      { name: 'users.delete', display_name: 'Delete Users', module: 'User Management', action: 'delete', resource: 'users' },
      { name: 'roles.manage', display_name: 'Manage Roles', module: 'User Management', action: 'manage', resource: 'roles' },
      
      // Finance Module
      { name: 'accounts.create', display_name: 'Create Accounts', module: 'Finance', action: 'create', resource: 'accounts' },
      { name: 'accounts.read', display_name: 'View Accounts', module: 'Finance', action: 'read', resource: 'accounts' },
      { name: 'accounts.update', display_name: 'Update Accounts', module: 'Finance', action: 'update', resource: 'accounts' },
      { name: 'vouchers.create', display_name: 'Create Vouchers', module: 'Finance', action: 'create', resource: 'vouchers' },
      { name: 'vouchers.read', display_name: 'View Vouchers', module: 'Finance', action: 'read', resource: 'vouchers' },
      { name: 'vouchers.approve', display_name: 'Approve Vouchers', module: 'Finance', action: 'approve', resource: 'vouchers' },
      { name: 'payments.create', display_name: 'Create Payments', module: 'Finance', action: 'create', resource: 'payments' },
      { name: 'payments.read', display_name: 'View Payments', module: 'Finance', action: 'read', resource: 'payments' },
      { name: 'payments.approve', display_name: 'Approve Payments', module: 'Finance', action: 'approve', resource: 'payments' },
      { name: 'reports.financial', display_name: 'View Financial Reports', module: 'Finance', action: 'read', resource: 'financial_reports' },
      
      // HR Module
      { name: 'employees.create', display_name: 'Create Employees', module: 'HR', action: 'create', resource: 'employees' },
      { name: 'employees.read', display_name: 'View Employees', module: 'HR', action: 'read', resource: 'employees' },
      { name: 'employees.update', display_name: 'Update Employees', module: 'HR', action: 'update', resource: 'employees' },
      { name: 'payroll.process', display_name: 'Process Payroll', module: 'HR', action: 'process', resource: 'payroll' },
      { name: 'payroll.read', display_name: 'View Payroll', module: 'HR', action: 'read', resource: 'payroll' },
      { name: 'departments.manage', display_name: 'Manage Departments', module: 'HR', action: 'manage', resource: 'departments' },
      
      // Sales Module
      { name: 'customers.create', display_name: 'Create Customers', module: 'Sales', action: 'create', resource: 'customers' },
      { name: 'customers.read', display_name: 'View Customers', module: 'Sales', action: 'read', resource: 'customers' },
      { name: 'customers.update', display_name: 'Update Customers', module: 'Sales', action: 'update', resource: 'customers' },
      { name: 'sales_orders.create', display_name: 'Create Sales Orders', module: 'Sales', action: 'create', resource: 'sales_orders' },
      { name: 'sales_orders.read', display_name: 'View Sales Orders', module: 'Sales', action: 'read', resource: 'sales_orders' },
      { name: 'sales_orders.approve', display_name: 'Approve Sales Orders', module: 'Sales', action: 'approve', resource: 'sales_orders' },
      { name: 'quotations.create', display_name: 'Create Quotations', module: 'Sales', action: 'create', resource: 'quotations' },
      { name: 'sales.pricing', display_name: 'Manage Sales Pricing', module: 'Sales', action: 'manage', resource: 'pricing' },
      { name: 'reports.sales', display_name: 'View Sales Reports', module: 'Sales', action: 'read', resource: 'sales_reports' },
      
      // Purchase Module
      { name: 'suppliers.create', display_name: 'Create Suppliers', module: 'Purchase', action: 'create', resource: 'suppliers' },
      { name: 'suppliers.read', display_name: 'View Suppliers', module: 'Purchase', action: 'read', resource: 'suppliers' },
      { name: 'suppliers.update', display_name: 'Update Suppliers', module: 'Purchase', action: 'update', resource: 'suppliers' },
      { name: 'purchase_orders.create', display_name: 'Create Purchase Orders', module: 'Purchase', action: 'create', resource: 'purchase_orders' },
      { name: 'purchase_orders.read', display_name: 'View Purchase Orders', module: 'Purchase', action: 'read', resource: 'purchase_orders' },
      { name: 'purchase_orders.approve', display_name: 'Approve Purchase Orders', module: 'Purchase', action: 'approve', resource: 'purchase_orders' },
      { name: 'supplier_payments.create', display_name: 'Create Supplier Payments', module: 'Purchase', action: 'create', resource: 'supplier_payments' },
      
      // Inventory Module
      { name: 'products.create', display_name: 'Create Products', module: 'Inventory', action: 'create', resource: 'products' },
      { name: 'products.read', display_name: 'View Products', module: 'Inventory', action: 'read', resource: 'products' },
      { name: 'products.update', display_name: 'Update Products', module: 'Inventory', action: 'update', resource: 'products' },
      { name: 'inventory.track', display_name: 'Track Inventory', module: 'Inventory', action: 'read', resource: 'inventory' },
      { name: 'inventory.adjust', display_name: 'Adjust Inventory', module: 'Inventory', action: 'update', resource: 'inventory' },
      { name: 'inventory.approve_adjustments', display_name: 'Approve Inventory Adjustments', module: 'Inventory', action: 'approve', resource: 'inventory_adjustments' },
      { name: 'stock.transfers', display_name: 'Manage Stock Transfers', module: 'Inventory', action: 'manage', resource: 'stock_transfers' },
      { name: 'categories.manage', display_name: 'Manage Categories', module: 'Inventory', action: 'manage', resource: 'categories' },
      
      // Operations Module (Technicians)
      { name: 'technicians.manage', display_name: 'Manage Technicians', module: 'Operations', action: 'manage', resource: 'technicians' },
      { name: 'service_requests.create', display_name: 'Create Service Requests', module: 'Operations', action: 'create', resource: 'service_requests' },
      { name: 'service_requests.read', display_name: 'View Service Requests', module: 'Operations', action: 'read', resource: 'service_requests' },
      { name: 'service_requests.assign', display_name: 'Assign Service Requests', module: 'Operations', action: 'assign', resource: 'service_requests' },
      { name: 'technician_inventory.manage', display_name: 'Manage Technician Inventory', module: 'Operations', action: 'manage', resource: 'technician_inventory' },
      { name: 'service_reports.submit', display_name: 'Submit Service Reports', module: 'Operations', action: 'create', resource: 'service_reports' },
      
      // Customer Service Module
      { name: 'complaints.create', display_name: 'Create Complaints', module: 'Customer Service', action: 'create', resource: 'complaints' },
      { name: 'complaints.read', display_name: 'View Complaints', module: 'Customer Service', action: 'read', resource: 'complaints' },
      { name: 'complaints.resolve', display_name: 'Resolve Complaints', module: 'Customer Service', action: 'resolve', resource: 'complaints' },
      { name: 'feedback.manage', display_name: 'Manage Customer Feedback', module: 'Customer Service', action: 'manage', resource: 'feedback' },
      { name: 'call_logs.manage', display_name: 'Manage Call Logs', module: 'Customer Service', action: 'manage', resource: 'call_logs' },
      
      // Marketing Module
      { name: 'campaigns.create', display_name: 'Create Campaigns', module: 'Marketing', action: 'create', resource: 'campaigns' },
      { name: 'campaigns.read', display_name: 'View Campaigns', module: 'Marketing', action: 'read', resource: 'campaigns' },
      { name: 'communications.sms', display_name: 'Send SMS', module: 'Marketing', action: 'send', resource: 'sms' },
      { name: 'communications.email', display_name: 'Send Email', module: 'Marketing', action: 'send', resource: 'email' },
      { name: 'communications.whatsapp', display_name: 'Send WhatsApp', module: 'Marketing', action: 'send', resource: 'whatsapp' },
      
      // System & Reporting
      { name: 'dashboard.executive', display_name: 'Executive Dashboard', module: 'Dashboard', action: 'read', resource: 'executive_dashboard' },
      { name: 'dashboard.departmental', display_name: 'Departmental Dashboard', module: 'Dashboard', action: 'read', resource: 'departmental_dashboard' },
      { name: 'reports.generate', display_name: 'Generate Reports', module: 'Reports', action: 'create', resource: 'reports' },
      { name: 'system.settings', display_name: 'System Settings', module: 'System', action: 'manage', resource: 'settings' },
      { name: 'audit.read', display_name: 'View Audit Logs', module: 'System', action: 'read', resource: 'audit_logs' },
      
      // Self-Service
      { name: 'profile.read', display_name: 'View Own Profile', module: 'Self Service', action: 'read', resource: 'own_profile' },
      { name: 'profile.update', display_name: 'Update Own Profile', module: 'Self Service', action: 'update', resource: 'own_profile' },
      { name: 'payslip.read', display_name: 'View Own Payslip', module: 'Self Service', action: 'read', resource: 'own_payslip' },
      { name: 'leave.request', display_name: 'Request Leave', module: 'Self Service', action: 'create', resource: 'leave_requests' }
    ];

    for (const permission of permissions) {
      await client.query(`
        INSERT INTO permissions (name, display_name, description, module, action, resource)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO NOTHING
      `, [permission.name, permission.display_name, permission.display_name, permission.module, permission.action, permission.resource]);
    }

    MyLogger.info('Assigning permissions to roles...');

    // Now assign permissions to roles based on the role definitions
    const rolePermissions = [
      // System Admin - Full access
      { role: 'system_admin', permissions: permissions.map(p => p.name) },
      
      // Executive - Reporting and high-level access
      { role: 'executive', permissions: [
        'dashboard.executive', 'reports.financial', 'reports.sales', 'reports.generate',
        'users.read', 'employees.read', 'customers.read', 'suppliers.read',
        'payments.read', 'sales_orders.read', 'purchase_orders.read',
        'audit.read', 'vouchers.approve', 'purchase_orders.approve', 'sales_orders.approve'
      ]},
      
      // Finance Manager
      { role: 'finance_manager', permissions: [
        'accounts.create', 'accounts.read', 'accounts.update',
        'vouchers.create', 'vouchers.read', 'vouchers.approve',
        'payments.create', 'payments.read', 'payments.approve',
        'reports.financial', 'dashboard.departmental',
        'supplier_payments.create', 'audit.read'
      ]},
      
      // Finance Staff
      { role: 'finance_staff', permissions: [
        'accounts.read', 'vouchers.create', 'vouchers.read',
        'payments.create', 'payments.read', 'reports.financial',
        'dashboard.departmental'
      ]},
      
      // HR Manager
      { role: 'hr_manager', permissions: [
        'employees.create', 'employees.read', 'employees.update',
        'payroll.process', 'payroll.read', 'departments.manage',
        'dashboard.departmental', 'users.create', 'users.read', 'users.update'
      ]},
      
      // Employee - Self Service
      { role: 'employee', permissions: [
        'profile.read', 'profile.update', 'payslip.read', 'leave.request'
      ]},
      
      // Sales Manager
      { role: 'sales_manager', permissions: [
        'customers.create', 'customers.read', 'customers.update',
        'sales_orders.create', 'sales_orders.read', 'sales_orders.approve',
        'quotations.create', 'sales.pricing', 'reports.sales',
        'dashboard.departmental'
      ]},
      
      // Sales Executive
      { role: 'sales_executive', permissions: [
        'customers.create', 'customers.read', 'customers.update',
        'sales_orders.create', 'sales_orders.read', 'quotations.create',
        'reports.sales', 'dashboard.departmental'
      ]},
      
      // Purchase Manager
      { role: 'purchase_manager', permissions: [
        'suppliers.create', 'suppliers.read', 'suppliers.update',
        'purchase_orders.create', 'purchase_orders.read', 'purchase_orders.approve',
        'supplier_payments.create', 'dashboard.departmental'
      ]},
      
      // Purchase Staff
      { role: 'purchase_staff', permissions: [
        'suppliers.read', 'suppliers.update',
        'purchase_orders.create', 'purchase_orders.read',
        'dashboard.departmental'
      ]},
      
      // Inventory Manager
      { role: 'inventory_manager', permissions: [
        'products.create', 'products.read', 'products.update',
        'inventory.track', 'inventory.adjust', 'inventory.approve_adjustments',
        'stock.transfers', 'categories.manage', 'dashboard.departmental'
      ]},
      
      // Warehouse Staff
      { role: 'warehouse_staff', permissions: [
        'products.read', 'inventory.track', 'inventory.adjust',
        'stock.transfers', 'dashboard.departmental'
      ]},
      
      // Technician Supervisor
      { role: 'technician_supervisor', permissions: [
        'technicians.manage', 'service_requests.create', 'service_requests.read',
        'service_requests.assign', 'technician_inventory.manage', 'dashboard.departmental'
      ]},
      
      // Technician
      { role: 'technician', permissions: [
        'service_requests.read', 'service_reports.submit',
        'technician_inventory.manage', 'profile.read', 'profile.update'
      ]},
      
      // Call Center Manager
      { role: 'call_center_manager', permissions: [
        'complaints.create', 'complaints.read', 'complaints.resolve',
        'call_logs.manage', 'service_requests.create', 'dashboard.departmental'
      ]},
      
      // Call Center Operator
      { role: 'call_center_operator', permissions: [
        'complaints.create', 'complaints.read', 'call_logs.manage',
        'service_requests.create', 'customers.read'
      ]},
      
      // Customer Service
      { role: 'customer_service', permissions: [
        'feedback.manage', 'complaints.read', 'customers.read',
        'dashboard.departmental'
      ]},
      
      // Marketing
      { role: 'marketing', permissions: [
        'campaigns.create', 'campaigns.read', 'communications.sms',
        'communications.email', 'communications.whatsapp', 'customers.read',
        'dashboard.departmental'
      ]},
      
      // Auditor
      { role: 'auditor', permissions: [
        'audit.read', 'reports.financial', 'reports.sales',
        'users.read', 'employees.read', 'payments.read',
        'sales_orders.read', 'purchase_orders.read', 'inventory.track'
      ]}
    ];

    // Assign permissions to roles
    for (const rolePermission of rolePermissions) {
      // Get role ID
      const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [rolePermission.role]);
      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        
        for (const permissionName of rolePermission.permissions) {
          // Get permission ID
          const permResult = await client.query('SELECT id FROM permissions WHERE name = $1', [permissionName]);
          if (permResult.rows.length > 0) {
            const permissionId = permResult.rows[0].id;
            
            // Insert role-permission mapping
            await client.query(`
              INSERT INTO role_permissions (role_id, permission_id, granted_by)
              VALUES ($1, $2, 1)
              ON CONFLICT (role_id, permission_id) DO NOTHING
            `, [roleId, permissionId]);
          }
        }
      }
    }

    MyLogger.info('Setting up role hierarchy...');

    // Setup role hierarchy (child roles inherit parent permissions)
    const hierarchy = [
      { parent: 'system_admin', child: 'executive' },
      { parent: 'executive', child: 'finance_manager' },
      { parent: 'executive', child: 'hr_manager' },
      { parent: 'executive', child: 'sales_manager' },
      { parent: 'executive', child: 'purchase_manager' },
      { parent: 'executive', child: 'inventory_manager' },
      { parent: 'finance_manager', child: 'finance_staff' },
      { parent: 'sales_manager', child: 'sales_executive' },
      { parent: 'purchase_manager', child: 'purchase_staff' },
      { parent: 'inventory_manager', child: 'warehouse_staff' },
      { parent: 'technician_supervisor', child: 'technician' },
      { parent: 'call_center_manager', child: 'call_center_operator' }
    ];

    for (const relation of hierarchy) {
      const parentResult = await client.query('SELECT id FROM roles WHERE name = $1', [relation.parent]);
      const childResult = await client.query('SELECT id FROM roles WHERE name = $1', [relation.child]);
      
      if (parentResult.rows.length > 0 && childResult.rows.length > 0) {
        await client.query(`
          INSERT INTO role_hierarchy (parent_role_id, child_role_id)
          VALUES ($1, $2)
          ON CONFLICT (parent_role_id, child_role_id) DO NOTHING
        `, [parentResult.rows[0].id, childResult.rows[0].id]);
      }
    }

    MyLogger.info('Migrating existing users to new role system...');

    // Migrate existing users to the new role system
    const userRoleMapping = {
      'admin': 'system_admin',
      'manager': 'executive',
      'accounts': 'finance_manager',
      'employee': 'employee',
      'viewer': 'auditor'
    };

    for (const [oldRole, newRole] of Object.entries(userRoleMapping)) {
      const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [newRole]);
      if (roleResult.rows.length > 0) {
        await client.query(`
          UPDATE users 
          SET role_id = $1 
          WHERE role = $2 AND role_id IS NULL
        `, [roleResult.rows[0].id, oldRole]);
      }
    }

    // Add indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_roles_department ON roles(department);');

    await client.query('COMMIT');
    MyLogger.success('RBAC system created successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    MyLogger.error('Error creating RBAC system', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  addRBACSystem()
    .then(() => {
      console.log('✅ RBAC system migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
