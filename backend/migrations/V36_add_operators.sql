-- Migration V36: Add Operators Table
-- Description: Creates or updates the operators table for managing factory operators/workers

-- Create operators table if it doesn't exist
CREATE TABLE IF NOT EXISTS operators (
    id BIGSERIAL PRIMARY KEY,
    factory_id BIGINT, -- References factories(id) - nullable for initial setup
    user_id BIGINT REFERENCES users(id),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    skill_level VARCHAR(20) DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'expert', 'master')),
    department VARCHAR(100),
    current_work_order_id BIGINT,
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'off_duty', 'on_leave')),
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT operators_hourly_rate_check CHECK (hourly_rate >= 0)
);

-- Add missing columns if they don't exist (for existing tables)
-- Add factory_id column if it doesn't exist
ALTER TABLE operators ADD COLUMN IF NOT EXISTS factory_id BIGINT;

-- Add department column if it doesn't exist
ALTER TABLE operators ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add current_work_order_id column if it doesn't exist
ALTER TABLE operators ADD COLUMN IF NOT EXISTS current_work_order_id BIGINT;

-- Add availability_status column if it doesn't exist
ALTER TABLE operators ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'off_duty', 'on_leave'));

-- Add hourly_rate column if it doesn't exist
ALTER TABLE operators ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);

-- Add is_active column if it doesn't exist
ALTER TABLE operators ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add updated_at column if it doesn't exist
ALTER TABLE operators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have proper defaults
UPDATE operators SET is_active = true WHERE is_active IS NULL;
UPDATE operators SET availability_status = 'available' WHERE availability_status IS NULL;
UPDATE operators SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_operators_factory_id ON operators(factory_id);
CREATE INDEX IF NOT EXISTS idx_operators_user_id ON operators(user_id);
CREATE INDEX IF NOT EXISTS idx_operators_employee_id ON operators(employee_id);
CREATE INDEX IF NOT EXISTS idx_operators_skill_level ON operators(skill_level);
CREATE INDEX IF NOT EXISTS idx_operators_availability_status ON operators(availability_status);
CREATE INDEX IF NOT EXISTS idx_operators_is_active ON operators(is_active);
CREATE INDEX IF NOT EXISTS idx_operators_department ON operators(department);

-- Add trigger to update updated_at timestamp (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_operators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_operators_updated_at ON operators;
CREATE TRIGGER trigger_operators_updated_at
    BEFORE UPDATE ON operators
    FOR EACH ROW
    EXECUTE FUNCTION update_operators_updated_at();

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- Note: Sample operators data insertion skipped to avoid conflicts with existing user_id constraints
-- If you need sample data, insert manually after ensuring no user_id conflicts
