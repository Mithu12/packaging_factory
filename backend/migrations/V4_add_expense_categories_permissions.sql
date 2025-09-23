-- Migration: Add Expense Categories Permissions
-- Version: V4
-- Description: Add RBAC permissions for expense categories management
-- Date: 2025-09-23

-- Add expense categories permissions
INSERT INTO public.permissions (id, name, display_name, description, module, action, resource, created_at) 
VALUES 
  (2252, 'expense_categories.create', 'Create Expense Categories', 'Create and add new expense categories', 'Finance', 'create', 'expense_categories', CURRENT_TIMESTAMP),
  (2253, 'expense_categories.read', 'View Expense Categories', 'View and browse expense categories', 'Finance', 'read', 'expense_categories', CURRENT_TIMESTAMP),
  (2254, 'expense_categories.update', 'Update Expense Categories', 'Edit and modify expense categories', 'Finance', 'update', 'expense_categories', CURRENT_TIMESTAMP),
  (2255, 'expense_categories.delete', 'Delete Expense Categories', 'Remove and delete expense categories', 'Finance', 'delete', 'expense_categories', CURRENT_TIMESTAMP);

-- Update sequence to next available ID
SELECT setval('permissions_id_seq', 2255, true);

-- Grant expense categories permissions to Admin role (role_id = 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
VALUES 
  (1, 2252, CURRENT_TIMESTAMP), -- Admin can create expense categories
  (1, 2253, CURRENT_TIMESTAMP), -- Admin can read expense categories
  (1, 2254, CURRENT_TIMESTAMP), -- Admin can update expense categories
  (1, 2255, CURRENT_TIMESTAMP); -- Admin can delete expense categories

-- Grant permissions to Finance Manager role (role_id = 3)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
VALUES 
  (3, 2252, CURRENT_TIMESTAMP), -- Finance Manager can create expense categories
  (3, 2253, CURRENT_TIMESTAMP), -- Finance Manager can read expense categories
  (3, 2254, CURRENT_TIMESTAMP), -- Finance Manager can update expense categories
  (3, 2255, CURRENT_TIMESTAMP); -- Finance Manager can delete expense categories

-- Grant read permissions to Finance Staff role (role_id = 4)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
VALUES 
  (4, 2253, CURRENT_TIMESTAMP); -- Finance Staff can read expense categories
