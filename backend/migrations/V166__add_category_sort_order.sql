-- Add explicit display ordering to the product catalog so categories and their
-- subcategories render in a deliberate, user-controlled sequence (the catalog
-- tree previously fell back to product appearance order).
--
-- The user's catalog groups (Finished Goods, Reel, Pre-Production Corrugation,
-- Pre-Production Printing, Others Raw Material) are seeded as SUBCATEGORIES under
-- the three fixed primary categories, leaving RM/RRM/Ready-Goods business logic
-- untouched. Only the group skeleton is created here; existing products are not
-- moved or re-tagged.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Parent ordering: Ready Goods first, then Ready Raw Materials, then Raw Materials.
UPDATE categories SET sort_order = 10 WHERE name = 'Ready Goods';
UPDATE categories SET sort_order = 20 WHERE name = 'Ready Raw Materials';
UPDATE categories SET sort_order = 30 WHERE name = 'Raw Materials';

-- Seed the catalog groups as subcategories with explicit ordering.
-- Idempotent via the existing unique index on (name, category_id).
INSERT INTO subcategories (name, description, category_id, sort_order)
SELECT v.name, v.description, c.id, v.sort_order
FROM (
    VALUES
        ('Ready Goods',          'Finished Goods',                NULL::text, 10),
        ('Ready Goods',          'Pre-Production (Printing Items)', NULL::text, 20),
        ('Ready Raw Materials',  'Pre-Production (Corrugation)',  NULL::text, 10),
        ('Raw Materials',        'Reel',                          NULL::text, 10),
        ('Raw Materials',        'Others Raw Material',           NULL::text, 20)
) AS v(category_name, name, description, sort_order)
JOIN categories c ON c.name = v.category_name
ON CONFLICT (name, category_id) DO NOTHING;
