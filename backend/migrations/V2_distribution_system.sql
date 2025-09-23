-- =====================================================
-- Distribution System Migration V2
-- Adds comprehensive product distribution functionality
-- =====================================================

-- Distribution Centers / Warehouses
CREATE TABLE distribution_centers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'warehouse', -- warehouse, distribution_center, retail_store, cross_dock
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    capacity_volume DECIMAL(12,2), -- cubic meters
    capacity_weight DECIMAL(12,2), -- kg
    operating_hours JSONB, -- {"monday": {"open": "08:00", "close": "17:00"}, ...}
    facilities JSONB, -- ["loading_dock", "refrigeration", "security", ...]
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    is_primary BOOLEAN DEFAULT false,
    manager_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Stock by Location
CREATE TABLE product_locations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    distribution_center_id INTEGER NOT NULL REFERENCES distribution_centers(id) ON DELETE CASCADE,
    current_stock DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (current_stock >= 0),
    reserved_stock DECIMAL(10,2) DEFAULT 0 NOT NULL CHECK (reserved_stock >= 0),
    available_stock DECIMAL(10,2) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    max_stock_level DECIMAL(10,2),
    reorder_point DECIMAL(10,2),
    location_in_warehouse VARCHAR(100), -- e.g., "A-12-B", "Zone-C-Shelf-5"
    last_count_date DATE,
    last_movement_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, distribution_center_id)
);

-- Stock Movements between locations
CREATE TABLE stock_transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id),
    from_center_id INTEGER REFERENCES distribution_centers(id),
    to_center_id INTEGER NOT NULL REFERENCES distribution_centers(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    shipped_date TIMESTAMP WITH TIME ZONE,
    received_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'in_transit', 'received', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    requested_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    shipped_by INTEGER REFERENCES users(id),
    received_by INTEGER REFERENCES users(id),
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    shipping_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Distribution Routes
CREATE TABLE distribution_routes (
    id SERIAL PRIMARY KEY,
    route_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    from_center_id INTEGER NOT NULL REFERENCES distribution_centers(id),
    to_center_id INTEGER NOT NULL REFERENCES distribution_centers(id),
    distance_km DECIMAL(8,2),
    estimated_transit_time INTEGER, -- hours
    transport_type VARCHAR(50), -- truck, air, rail, sea
    carrier VARCHAR(255),
    cost_per_kg DECIMAL(8,4),
    cost_per_km DECIMAL(8,4),
    max_weight DECIMAL(10,2),
    max_volume DECIMAL(10,2),
    service_days INTEGER[], -- [1,2,3,4,5] for Mon-Fri
    cutoff_time TIME, -- last pickup time
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shipments (collections of products being moved)
CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    route_id INTEGER NOT NULL REFERENCES distribution_routes(id),
    from_center_id INTEGER NOT NULL REFERENCES distribution_centers(id),
    to_center_id INTEGER NOT NULL REFERENCES distribution_centers(id),
    shipment_type VARCHAR(50) DEFAULT 'regular', -- regular, express, priority, emergency
    total_weight DECIMAL(10,2),
    total_volume DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    planned_departure TIMESTAMP WITH TIME ZONE,
    actual_departure TIMESTAMP WITH TIME ZONE,
    planned_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'ready', 'in_transit', 'delivered', 'cancelled', 'delayed')),
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    vehicle_info VARCHAR(255),
    created_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Line Items
CREATE TABLE shipment_items (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    transfer_id INTEGER REFERENCES stock_transfers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_weight DECIMAL(8,2),
    unit_volume DECIMAL(8,2),
    total_weight DECIMAL(10,2),
    total_volume DECIMAL(10,2),
    condition_on_departure VARCHAR(50) DEFAULT 'good', -- good, damaged, expired
    condition_on_arrival VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order Fulfillment (link sales orders to distribution)
CREATE TABLE order_fulfillments (
    id SERIAL PRIMARY KEY,
    sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id),
    fulfillment_number VARCHAR(50) UNIQUE NOT NULL,
    distribution_center_id INTEGER NOT NULL REFERENCES distribution_centers(id),
    shipment_id INTEGER REFERENCES shipments(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'picking', 'packed', 'shipped', 'delivered', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    pick_start_time TIMESTAMP WITH TIME ZONE,
    pick_complete_time TIMESTAMP WITH TIME ZONE,
    pack_complete_time TIMESTAMP WITH TIME ZONE,
    ship_time TIMESTAMP WITH TIME ZONE,
    delivery_time TIMESTAMP WITH TIME ZONE,
    assigned_picker INTEGER REFERENCES users(id),
    assigned_packer INTEGER REFERENCES users(id),
    tracking_number VARCHAR(100),
    shipping_cost DECIMAL(10,2),
    delivery_address TEXT,
    delivery_instructions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fulfillment Line Items
CREATE TABLE fulfillment_items (
    id SERIAL PRIMARY KEY,
    fulfillment_id INTEGER NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
    sales_order_item_id INTEGER NOT NULL REFERENCES sales_order_line_items(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    requested_quantity DECIMAL(10,2) NOT NULL,
    picked_quantity DECIMAL(10,2) DEFAULT 0,
    shipped_quantity DECIMAL(10,2) DEFAULT 0,
    location_in_warehouse VARCHAR(100),
    pick_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Distribution Analytics Views
CREATE VIEW distribution_center_stats AS
SELECT 
    dc.id,
    dc.name,
    dc.type,
    dc.status,
    COUNT(pl.id) as total_products,
    SUM(pl.current_stock) as total_stock,
    SUM(pl.current_stock * p.cost_price) as total_inventory_value,
    COUNT(CASE WHEN pl.current_stock <= pl.min_stock_level THEN 1 END) as low_stock_products,
    COUNT(st_from.id) as outbound_transfers,
    COUNT(st_to.id) as inbound_transfers
FROM distribution_centers dc
LEFT JOIN product_locations pl ON dc.id = pl.distribution_center_id AND pl.status = 'active'
LEFT JOIN products p ON pl.product_id = p.id
LEFT JOIN stock_transfers st_from ON dc.id = st_from.from_center_id AND st_from.created_at >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN stock_transfers st_to ON dc.id = st_to.to_center_id AND st_to.created_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE dc.status = 'active'
GROUP BY dc.id, dc.name, dc.type, dc.status;

-- Inventory allocation view (for order fulfillment)
CREATE VIEW product_allocation_view AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name as product_name,
    pl.distribution_center_id,
    dc.name as center_name,
    dc.type as center_type,
    dc.city,
    dc.state,
    pl.available_stock,
    pl.reserved_stock,
    pl.current_stock,
    dc.latitude,
    dc.longitude,
    CASE 
        WHEN pl.available_stock <= 0 THEN 'out_of_stock'
        WHEN pl.available_stock <= pl.min_stock_level THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status
FROM products p
JOIN product_locations pl ON p.id = pl.product_id
JOIN distribution_centers dc ON pl.distribution_center_id = dc.id
WHERE p.status = 'active' AND dc.status = 'active' AND pl.status = 'active';

-- Create sequences for auto-generated codes
CREATE SEQUENCE distribution_center_code_seq START 1;
CREATE SEQUENCE transfer_number_seq START 1;
CREATE SEQUENCE shipment_number_seq START 1;
CREATE SEQUENCE fulfillment_number_seq START 1;

-- Create indexes for performance
CREATE INDEX idx_product_locations_product_id ON product_locations(product_id);
CREATE INDEX idx_product_locations_center_id ON product_locations(distribution_center_id);
CREATE INDEX idx_product_locations_available_stock ON product_locations(available_stock);
CREATE INDEX idx_stock_transfers_product_id ON stock_transfers(product_id);
CREATE INDEX idx_stock_transfers_from_center ON stock_transfers(from_center_id);
CREATE INDEX idx_stock_transfers_to_center ON stock_transfers(to_center_id);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX idx_shipments_route_id ON shipments(route_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_order_fulfillments_sales_order ON order_fulfillments(sales_order_id);
CREATE INDEX idx_order_fulfillments_center ON order_fulfillments(distribution_center_id);
CREATE INDEX idx_order_fulfillments_status ON order_fulfillments(status);

-- Update products table to support distribution
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_distributed BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS distribution_unit VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_weight DECIMAL(8,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_dimensions VARCHAR(100);

-- Update existing stock adjustments to reference locations if needed
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS distribution_center_id INTEGER REFERENCES distribution_centers(id);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_product_locations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_product_locations_timestamp
    BEFORE UPDATE ON product_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_product_locations_timestamp();

CREATE TRIGGER trigger_stock_transfers_timestamp
    BEFORE UPDATE ON stock_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_product_locations_timestamp();

CREATE TRIGGER trigger_distribution_centers_timestamp
    BEFORE UPDATE ON distribution_centers
    FOR EACH ROW
    EXECUTE FUNCTION update_product_locations_timestamp();

CREATE TRIGGER trigger_shipments_timestamp
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_product_locations_timestamp();

CREATE TRIGGER trigger_order_fulfillments_timestamp
    BEFORE UPDATE ON order_fulfillments
    FOR EACH ROW
    EXECUTE FUNCTION update_product_locations_timestamp();

-- Function to automatically generate codes
CREATE OR REPLACE FUNCTION generate_distribution_center_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'DC-' || LPAD(nextval('distribution_center_code_seq')::text, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_generate_distribution_center_code
    BEFORE INSERT ON distribution_centers
    FOR EACH ROW
    EXECUTE FUNCTION generate_distribution_center_code();

-- Insert default main warehouse
INSERT INTO distribution_centers (
    code, name, type, address, city, state, country, 
    is_primary, status, notes, contact_person
) VALUES (
    'DC-001', 
    'Main Warehouse', 
    'warehouse',
    'Main Street 123',
    'Default City',
    'Default State',
    'USA',
    true,
    'active',
    'Primary distribution center - automatically created during migration',
    'Warehouse Manager'
) ON CONFLICT (code) DO NOTHING;

-- Migrate existing product stock to main warehouse
INSERT INTO product_locations (product_id, distribution_center_id, current_stock, min_stock_level, max_stock_level)
SELECT 
    p.id,
    dc.id,
    p.current_stock,
    p.min_stock_level,
    p.max_stock_level
FROM products p
CROSS JOIN distribution_centers dc
WHERE dc.code = 'DC-001'
ON CONFLICT (product_id, distribution_center_id) DO NOTHING;

COMMENT ON TABLE distribution_centers IS 'Physical locations where products are stored and distributed from';
COMMENT ON TABLE product_locations IS 'Product inventory levels at specific distribution centers';
COMMENT ON TABLE stock_transfers IS 'Requests and records of stock movements between distribution centers';
COMMENT ON TABLE distribution_routes IS 'Predefined routes between distribution centers with costs and timing';
COMMENT ON TABLE shipments IS 'Collections of products being shipped between locations';
COMMENT ON TABLE order_fulfillments IS 'Sales order processing and fulfillment from distribution centers';
COMMENT ON VIEW distribution_center_stats IS 'Real-time statistics for each distribution center';
COMMENT ON VIEW product_allocation_view IS 'Product availability across all distribution centers for order fulfillment';
