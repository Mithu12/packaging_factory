-- Product Warranty and Service Time Fields
-- Version: 1.6.0
-- Description: Adds warranty period and service time fields to products table

-- Add warranty_period column (integer, months)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS warranty_period INTEGER DEFAULT NULL;

-- Add service_time column (integer, months)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS service_time INTEGER DEFAULT NULL;

-- Add comments to the columns
COMMENT ON COLUMN products.warranty_period IS 'Warranty period in months';
COMMENT ON COLUMN products.service_time IS 'Service reminder interval in months';
