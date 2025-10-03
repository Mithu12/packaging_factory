-- V17: Add Factories and Multi-Factory Support
-- This migration creates the factories system with multi-factory access control

-- Create factories table
CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    address JSONB NOT NULL DEFAULT '{}',
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_id INTEGER, -- references users(id) for factory manager
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_factories junction table for users who can access multiple factories
CREATE TABLE user_factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'worker', 'viewer')),
    is_primary BOOLEAN DEFAULT false, -- indicates primary factory for the user
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, factory_id)
);

-- Add factory_id to existing factory_customer_orders table
ALTER TABLE factory_customer_orders
ADD COLUMN factory_id UUID REFERENCES factories(id) ON DELETE RESTRICT;

-- Create indexes for better performance
CREATE INDEX idx_factories_manager_id ON factories(manager_id);
CREATE INDEX idx_factories_is_active ON factories(is_active);
CREATE INDEX idx_user_factories_user_id ON user_factories(user_id);
CREATE INDEX idx_user_factories_factory_id ON user_factories(factory_id);
CREATE INDEX idx_user_factories_role ON user_factories(role);
CREATE INDEX idx_factory_customer_orders_factory_id ON factory_customer_orders(factory_id);

-- Create trigger to update updated_at timestamp for factories
CREATE TRIGGER update_factories_updated_at
    BEFORE UPDATE ON factories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default factories for existing data
-- This is a migration script, so we need to handle existing data appropriately
-- For now, we'll create a default factory and assign all existing orders to it

INSERT INTO factories (name, code, description, address) VALUES
('Default Factory', 'DF001', 'Default factory for existing data migration', '{"street": "123 Default Ave", "city": "Default City", "state": "DC", "postal_code": "00000", "country": "USA"}');

-- Get the default factory ID and assign it to existing orders
UPDATE factory_customer_orders
SET factory_id = (SELECT id FROM factories WHERE code = 'DF001' LIMIT 1)
WHERE factory_id IS NULL;

-- Add NOT NULL constraint after populating existing data
ALTER TABLE factory_customer_orders
ALTER COLUMN factory_id SET NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE factories IS 'Factory entities with location and contact information';
COMMENT ON TABLE user_factories IS 'Junction table linking users to factories with their roles in each factory';
COMMENT ON COLUMN user_factories.role IS 'Role in the factory: manager, worker, viewer';
COMMENT ON COLUMN user_factories.is_primary IS 'Whether this is the user''s primary factory';

-- Create a view for easy user-factory role lookup
CREATE VIEW user_factory_roles AS
SELECT
    uf.id,
    uf.user_id,
    uf.factory_id,
    uf.role,
    uf.is_primary,
    u.username,
    u.full_name,
    u.email,
    f.name as factory_name,
    f.code as factory_code
FROM user_factories uf
JOIN users u ON uf.user_id = u.id
JOIN factories f ON uf.factory_id = f.id
WHERE u.is_active = true AND f.is_active = true;

-- Create a function to get user's accessible factories
CREATE OR REPLACE FUNCTION get_user_factories(p_user_id INTEGER)
RETURNS TABLE(factory_id UUID, factory_name VARCHAR, factory_code VARCHAR, role VARCHAR, is_primary BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uf.factory_id,
        f.name,
        f.code,
        uf.role,
        uf.is_primary
    FROM user_factories uf
    JOIN factories f ON uf.factory_id = f.id
    WHERE uf.user_id = p_user_id
    AND f.is_active = true
    AND EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user has access to factory
CREATE OR REPLACE FUNCTION user_has_factory_access(p_user_id INTEGER, p_factory_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_factories uf
        JOIN factories f ON uf.factory_id = f.id
        WHERE uf.user_id = p_user_id
        AND uf.factory_id = p_factory_id
        AND f.is_active = true
        AND EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
