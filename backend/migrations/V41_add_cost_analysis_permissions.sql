-- =========================================
-- Migration: V41_add_cost_analysis_permissions
-- Description: Adds permissions for cost analysis functionality
-- Author: Factory Module Implementation
-- Date: 2025-03-10
-- =========================================

-- Cost Analysis Permissions
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_COST_ANALYSIS_READ','View Cost Analysis','View material cost analyses, variances, trends, and cost centers','Factory','read','cost_analysis',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- =========================================
-- Assign Permissions to Existing Roles
-- =========================================

-- Admin gets all cost analysis permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.name = 'FACTORY_COST_ANALYSIS_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Manager gets cost analysis permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Manager'
AND p.name = 'FACTORY_COST_ANALYSIS_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Supervisor gets cost analysis permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Supervisor'
AND p.name = 'FACTORY_COST_ANALYSIS_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Factory Worker gets cost analysis read permissions (for viewing reports)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Factory Worker'
AND p.name = 'FACTORY_COST_ANALYSIS_READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Comments
COMMENT ON TABLE permissions IS 'Extended with factory cost analysis permissions';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration V41 completed: Cost analysis permissions added';
    RAISE NOTICE '  - Added FACTORY_COST_ANALYSIS_READ permission';
    RAISE NOTICE '  - Assigned to Admin, Factory Manager, Factory Supervisor, and Factory Worker roles';
END $$;
