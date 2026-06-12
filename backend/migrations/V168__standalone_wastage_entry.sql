-- Standalone wastage entry: wastage discovered outside a work order (storage
-- damage, QC rejects) has no work order to reference.
ALTER TABLE material_wastage
  ALTER COLUMN work_order_id DROP NOT NULL;

-- FACTORY_WASTAGE_CREATE has existed in middleware/permission.ts since the
-- factory module shipped but was never seeded (wastage was only created
-- implicitly through consumption recording, which uses the consumption
-- permission). Seed it now for the standalone entry endpoint.
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_WASTAGE_CREATE','Record Wastage','Record material wastage','Factory','create','wastage',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Mirror the consumption-create grants: everyone who can record consumption
-- (and therefore already creates wastage records implicitly) can record
-- standalone wastage. Note: V28 granted wastage permissions to capitalized
-- role names ('Factory Manager') that never existed — actual role names are
-- lowercase. Grant READ/APPROVE here too so non-admin factory roles actually
-- get them.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('factory_manager', 'admin')
AND p.name IN ('FACTORY_WASTAGE_CREATE', 'FACTORY_WASTAGE_READ', 'FACTORY_WASTAGE_APPROVE')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'factory_worker'
AND p.name IN ('FACTORY_WASTAGE_CREATE', 'FACTORY_WASTAGE_READ')
ON CONFLICT (role_id, permission_id) DO NOTHING;
