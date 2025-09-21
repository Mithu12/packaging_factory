import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export async function addComprehensivePermissions(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    MyLogger.info('Adding comprehensive permissions for all ERP modules...');
    
    // Define comprehensive permissions for all modules
    const permissions = [
      // ==================== USER MANAGEMENT ====================
      { name: 'users.create', display_name: 'Create Users', module: 'User Management', action: 'create', resource: 'users' },
      { name: 'users.read', display_name: 'View Users', module: 'User Management', action: 'read', resource: 'users' },
      { name: 'users.update', display_name: 'Update Users', module: 'User Management', action: 'update', resource: 'users' },
      { name: 'users.delete', display_name: 'Delete Users', module: 'User Management', action: 'delete', resource: 'users' },
      { name: 'users.activate', display_name: 'Activate/Deactivate Users', module: 'User Management', action: 'update', resource: 'user_status' },
      { name: 'users.reset_password', display_name: 'Reset User Passwords', module: 'User Management', action: 'update', resource: 'user_passwords' },
      { name: 'roles.create', display_name: 'Create Roles', module: 'User Management', action: 'create', resource: 'roles' },
      { name: 'roles.read', display_name: 'View Roles', module: 'User Management', action: 'read', resource: 'roles' },
      { name: 'roles.update', display_name: 'Update Roles', module: 'User Management', action: 'update', resource: 'roles' },
      { name: 'roles.delete', display_name: 'Delete Roles', module: 'User Management', action: 'delete', resource: 'roles' },
      { name: 'permissions.assign', display_name: 'Assign Permissions', module: 'User Management', action: 'assign', resource: 'permissions' },

      // ==================== FINANCE MODULE ====================
      { name: 'accounts.create', display_name: 'Create Chart of Accounts', module: 'Finance', action: 'create', resource: 'accounts' },
      { name: 'accounts.read', display_name: 'View Chart of Accounts', module: 'Finance', action: 'read', resource: 'accounts' },
      { name: 'accounts.update', display_name: 'Update Chart of Accounts', module: 'Finance', action: 'update', resource: 'accounts' },
      { name: 'accounts.delete', display_name: 'Delete Chart of Accounts', module: 'Finance', action: 'delete', resource: 'accounts' },
      
      { name: 'vouchers.create', display_name: 'Create Vouchers', module: 'Finance', action: 'create', resource: 'vouchers' },
      { name: 'vouchers.read', display_name: 'View Vouchers', module: 'Finance', action: 'read', resource: 'vouchers' },
      { name: 'vouchers.update', display_name: 'Update Vouchers', module: 'Finance', action: 'update', resource: 'vouchers' },
      { name: 'vouchers.delete', display_name: 'Delete Vouchers', module: 'Finance', action: 'delete', resource: 'vouchers' },
      { name: 'vouchers.approve', display_name: 'Approve Vouchers', module: 'Finance', action: 'approve', resource: 'vouchers' },
      { name: 'vouchers.reject', display_name: 'Reject Vouchers', module: 'Finance', action: 'reject', resource: 'vouchers' },
      
      { name: 'payments.create', display_name: 'Create Payments', module: 'Finance', action: 'create', resource: 'payments' },
      { name: 'payments.read', display_name: 'View Payments', module: 'Finance', action: 'read', resource: 'payments' },
      { name: 'payments.update', display_name: 'Update Payments', module: 'Finance', action: 'update', resource: 'payments' },
      { name: 'payments.delete', display_name: 'Delete Payments', module: 'Finance', action: 'delete', resource: 'payments' },
      { name: 'payments.approve', display_name: 'Approve Payments', module: 'Finance', action: 'approve', resource: 'payments' },
      { name: 'payments.reject', display_name: 'Reject Payments', module: 'Finance', action: 'reject', resource: 'payments' },
      
      { name: 'expenses.create', display_name: 'Create Expenses', module: 'Finance', action: 'create', resource: 'expenses' },
      { name: 'expenses.read', display_name: 'View Expenses', module: 'Finance', action: 'read', resource: 'expenses' },
      { name: 'expenses.update', display_name: 'Update Expenses', module: 'Finance', action: 'update', resource: 'expenses' },
      { name: 'expenses.delete', display_name: 'Delete Expenses', module: 'Finance', action: 'delete', resource: 'expenses' },
      { name: 'expenses.approve', display_name: 'Approve Expenses', module: 'Finance', action: 'approve', resource: 'expenses' },
      { name: 'expenses.reject', display_name: 'Reject Expenses', module: 'Finance', action: 'reject', resource: 'expenses' },
      
      { name: 'cost_centers.manage', display_name: 'Manage Cost Centers', module: 'Finance', action: 'manage', resource: 'cost_centers' },
      { name: 'budgets.create', display_name: 'Create Budgets', module: 'Finance', action: 'create', resource: 'budgets' },
      { name: 'budgets.read', display_name: 'View Budgets', module: 'Finance', action: 'read', resource: 'budgets' },
      { name: 'budgets.update', display_name: 'Update Budgets', module: 'Finance', action: 'update', resource: 'budgets' },
      { name: 'budgets.approve', display_name: 'Approve Budgets', module: 'Finance', action: 'approve', resource: 'budgets' },
      
      { name: 'financial_reports.view', display_name: 'View Financial Reports', module: 'Finance', action: 'read', resource: 'financial_reports' },
      { name: 'financial_reports.generate', display_name: 'Generate Financial Reports', module: 'Finance', action: 'create', resource: 'financial_reports' },
      { name: 'financial_statements.view', display_name: 'View Financial Statements', module: 'Finance', action: 'read', resource: 'financial_statements' },
      { name: 'ledger.view', display_name: 'View Ledger', module: 'Finance', action: 'read', resource: 'ledger' },
      { name: 'trial_balance.view', display_name: 'View Trial Balance', module: 'Finance', action: 'read', resource: 'trial_balance' },

      // ==================== HR MODULE ====================
      { name: 'employees.create', display_name: 'Create Employees', module: 'HR', action: 'create', resource: 'employees' },
      { name: 'employees.read', display_name: 'View Employees', module: 'HR', action: 'read', resource: 'employees' },
      { name: 'employees.update', display_name: 'Update Employees', module: 'HR', action: 'update', resource: 'employees' },
      { name: 'employees.delete', display_name: 'Delete Employees', module: 'HR', action: 'delete', resource: 'employees' },
      { name: 'employees.hire', display_name: 'Hire Employees', module: 'HR', action: 'create', resource: 'employee_hiring' },
      { name: 'employees.terminate', display_name: 'Terminate Employees', module: 'HR', action: 'update', resource: 'employee_termination' },
      
      { name: 'departments.create', display_name: 'Create Departments', module: 'HR', action: 'create', resource: 'departments' },
      { name: 'departments.read', display_name: 'View Departments', module: 'HR', action: 'read', resource: 'departments' },
      { name: 'departments.update', display_name: 'Update Departments', module: 'HR', action: 'update', resource: 'departments' },
      { name: 'departments.delete', display_name: 'Delete Departments', module: 'HR', action: 'delete', resource: 'departments' },
      
      { name: 'designations.create', display_name: 'Create Designations', module: 'HR', action: 'create', resource: 'designations' },
      { name: 'designations.read', display_name: 'View Designations', module: 'HR', action: 'read', resource: 'designations' },
      { name: 'designations.update', display_name: 'Update Designations', module: 'HR', action: 'update', resource: 'designations' },
      { name: 'designations.delete', display_name: 'Delete Designations', module: 'HR', action: 'delete', resource: 'designations' },
      
      { name: 'payroll.create', display_name: 'Create Payroll', module: 'HR', action: 'create', resource: 'payroll' },
      { name: 'payroll.read', display_name: 'View Payroll', module: 'HR', action: 'read', resource: 'payroll' },
      { name: 'payroll.process', display_name: 'Process Payroll', module: 'HR', action: 'process', resource: 'payroll' },
      { name: 'payroll.approve', display_name: 'Approve Payroll', module: 'HR', action: 'approve', resource: 'payroll' },
      { name: 'salary.update', display_name: 'Update Salaries', module: 'HR', action: 'update', resource: 'salaries' },
      
      { name: 'leave.create', display_name: 'Create Leave Requests', module: 'HR', action: 'create', resource: 'leave_requests' },
      { name: 'leave.read', display_name: 'View Leave Requests', module: 'HR', action: 'read', resource: 'leave_requests' },
      { name: 'leave.approve', display_name: 'Approve Leave Requests', module: 'HR', action: 'approve', resource: 'leave_requests' },
      { name: 'leave.reject', display_name: 'Reject Leave Requests', module: 'HR', action: 'reject', resource: 'leave_requests' },
      
      { name: 'attendance.mark', display_name: 'Mark Attendance', module: 'HR', action: 'create', resource: 'attendance' },
      { name: 'attendance.view', display_name: 'View Attendance', module: 'HR', action: 'read', resource: 'attendance' },
      { name: 'attendance.manage', display_name: 'Manage Attendance', module: 'HR', action: 'manage', resource: 'attendance' },

      // ==================== SALES MODULE ====================
      { name: 'customers.create', display_name: 'Create Customers', module: 'Sales', action: 'create', resource: 'customers' },
      { name: 'customers.read', display_name: 'View Customers', module: 'Sales', action: 'read', resource: 'customers' },
      { name: 'customers.update', display_name: 'Update Customers', module: 'Sales', action: 'update', resource: 'customers' },
      { name: 'customers.delete', display_name: 'Delete Customers', module: 'Sales', action: 'delete', resource: 'customers' },
      { name: 'customers.credit_limit', display_name: 'Manage Customer Credit Limits', module: 'Sales', action: 'update', resource: 'customer_credit' },
      
      { name: 'customer_groups.create', display_name: 'Create Customer Groups', module: 'Sales', action: 'create', resource: 'customer_groups' },
      { name: 'customer_groups.read', display_name: 'View Customer Groups', module: 'Sales', action: 'read', resource: 'customer_groups' },
      { name: 'customer_groups.update', display_name: 'Update Customer Groups', module: 'Sales', action: 'update', resource: 'customer_groups' },
      { name: 'customer_groups.assign', display_name: 'Assign Customers to Groups', module: 'Sales', action: 'assign', resource: 'customer_groups' },
      
      { name: 'quotations.create', display_name: 'Create Quotations', module: 'Sales', action: 'create', resource: 'quotations' },
      { name: 'quotations.read', display_name: 'View Quotations', module: 'Sales', action: 'read', resource: 'quotations' },
      { name: 'quotations.update', display_name: 'Update Quotations', module: 'Sales', action: 'update', resource: 'quotations' },
      { name: 'quotations.delete', display_name: 'Delete Quotations', module: 'Sales', action: 'delete', resource: 'quotations' },
      { name: 'quotations.approve', display_name: 'Approve Quotations', module: 'Sales', action: 'approve', resource: 'quotations' },
      { name: 'quotations.send', display_name: 'Send Quotations', module: 'Sales', action: 'send', resource: 'quotations' },
      
      { name: 'sales_orders.create', display_name: 'Create Sales Orders', module: 'Sales', action: 'create', resource: 'sales_orders' },
      { name: 'sales_orders.read', display_name: 'View Sales Orders', module: 'Sales', action: 'read', resource: 'sales_orders' },
      { name: 'sales_orders.update', display_name: 'Update Sales Orders', module: 'Sales', action: 'update', resource: 'sales_orders' },
      { name: 'sales_orders.delete', display_name: 'Delete Sales Orders', module: 'Sales', action: 'delete', resource: 'sales_orders' },
      { name: 'sales_orders.approve', display_name: 'Approve Sales Orders', module: 'Sales', action: 'approve', resource: 'sales_orders' },
      { name: 'sales_orders.cancel', display_name: 'Cancel Sales Orders', module: 'Sales', action: 'update', resource: 'sales_order_status' },
      
      { name: 'invoices.create', display_name: 'Create Invoices', module: 'Sales', action: 'create', resource: 'invoices' },
      { name: 'invoices.read', display_name: 'View Invoices', module: 'Sales', action: 'read', resource: 'invoices' },
      { name: 'invoices.update', display_name: 'Update Invoices', module: 'Sales', action: 'update', resource: 'invoices' },
      { name: 'invoices.send', display_name: 'Send Invoices', module: 'Sales', action: 'send', resource: 'invoices' },
      { name: 'invoices.cancel', display_name: 'Cancel Invoices', module: 'Sales', action: 'update', resource: 'invoice_status' },
      
      { name: 'receipts.create', display_name: 'Create Receipt Vouchers', module: 'Sales', action: 'create', resource: 'receipts' },
      { name: 'receipts.read', display_name: 'View Receipt Vouchers', module: 'Sales', action: 'read', resource: 'receipts' },
      
      { name: 'pricing.create', display_name: 'Create Price Configurations', module: 'Sales', action: 'create', resource: 'pricing' },
      { name: 'pricing.read', display_name: 'View Price Configurations', module: 'Sales', action: 'read', resource: 'pricing' },
      { name: 'pricing.update', display_name: 'Update Price Configurations', module: 'Sales', action: 'update', resource: 'pricing' },
      { name: 'pricing.approve', display_name: 'Approve Price Changes', module: 'Sales', action: 'approve', resource: 'pricing' },
      
      { name: 'pos.access', display_name: 'Access POS System', module: 'Sales', action: 'read', resource: 'pos' },
      { name: 'pos.transactions', display_name: 'Process POS Transactions', module: 'Sales', action: 'create', resource: 'pos_transactions' },
      { name: 'pos.refunds', display_name: 'Process POS Refunds', module: 'Sales', action: 'create', resource: 'pos_refunds' },
      { name: 'pos.discounts', display_name: 'Apply POS Discounts', module: 'Sales', action: 'apply', resource: 'pos_discounts' },
      { name: 'pos.gifts', display_name: 'Process Gift Items in POS', module: 'Sales', action: 'create', resource: 'pos_gifts' },
      
      // POS Returns
      { name: 'pos_returns.create', display_name: 'Create POS Returns', module: 'Sales', action: 'create', resource: 'pos_returns' },
      { name: 'pos_returns.read', display_name: 'View POS Returns', module: 'Sales', action: 'read', resource: 'pos_returns' },
      { name: 'pos_returns.approve', display_name: 'Approve POS Returns', module: 'Sales', action: 'approve', resource: 'pos_returns' },
      { name: 'pos_returns.complete', display_name: 'Complete POS Returns', module: 'Sales', action: 'process', resource: 'pos_returns' },
      
      { name: 'sales_reports.view', display_name: 'View Sales Reports', module: 'Sales', action: 'read', resource: 'sales_reports' },
      { name: 'sales_reports.generate', display_name: 'Generate Sales Reports', module: 'Sales', action: 'create', resource: 'sales_reports' },

      // ==================== PURCHASE MODULE ====================
      { name: 'suppliers.create', display_name: 'Create Suppliers', module: 'Purchase', action: 'create', resource: 'suppliers' },
      { name: 'suppliers.read', display_name: 'View Suppliers', module: 'Purchase', action: 'read', resource: 'suppliers' },
      { name: 'suppliers.update', display_name: 'Update Suppliers', module: 'Purchase', action: 'update', resource: 'suppliers' },
      { name: 'suppliers.delete', display_name: 'Delete Suppliers', module: 'Purchase', action: 'delete', resource: 'suppliers' },
      { name: 'suppliers.rating', display_name: 'Rate Suppliers', module: 'Purchase', action: 'update', resource: 'supplier_ratings' },
      
      { name: 'supplier_categories.create', display_name: 'Create Supplier Categories', module: 'Purchase', action: 'create', resource: 'supplier_categories' },
      { name: 'supplier_categories.read', display_name: 'View Supplier Categories', module: 'Purchase', action: 'read', resource: 'supplier_categories' },
      { name: 'supplier_categories.update', display_name: 'Update Supplier Categories', module: 'Purchase', action: 'update', resource: 'supplier_categories' },
      { name: 'supplier_categories.delete', display_name: 'Delete Supplier Categories', module: 'Purchase', action: 'delete', resource: 'supplier_categories' },
      
      { name: 'purchase_requests.create', display_name: 'Create Purchase Requests', module: 'Purchase', action: 'create', resource: 'purchase_requests' },
      { name: 'purchase_requests.read', display_name: 'View Purchase Requests', module: 'Purchase', action: 'read', resource: 'purchase_requests' },
      { name: 'purchase_requests.approve', display_name: 'Approve Purchase Requests', module: 'Purchase', action: 'approve', resource: 'purchase_requests' },
      
      { name: 'purchase_orders.create', display_name: 'Create Purchase Orders', module: 'Purchase', action: 'create', resource: 'purchase_orders' },
      { name: 'purchase_orders.read', display_name: 'View Purchase Orders', module: 'Purchase', action: 'read', resource: 'purchase_orders' },
      { name: 'purchase_orders.update', display_name: 'Update Purchase Orders', module: 'Purchase', action: 'update', resource: 'purchase_orders' },
      { name: 'purchase_orders.delete', display_name: 'Delete Purchase Orders', module: 'Purchase', action: 'delete', resource: 'purchase_orders' },
      { name: 'purchase_orders.approve', display_name: 'Approve Purchase Orders', module: 'Purchase', action: 'approve', resource: 'purchase_orders' },
      { name: 'purchase_orders.cancel', display_name: 'Cancel Purchase Orders', module: 'Purchase', action: 'update', resource: 'purchase_order_status' },
      
      { name: 'goods_receipt.create', display_name: 'Create Goods Receipt', module: 'Purchase', action: 'create', resource: 'goods_receipt' },
      { name: 'goods_receipt.read', display_name: 'View Goods Receipt', module: 'Purchase', action: 'read', resource: 'goods_receipt' },
      
      { name: 'supplier_invoices.create', display_name: 'Create Supplier Invoices', module: 'Purchase', action: 'create', resource: 'supplier_invoices' },
      { name: 'supplier_invoices.read', display_name: 'View Supplier Invoices', module: 'Purchase', action: 'read', resource: 'supplier_invoices' },
      { name: 'supplier_invoices.update', display_name: 'Update Supplier Invoices', module: 'Purchase', action: 'update', resource: 'supplier_invoices' },
      
      { name: 'supplier_payments.create', display_name: 'Create Supplier Payments', module: 'Purchase', action: 'create', resource: 'supplier_payments' },
      { name: 'supplier_payments.read', display_name: 'View Supplier Payments', module: 'Purchase', action: 'read', resource: 'supplier_payments' },
      { name: 'supplier_payments.approve', display_name: 'Approve Supplier Payments', module: 'Purchase', action: 'approve', resource: 'supplier_payments' },
      
      { name: 'purchase_reports.view', display_name: 'View Purchase Reports', module: 'Purchase', action: 'read', resource: 'purchase_reports' },
      { name: 'purchase_reports.generate', display_name: 'Generate Purchase Reports', module: 'Purchase', action: 'create', resource: 'purchase_reports' },

      // ==================== INVENTORY MODULE ====================
      { name: 'products.create', display_name: 'Create Products', module: 'Inventory', action: 'create', resource: 'products' },
      { name: 'products.read', display_name: 'View Products', module: 'Inventory', action: 'read', resource: 'products' },
      { name: 'products.update', display_name: 'Update Products', module: 'Inventory', action: 'update', resource: 'products' },
      { name: 'products.delete', display_name: 'Delete Products', module: 'Inventory', action: 'delete', resource: 'products' },
      { name: 'products.price_update', display_name: 'Update Product Prices', module: 'Inventory', action: 'update', resource: 'product_prices' },
      
      { name: 'categories.create', display_name: 'Create Product Categories', module: 'Inventory', action: 'create', resource: 'categories' },
      { name: 'categories.read', display_name: 'View Product Categories', module: 'Inventory', action: 'read', resource: 'categories' },
      { name: 'categories.update', display_name: 'Update Product Categories', module: 'Inventory', action: 'update', resource: 'categories' },
      { name: 'categories.delete', display_name: 'Delete Product Categories', module: 'Inventory', action: 'delete', resource: 'categories' },
      
      { name: 'brands.create', display_name: 'Create Brands', module: 'Inventory', action: 'create', resource: 'brands' },
      { name: 'brands.read', display_name: 'View Brands', module: 'Inventory', action: 'read', resource: 'brands' },
      { name: 'brands.update', display_name: 'Update Brands', module: 'Inventory', action: 'update', resource: 'brands' },
      { name: 'brands.delete', display_name: 'Delete Brands', module: 'Inventory', action: 'delete', resource: 'brands' },
      
      { name: 'origins.create', display_name: 'Create Origins', module: 'Inventory', action: 'create', resource: 'origins' },
      { name: 'origins.read', display_name: 'View Origins', module: 'Inventory', action: 'read', resource: 'origins' },
      { name: 'origins.update', display_name: 'Update Origins', module: 'Inventory', action: 'update', resource: 'origins' },
      { name: 'origins.delete', display_name: 'Delete Origins', module: 'Inventory', action: 'delete', resource: 'origins' },
      
      { name: 'inventory.track', display_name: 'Track Inventory', module: 'Inventory', action: 'read', resource: 'inventory' },
      { name: 'inventory.adjust', display_name: 'Adjust Inventory', module: 'Inventory', action: 'create', resource: 'inventory_adjustments' },
      { name: 'inventory.approve_adjustments', display_name: 'Approve Inventory Adjustments', module: 'Inventory', action: 'approve', resource: 'inventory_adjustments' },
      { name: 'inventory.reorder_levels', display_name: 'Set Reorder Levels', module: 'Inventory', action: 'update', resource: 'reorder_levels' },
      
      { name: 'stock_transfers.create', display_name: 'Create Stock Transfers', module: 'Inventory', action: 'create', resource: 'stock_transfers' },
      { name: 'stock_transfers.read', display_name: 'View Stock Transfers', module: 'Inventory', action: 'read', resource: 'stock_transfers' },
      { name: 'stock_transfers.approve', display_name: 'Approve Stock Transfers', module: 'Inventory', action: 'approve', resource: 'stock_transfers' },
      
      { name: 'warehouses.create', display_name: 'Create Warehouses', module: 'Inventory', action: 'create', resource: 'warehouses' },
      { name: 'warehouses.read', display_name: 'View Warehouses', module: 'Inventory', action: 'read', resource: 'warehouses' },
      { name: 'warehouses.update', display_name: 'Update Warehouses', module: 'Inventory', action: 'update', resource: 'warehouses' },
      
      { name: 'stock_counts.create', display_name: 'Create Stock Counts', module: 'Inventory', action: 'create', resource: 'stock_counts' },
      { name: 'stock_counts.read', display_name: 'View Stock Counts', module: 'Inventory', action: 'read', resource: 'stock_counts' },
      { name: 'stock_counts.approve', display_name: 'Approve Stock Counts', module: 'Inventory', action: 'approve', resource: 'stock_counts' },
      
      { name: 'inventory_reports.view', display_name: 'View Inventory Reports', module: 'Inventory', action: 'read', resource: 'inventory_reports' },
      { name: 'inventory_reports.generate', display_name: 'Generate Inventory Reports', module: 'Inventory', action: 'create', resource: 'inventory_reports' },
      { name: 'stock_ledger.view', display_name: 'View Stock Ledger', module: 'Inventory', action: 'read', resource: 'stock_ledger' },

      // ==================== OPERATIONS MODULE (Technicians & Service) ====================
      { name: 'technicians.create', display_name: 'Create Technician Profiles', module: 'Operations', action: 'create', resource: 'technicians' },
      { name: 'technicians.read', display_name: 'View Technician Profiles', module: 'Operations', action: 'read', resource: 'technicians' },
      { name: 'technicians.update', display_name: 'Update Technician Profiles', module: 'Operations', action: 'update', resource: 'technicians' },
      { name: 'technicians.delete', display_name: 'Delete Technician Profiles', module: 'Operations', action: 'delete', resource: 'technicians' },
      { name: 'technicians.assign', display_name: 'Assign Technicians to Jobs', module: 'Operations', action: 'assign', resource: 'technicians' },
      
      { name: 'service_requests.create', display_name: 'Create Service Requests', module: 'Operations', action: 'create', resource: 'service_requests' },
      { name: 'service_requests.read', display_name: 'View Service Requests', module: 'Operations', action: 'read', resource: 'service_requests' },
      { name: 'service_requests.update', display_name: 'Update Service Requests', module: 'Operations', action: 'update', resource: 'service_requests' },
      { name: 'service_requests.assign', display_name: 'Assign Service Requests', module: 'Operations', action: 'assign', resource: 'service_requests' },
      { name: 'service_requests.close', display_name: 'Close Service Requests', module: 'Operations', action: 'update', resource: 'service_request_status' },
      
      { name: 'technician_inventory.view', display_name: 'View Technician Inventory', module: 'Operations', action: 'read', resource: 'technician_inventory' },
      { name: 'technician_inventory.manage', display_name: 'Manage Technician Inventory', module: 'Operations', action: 'manage', resource: 'technician_inventory' },
      { name: 'technician_inventory.requisition', display_name: 'Create Inventory Requisitions', module: 'Operations', action: 'create', resource: 'inventory_requisitions' },
      { name: 'technician_inventory.approve_requisition', display_name: 'Approve Inventory Requisitions', module: 'Operations', action: 'approve', resource: 'inventory_requisitions' },
      
      { name: 'service_reports.create', display_name: 'Create Service Reports', module: 'Operations', action: 'create', resource: 'service_reports' },
      { name: 'service_reports.read', display_name: 'View Service Reports', module: 'Operations', action: 'read', resource: 'service_reports' },
      { name: 'service_reports.approve', display_name: 'Approve Service Reports', module: 'Operations', action: 'approve', resource: 'service_reports' },
      
      { name: 'work_orders.create', display_name: 'Create Work Orders', module: 'Operations', action: 'create', resource: 'work_orders' },
      { name: 'work_orders.read', display_name: 'View Work Orders', module: 'Operations', action: 'read', resource: 'work_orders' },
      { name: 'work_orders.update', display_name: 'Update Work Orders', module: 'Operations', action: 'update', resource: 'work_orders' },
      { name: 'work_orders.complete', display_name: 'Complete Work Orders', module: 'Operations', action: 'update', resource: 'work_order_completion' },

      // ==================== CUSTOMER SERVICE MODULE ====================
      { name: 'complaints.create', display_name: 'Create Complaints', module: 'Customer Service', action: 'create', resource: 'complaints' },
      { name: 'complaints.read', display_name: 'View Complaints', module: 'Customer Service', action: 'read', resource: 'complaints' },
      { name: 'complaints.update', display_name: 'Update Complaints', module: 'Customer Service', action: 'update', resource: 'complaints' },
      { name: 'complaints.assign', display_name: 'Assign Complaints', module: 'Customer Service', action: 'assign', resource: 'complaints' },
      { name: 'complaints.resolve', display_name: 'Resolve Complaints', module: 'Customer Service', action: 'resolve', resource: 'complaints' },
      { name: 'complaints.escalate', display_name: 'Escalate Complaints', module: 'Customer Service', action: 'update', resource: 'complaint_escalation' },
      { name: 'complaints.close', display_name: 'Close Complaints', module: 'Customer Service', action: 'update', resource: 'complaint_closure' },
      
      { name: 'feedback.create', display_name: 'Create Customer Feedback', module: 'Customer Service', action: 'create', resource: 'feedback' },
      { name: 'feedback.read', display_name: 'View Customer Feedback', module: 'Customer Service', action: 'read', resource: 'feedback' },
      { name: 'feedback.respond', display_name: 'Respond to Customer Feedback', module: 'Customer Service', action: 'create', resource: 'feedback_responses' },
      
      { name: 'call_logs.create', display_name: 'Create Call Logs', module: 'Customer Service', action: 'create', resource: 'call_logs' },
      { name: 'call_logs.read', display_name: 'View Call Logs', module: 'Customer Service', action: 'read', resource: 'call_logs' },
      { name: 'call_logs.update', display_name: 'Update Call Logs', module: 'Customer Service', action: 'update', resource: 'call_logs' },
      
      { name: 'service_tracking.view', display_name: 'View Service Tracking', module: 'Customer Service', action: 'read', resource: 'service_tracking' },
      { name: 'service_tracking.update', display_name: 'Update Service Tracking', module: 'Customer Service', action: 'update', resource: 'service_tracking' },

      // ==================== MARKETING MODULE ====================
      { name: 'campaigns.create', display_name: 'Create Marketing Campaigns', module: 'Marketing', action: 'create', resource: 'campaigns' },
      { name: 'campaigns.read', display_name: 'View Marketing Campaigns', module: 'Marketing', action: 'read', resource: 'campaigns' },
      { name: 'campaigns.update', display_name: 'Update Marketing Campaigns', module: 'Marketing', action: 'update', resource: 'campaigns' },
      { name: 'campaigns.delete', display_name: 'Delete Marketing Campaigns', module: 'Marketing', action: 'delete', resource: 'campaigns' },
      { name: 'campaigns.execute', display_name: 'Execute Marketing Campaigns', module: 'Marketing', action: 'execute', resource: 'campaigns' },
      
      { name: 'sms.send', display_name: 'Send SMS Messages', module: 'Marketing', action: 'send', resource: 'sms' },
      { name: 'sms.read', display_name: 'View SMS History', module: 'Marketing', action: 'read', resource: 'sms' },
      { name: 'sms.bulk_send', display_name: 'Send Bulk SMS', module: 'Marketing', action: 'send', resource: 'bulk_sms' },
      
      { name: 'email.send', display_name: 'Send Email Messages', module: 'Marketing', action: 'send', resource: 'email' },
      { name: 'email.read', display_name: 'View Email History', module: 'Marketing', action: 'read', resource: 'email' },
      { name: 'email.bulk_send', display_name: 'Send Bulk Email', module: 'Marketing', action: 'send', resource: 'bulk_email' },
      
      { name: 'whatsapp.send', display_name: 'Send WhatsApp Messages', module: 'Marketing', action: 'send', resource: 'whatsapp' },
      { name: 'whatsapp.read', display_name: 'View WhatsApp History', module: 'Marketing', action: 'read', resource: 'whatsapp' },
      { name: 'whatsapp.bulk_send', display_name: 'Send Bulk WhatsApp', module: 'Marketing', action: 'send', resource: 'bulk_whatsapp' },
      
      { name: 'customer_segments.create', display_name: 'Create Customer Segments', module: 'Marketing', action: 'create', resource: 'customer_segments' },
      { name: 'customer_segments.read', display_name: 'View Customer Segments', module: 'Marketing', action: 'read', resource: 'customer_segments' },
      { name: 'customer_segments.update', display_name: 'Update Customer Segments', module: 'Marketing', action: 'update', resource: 'customer_segments' },

      // ==================== DASHBOARD & REPORTS ====================
      { name: 'dashboard.executive', display_name: 'Access Executive Dashboard', module: 'Dashboard', action: 'read', resource: 'executive_dashboard' },
      { name: 'dashboard.departmental', display_name: 'Access Departmental Dashboard', module: 'Dashboard', action: 'read', resource: 'departmental_dashboard' },
      { name: 'dashboard.operational', display_name: 'Access Operational Dashboard', module: 'Dashboard', action: 'read', resource: 'operational_dashboard' },
      { name: 'dashboard.kpi', display_name: 'View KPI Dashboard', module: 'Dashboard', action: 'read', resource: 'kpi_dashboard' },
      { name: 'dashboard.customize', display_name: 'Customize Dashboard', module: 'Dashboard', action: 'update', resource: 'dashboard_customization' },
      
      { name: 'reports.generate', display_name: 'Generate Custom Reports', module: 'Reports', action: 'create', resource: 'custom_reports' },
      { name: 'reports.schedule', display_name: 'Schedule Reports', module: 'Reports', action: 'create', resource: 'scheduled_reports' },
      { name: 'reports.export', display_name: 'Export Reports', module: 'Reports', action: 'export', resource: 'reports' },
      { name: 'reports.share', display_name: 'Share Reports', module: 'Reports', action: 'share', resource: 'reports' },

      // ==================== SYSTEM ADMINISTRATION ====================
      { name: 'settings.read', display_name: 'View Settings', module: 'System', action: 'read', resource: 'settings' },
      { name: 'settings.update', display_name: 'Update Settings', module: 'System', action: 'update', resource: 'settings' },
      { name: 'system.settings', display_name: 'Manage System Settings', module: 'System', action: 'manage', resource: 'system_settings' },
      { name: 'system.backup', display_name: 'Manage System Backups', module: 'System', action: 'create', resource: 'system_backups' },
      { name: 'system.restore', display_name: 'Restore System', module: 'System', action: 'restore', resource: 'system_restore' },
      { name: 'system.maintenance', display_name: 'System Maintenance Mode', module: 'System', action: 'manage', resource: 'system_maintenance' },
      
      { name: 'audit.read', display_name: 'View Audit Logs', module: 'System', action: 'read', resource: 'audit_logs' },
      { name: 'audit.export', display_name: 'Export Audit Logs', module: 'System', action: 'export', resource: 'audit_logs' },
      
      { name: 'api.access', display_name: 'API Access', module: 'System', action: 'read', resource: 'api' },
      { name: 'api.manage', display_name: 'Manage API Keys', module: 'System', action: 'manage', resource: 'api_keys' },
      
      { name: 'database.access', display_name: 'Database Access', module: 'System', action: 'read', resource: 'database' },
      { name: 'database.configure', display_name: 'Configure Database', module: 'System', action: 'manage', resource: 'database_configuration' },

      // ==================== SELF SERVICE ====================
      { name: 'profile.read', display_name: 'View Own Profile', module: 'Self Service', action: 'read', resource: 'own_profile' },
      { name: 'profile.update', display_name: 'Update Own Profile', module: 'Self Service', action: 'update', resource: 'own_profile' },
      { name: 'profile.change_password', display_name: 'Change Own Password', module: 'Self Service', action: 'update', resource: 'own_password' },
      
      { name: 'payslip.read', display_name: 'View Own Payslips', module: 'Self Service', action: 'read', resource: 'own_payslips' },
      { name: 'payslip.download', display_name: 'Download Own Payslips', module: 'Self Service', action: 'download', resource: 'own_payslips' },
      
      { name: 'leave.request', display_name: 'Request Leave', module: 'Self Service', action: 'create', resource: 'own_leave_requests' },
      { name: 'leave.view_own', display_name: 'View Own Leave Requests', module: 'Self Service', action: 'read', resource: 'own_leave_requests' },
      { name: 'leave.cancel_own', display_name: 'Cancel Own Leave Requests', module: 'Self Service', action: 'update', resource: 'own_leave_requests' },
      
      { name: 'attendance.view_own', display_name: 'View Own Attendance', module: 'Self Service', action: 'read', resource: 'own_attendance' },
      { name: 'attendance.mark_own', display_name: 'Mark Own Attendance', module: 'Self Service', action: 'create', resource: 'own_attendance' },
      
      { name: 'documents.upload', display_name: 'Upload Personal Documents', module: 'Self Service', action: 'create', resource: 'personal_documents' },
      { name: 'documents.view_own', display_name: 'View Own Documents', module: 'Self Service', action: 'read', resource: 'personal_documents' }
    ];

    console.log(`🔄 Inserting ${permissions.length} comprehensive permissions...`);

    for (const permission of permissions) {
      await client.query(`
        INSERT INTO permissions (name, display_name, description, module, action, resource)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          module = EXCLUDED.module,
          action = EXCLUDED.action,
          resource = EXCLUDED.resource
      `, [permission.name, permission.display_name, permission.display_name, permission.module, permission.action, permission.resource]);
    }

    await client.query('COMMIT');
    MyLogger.success('Comprehensive permissions added successfully!', { permissionsCount: permissions.length });
    
  } catch (error) {
    await client.query('ROLLBACK');
    MyLogger.error('Error adding comprehensive permissions', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  addComprehensivePermissions()
    .then(() => {
      console.log('✅ Comprehensive permissions migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
