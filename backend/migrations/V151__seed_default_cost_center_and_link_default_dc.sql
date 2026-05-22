-- V151: Seed default cost center and link it to the default distribution center
--
-- Ensures the system has a baseline cost center (CC-DF001) — matching the one
-- created at runtime by MasterDataSeeder — and ties the default Main Warehouse
-- (DC-001) to it so out-of-the-box installs can post inventory transactions
-- against a cost center without manual setup.

INSERT INTO cost_centers (name, code, type, status)
VALUES ('Default Cost Center', 'CC-DF001', 'Location', 'Active')
ON CONFLICT (code) DO NOTHING;

UPDATE distribution_centers
SET cost_center_id = cc.id
FROM cost_centers cc
WHERE distribution_centers.code = 'DC-001'
  AND cc.code = 'CC-DF001'
  AND distribution_centers.cost_center_id IS DISTINCT FROM cc.id;
