-- Migration V57: HRM Permissions and RBAC
-- Description: Adds HRM module permissions and roles to the RBAC system

-- Insert HRM module permissions
INSERT INTO permissions (name, display_name, description, module, action, resource)
VALUES
    -- Employee Management Permissions
    ('hrm_employees_create', 'Create Employees', 'Create new employee records', 'HR', 'create', 'employees'),
    ('hrm_employees_read', 'View Employees', 'View employee information', 'HR', 'read', 'employees'),
    ('hrm_employees_update', 'Update Employees', 'Update employee information', 'HR', 'update', 'employees'),
    ('hrm_employees_delete', 'Delete Employees', 'Delete employee records', 'HR', 'delete', 'employees'),
    ('hrm_employees_manage', 'Manage Employees', 'Full employee management access', 'HR', 'manage', 'employees'),

    -- Department Management Permissions
    ('hrm_departments_create', 'Create Departments', 'Create new departments', 'HR', 'create', 'departments'),
    ('hrm_departments_read', 'View Departments', 'View department information', 'HR', 'read', 'departments'),
    ('hrm_departments_update', 'Update Departments', 'Update department information', 'HR', 'update', 'departments'),
    ('hrm_departments_delete', 'Delete Departments', 'Delete department records', 'HR', 'delete', 'departments'),
    ('hrm_departments_manage', 'Manage Departments', 'Full department management access', 'HR', 'manage', 'departments'),

    -- Designation Management Permissions
    ('hrm_designations_create', 'Create Designations', 'Create new designations', 'HR', 'create', 'designations'),
    ('hrm_designations_read', 'View Designations', 'View designation information', 'HR', 'read', 'designations'),
    ('hrm_designations_update', 'Update Designations', 'Update designation information', 'HR', 'update', 'designations'),
    ('hrm_designations_delete', 'Delete Designations', 'Delete designation records', 'HR', 'delete', 'designations'),
    ('hrm_designations_manage', 'Manage Designations', 'Full designation management access', 'HR', 'manage', 'designations'),

    -- Payroll Management Permissions
    ('hrm_payroll_create', 'Create Payroll', 'Create payroll records', 'HR', 'create', 'payroll'),
    ('hrm_payroll_read', 'View Payroll', 'View payroll information', 'HR', 'read', 'payroll'),
    ('hrm_payroll_update', 'Update Payroll', 'Update payroll information', 'HR', 'update', 'payroll'),
    ('hrm_payroll_process', 'Process Payroll', 'Process payroll runs', 'HR', 'process', 'payroll'),
    ('hrm_payroll_approve', 'Approve Payroll', 'Approve payroll for payment', 'HR', 'approve', 'payroll'),
    ('hrm_payroll_manage', 'Manage Payroll', 'Full payroll management access', 'HR', 'manage', 'payroll'),

    -- Attendance Management Permissions
    ('hrm_attendance_create', 'Create Attendance', 'Create attendance records', 'HR', 'create', 'attendance'),
    ('hrm_attendance_read', 'View Attendance', 'View attendance information', 'HR', 'read', 'attendance'),
    ('hrm_attendance_update', 'Update Attendance', 'Update attendance records', 'HR', 'update', 'attendance'),
    ('hrm_attendance_manage', 'Manage Attendance', 'Full attendance management access', 'HR', 'manage', 'attendance'),

    -- Leave Management Permissions
    ('hrm_leave_create', 'Create Leave', 'Create leave applications', 'HR', 'create', 'leave'),
    ('hrm_leave_read', 'View Leave', 'View leave information', 'HR', 'read', 'leave'),
    ('hrm_leave_update', 'Update Leave', 'Update leave applications', 'HR', 'update', 'leave'),
    ('hrm_leave_approve', 'Approve Leave', 'Approve or reject leave applications', 'HR', 'approve', 'leave'),
    ('hrm_leave_manage', 'Manage Leave', 'Full leave management access', 'HR', 'manage', 'leave'),

    -- Transfer Management Permissions
    ('hrm_transfers_create', 'Create Transfers', 'Create employee transfers', 'HR', 'create', 'transfers'),
    ('hrm_transfers_read', 'View Transfers', 'View transfer information', 'HR', 'read', 'transfers'),
    ('hrm_transfers_update', 'Update Transfers', 'Update transfer records', 'HR', 'update', 'transfers'),
    ('hrm_transfers_approve', 'Approve Transfers', 'Approve employee transfers', 'HR', 'approve', 'transfers'),
    ('hrm_transfers_manage', 'Manage Transfers', 'Full transfer management access', 'HR', 'manage', 'transfers'),

    -- Contract Management Permissions
    ('hrm_contracts_create', 'Create Contracts', 'Create employee contracts', 'HR', 'create', 'contracts'),
    ('hrm_contracts_read', 'View Contracts', 'View contract information', 'HR', 'read', 'contracts'),
    ('hrm_contracts_update', 'Update Contracts', 'Update contract information', 'HR', 'update', 'contracts'),
    ('hrm_contracts_manage', 'Manage Contracts', 'Full contract management access', 'HR', 'manage', 'contracts'),

    -- Loan Management Permissions
    ('hrm_loans_create', 'Create Loans', 'Create employee loans', 'HR', 'create', 'loans'),
    ('hrm_loans_read', 'View Loans', 'View loan information', 'HR', 'read', 'loans'),
    ('hrm_loans_update', 'Update Loans', 'Update loan information', 'HR', 'update', 'loans'),
    ('hrm_loans_approve', 'Approve Loans', 'Approve employee loans', 'HR', 'approve', 'loans'),
    ('hrm_loans_manage', 'Manage Loans', 'Full loan management access', 'HR', 'manage', 'loans'),

    -- Reports and Analytics Permissions
    ('hrm_reports_read', 'View HR Reports', 'View HR reports and analytics', 'HR', 'read', 'reports'),
    ('hrm_reports_manage', 'Manage HR Reports', 'Full HR reporting access', 'HR', 'manage', 'reports'),

    -- Settings and Configuration Permissions
    ('hrm_settings_read', 'View HR Settings', 'View HR system settings', 'HR', 'read', 'settings'),
    ('hrm_settings_update', 'Update HR Settings', 'Update HR system settings', 'HR', 'update', 'settings'),
    ('hrm_settings_manage', 'Manage HR Settings', 'Full HR settings management access', 'HR', 'manage', 'settings')

ON CONFLICT (name) DO NOTHING;

-- Assign all HRM permissions to hr_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager'
AND p.module = 'HR'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign basic employee permissions to employee role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee'
AND p.name IN ('hrm_employees_read', 'hrm_leave_create', 'hrm_leave_read', 'hrm_attendance_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign supervisor/manager permissions to executive role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'executive'
AND p.name IN (
    'hrm_employees_read', 'hrm_employees_update',
    'hrm_attendance_read', 'hrm_attendance_update',
    'hrm_leave_read', 'hrm_leave_approve',
    'hrm_transfers_read', 'hrm_transfers_approve',
    'hrm_reports_read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update role hierarchy to include HR roles
INSERT INTO role_hierarchies (parent_role_id, child_role_id)
SELECT pr.id, cr.id
FROM roles pr, roles cr
WHERE pr.name = 'admin' AND cr.name = 'hr_manager'
ON CONFLICT (parent_role_id, child_role_id) DO NOTHING;

INSERT INTO role_hierarchies (parent_role_id, child_role_id)
SELECT pr.id, cr.id
FROM roles pr, roles cr
WHERE pr.name = 'hr_manager' AND cr.name = 'employee'
ON CONFLICT (parent_role_id, child_role_id) DO NOTHING;

-- Create HR audit events
INSERT INTO audit_events (event_type, table_name, description)
VALUES
    ('CREATE', 'employees', 'Employee record created'),
    ('UPDATE', 'employees', 'Employee record updated'),
    ('DELETE', 'employees', 'Employee record deleted'),
    ('CREATE', 'departments', 'Department created'),
    ('UPDATE', 'departments', 'Department updated'),
    ('DELETE', 'departments', 'Department deleted'),
    ('CREATE', 'designations', 'Designation created'),
    ('UPDATE', 'designations', 'Designation updated'),
    ('DELETE', 'designations', 'Designation deleted'),
    ('CREATE', 'payroll_runs', 'Payroll run created'),
    ('UPDATE', 'payroll_runs', 'Payroll run updated'),
    ('CREATE', 'payroll_details', 'Payroll detail created'),
    ('UPDATE', 'payroll_details', 'Payroll detail updated'),
    ('CREATE', 'attendance_records', 'Attendance record created'),
    ('UPDATE', 'attendance_records', 'Attendance record updated'),
    ('CREATE', 'leave_applications', 'Leave application created'),
    ('UPDATE', 'leave_applications', 'Leave application updated'),
    ('APPROVE', 'leave_applications', 'Leave application approved'),
    ('REJECT', 'leave_applications', 'Leave application rejected'),
    ('CREATE', 'employee_transfers', 'Employee transfer created'),
    ('UPDATE', 'employee_transfers', 'Employee transfer updated'),
    ('APPROVE', 'employee_transfers', 'Employee transfer approved')
ON CONFLICT (event_type, table_name) DO NOTHING;
