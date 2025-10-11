-- V45: Add shipping columns to factory customer orders
-- This migration adds shipping-related columns for tracking shipments

-- Add shipping columns to factory_customer_orders table
ALTER TABLE factory_customer_orders
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'failed', 'returned'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_factory_orders_tracking_number ON factory_customer_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_factory_orders_carrier ON factory_customer_orders(carrier);
CREATE INDEX IF NOT EXISTS idx_factory_orders_delivery_status ON factory_customer_orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_factory_orders_estimated_delivery ON factory_customer_orders(estimated_delivery_date);

-- Comments for documentation
COMMENT ON COLUMN factory_customer_orders.tracking_number IS 'Tracking number for shipment';
COMMENT ON COLUMN factory_customer_orders.carrier IS 'Shipping carrier (UPS, FedEx, DHL, etc.)';
COMMENT ON COLUMN factory_customer_orders.estimated_delivery_date IS 'Expected delivery date';
COMMENT ON COLUMN factory_customer_orders.actual_delivery_date IS 'Actual delivery date when confirmed';
COMMENT ON COLUMN factory_customer_orders.shipping_cost IS 'Cost of shipping this order';
COMMENT ON COLUMN factory_customer_orders.delivery_status IS 'Delivery status: pending, in_transit, delivered, failed, returned';

-- Create view for shipping tracking
CREATE OR REPLACE VIEW factory_customer_orders_shipping_status AS
SELECT
    fco.id,
    fco.order_number,
    fco.status as order_status,
    fco.tracking_number,
    fco.carrier,
    fco.estimated_delivery_date,
    fco.actual_delivery_date,
    fco.shipping_cost,
    fco.delivery_status,
    fco.shipped_at,
    fco.required_date,
    -- Calculate delivery performance
    CASE
        WHEN fco.actual_delivery_date IS NOT NULL AND fco.actual_delivery_date <= fco.required_date THEN 'on_time'
        WHEN fco.actual_delivery_date IS NOT NULL AND fco.actual_delivery_date > fco.required_date THEN 'delayed'
        WHEN fco.estimated_delivery_date IS NOT NULL AND fco.estimated_delivery_date <= fco.required_date THEN 'on_schedule'
        WHEN fco.estimated_delivery_date IS NOT NULL AND fco.estimated_delivery_date > fco.required_date THEN 'at_risk'
        ELSE 'unknown'
    END as delivery_performance,
    -- Days difference from required date
    CASE
        WHEN fco.actual_delivery_date IS NOT NULL THEN
            EXTRACT(DAYS FROM fco.actual_delivery_date - fco.required_date)
        ELSE
            EXTRACT(DAYS FROM fco.estimated_delivery_date - fco.required_date)
    END as delivery_variance_days
FROM factory_customer_orders fco
WHERE fco.status IN ('completed', 'shipped');

COMMENT ON VIEW factory_customer_orders_shipping_status IS 'View showing shipping status and delivery performance for factory customer orders';
