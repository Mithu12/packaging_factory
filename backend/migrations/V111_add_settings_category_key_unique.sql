-- Add unique constraint on (category, key) for settings table.
-- Required for INSERT ... ON CONFLICT (category, key) DO UPDATE in SettingsMediator.

-- Remove duplicates if any (keep row with highest id)
DELETE FROM settings a
USING settings b
WHERE a.id < b.id AND a.category = b.category AND a.key = b.key;

ALTER TABLE settings ADD CONSTRAINT settings_category_key_unique UNIQUE (category, key);
