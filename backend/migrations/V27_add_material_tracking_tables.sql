-- =========================================
-- Migration: V27_add_material_tracking_tables
-- Description: Creates material allocation and wastage tracking tables
-- Author: Factory Module Implementation
-- Date: 2025-03-10
-- =========================================

-- Work Order Material Allocations: Track material allocations to work orders
CREATE TABLE IF NOT EXISTS work_order_material_allocations (
    id BIGSERIAL PRIMARY KEY,
    work_order_requirement_id UUID NOT NULL REFERENCES work_order_material_requirements(id) ON DELETE CASCADE,
    inventory_item_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Allocation details
    allocated_quantity NUMERIC(10, 2) NOT NULL CHECK (allocated_quantity > 0),
    allocated_from_location VARCHAR(100) NOT NULL,
    allocated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    allocated_by INTEGER NOT NULL REFERENCES users(id),
    
    -- Status tracking
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'allocated',
        'consumed',
        'returned',
        'short'
    )) DEFAULT 'allocated',
    
    -- Additional info
    expiry_date DATE,
    batch_number VARCHAR(100),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Work Order Material Consumptions: Track actual material consumption
CREATE TABLE IF NOT EXISTS work_order_material_consumptions (
    id BIGSERIAL PRIMARY KEY,
    work_order_requirement_id UUID NOT NULL REFERENCES work_order_material_requirements(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    material_name VARCHAR(255) NOT NULL,
    
    -- Consumption details
    consumed_quantity NUMERIC(10, 2) NOT NULL CHECK (consumed_quantity > 0),
    wastage_quantity NUMERIC(10, 2) DEFAULT 0 CHECK (wastage_quantity >= 0),
    wastage_reason TEXT,
    
    -- Location and timing
    consumption_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    production_line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
    operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    
    -- Tracking
    batch_number VARCHAR(100),
    consumed_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Material Wastage: Separate tracking for wastage reporting and approval
CREATE TABLE IF NOT EXISTS material_wastage (
    id BIGSERIAL PRIMARY KEY,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    material_name VARCHAR(255) NOT NULL,
    
    -- Wastage details
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    wastage_reason VARCHAR(255) NOT NULL,
    cost NUMERIC(10, 2) DEFAULT 0,
    
    -- Status and approval
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'pending',
        'approved',
        'rejected'
    )) DEFAULT 'pending',
    recorded_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional info
    batch_number VARCHAR(100),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_material_allocations_requirement 
    ON work_order_material_allocations(work_order_requirement_id);
CREATE INDEX IF NOT EXISTS idx_material_allocations_inventory 
    ON work_order_material_allocations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_material_allocations_status 
    ON work_order_material_allocations(status);
CREATE INDEX IF NOT EXISTS idx_material_allocations_date 
    ON work_order_material_allocations(allocated_date);

CREATE INDEX IF NOT EXISTS idx_material_consumptions_requirement 
    ON work_order_material_consumptions(work_order_requirement_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_work_order 
    ON work_order_material_consumptions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_material 
    ON work_order_material_consumptions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_date 
    ON work_order_material_consumptions(consumption_date);

CREATE INDEX IF NOT EXISTS idx_material_wastage_work_order 
    ON material_wastage(work_order_id);
CREATE INDEX IF NOT EXISTS idx_material_wastage_material 
    ON material_wastage(material_id);
CREATE INDEX IF NOT EXISTS idx_material_wastage_status 
    ON material_wastage(status);
CREATE INDEX IF NOT EXISTS idx_material_wastage_date 
    ON material_wastage(recorded_date);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_material_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_material_consumptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_material_wastage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_material_allocations_updated_at
    BEFORE UPDATE ON work_order_material_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_material_allocations_updated_at();

CREATE TRIGGER trigger_update_material_consumptions_updated_at
    BEFORE UPDATE ON work_order_material_consumptions
    FOR EACH ROW
    EXECUTE FUNCTION update_material_consumptions_updated_at();

CREATE TRIGGER trigger_update_material_wastage_updated_at
    BEFORE UPDATE ON material_wastage
    FOR EACH ROW
    EXECUTE FUNCTION update_material_wastage_updated_at();

-- Comments
COMMENT ON TABLE work_order_material_allocations IS 'Tracks material allocations to work orders from inventory';
COMMENT ON TABLE work_order_material_consumptions IS 'Records actual material consumption during production';
COMMENT ON TABLE material_wastage IS 'Tracks and manages material wastage with approval workflow';

