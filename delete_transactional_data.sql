-- =======================================================================================
-- ERP System Data Cleanup Script
-- Deletes all transactional data while preserving master data
--
-- WARNING: This script will permanently delete all transactional data!
-- Make sure to backup your database before running this script.
--
-- Master data preserved:
-- - Users, roles, permissions
-- - Products, brands, categories, subcategories, origins
-- - Suppliers, customers
-- - Chart of accounts, cost centers, account groups
-- - Factory setup (factories, production lines, operators)
-- - Bills of materials
-- - System settings and configuration
-- - Distribution setup (centers, routes, product locations)
--
-- Transactional data deleted:
-- - All sales, purchase, and payment transactions
-- - All inventory and stock movements
-- - All production and work order transactions
-- - All accounting vouchers and ledger entries
-- - All audit logs and activity tracking
-- =======================================================================================

-- Alternative approach: If you encounter foreign key constraint errors,
-- you can uncomment the TRUNCATE CASCADE commands below and comment out
-- the individual DELETE statements. TRUNCATE CASCADE will automatically
-- handle foreign key dependencies.

-- TRUNCATE CASCADE approach (uncomment if DELETE approach fails):
-- TRUNCATE TABLE factory_event_log, failed_voucher_queue,
--                ledger_entries, voucher_lines, vouchers,
--                payment_history, payments, customer_due_transactions,
--                sales_return_items, sales_returns,
--                sales_receipts, invoices, sales_order_line_items, sales_orders,
--                purchase_order_line_items, purchase_order_timeline, purchase_orders,
--                return_inventory_adjustments, return_refund_transactions,
--                stock_adjustments, stock_transfers, shipment_items, shipments,
--                fulfillment_items, order_fulfillments,
--                material_wastage, production_downtime, production_run_events, production_runs,
--                material_shortages, work_order_material_consumptions,
--                work_order_material_allocations, work_order_material_requirements,
--                work_order_assignments, work_orders,
--                factory_return_line_items, factory_customer_returns,
--                factory_customer_order_line_items, factory_customer_orders, factory_customers,
--                pricing_rules,
--                user_activity_logs, data_changes, security_events, user_sessions,
--                approval_history CASCADE;

-- Begin transaction for safety
BEGIN;

-- =======================================================================================
-- Step 1: Delete audit logs and activity tracking (no foreign key dependencies)
-- =======================================================================================

-- Delete user activity logs
DELETE FROM user_activity_logs;

-- Delete data changes audit trail
DELETE FROM data_changes;

-- Delete security events
DELETE FROM security_events;

-- Delete user sessions
DELETE FROM user_sessions;

-- Delete approval history
DELETE FROM approval_history;

-- Delete factory event logs
DELETE FROM factory_event_log;

-- Delete failed voucher queue
DELETE FROM failed_voucher_queue;

-- =======================================================================================
-- Step 2: Delete financial transactions (vouchers and accounting)
-- =======================================================================================

-- Option A: Individual DELETE statements (comment out if using Option B)
-- Check current counts before deletion
SELECT 'Before deletion - ledger_entries' as info, COUNT(*) FROM ledger_entries
UNION ALL
SELECT 'Before deletion - voucher_lines', COUNT(*) FROM voucher_lines
UNION ALL
SELECT 'Before deletion - vouchers', COUNT(*) FROM vouchers;

-- Delete ledger entries first (foreign key to vouchers)
-- Note: This must be done before deleting vouchers due to foreign key constraint
DELETE FROM ledger_entries;

-- Delete voucher lines (foreign key to vouchers, has CASCADE delete)
DELETE FROM voucher_lines;

-- Delete vouchers (after all dependent records are deleted)
DELETE FROM vouchers;

-- Verify deletion was successful
SELECT 'After deletion - ledger_entries' as info, COUNT(*) FROM ledger_entries
UNION ALL
SELECT 'After deletion - voucher_lines', COUNT(*) FROM voucher_lines
UNION ALL
SELECT 'After deletion - vouchers', COUNT(*) FROM vouchers;

-- Option B: TRUNCATE CASCADE approach (uncomment if Option A fails)
-- This automatically handles all foreign key dependencies in the correct order
-- TRUNCATE TABLE ledger_entries, voucher_lines, vouchers CASCADE;

-- =======================================================================================
-- Step 3: Delete payment and financial transaction data
-- =======================================================================================

-- Delete payment history
DELETE FROM payment_history;

-- Delete payments
DELETE FROM payments;

-- Delete customer due transactions
DELETE FROM customer_due_transactions;

-- =======================================================================================
-- Step 4: Delete sales returns and related transactions
-- =======================================================================================

-- Delete sales return items first (foreign key to sales_returns)
DELETE FROM sales_return_items;

-- Delete sales returns
DELETE FROM sales_returns;

-- =======================================================================================
-- Step 5: Delete sales transactions
-- =======================================================================================

-- Delete sales receipts
DELETE FROM sales_receipts;

-- Delete invoices
DELETE FROM invoices;

-- Delete sales order line items first (foreign key to sales_orders)
DELETE FROM sales_order_line_items;

-- Delete sales orders
DELETE FROM sales_orders;

-- =======================================================================================
-- Step 6: Delete purchase transactions
-- =======================================================================================

-- Delete purchase order line items first (foreign key to purchase_orders)
DELETE FROM purchase_order_line_items;

-- Delete purchase order timeline
DELETE FROM purchase_order_timeline;

-- Delete purchase orders
DELETE FROM purchase_orders;

-- =======================================================================================
-- Step 7: Delete inventory and stock transactions
-- =======================================================================================

-- Delete return inventory adjustments
DELETE FROM return_inventory_adjustments;

-- Delete return refund transactions
DELETE FROM return_refund_transactions;

-- Delete stock adjustments
DELETE FROM stock_adjustments;

-- Delete fulfillment items first (foreign key to order_fulfillments)
DELETE FROM fulfillment_items;

-- Delete order fulfillments
DELETE FROM order_fulfillments;

-- Delete shipment items first (foreign key to shipments)
DELETE FROM shipment_items;

-- Delete shipments
DELETE FROM shipments;

-- Delete stock transfers
DELETE FROM stock_transfers;

-- =======================================================================================
-- Step 8: Delete production and manufacturing transactions
-- =======================================================================================

-- Delete material wastage
DELETE FROM material_wastage;

-- Delete production downtime
DELETE FROM production_downtime;

-- Delete production run events
DELETE FROM production_run_events;

-- Delete production runs
DELETE FROM production_runs;

-- Delete material shortages
DELETE FROM material_shortages;

-- Delete work order material consumptions
DELETE FROM work_order_material_consumptions;

-- Delete work order material allocations
DELETE FROM work_order_material_allocations;

-- Delete work order material requirements
DELETE FROM work_order_material_requirements;

-- Delete work order assignments
DELETE FROM work_order_assignments;

-- Delete work orders
DELETE FROM work_orders;

-- =======================================================================================
-- Step 9: Delete factory customer transactions
-- =======================================================================================

-- Delete factory return line items first (foreign key to factory_customer_returns)
DELETE FROM factory_return_line_items;

-- Delete factory customer returns
DELETE FROM factory_customer_returns;

-- Delete factory customer order line items first (foreign key to factory_customer_orders)
DELETE FROM factory_customer_order_line_items;

-- Delete factory customer orders
DELETE FROM factory_customer_orders;

-- Delete factory customers
-- DELETE FROM factory_customers;

-- =======================================================================================
-- Step 10: Delete pricing rules (these are transactional/configuration)
-- =======================================================================================

-- Delete pricing rules
DELETE FROM pricing_rules;

-- =======================================================================================
-- Step 11: Reset sequences (optional - uncomment if needed)
-- =======================================================================================

-- Note: Uncomment the following ALTER SEQUENCE commands if you want to reset auto-increment counters
-- This is optional and may cause issues if you have foreign key references

-- ALTER SEQUENCE approval_history_id_seq RESTART WITH 1;
-- ALTER SEQUENCE audit_settings_id_seq RESTART WITH 1;
-- ALTER SEQUENCE brands_id_seq RESTART WITH 1;
-- ALTER SEQUENCE categories_id_seq RESTART WITH 1;
-- ALTER SEQUENCE customers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE data_changes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE expense_categories_id_seq RESTART WITH 1;
-- ALTER SEQUENCE expenses_id_seq RESTART WITH 1;
-- ALTER SEQUENCE invoices_id_seq RESTART WITH 1;
-- ALTER SEQUENCE origins_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payment_history_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE permissions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE pricing_rules_id_seq RESTART WITH 1;
-- ALTER SEQUENCE products_id_seq RESTART WITH 1;
-- ALTER SEQUENCE purchase_order_line_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE purchase_order_timeline_id_seq RESTART WITH 1;
-- ALTER SEQUENCE purchase_orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE return_inventory_adjustments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE return_refund_transactions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE role_hierarchy_id_seq RESTART WITH 1;
-- ALTER SEQUENCE role_permissions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE roles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_order_line_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_receipts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_return_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sales_returns_id_seq RESTART WITH 1;
-- ALTER SEQUENCE security_events_id_seq RESTART WITH 1;
-- ALTER SEQUENCE settings_id_seq RESTART WITH 1;
-- ALTER SEQUENCE stock_adjustments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE subcategories_id_seq RESTART WITH 1;
-- ALTER SEQUENCE supplier_categories_id_seq RESTART WITH 1;
-- ALTER SEQUENCE supplier_performance_id_seq RESTART WITH 1;
-- ALTER SEQUENCE suppliers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_activity_logs_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_permissions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_sessions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE factories_id_seq RESTART WITH 1;
-- ALTER SEQUENCE user_factories_id_seq RESTART WITH 1;
-- ALTER SEQUENCE production_lines_id_seq RESTART WITH 1;
-- ALTER SEQUENCE operators_id_seq RESTART WITH 1;
-- ALTER SEQUENCE work_orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE work_order_assignments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE bill_of_materials_id_seq RESTART WITH 1;
-- ALTER SEQUENCE bom_components_id_seq RESTART WITH 1;
-- ALTER SEQUENCE work_order_material_requirements_id_seq RESTART WITH 1;
-- ALTER SEQUENCE work_order_material_allocations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE work_order_material_consumptions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE material_shortages_id_seq RESTART WITH 1;
-- ALTER SEQUENCE production_runs_id_seq RESTART WITH 1;
-- ALTER SEQUENCE production_run_events_id_seq RESTART WITH 1;
-- ALTER SEQUENCE production_downtime_id_seq RESTART WITH 1;
-- ALTER SEQUENCE material_wastage_id_seq RESTART WITH 1;
-- ALTER SEQUENCE factory_customers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE factory_customer_orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE factory_customer_order_line_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE factory_customer_returns_id_seq RESTART WITH 1;
-- ALTER SEQUENCE factory_return_line_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE distribution_centers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE product_locations_id_seq RESTART WITH 1;
-- ALTER SEQUENCE stock_transfers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE distribution_routes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE shipments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE shipment_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE order_fulfillments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE fulfillment_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE account_groups_id_seq RESTART WITH 1;
-- ALTER SEQUENCE chart_of_accounts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE cost_centers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE vouchers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE voucher_lines_id_seq RESTART WITH 1;
-- ALTER SEQUENCE ledger_entries_id_seq RESTART WITH 1;
-- ALTER SEQUENCE factory_event_log_id_seq RESTART WITH 1;
-- ALTER SEQUENCE failed_voucher_queue_id_seq RESTART WITH 1;
-- ALTER SEQUENCE system_settings_id_seq RESTART WITH 1;

-- =======================================================================================
-- Step 12: Verify master data integrity
-- =======================================================================================

-- Count records in master data tables to verify they still exist
SELECT
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'brands', COUNT(*) FROM brands
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'subcategories', COUNT(*) FROM subcategories
UNION ALL
SELECT 'origins', COUNT(*) FROM origins
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'factories', COUNT(*) FROM factories
UNION ALL
SELECT 'chart_of_accounts', COUNT(*) FROM chart_of_accounts
UNION ALL
SELECT 'cost_centers', COUNT(*) FROM cost_centers
UNION ALL
SELECT 'bill_of_materials', COUNT(*) FROM bill_of_materials
ORDER BY table_name;

-- =======================================================================================
-- Step 13: Verify transactional data has been deleted
-- =======================================================================================

-- Count records in key transactional tables to verify deletion
SELECT
    'sales_orders' as table_name, COUNT(*) as record_count FROM sales_orders
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'vouchers', COUNT(*) FROM vouchers
UNION ALL
SELECT 'work_orders', COUNT(*) FROM work_orders
UNION ALL
SELECT 'production_runs', COUNT(*) FROM production_runs
UNION ALL
SELECT 'stock_adjustments', COUNT(*) FROM stock_adjustments
UNION ALL
SELECT 'user_activity_logs', COUNT(*) FROM user_activity_logs
UNION ALL
SELECT 'factory_event_log', COUNT(*) FROM factory_event_log
ORDER BY table_name;

-- =======================================================================================
-- Commit the transaction
-- =======================================================================================

COMMIT;

-- =======================================================================================
-- Script completed successfully!
--
-- To run this script safely:
-- 1. Backup your database first
-- 2. Run in a test environment first
-- 3. Execute: psql -d your_database -f delete_transactional_data.sql
--
-- Expected result: All transactional data deleted, master data preserved
--
-- Troubleshooting:
-- If you encounter foreign key constraint errors with the DELETE approach,
-- uncomment the TRUNCATE CASCADE command at the top of the script and
-- comment out all the individual DELETE statements. TRUNCATE CASCADE
-- automatically handles foreign key dependencies in the correct order.
-- =======================================================================================
