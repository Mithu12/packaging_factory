-- =========================================
-- Migration: V28_add_factory_extended_permissions
-- Description: Adds permissions for material allocation, consumption, wastage, production execution, and dashboard
-- Author: Factory Module Implementation
-- Date: 2025-03-10
-- =========================================

-- Material Allocations Permissions
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_MATERIAL_ALLOCATIONS_READ','View Material Allocations','View material allocations','Factory','read','material_allocations',CURRENT_TIMESTAMP),
('FACTORY_MATERIAL_ALLOCATIONS_CREATE','Create Material Allocations','Create material allocations','Factory','create','material_allocations',CURRENT_TIMESTAMP),
('FACTORY_MATERIAL_ALLOCATIONS_UPDATE','Update Material Allocations','Update material allocations','Factory','update','material_allocations',CURRENT_TIMESTAMP),
('FACTORY_MATERIAL_ALLOCATIONS_DELETE','Delete Material Allocations','Delete material allocations','Factory','delete','material_allocations',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Material Consumptions Permissions
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_MATERIAL_CONSUMPTIONS_READ','View Material Consumptions','View material consumptions','Factory','read','material_consumptions',CURRENT_TIMESTAMP),
('FACTORY_MATERIAL_CONSUMPTIONS_CREATE','Record Material Consumptions','Record material consumptions','Factory','create','material_consumptions',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Wastage Permissions
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_WASTAGE_READ','View Wastage Records','View wastage records','Factory','read','wastage',CURRENT_TIMESTAMP),
('FACTORY_WASTAGE_APPROVE','Approve Wastage Records','Approve wastage records','Factory','approve','wastage',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Production Execution Permissions
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_PRODUCTION_RUNS_READ','View Production Runs','View production runs','Factory','read','production_runs',CURRENT_TIMESTAMP),
('FACTORY_PRODUCTION_RUNS_CREATE','Create Production Runs','Create production runs','Factory','create','production_runs',CURRENT_TIMESTAMP),
('FACTORY_PRODUCTION_RUNS_UPDATE','Update Production Runs','Update production runs','Factory','update','production_runs',CURRENT_TIMESTAMP),
('FACTORY_PRODUCTION_RUNS_DELETE','Delete Production Runs','Delete production runs','Factory','delete','production_runs',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Dashboard Permissions
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_DASHBOARD_READ','View Factory Dashboard','View factory dashboard','Factory','read','dashboard',CURRENT_TIMESTAMP)
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
WHERE r.name = 'Admin'
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

