-- Migration V35: Add Production Lines Table
-- Description: Creates or updates the production_lines table for managing factory production lines

-- Create production_lines table if it doesn't exist
CREATE TABLE IF NOT EXISTS production_lines (
    id BIGSERIAL PRIMARY KEY,
    factory_id BIGINT, -- References factories(id) - nullable for initial setup
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 1,
    current_load INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'busy', 'maintenance', 'offline')),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT production_lines_capacity_check CHECK (capacity > 0),
    CONSTRAINT production_lines_load_check CHECK (current_load >= 0),
    CONSTRAINT production_lines_load_capacity_check CHECK (current_load <= capacity)
);

-- Add missing columns if they don't exist (for existing tables)
-- Add factory_id column if it doesn't exist
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS factory_id BIGINT;

-- Add description column if it doesn't exist
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS description TEXT;

-- Add location column if it doesn't exist
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Add is_active column if it doesn't exist
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add updated_at column if it doesn't exist
ALTER TABLE production_lines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have proper defaults
UPDATE production_lines SET is_active = true WHERE is_active IS NULL;
UPDATE production_lines SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_production_lines_factory_id ON production_lines(factory_id);
CREATE INDEX IF NOT EXISTS idx_production_lines_status ON production_lines(status);
CREATE INDEX IF NOT EXISTS idx_production_lines_is_active ON production_lines(is_active);
CREATE INDEX IF NOT EXISTS idx_production_lines_code ON production_lines(code);

-- Add trigger to update updated_at timestamp (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_production_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_production_lines_updated_at ON production_lines;
CREATE TRIGGER trigger_production_lines_updated_at
    BEFORE UPDATE ON production_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_production_lines_updated_at();

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE production_lines ENABLE ROW LEVEL SECURITY;

-- Insert some sample production lines for testing (only if they don't exist)
INSERT INTO production_lines (factory_id, name, code, description, capacity, location)
VALUES
    (1, 'Assembly Line 1', 'AL1', 'Main assembly line for standard products', 10, 'Building A - Floor 1'),
    (1, 'Assembly Line 2', 'AL2', 'Secondary assembly line for custom products', 8, 'Building A - Floor 2'),
    (1, 'Packaging Line 1', 'PL1', 'Primary packaging line', 5, 'Building B - Floor 1'),
    (1, 'Quality Control Station', 'QC1', 'Quality control and testing station', 3, 'Building C - Floor 1')
ON CONFLICT (code) DO NOTHING;
