-- V21: Add Work Orders System Tables
-- This migration creates the work orders, production lines, and operators tables for the factory module

-- Create sequence for work order numbers
CREATE SEQUENCE IF NOT EXISTS work_order_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create production_lines table
CREATE TABLE production_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    capacity DECIMAL(10,2) NOT NULL CHECK (capacity > 0),
    current_load DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'maintenance', 'offline')),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create operators table
CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    skill_level VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'expert', 'master')),
    department VARCHAR(100),
    current_work_order_id UUID,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'off_duty', 'on_leave')),
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create work_orders table
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_order_id BIGINT REFERENCES factory_customer_orders(id) ON DELETE SET NULL,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit_of_measure VARCHAR(20) NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'released', 'in_progress', 'completed', 'on_hold', 'cancelled')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    progress DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_hours DECIMAL(10,2) NOT NULL CHECK (estimated_hours > 0),
    actual_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    production_line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
    production_line_name VARCHAR(255),
    assigned_operators JSONB NOT NULL DEFAULT '[]',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    specifications TEXT
);

-- Create work_order_assignments table (for tracking operator assignments)
CREATE TABLE work_order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    production_line_id UUID NOT NULL REFERENCES production_lines(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255) NOT NULL,
    estimated_start_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(work_order_id, operator_id) -- Prevent duplicate assignments
);

-- Create indexes for better performance
CREATE INDEX idx_production_lines_status ON production_lines(status);
CREATE INDEX idx_production_lines_is_active ON production_lines(is_active);
CREATE INDEX idx_production_lines_code ON production_lines(code);

CREATE INDEX idx_operators_employee_id ON operators(employee_id);
CREATE INDEX idx_operators_availability_status ON operators(availability_status);
CREATE INDEX idx_operators_is_active ON operators(is_active);
CREATE INDEX idx_operators_skill_level ON operators(skill_level);

CREATE INDEX idx_work_orders_customer_order_id ON work_orders(customer_order_id);
CREATE INDEX idx_work_orders_product_id ON work_orders(product_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_deadline ON work_orders(deadline);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX idx_work_orders_production_line_id ON work_orders(production_line_id);
CREATE INDEX idx_work_orders_work_order_number ON work_orders(work_order_number);

CREATE INDEX idx_work_order_assignments_work_order_id ON work_order_assignments(work_order_id);
CREATE INDEX idx_work_order_assignments_production_line_id ON work_order_assignments(production_line_id);
CREATE INDEX idx_work_order_assignments_operator_id ON work_order_assignments(operator_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_production_lines_updated_at
    BEFORE UPDATE ON production_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at
    BEFORE UPDATE ON operators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample production lines
INSERT INTO production_lines (name, code, description, capacity, location) VALUES
('Production Line 1', 'PL001', 'Main assembly line for standard products', 100.00, 'Building A - Floor 1'),
('Production Line 2', 'PL002', 'Specialized line for custom products', 80.00, 'Building A - Floor 2'),
('Production Line 3', 'PL003', 'High-capacity line for bulk orders', 150.00, 'Building B - Floor 1'),
('Production Line 4', 'PL004', 'Quality control and testing line', 50.00, 'Building C - Floor 1')
ON CONFLICT (code) DO NOTHING;

-- Insert some sample operators
INSERT INTO operators (employee_id, name, skill_level, department, hourly_rate) VALUES
('EMP001', 'John Smith', 'expert', 'Assembly', 25.00),
('EMP002', 'Jane Doe', 'intermediate', 'Assembly', 20.00),
('EMP003', 'Mike Johnson', 'expert', 'Quality Control', 28.00),
('EMP004', 'Sarah Wilson', 'beginner', 'Assembly', 15.00),
('EMP005', 'Tom Brown', 'intermediate', 'Maintenance', 22.00),
('EMP006', 'Lisa Davis', 'expert', 'Quality Control', 30.00)
ON CONFLICT (employee_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE production_lines IS 'Production lines with capacity and status tracking';
COMMENT ON TABLE operators IS 'Factory operators with skill levels and availability';
COMMENT ON TABLE work_orders IS 'Work orders for production management with full lifecycle tracking';
COMMENT ON TABLE work_order_assignments IS 'Assignments of operators to work orders and production lines';
COMMENT ON SEQUENCE work_order_sequence IS 'Sequence for generating unique work order numbers';

COMMENT ON COLUMN production_lines.status IS 'Line status: available, busy, maintenance, offline';
COMMENT ON COLUMN production_lines.capacity IS 'Maximum capacity in units per hour';
COMMENT ON COLUMN production_lines.current_load IS 'Current utilization percentage (0-100)';

COMMENT ON COLUMN operators.skill_level IS 'Operator skill level: beginner, intermediate, expert, master';
COMMENT ON COLUMN operators.availability_status IS 'Current availability: available, busy, off_duty, on_leave';
COMMENT ON COLUMN operators.current_work_order_id IS 'Currently assigned work order ID';

COMMENT ON COLUMN work_orders.status IS 'Work order status: draft, planned, released, in_progress, completed, on_hold, cancelled';
COMMENT ON COLUMN work_orders.priority IS 'Work order priority: low, medium, high, urgent';
COMMENT ON COLUMN work_orders.progress IS 'Completion progress percentage (0-100)';
COMMENT ON COLUMN work_orders.assigned_operators IS 'JSON array of operator names assigned to this work order';

COMMENT ON COLUMN work_order_assignments.estimated_start_time IS 'Planned start time for this assignment';
COMMENT ON COLUMN work_order_assignments.actual_start_time IS 'Actual start time when work began';
COMMENT ON COLUMN work_order_assignments.estimated_completion_time IS 'Planned completion time';
COMMENT ON COLUMN work_order_assignments.actual_completion_time IS 'Actual completion time when work finished';
