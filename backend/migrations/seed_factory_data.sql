-- Factory Users and Factories Seed Script
-- This script populates the database with factory-specific roles, users, and factories
-- 
-- Tables being seeded:
-- - roles (factory-specific roles if not exist)
-- - users (factory workers and managers)
-- - factories (Factory A and Factory B)
-- - user_factories (user-factory assignments)
-- - operators (factory operators from workers)
--
-- Run this script after all migrations have been applied
-- Prerequisites: V17 (factories), V19 (factory roles), V21 (operators) migrations must be run first
-- Use: psql -d your_database -f seed_factory_data.sql

-- Start transaction to ensure atomicity
BEGIN;

-- =============================================================================
-- FACTORY ROLES (ensure they exist)
-- =============================================================================

-- Insert factory-specific roles if they don't exist (in case V19 wasn't run)
INSERT INTO roles (name, display_name, description, level, department, is_active) VALUES
('factory_manager', 'Factory Manager', 'Can manage all aspects of assigned factories including orders, production, and staff', 3, 'Factory', true),
('factory_worker', 'Factory Worker', 'Can view and update factory orders and production data for assigned factories', 2, 'Factory', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- FACTORIES
-- =============================================================================

-- Insert Factory A and Factory B
INSERT INTO factories (name, code, description, address, phone, email, is_active) VALUES
('Factory A', 'FAC_A', 'Main production facility for electronics and mechanical assemblies', 
 '{"street": "1234 Industrial Boulevard", "city": "Manufacturing City", "state": "CA", "postal_code": "90210", "country": "USA"}',
 '+1-555-FAC-AAAA', 'operations@factory-a.company.com', true),

('Factory B', 'FAC_B', 'Secondary production facility specializing in raw materials processing', 
 '{"street": "5678 Production Avenue", "city": "Industrial Town", "state": "TX", "postal_code": "75001", "country": "USA"}',
 '+1-555-FAC-BBBB', 'operations@factory-b.company.com', true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- USERS (Factory Workers and Managers)  
-- =============================================================================

-- Insert factory users with proper roles
-- Note: Using bcrypt hash for password "password123" (in production, use proper password hashing)
-- Hash generated with: bcrypt.hashSync('password123', 12)
INSERT INTO users (
    username, email, password_hash, full_name, mobile_number, 
    role, role_id, is_active, email_verified
) VALUES
-- Factory A Manager
('fac_a_manager', 'manager.a@factory-a.company.com', 
 '$2b$12$LQv3c1yqBw2fnc.eALlgPO.Kg3FRlvbuxEGPhAhGsOBHwPfpg7I3O', -- password123
 'Alice Johnson', '+1-555-101-1001', 'manager', 
 (SELECT id FROM roles WHERE name = 'factory_manager'), true, true),

-- Factory A Worker  
('fac_a_worker', 'worker.a@factory-a.company.com',
 '$2b$12$LQv3c1yqBw2fnc.eALlgPO.Kg3FRlvbuxEGPhAhGsOBHwPfpg7I3O', -- password123
 'Bob Smith', '+1-555-101-2001', 'employee',
 (SELECT id FROM roles WHERE name = 'factory_worker'), true, true),

-- Factory B Manager
('fac_b_manager', 'manager.b@factory-b.company.com',
 '$2b$12$LQv3c1yqBw2fnc.eALlgPO.Kg3FRlvbuxEGPhAhGsOBHwPfpg7I3O', -- password123
 'Carol Davis', '+1-555-102-1002', 'manager',
 (SELECT id FROM roles WHERE name = 'factory_manager'), true, true),

-- Factory B Worker
('fac_b_worker', 'worker.b@factory-b.company.com',
 '$2b$12$LQv3c1yqBw2fnc.eALlgPO.Kg3FRlvbuxEGPhAhGsOBHwPfpg7I3O', -- password123
 'David Wilson', '+1-555-102-2002', 'employee',
 (SELECT id FROM roles WHERE name = 'factory_worker'), true, true)
ON CONFLICT (username) DO NOTHING;

-- =============================================================================
-- FACTORY ASSIGNMENTS
-- =============================================================================

-- Assign users to their respective factories
INSERT INTO user_factories (user_id, factory_id, role, is_primary) VALUES
-- Factory A assignments
((SELECT id FROM users WHERE username = 'fac_a_manager'), 
 (SELECT id FROM factories WHERE code = 'FAC_A'), 'manager', true),
 
((SELECT id FROM users WHERE username = 'fac_a_worker'), 
 (SELECT id FROM factories WHERE code = 'FAC_A'), 'worker', true),

-- Factory B assignments
((SELECT id FROM users WHERE username = 'fac_b_manager'), 
 (SELECT id FROM factories WHERE code = 'FAC_B'), 'manager', true),
 
((SELECT id FROM users WHERE username = 'fac_b_worker'), 
 (SELECT id FROM factories WHERE code = 'FAC_B'), 'worker', true)
ON CONFLICT (user_id, factory_id) DO NOTHING;

-- Update factory manager_id references
UPDATE factories 
SET manager_id = (SELECT id FROM users WHERE username = 'fac_a_manager')
WHERE code = 'FAC_A';

UPDATE factories 
SET manager_id = (SELECT id FROM users WHERE username = 'fac_b_manager')
WHERE code = 'FAC_B';

-- =============================================================================
-- OPERATORS (from factory workers)
-- =============================================================================

-- Create operator records for the factory workers
-- Note: operators table requires user_id, employee_id, and other details
INSERT INTO operators (
    user_id, employee_id, skill_level, department, 
    availability_status, hourly_rate, is_active
) VALUES
-- Factory A Worker as Operator
((SELECT id FROM users WHERE username = 'fac_a_worker'), 
 'EMP-FAC-A-001', 'intermediate', 'Factory A Production', 
 'available', 25.50, true),

-- Factory B Worker as Operator  
((SELECT id FROM users WHERE username = 'fac_b_worker'),
 'EMP-FAC-B-001', 'intermediate', 'Factory B Production',
 'available', 24.75, true)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- SAMPLE FACTORY CUSTOMER ORDERS
-- =============================================================================

-- Create some sample factory customer orders for each factory
-- First, ensure we have factory customers (using existing ones or create minimal ones)

-- Insert sample factory customer orders for Factory A
INSERT INTO factory_customer_orders (
    order_number, factory_customer_id, factory_customer_name, factory_customer_email,
    factory_customer_phone, required_date, status, priority, total_value,
    sales_person, shipping_address, billing_address, factory_id, created_by
) VALUES
-- Factory A Order
('FCO' || LPAD(nextval('factory_customer_order_sequence')::text, 6, '0'),
 (SELECT id FROM factory_customers LIMIT 1), -- Use first available customer
 'ABC Manufacturing Ltd', 'orders@abcmanufacturing.com', '+1-555-0123',
 CURRENT_DATE + INTERVAL '3 weeks', 'pending', 'medium', 15000.00,
 'Alice Johnson', 
 '{"street": "123 Industrial Ave", "city": "Manufacturing City", "state": "CA", "postal_code": "90210", "country": "USA"}',
 '{"street": "123 Industrial Ave", "city": "Manufacturing City", "state": "CA", "postal_code": "90210", "country": "USA"}',
 (SELECT id FROM factories WHERE code = 'FAC_A'),
 'fac_a_manager'),

-- Factory B Order  
('FCO' || LPAD(nextval('factory_customer_order_sequence')::text, 6, '0'),
 (SELECT id FROM factory_customers LIMIT 1 OFFSET 1), -- Use second available customer
 'XYZ Industries', 'procurement@xyzindustries.com', '+1-555-0456',
 CURRENT_DATE + INTERVAL '4 weeks', 'pending', 'high', 22000.00,
 'Carol Davis',
 '{"street": "456 Business Blvd", "city": "Commerce Town", "state": "TX", "postal_code": "75001", "country": "USA"}',
 '{"street": "456 Business Blvd", "city": "Commerce Town", "state": "TX", "postal_code": "75001", "country": "USA"}',
 (SELECT id FROM factories WHERE code = 'FAC_B'),
 'fac_b_manager')
ON CONFLICT (order_number) DO NOTHING;

COMMIT;

-- -- =============================================================================
-- -- DATA VALIDATION AND SUMMARY
-- -- =============================================================================

-- -- Display comprehensive summary of inserted data
-- SELECT 'Factory Data Summary' as report_section, '' as table_name, 0 as record_count
-- UNION ALL
-- SELECT '', '====================', 0
-- UNION ALL
-- SELECT '', 'Factory Roles', COUNT(*) FROM roles WHERE department = 'Factory'
-- UNION ALL
-- SELECT '', 'Users Created', COUNT(*) FROM users WHERE username LIKE 'fac_%'
-- UNION ALL
-- SELECT '', 'Factories', COUNT(*) FROM factories WHERE code IN ('FAC_A', 'FAC_B')
-- UNION ALL
-- SELECT '', 'Factory Assignments', COUNT(*) FROM user_factories
-- UNION ALL
-- SELECT '', 'Operators', COUNT(*) FROM operators WHERE employee_id LIKE 'EMP-FAC-%'
-- UNION ALL
-- SELECT '', 'Sample Factory Orders', COUNT(*) FROM factory_customer_orders WHERE factory_id IN (
--     SELECT id FROM factories WHERE code IN ('FAC_A', 'FAC_B')
-- )
-- ORDER BY record_count DESC;

-- -- Factory details
-- SELECT 
--     'Factory Details:' as report_section,
--     '' as factory_info,
--     '' as details
-- UNION ALL
-- SELECT 
--     '',
--     '================',
--     ''
-- UNION ALL
-- SELECT 
--     '',
--     CONCAT(f.name, ' (', f.code, ')'),
--     CONCAT('Manager: ', COALESCE(u.full_name, 'Not Assigned'), ', Phone: ', f.phone)
-- FROM factories f
-- LEFT JOIN users u ON f.manager_id = u.id
-- WHERE f.code IN ('FAC_A', 'FAC_B')
-- ORDER BY factory_info;

-- -- User assignments summary
-- SELECT 
--     'User Factory Assignments:' as report_section,
--     '' as user_info,
--     '' as assignment_info
-- UNION ALL
-- SELECT 
--     '',
--     '==========================',
--     ''
-- UNION ALL
-- SELECT 
--     '',
--     u.full_name || ' (' || u.username || ')',
--     CONCAT(f.name, ' - ', uf.role, CASE WHEN uf.is_primary THEN ' (Primary)' ELSE '' END)
-- FROM user_factories uf
-- JOIN users u ON uf.user_id = u.id
-- JOIN factories f ON uf.factory_id = f.id
-- WHERE u.username LIKE 'fac_%'
-- ORDER BY user_info;

-- -- Data validation checks
-- SELECT 
--     'Data Validation Checks:' as report_section,
--     '' as check_name,
--     '' as status
-- UNION ALL
-- SELECT 
--     '',
--     '========================',
--     ''
-- UNION ALL
-- SELECT 
--     '',
--     'Users without factory assignments',
--     CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE CONCAT('FAIL - ', COUNT(*)::text, ' users') END
-- FROM users u
-- WHERE u.username LIKE 'fac_%'
-- AND NOT EXISTS (SELECT 1 FROM user_factories WHERE user_id = u.id)
-- UNION ALL
-- SELECT 
--     '',
--     'Factories without managers',
--     CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE CONCAT('WARNING - ', COUNT(*)::text, ' factories') END
-- FROM factories 
-- WHERE code IN ('FAC_A', 'FAC_B') AND manager_id IS NULL
-- UNION ALL
-- SELECT 
--     '',
--     'Users with invalid role assignments',
--     CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE CONCAT('FAIL - ', COUNT(*)::text, ' users') END
-- FROM users u
-- WHERE u.username LIKE 'fac_%'
-- AND u.role_id NOT IN (SELECT id FROM roles WHERE department = 'Factory');

-- -- Login credentials information
-- SELECT 
--     'Login Credentials:' as report_section,
--     '' as username,
--     '' as info
-- UNION ALL
-- SELECT 
--     '',
--     '==================',
--     ''
-- UNION ALL
-- SELECT 
--     '',
--     u.username,
--     CONCAT('Password: password123, Email: ', u.email, ', Role: ', r.display_name)
-- FROM users u
-- JOIN roles r ON u.role_id = r.id
-- WHERE u.username LIKE 'fac_%'
-- ORDER BY username;

-- \echo ''
-- \echo '=== FACTORY SEED SCRIPT COMPLETED SUCCESSFULLY ==='
-- \echo ''
-- \echo 'Factory data includes:'
-- \echo '- 2 factory-specific roles (factory_manager, factory_worker)'
-- \echo '- 4 users: fac_a_manager, fac_a_worker, fac_b_manager, fac_b_worker'
-- \echo '- 2 factories: Factory A (FAC_A), Factory B (FAC_B)'
-- \echo '- User-factory assignments with proper roles'
-- \echo '- 2 operators created from factory workers'
-- \echo '- Sample factory customer orders for each factory'
-- \echo '- All users have password: "password123"'
-- \echo '- All data follows BIGSERIAL primary key pattern'
-- \echo '- Proper foreign key relationships maintained'
-- \echo ''
-- \echo 'Next steps:'
-- \echo '1. Users can log in with their credentials'
-- \echo '2. Test factory-specific access controls'
-- \echo '3. Create additional work orders and production data'
-- \echo '4. Configure production lines for each factory'
-- \echo ''