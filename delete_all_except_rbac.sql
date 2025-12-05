-- =======================================================================================
-- ERP System Data Cleanup Script (Preserve RBAC + Minimal Config)
-- 
-- WARNING: This script will permanently delete most data!
-- Make sure to backup your database before running this script.
--
-- PRESERVED:
-- - RBAC: users, roles, permissions, role_permissions, role_hierarchy, user_permissions
-- - Configuration: system_settings, settings, audit_settings, expense_categories
-- - Distribution: distribution_centers (primary)
-- - Accounting: account_groups
--
-- DELETED: Everything else
-- =======================================================================================

-- Begin transaction for safety
BEGIN;

-- =======================================================================================
-- Disable foreign key constraints temporarily for efficient truncation
-- =======================================================================================
SET session_replication_role = 'replica';

-- =======================================================================================
-- TRUNCATE all tables except RBAC + minimal config
-- =======================================================================================

-- ---------------------------------------------------------------------------------------
-- Sales Rep Module Tables
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    sales_rep_reports,
    sales_rep_notifications,
    sales_rep_deliveries,
    sales_rep_payments,
    sales_rep_invoices,
    sales_rep_order_items,
    sales_rep_orders,
    sales_rep_customers
CASCADE;

-- ---------------------------------------------------------------------------------------
-- HRM Module Tables (ALL - including master data)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    employee_transfers,
    holidays,
    attendance_records,
    leave_applications,
    leave_balances,
    leave_types,
    work_schedules,
    employee_loans,
    payroll_component_details,
    payroll_details,
    payroll_runs,
    employee_salary_structure,
    payroll_components,
    payroll_periods,
    employee_contracts,
    employees,
    designations,
    departments
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Factory Module Tables (ALL - including master data)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    factory_order_workflow_history,
    factory_customer_payments,
    factory_sales_invoices,
    factory_event_log,
    failed_voucher_queue,
    factory_return_line_items,
    factory_customer_returns,
    factory_customer_order_line_items,
    factory_customer_orders,
    factory_customers,
    material_wastage,
    production_downtime,
    production_run_events,
    production_runs,
    material_shortages,
    work_order_material_consumptions,
    work_order_material_allocations,
    work_order_material_requirements,
    work_order_assignments,
    work_orders,
    bom_components,
    bill_of_materials,
    operators,
    production_lines,
    user_factories,
    factories
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Accounting / Vouchers Module Tables (keep account_groups only)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    ledger_entries,
    voucher_lines,
    vouchers,
    cost_centers,
    chart_of_accounts
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Sales Module Tables
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    sales_return_items,
    sales_returns,
    sales_receipts,
    invoices,
    sales_order_line_items,
    sales_orders
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Purchase Module Tables (ALL - including suppliers)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    purchase_order_line_items,
    purchase_order_timeline,
    purchase_orders,
    supplier_performance,
    supplier_categories,
    suppliers
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Inventory / Distribution Module Tables (keep distribution_centers only)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    return_inventory_adjustments,
    return_refund_transactions,
    stock_adjustments,
    fulfillment_items,
    order_fulfillments,
    shipment_items,
    shipments,
    stock_transfers,
    product_locations,
    distribution_routes
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Payment / Customer Module Tables (ALL - including customers)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    payment_history,
    payments,
    customer_due_transactions,
    customers
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Product / Catalog Module Tables (ALL - including products)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    pricing_rules,
    products,
    subcategories,
    categories,
    origins,
    brands,
    expenses
CASCADE;

-- ---------------------------------------------------------------------------------------
-- Audit / Logging Tables (keep settings, audit_settings, expense_categories)
-- ---------------------------------------------------------------------------------------
TRUNCATE TABLE IF EXISTS 
    user_activity_logs,
    data_changes,
    security_events,
    user_sessions,
    approval_history
CASCADE;

-- =======================================================================================
-- Re-enable foreign key constraints
-- =======================================================================================
SET session_replication_role = 'origin';

-- =======================================================================================
-- Reset sequences for truncated tables
-- =======================================================================================

-- Sales Rep sequences
ALTER SEQUENCE IF EXISTS sales_rep_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_rep_notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_rep_deliveries_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_rep_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_rep_invoices_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_rep_order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_rep_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_rep_customers_id_seq RESTART WITH 1;

-- HRM sequences
ALTER SEQUENCE IF EXISTS employee_transfers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS holidays_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS attendance_records_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS leave_applications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS leave_balances_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS leave_types_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS work_schedules_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS employee_loans_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payroll_component_details_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payroll_details_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payroll_runs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS employee_salary_structure_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payroll_components_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payroll_periods_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS employee_contracts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS employees_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS designations_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS departments_id_seq RESTART WITH 1;

-- Factory sequences
ALTER SEQUENCE IF EXISTS factory_order_workflow_history_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_customer_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_sales_invoices_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_event_log_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS failed_voucher_queue_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_return_line_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_customer_returns_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_customer_order_line_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_customer_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factory_customers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS material_wastage_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS production_downtime_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS production_run_events_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS production_runs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS material_shortages_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS work_order_material_consumptions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS work_order_material_allocations_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS work_order_material_requirements_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS work_order_assignments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS work_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS bom_components_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS bill_of_materials_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS operators_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS production_lines_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_factories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factories_id_seq RESTART WITH 1;

-- Accounting sequences
ALTER SEQUENCE IF EXISTS ledger_entries_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS voucher_lines_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vouchers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS cost_centers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS chart_of_accounts_id_seq RESTART WITH 1;

-- Sales sequences
ALTER SEQUENCE IF EXISTS sales_return_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_returns_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_receipts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS invoices_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_order_line_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sales_orders_id_seq RESTART WITH 1;

-- Purchase sequences
ALTER SEQUENCE IF EXISTS purchase_order_line_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchase_order_timeline_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchase_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS supplier_performance_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS supplier_categories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS suppliers_id_seq RESTART WITH 1;

-- Inventory / Distribution sequences
ALTER SEQUENCE IF EXISTS return_inventory_adjustments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS return_refund_transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS stock_adjustments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS fulfillment_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_fulfillments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS shipment_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS shipments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS stock_transfers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS product_locations_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS distribution_routes_id_seq RESTART WITH 1;

-- Payment / Customer sequences
ALTER SEQUENCE IF EXISTS payment_history_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS customer_due_transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;

-- Product / Catalog sequences
ALTER SEQUENCE IF EXISTS pricing_rules_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS subcategories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS categories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS origins_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS brands_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS expenses_id_seq RESTART WITH 1;

-- Audit / Logging sequences
ALTER SEQUENCE IF EXISTS user_activity_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS data_changes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS security_events_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS approval_history_id_seq RESTART WITH 1;

-- =======================================================================================
-- Verify PRESERVED data
-- =======================================================================================

SELECT '============================================' as info;
SELECT 'PRESERVED TABLES (Should have data)' as info;
SELECT '============================================' as info;

SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'role_hierarchy', COUNT(*) FROM role_hierarchy
UNION ALL
SELECT 'user_permissions', COUNT(*) FROM user_permissions
UNION ALL
SELECT 'account_groups', COUNT(*) FROM account_groups
UNION ALL
SELECT 'distribution_centers', COUNT(*) FROM distribution_centers
UNION ALL
SELECT 'settings', COUNT(*) FROM settings
UNION ALL
SELECT 'audit_settings', COUNT(*) FROM audit_settings
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM expense_categories
ORDER BY table_name;

-- =======================================================================================
-- Verify DELETED tables (should be 0)
-- =======================================================================================

SELECT '============================================' as info;
SELECT 'DELETED TABLES (Should be 0)' as info;
SELECT '============================================' as info;

SELECT 'products' as table_name, COUNT(*) as record_count FROM products
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'sales_orders', COUNT(*) FROM sales_orders
UNION ALL
SELECT 'vouchers', COUNT(*) FROM vouchers
UNION ALL
SELECT 'factories', COUNT(*) FROM factories
UNION ALL
SELECT 'chart_of_accounts', COUNT(*) FROM chart_of_accounts
UNION ALL
SELECT 'cost_centers', COUNT(*) FROM cost_centers
ORDER BY table_name;

-- =======================================================================================
-- Commit the transaction
-- =======================================================================================

COMMIT;

-- =======================================================================================
-- Script completed!
--
-- To run this script:
-- 1. BACKUP YOUR DATABASE FIRST!
-- 2. Execute: psql -d your_database -f delete_all_except_rbac.sql
--
-- PRESERVED:
-- - RBAC: users, roles, permissions, role_permissions, role_hierarchy, user_permissions
-- - Configuration: system_settings, settings, audit_settings, expense_categories
-- - Distribution: distribution_centers
-- - Accounting: account_groups
--
-- DELETED: Everything else including products, customers, suppliers, factories,
--          chart_of_accounts, cost_centers, etc.
-- =======================================================================================
