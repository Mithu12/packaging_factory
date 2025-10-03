-- V18: Add factory_id to users table for primary factory assignment
-- This migration adds factory_id field to users table to support primary factory assignment

-- Add factory_id column to users table (nullable initially)
ALTER TABLE users
ADD COLUMN factory_id UUID REFERENCES factories(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_users_factory_id ON users(factory_id);

-- Create index for active users with factory
CREATE INDEX idx_users_active_factory ON users(is_active, factory_id) WHERE is_active = true;

-- Update existing users to use the default factory (created in V17)
-- This assigns all existing users to the 'Default Factory' that was created in V17
UPDATE users
SET factory_id = (SELECT id FROM factories WHERE code = 'DF001' LIMIT 1)
WHERE factory_id IS NULL AND is_active = true;

-- Add comments for documentation
COMMENT ON COLUMN users.factory_id IS 'Primary factory assignment for the user - determines default factory context';

-- Note: After this migration, the factory_id column should ideally be made NOT NULL
-- in a future migration once all users have been properly assigned to factories
