-- =========================================
-- Migration: V28_add_factory_extended_permissions
-- Description: Adds permissions for material allocation, consumption, wastage, production execution, and dashboard
-- Author: Factory Module Implementation
-- Date: 2025-03-10
-- =========================================

-- Material Allocations Permissions
INSERT INTO permissions (name, description, category) VALUES
('FACTORY_MATERIAL_ALLOCATIONS_READ', 'View material allocations', 'Factory Operations'),
('FACTORY_MATERIAL_ALLOCATIONS_CREATE', 'Create material allocations', 'Factory Operations'),
('FACTORY_MATERIAL_ALLOCATIONS_UPDATE', 'Update material allocations', 'Factory Operations'),
('FACTORY_MATERIAL_ALLOCATIONS_DELETE', 'Delete material allocations', 'Factory Operations')
ON CONFLICT (name) DO NOTHING;

-- Material Consumptions Permissions
INSERT INTO permissions (name, description, category) VALUES
('FACTORY_MATERIAL_CONSUMPTIONS_READ', 'View material consumptions', 'Factory Operations'),
('FACTORY_MATERIAL_CONSUMPTIONS_CREATE', 'Record material consumptions', 'Factory Operations')
ON CONFLICT (name) DO NOTHING;

-- Wastage Permissions
INSERT INTO permissions (name, description, category) VALUES
('FACTORY_WASTAGE_READ', 'View wastage records', 'Factory Operations'),
('FACTORY_WASTAGE_APPROVE', 'Approve/reject wastage records', 'Factory Operations')
ON CONFLICT (name) DO NOTHING;

-- Production Execution Permissions
INSERT INTO permissions (name, description, category) VALUES
('FACTORY_PRODUCTION_RUNS_READ', 'View production runs', 'Factory Operations'),
('FACTORY_PRODUCTION_RUNS_CREATE', 'Create production runs', 'Factory Operations'),
('FACTORY_PRODUCTION_RUNS_UPDATE', 'Update production runs (start, pause, complete)', 'Factory Operations'),
('FACTORY_PRODUCTION_RUNS_DELETE', 'Delete production runs', 'Factory Operations')
ON CONFLICT (name) DO NOTHING;

-- Dashboard Permissions
INSERT INTO permissions (name, description, category) VALUES
('FACTORY_DASHBOARD_READ', 'View factory dashboard', 'Factory Operations')
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- Assign Permissions to Existing Roles
-- =========================================

-- Factory Manager gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id, 
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Manager'
AND p.name IN (
    'FACTORY_MATERIAL_ALLOCATIONS_READ',
    'FACTORY_MATERIAL_ALLOCATIONS_CREATE',
    'FACTORY_MATERIAL_ALLOCATIONS_UPDATE',
    'FACTORY_MATERIAL_ALLOCATIONS_DELETE',
    'FACTORY_MATERIAL_CONSUMPTIONS_READ',
    'FACTORY_MATERIAL_CONSUMPTIONS_CREATE',
    'FACTORY_WASTAGE_READ',
    'FACTORY_WASTAGE_APPROVE',
    'FACTORY_PRODUCTION_RUNS_READ',
    'FACTORY_PRODUCTION_RUNS_CREATE',
    'FACTORY_PRODUCTION_RUNS_UPDATE',
    'FACTORY_PRODUCTION_RUNS_DELETE',
    'FACTORY_DASHBOARD_READ'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Supervisor gets read, create, and update (no delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id, 
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Supervisor'
AND p.name IN (
    'FACTORY_MATERIAL_ALLOCATIONS_READ',
    'FACTORY_MATERIAL_ALLOCATIONS_CREATE',
    'FACTORY_MATERIAL_ALLOCATIONS_UPDATE',
    'FACTORY_MATERIAL_CONSUMPTIONS_READ',
    'FACTORY_MATERIAL_CONSUMPTIONS_CREATE',
    'FACTORY_WASTAGE_READ',
    'FACTORY_WASTAGE_APPROVE',
    'FACTORY_PRODUCTION_RUNS_READ',
    'FACTORY_PRODUCTION_RUNS_CREATE',
    'FACTORY_PRODUCTION_RUNS_UPDATE',
    'FACTORY_DASHBOARD_READ'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Worker gets read and limited create
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id, 
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Worker'
AND p.name IN (
    'FACTORY_MATERIAL_ALLOCATIONS_READ',
    'FACTORY_MATERIAL_CONSUMPTIONS_READ',
    'FACTORY_MATERIAL_CONSUMPTIONS_CREATE',
    'FACTORY_WASTAGE_READ',
    'FACTORY_PRODUCTION_RUNS_READ',
    'FACTORY_PRODUCTION_RUNS_UPDATE',
    'FACTORY_DASHBOARD_READ'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id, 
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'System Administrator'
AND p.name IN (
    'FACTORY_MATERIAL_ALLOCATIONS_READ',
    'FACTORY_MATERIAL_ALLOCATIONS_CREATE',
    'FACTORY_MATERIAL_ALLOCATIONS_UPDATE',
    'FACTORY_MATERIAL_ALLOCATIONS_DELETE',
    'FACTORY_MATERIAL_CONSUMPTIONS_READ',
    'FACTORY_MATERIAL_CONSUMPTIONS_CREATE',
    'FACTORY_WASTAGE_READ',
    'FACTORY_WASTAGE_APPROVE',
    'FACTORY_PRODUCTION_RUNS_READ',
    'FACTORY_PRODUCTION_RUNS_CREATE',
    'FACTORY_PRODUCTION_RUNS_UPDATE',
    'FACTORY_PRODUCTION_RUNS_DELETE',
    'FACTORY_DASHBOARD_READ'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Comments
COMMENT ON TABLE permissions IS 'Extended with factory material allocation, consumption, wastage, production execution, and dashboard permissions';

