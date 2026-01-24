-- Database Cleanup Script for ERP System
-- This script clears transactional and master data while preserving core configuration and admin accounts.

BEGIN;

-- 1. Identify and clear transactional/master data tables
-- Using TRUNCATE with CASCADE to handle foreign key dependencies efficiently.
DO $$ 
DECLARE
    clean_tables TEXT[] := ARRAY[
        'attendance_records',
        'audit_settings',
        'chart_of_accounts',
        'brands',
        'approval_history',
        'bill_of_materials',
        'categories',
        'cost_centers',
        'bom_components',
        'account_groups',
        'data_changes',
        'departments',
        'customer_due_transactions',
        'customers',
        'designations',
        'employee_contracts',
        'stock_transfers',
        'employee_loans',
        'distribution_routes',
        'products',
        'employee_transfers',
        'employee_salary_structure',
        'product_locations',
        'distribution_centers',
        'expenses',
        'factories',
        'factory_customer_order_line_items',
        'factory_customer_orders',
        'employees',
        'expense_categories',
        'factory_customer_returns',
        'factory_customers',
        'factory_event_log',
        'vouchers',
        'factory_return_line_items',
        'leave_applications',
        'invoices',
        'holidays',
        'factory_sales_invoices',
        'fulfillment_items',
        'failed_voucher_queue',
        'leave_balances',
        'material_wastage',
        'payments',
        'origins',
        'order_fulfillments',
        'payroll_components',
        'payroll_component_details',
        'material_shortages',
        'payment_history',
        'ledger_entries',
        'leave_types',
        'operators',
        'pricing_rules',
        'payroll_runs',
        'production_lines',
        'production_downtime',
        'production_runs',
        'work_orders',
        'production_run_events',
        'payroll_periods',
        'purchase_orders',
        'return_inventory_adjustments',
        'purchase_order_timeline',
        'return_refund_transactions',
        'sales_order_line_items',
        'purchase_order_line_items',
        'sales_orders',
        'sales_receipts',
        'sales_rep_invoices',
        'sales_rep_notifications',
        'sales_returns',
        'sales_rep_order_items',
        'sales_rep_orders',
        'sales_rep_payments',
        'sales_rep_reports',
        'security_events',
        'sales_return_items',
        'sales_rep_deliveries',
        'stock_adjustments',
        'supplier_performance',
        'supplier_categories',
        'suppliers',
        'subcategories',
        'user_activity_logs',
        'shipment_items',
        'shipments',
        'work_order_assignments',
        'user_factories',
        'work_schedules',
        'work_order_material_consumptions',
        'voucher_lines',
        'work_order_material_requirements',
        'user_sessions',
        'factory_customer_payments',
        'payroll_details',
        'work_order_material_allocations',
        'sales_rep_customers',
        'customer_payments'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY clean_tables
    LOOP
        -- Execute TRUNCATE if the table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
        END IF;
    END LOOP;
END $$;

-- 2. Handle Users and their permissions
-- Preserve only users with 'admin' role or explicitly assigned admin role_id
DELETE FROM user_permissions 
WHERE user_id NOT IN (
    SELECT id FROM users 
    WHERE role = 'admin' 
    OR role_id IN (SELECT id FROM roles WHERE name = 'admin')
);

DELETE FROM users 
WHERE role != 'admin' 
AND (role_id IS NULL OR role_id NOT IN (SELECT id FROM roles WHERE name = 'admin'));

-- 3. Reset sequences for preserved tables (where users/permissions might have had deletions)
SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM users;
SELECT setval(pg_get_serial_sequence('user_permissions', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM user_permissions;

COMMIT;

-- Note: roles, role_hierarchy, permissions, role_permissions, settings, system_settings, and flyway_schema_history are preserved as they are NOT in the clean_tables array.
