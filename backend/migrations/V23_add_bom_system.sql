-- V23: Add Bill of Materials (BOM) System Tables
-- This migration creates the BOM tables for managing product components and material requirements

-- Create bill_of_materials table
CREATE TABLE bill_of_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_cost DECIMAL(15,4) NOT NULL DEFAULT 0,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(parent_product_id, version)
);

-- Create bom_components table
CREATE TABLE bom_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    component_product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_required DECIMAL(15,4) NOT NULL CHECK (quantity_required > 0),
    unit_of_measure VARCHAR(20) NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    scrap_factor DECIMAL(5,2) DEFAULT 0 CHECK (scrap_factor >= 0 AND scrap_factor <= 100),
    unit_cost DECIMAL(15,4) NOT NULL,
    total_cost DECIMAL(15,4) NOT NULL,
    lead_time_days INTEGER DEFAULT 0,
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    specifications TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create work_order_material_requirements table
CREATE TABLE work_order_material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    material_sku VARCHAR(100) NOT NULL,
    required_quantity DECIMAL(15,4) NOT NULL CHECK (required_quantity > 0),
    allocated_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    consumed_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'short', 'fulfilled', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 1,
    required_date DATE NOT NULL,
    bom_component_id UUID REFERENCES bom_components(id) ON DELETE SET NULL,
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    unit_cost DECIMAL(15,4) NOT NULL,
    total_cost DECIMAL(15,4) NOT NULL,
    lead_time_days INTEGER DEFAULT 0,
    is_critical BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create work_order_material_allocations table
CREATE TABLE work_order_material_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_requirement_id UUID NOT NULL REFERENCES work_order_material_requirements(id) ON DELETE CASCADE,
    inventory_item_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    allocated_quantity DECIMAL(15,4) NOT NULL CHECK (allocated_quantity > 0),
    allocated_from_location VARCHAR(255) NOT NULL,
    allocated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    allocated_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated', 'consumed', 'returned', 'short')),
    expiry_date DATE,
    batch_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create work_order_material_consumptions table
CREATE TABLE work_order_material_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    consumed_quantity DECIMAL(15,4) NOT NULL CHECK (consumed_quantity > 0),
    consumption_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    production_line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
    production_line_name VARCHAR(255),
    consumed_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    wastage_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    wastage_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create material_shortages table for tracking shortages
CREATE TABLE material_shortages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    material_sku VARCHAR(100) NOT NULL,
    required_quantity DECIMAL(15,4) NOT NULL CHECK (required_quantity > 0),
    available_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    shortfall_quantity DECIMAL(15,4) NOT NULL,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    work_order_number VARCHAR(50) NOT NULL,
    required_date DATE NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    lead_time_days INTEGER DEFAULT 0,
    suggested_action VARCHAR(20) NOT NULL CHECK (suggested_action IN ('purchase', 'substitute', 'delay', 'split', 'po_created')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'cancelled')),
    resolved_date TIMESTAMP WITH TIME ZONE,
    resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_bom_parent_product_id ON bill_of_materials(parent_product_id);
CREATE INDEX idx_bom_is_active ON bill_of_materials(is_active);
CREATE INDEX idx_bom_created_by ON bill_of_materials(created_by);

CREATE INDEX idx_bom_components_bom_id ON bom_components(bom_id);
CREATE INDEX idx_bom_components_component_product_id ON bom_components(component_product_id);
CREATE INDEX idx_bom_components_supplier_id ON bom_components(supplier_id);

CREATE INDEX idx_work_order_material_requirements_work_order_id ON work_order_material_requirements(work_order_id);
CREATE INDEX idx_work_order_material_requirements_material_id ON work_order_material_requirements(material_id);
CREATE INDEX idx_work_order_material_requirements_status ON work_order_material_requirements(status);
CREATE INDEX idx_work_order_material_requirements_required_date ON work_order_material_requirements(required_date);
CREATE INDEX idx_work_order_material_requirements_priority ON work_order_material_requirements(priority);

CREATE INDEX idx_work_order_material_allocations_requirement_id ON work_order_material_allocations(work_order_requirement_id);
CREATE INDEX idx_work_order_material_allocations_inventory_item_id ON work_order_material_allocations(inventory_item_id);
CREATE INDEX idx_work_order_material_allocations_status ON work_order_material_allocations(status);
CREATE INDEX idx_work_order_material_allocations_allocated_by ON work_order_material_allocations(allocated_by);

CREATE INDEX idx_work_order_material_consumptions_work_order_id ON work_order_material_consumptions(work_order_id);
CREATE INDEX idx_work_order_material_consumptions_material_id ON work_order_material_consumptions(material_id);
CREATE INDEX idx_work_order_material_consumptions_consumption_date ON work_order_material_consumptions(consumption_date);

CREATE INDEX idx_material_shortages_material_id ON material_shortages(material_id);
CREATE INDEX idx_material_shortages_work_order_id ON material_shortages(work_order_id);
CREATE INDEX idx_material_shortages_priority ON material_shortages(priority);
CREATE INDEX idx_material_shortages_status ON material_shortages(status);
CREATE INDEX idx_material_shortages_required_date ON material_shortages(required_date);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_bom_updated_at
    BEFORE UPDATE ON bill_of_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_components_updated_at
    BEFORE UPDATE ON bom_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_order_material_requirements_updated_at
    BEFORE UPDATE ON work_order_material_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_order_material_allocations_updated_at
    BEFORE UPDATE ON work_order_material_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_order_material_consumptions_updated_at
    BEFORE UPDATE ON work_order_material_consumptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_shortages_updated_at
    BEFORE UPDATE ON material_shortages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample BOM data for testing
-- Note: This assumes you have existing products in your system
-- You may need to adjust these IDs based on your actual product data

-- Sample BOM for a fictional product (replace with actual product IDs)
-- INSERT INTO bill_of_materials (parent_product_id, version, effective_date, total_cost, created_by)
-- VALUES ('product-id-1', '1.0', CURRENT_DATE, 150.00, 1)
-- ON CONFLICT (parent_product_id, version) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE bill_of_materials IS 'Bill of Materials master records defining product compositions';
COMMENT ON TABLE bom_components IS 'Individual components that make up a BOM';
COMMENT ON TABLE work_order_material_requirements IS 'Material requirements for specific work orders';
COMMENT ON TABLE work_order_material_allocations IS 'Allocated inventory for work order material requirements';
COMMENT ON TABLE work_order_material_consumptions IS 'Actual consumption of materials during production';
COMMENT ON TABLE material_shortages IS 'Tracking and managing material shortages for work orders';

COMMENT ON COLUMN bom_components.scrap_factor IS 'Percentage of material expected to be wasted during production';
COMMENT ON COLUMN work_order_material_requirements.status IS 'Status: pending, allocated, short, fulfilled, cancelled';
COMMENT ON COLUMN work_order_material_allocations.status IS 'Allocation status: allocated, consumed, returned, short';
COMMENT ON COLUMN material_shortages.suggested_action IS 'Suggested action: purchase, substitute, delay, split, po_created';
