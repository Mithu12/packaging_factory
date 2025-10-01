-- V14: Add Factory Customer Orders Tables
-- This migration creates the factory_customer orders and related tables for the factory module

-- Create sequence for factory_customer order numbers
CREATE SEQUENCE IF NOT EXISTS factory_customer_order_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create factory_customers table (if not exists from other modules)
CREATE TABLE IF NOT EXISTS factory_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    address JSONB NOT NULL DEFAULT '{}',
    credit_limit DECIMAL(15,2),
    payment_terms VARCHAR(50) DEFAULT 'net_30',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create factory_customer orders table
CREATE TABLE factory_customer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    factory_customer_id UUID NOT NULL REFERENCES factory_customers(id) ON DELETE RESTRICT,
    factory_customer_name VARCHAR(255) NOT NULL,
    factory_customer_email VARCHAR(255) NOT NULL,
    factory_customer_phone VARCHAR(20),
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    required_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'quoted', 'approved', 'rejected', 'in_production', 'completed', 'shipped', 'cancelled')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    sales_person VARCHAR(255) NOT NULL,
    notes TEXT,
    terms TEXT,
    payment_terms VARCHAR(20) NOT NULL DEFAULT 'net_30' CHECK (payment_terms IN ('net_15', 'net_30', 'net_45', 'net_60', 'cash', 'advance')),
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Create factory_customer order line items table
CREATE TABLE factory_customer_order_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES factory_customer_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    description TEXT,
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
    discount_percentage DECIMAL(5,2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    specifications TEXT,
    delivery_date TIMESTAMP WITH TIME ZONE,
    is_optional BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_factory_customer_orders_factory_customer_id ON factory_customer_orders(factory_customer_id);
CREATE INDEX idx_factory_customer_orders_status ON factory_customer_orders(status);
CREATE INDEX idx_factory_customer_orders_priority ON factory_customer_orders(priority);
CREATE INDEX idx_factory_customer_orders_order_date ON factory_customer_orders(order_date);
CREATE INDEX idx_factory_customer_orders_required_date ON factory_customer_orders(required_date);
CREATE INDEX idx_factory_customer_orders_sales_person ON factory_customer_orders(sales_person);
CREATE INDEX idx_factory_customer_orders_order_number ON factory_customer_orders(order_number);

CREATE INDEX idx_factory_customer_order_line_items_order_id ON factory_customer_order_line_items(order_id);
CREATE INDEX idx_factory_customer_order_line_items_product_id ON factory_customer_order_line_items(product_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_factory_customer_orders_updated_at
    BEFORE UPDATE ON factory_customer_orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factory_customer_order_line_items_updated_at
    BEFORE UPDATE ON factory_customer_order_line_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample factory_customers if factory_customers table was just created
INSERT INTO factory_customers (name, email, phone, company, address, payment_terms) VALUES
('ABC Manufacturing Ltd', 'orders@abcmanufacturing.com', '+1-555-0123', 'ABC Manufacturing Ltd', 
 '{"street": "123 Industrial Ave", "city": "Manufacturing City", "state": "CA", "postal_code": "90210", "country": "USA"}', 'net_30'),
('XYZ Industries', 'procurement@xyzindustries.com', '+1-555-0456', 'XYZ Industries', 
 '{"street": "456 Business Blvd", "city": "Commerce Town", "state": "NY", "postal_code": "10001", "country": "USA"}', 'net_45'),
('Global Tech Solutions', 'orders@globaltech.com', '+1-555-0789', 'Global Tech Solutions', 
 '{"street": "789 Tech Park", "city": "Silicon Valley", "state": "CA", "postal_code": "94000", "country": "USA"}', 'net_15')
ON CONFLICT (email) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE factory_customer_orders IS 'Factory factory_customer orders with full order lifecycle management';
COMMENT ON TABLE factory_customer_order_line_items IS 'Line items for factory_customer orders with product details and pricing';
COMMENT ON SEQUENCE factory_customer_order_sequence IS 'Sequence for generating unique factory_customer order numbers';

COMMENT ON COLUMN factory_customer_orders.status IS 'Order status: draft, pending, quoted, approved, rejected, in_production, completed, shipped, cancelled';
COMMENT ON COLUMN factory_customer_orders.priority IS 'Order priority: low, medium, high, urgent';
COMMENT ON COLUMN factory_customer_orders.payment_terms IS 'Payment terms: net_15, net_30, net_45, net_60, cash, advance';
COMMENT ON COLUMN factory_customer_orders.shipping_address IS 'JSON object containing shipping address details';
COMMENT ON COLUMN factory_customer_orders.billing_address IS 'JSON object containing billing address details';
COMMENT ON COLUMN factory_customer_orders.attachments IS 'JSON array of attachment file paths';

COMMENT ON COLUMN factory_customer_order_line_items.discount_percentage IS 'Discount percentage (0-100)';
COMMENT ON COLUMN factory_customer_order_line_items.is_optional IS 'Whether this line item is optional for the order';
