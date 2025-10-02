-- Migration: Convert factory tables from UUID to BIGSERIAL
-- This migration changes the ID columns from UUID to BIGSERIAL (auto-incrementing integers)
-- to match the existing database pattern used throughout the ERP system

-- =====================================================
-- Step 1: Drop existing foreign key constraints
-- =====================================================

-- Drop foreign key constraints that reference the UUID columns
ALTER TABLE factory_customer_orders DROP CONSTRAINT IF EXISTS fk_customer_orders_customer_id;
ALTER TABLE factory_customer_order_line_items DROP CONSTRAINT IF EXISTS fk_customer_order_line_items_order_id;
ALTER TABLE factory_customer_order_line_items DROP CONSTRAINT IF EXISTS fk_customer_order_line_items_product_id;

-- =====================================================
-- Step 2: Add new BIGSERIAL columns
-- =====================================================

-- Add new ID columns with BIGSERIAL type
ALTER TABLE factory_customers ADD COLUMN new_id BIGSERIAL;
ALTER TABLE factory_customer_orders ADD COLUMN new_id BIGSERIAL;
ALTER TABLE factory_customer_order_line_items ADD COLUMN new_id BIGSERIAL;

-- =====================================================
-- Step 3: Create mapping tables for data migration
-- =====================================================

-- Create temporary mapping tables to track old UUID to new BIGSERIAL mapping
CREATE TEMP TABLE customer_id_mapping (
    old_id UUID,
    new_id BIGINT
);

CREATE TEMP TABLE order_id_mapping (
    old_id UUID,
    new_id BIGINT
);

-- =====================================================
-- Step 4: Populate mapping tables
-- =====================================================

-- Map old customer UUIDs to new BIGSERIAL IDs
INSERT INTO customer_id_mapping (old_id, new_id)
SELECT id, new_id FROM factory_customers;

-- Map old order UUIDs to new BIGSERIAL IDs
INSERT INTO order_id_mapping (old_id, new_id)
SELECT id, new_id FROM factory_customer_orders;

-- =====================================================
-- Step 5: Update foreign key references
-- =====================================================

-- Update customer_orders to use new customer IDs
UPDATE factory_customer_orders
SET factory_customer_id = cm.new_id::TEXT
FROM customer_id_mapping cm
WHERE factory_customer_orders.factory_customer_id = cm.old_id::TEXT;

-- Update customer_order_line_items to use new order IDs
UPDATE factory_customer_order_line_items
SET order_id = om.new_id::TEXT
FROM order_id_mapping om
WHERE factory_customer_order_line_items.order_id = om.old_id::TEXT;

-- Update customer_order_line_items to use new product IDs (assuming products table uses integer IDs)
UPDATE factory_customer_order_line_items
SET product_id = product_id::INTEGER::TEXT
WHERE product_id ~ '^[0-9]+$';

-- =====================================================
-- Step 6: Drop old UUID columns and rename new columns
-- =====================================================

-- Drop old UUID columns
ALTER TABLE factory_customers DROP COLUMN id;
ALTER TABLE factory_customer_orders DROP COLUMN id;
ALTER TABLE factory_customer_order_line_items DROP COLUMN id;

-- Rename new columns to replace old ones
ALTER TABLE factory_customers RENAME COLUMN new_id TO id;
ALTER TABLE factory_customer_orders RENAME COLUMN new_id TO id;
ALTER TABLE factory_customer_order_line_items RENAME COLUMN new_id TO id;

-- =====================================================
-- Step 7: Set primary keys and constraints
-- =====================================================

-- Set primary key constraints
ALTER TABLE factory_customers ADD PRIMARY KEY (id);
ALTER TABLE factory_customer_orders ADD PRIMARY KEY (id);
ALTER TABLE factory_customer_order_line_items ADD PRIMARY KEY (id);

-- =====================================================
-- Step 8: Recreate foreign key constraints
-- =====================================================

-- Add foreign key constraints with new BIGSERIAL columns
ALTER TABLE factory_customer_orders
ADD CONSTRAINT fk_customer_orders_customer_id 
FOREIGN KEY (factory_customer_id) REFERENCES factory_customers(id);

ALTER TABLE factory_customer_order_line_items
ADD CONSTRAINT fk_customer_order_line_items_order_id 
FOREIGN KEY (order_id) REFERENCES factory_customer_orders(id);

-- Note: Product foreign key will be added after confirming products table structure
-- ALTER TABLE customer_order_line_items 
-- ADD CONSTRAINT fk_customer_order_line_items_product_id 
-- FOREIGN KEY (factory_product_id) REFERENCES products(id);

-- =====================================================
-- Step 9: Update sequences to start from appropriate values
-- =====================================================

-- Reset sequences to start from the maximum existing ID + 1
SELECT setval('factory_customers_id_seq', COALESCE((SELECT MAX(id) FROM factory_customers), 0) + 1);
SELECT setval('customer_orders_id_seq', COALESCE((SELECT MAX(id) FROM factory_customer_orders), 0) + 1);
SELECT setval('customer_order_line_items_id_seq', COALESCE((SELECT MAX(id) FROM factory_customer_order_line_items), 0) + 1);

-- =====================================================
-- Step 10: Update column types for foreign key references
-- =====================================================

-- Change foreign key columns to INTEGER to match the new BIGSERIAL primary keys
ALTER TABLE factory_customer_orders ALTER COLUMN factory_customer_id TYPE INTEGER USING factory_customer_id::INTEGER;
ALTER TABLE factory_customer_order_line_items ALTER COLUMN order_id TYPE INTEGER USING order_id::INTEGER;
ALTER TABLE factory_customer_order_line_items ALTER COLUMN product_id TYPE INTEGER USING product_id::INTEGER;

-- =====================================================
-- Step 11: Add indexes for performance
-- =====================================================

-- Add indexes on foreign key columns
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON factory_customer_orders(factory_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_line_items_order_id ON factory_customer_order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_line_items_product_id ON factory_customer_order_line_items(product_id);

-- Add indexes on commonly queried columns
CREATE INDEX IF NOT EXISTS idx_customer_orders_order_number ON factory_customer_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON factory_customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_order_date ON factory_customer_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_factory_customers_email ON factory_customers(email);
CREATE INDEX IF NOT EXISTS idx_factory_customers_name ON factory_customers(name);

-- =====================================================
-- Migration completed successfully
-- =====================================================

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Migration V16 completed: Converted factory tables from UUID to BIGSERIAL';
    RAISE NOTICE 'factory_customers: % records', (SELECT COUNT(*) FROM factory_customers);
    RAISE NOTICE 'customer_orders: % records', (SELECT COUNT(*) FROM factory_customer_orders);
    RAISE NOTICE 'customer_order_line_items: % records', (SELECT COUNT(*) FROM factory_customer_order_line_items);
END $$;
