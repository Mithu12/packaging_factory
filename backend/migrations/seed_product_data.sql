-- Product and Related Tables Seed Script
-- This script populates the database with sample data for products and all related tables
-- 
-- Tables being seeded:
-- - categories
-- - subcategories  
-- - brands
-- - origins
-- - suppliers
-- - products
-- - pricing_rules
-- - bill_of_materials
-- - bom_components
-- - work_orders
-- - work_order_material_requirements
--
-- Run this script after all migrations have been applied
-- Use: psql -d your_database -f seed_product_data.sql

-- Start transaction to ensure atomicity
BEGIN;

-- =============================================================================
-- CATEGORIES AND SUBCATEGORIES
-- =============================================================================

-- Insert Categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic components and devices'),
('Raw Materials', 'Base materials used in manufacturing'),
('Mechanical Parts', 'Mechanical components and hardware'),
('Packaging', 'Packaging materials and supplies'),
('Tools & Equipment', 'Manufacturing tools and equipment'),
('Chemicals', 'Chemical products and compounds'),
('Textiles', 'Fabric and textile materials'),
('Safety Equipment', 'Personal protective equipment and safety gear')
ON CONFLICT (name) DO NOTHING;

-- Get category IDs for subcategories
-- Insert Subcategories
INSERT INTO subcategories (name, description, category_id) VALUES
-- Electronics subcategories
('Resistors', 'Electronic resistors of various values', (SELECT id FROM categories WHERE name = 'Electronics')),
('Capacitors', 'Electronic capacitors and condensers', (SELECT id FROM categories WHERE name = 'Electronics')),
('Microcontrollers', 'Programmable microcontroller units', (SELECT id FROM categories WHERE name = 'Electronics')),
('Sensors', 'Electronic sensors and detectors', (SELECT id FROM categories WHERE name = 'Electronics')),
('Connectors', 'Electronic connectors and cables', (SELECT id FROM categories WHERE name = 'Electronics')),

-- Raw Materials subcategories
('Metals', 'Metal sheets, rods, and raw metals', (SELECT id FROM categories WHERE name = 'Raw Materials')),
('Plastics', 'Plastic pellets and sheets', (SELECT id FROM categories WHERE name = 'Raw Materials')),
('Rubber', 'Rubber compounds and sheets', (SELECT id FROM categories WHERE name = 'Raw Materials')),
('Wood', 'Wood planks and lumber', (SELECT id FROM categories WHERE name = 'Raw Materials')),

-- Mechanical Parts subcategories
('Screws', 'Various types of screws and fasteners', (SELECT id FROM categories WHERE name = 'Mechanical Parts')),
('Bearings', 'Ball bearings and mechanical bearings', (SELECT id FROM categories WHERE name = 'Mechanical Parts')),
('Gears', 'Mechanical gears and transmission parts', (SELECT id FROM categories WHERE name = 'Mechanical Parts')),
('Springs', 'Mechanical springs of various types', (SELECT id FROM categories WHERE name = 'Mechanical Parts')),

-- Packaging subcategories  
('Boxes', 'Cardboard and shipping boxes', (SELECT id FROM categories WHERE name = 'Packaging')),
('Labels', 'Product labels and stickers', (SELECT id FROM categories WHERE name = 'Packaging')),
('Protective Materials', 'Bubble wrap and protective packaging', (SELECT id FROM categories WHERE name = 'Packaging')),

-- Tools & Equipment subcategories
('Hand Tools', 'Manual tools and implements', (SELECT id FROM categories WHERE name = 'Tools & Equipment')),
('Power Tools', 'Electric and pneumatic tools', (SELECT id FROM categories WHERE name = 'Tools & Equipment')),
('Measuring Tools', 'Precision measuring instruments', (SELECT id FROM categories WHERE name = 'Tools & Equipment'))
ON CONFLICT (name, category_id) DO NOTHING;

-- =============================================================================
-- BRANDS
-- =============================================================================

INSERT INTO brands (name, description, is_active) VALUES
('TechCorp', 'Leading electronics manufacturer', true),
('MechanoMax', 'Premium mechanical parts supplier', true),
('PlastiForm', 'Plastic manufacturing specialist', true),
('MetalWorks', 'High-quality metal components', true),
('SafeGuard', 'Industrial safety equipment', true),
('PrecisionTools', 'Professional tool manufacturer', true),
('ChemLab', 'Chemical compounds and materials', true),
('EcoPackage', 'Sustainable packaging solutions', true),
('PowerMax', 'Electronic components supplier', true),
('IndustrialPro', 'Professional industrial equipment', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- ORIGINS
-- =============================================================================

INSERT INTO origins (name, description, status) VALUES
('China', 'Manufactured in China', 'active'),
('Germany', 'Manufactured in Germany', 'active'),
('Japan', 'Manufactured in Japan', 'active'),
('USA', 'Manufactured in United States', 'active'),
('South Korea', 'Manufactured in South Korea', 'active'),
('Taiwan', 'Manufactured in Taiwan', 'active'),
('India', 'Manufactured in India', 'active'),
('Mexico', 'Manufactured in Mexico', 'active'),
('Canada', 'Manufactured in Canada', 'active'),
('Italy', 'Manufactured in Italy', 'active')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SUPPLIERS
-- =============================================================================

INSERT INTO suppliers (
    supplier_code, name, contact_person, phone, email, website, 
    address, city, state, zip_code, country, category, 
    payment_terms, status, rating
) VALUES
('SUP001', 'Global Electronics Supply Co', 'John Chen', '+86-21-1234-5678', 'orders@globalelec.com', 'www.globalelec.com',
 '123 Industrial Road', 'Shanghai', 'Shanghai', '200001', 'China', 'Electronics', 'Net 30', 'active', 4.5),
 
('SUP002', 'Precision Mechanical Parts Ltd', 'Hans Mueller', '+49-30-9876-5432', 'sales@precisionmech.de', 'www.precisionmech.de',
 '456 Manufacturing Street', 'Berlin', 'Berlin', '10115', 'Germany', 'Mechanical', 'Net 45', 'active', 4.8),
 
('SUP003', 'American Materials Corp', 'Sarah Johnson', '+1-555-123-4567', 'procurement@ammatcorp.com', 'www.ammatcorp.com',
 '789 Commerce Ave', 'Detroit', 'MI', '48201', 'USA', 'Raw Materials', 'Net 30', 'active', 4.2),
 
('SUP004', 'Pacific Plastics International', 'Taro Yamamoto', '+81-3-1234-5678', 'orders@pacificplastics.jp', 'www.pacificplastics.jp',
 '321 Polymer Park', 'Tokyo', 'Tokyo', '100-0001', 'Japan', 'Plastics', 'Net 60', 'active', 4.6),
 
('SUP005', 'Industrial Safety Systems', 'Maria Rodriguez', '+1-555-987-6543', 'safety@indsafety.com', 'www.indsafety.com',
 '654 Safety Blvd', 'Houston', 'TX', '77001', 'USA', 'Safety Equipment', 'Net 30', 'active', 4.7),
 
('SUP006', 'Korean Tech Components', 'Kim Min-jun', '+82-2-9876-5432', 'tech@koreantech.kr', 'www.koreantech.kr',
 '987 Technology Road', 'Seoul', 'Seoul', '04524', 'South Korea', 'Electronics', 'Net 45', 'active', 4.4),
 
('SUP007', 'European Chemical Solutions', 'Luigi Rossi', '+39-02-1234-5678', 'chemicals@eurochem.it', 'www.eurochem.it',
 '159 Chemical Lane', 'Milan', 'Lombardy', '20121', 'Italy', 'Chemicals', 'Net 30', 'active', 4.3),
 
('SUP008', 'Canadian Wood Products', 'David Thompson', '+1-416-555-0123', 'lumber@canwood.ca', 'www.canwood.ca',
 '753 Forest Ave', 'Toronto', 'ON', 'M5H 2N2', 'Canada', 'Wood Products', 'Net 45', 'active', 4.1),
 
('SUP009', 'Mexican Manufacturing Supplies', 'Carlos Hernandez', '+52-55-1234-5678', 'supplies@mexmfg.mx', 'www.mexmfg.mx',
 '852 Industrial Zone', 'Mexico City', 'CDMX', '01000', 'Mexico', 'General Supplies', 'Net 30', 'active', 4.0),
 
('SUP010', 'Advanced Tool Systems', 'Robert Smith', '+1-555-246-8135', 'tools@advancedtools.com', 'www.advancedtools.com',
 '951 Tool Street', 'Cleveland', 'OH', '44101', 'USA', 'Tools', 'Net 30', 'active', 4.9)
ON CONFLICT (supplier_code) DO NOTHING;

-- =============================================================================
-- PRODUCTS
-- =============================================================================

-- Set sequences to ensure we have proper product codes
SELECT setval('product_code_sequence', 1000);

INSERT INTO products (
    product_code, sku, name, description, category_id, subcategory_id, 
    brand_id, unit_of_measure, cost_price, selling_price, current_stock,
    min_stock_level, max_stock_level, supplier_id, status, barcode,
    weight, tax_rate, reorder_point, reorder_quantity, warranty_period, origin_id
) VALUES
-- Electronics Products
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'RES-10K-1W', 'Resistor 10K Ohm 1W', 'Carbon film resistor, 10K ohm, 1 watt, ±5% tolerance', 
 (SELECT id FROM categories WHERE name = 'Electronics'), (SELECT id FROM subcategories WHERE name = 'Resistors'),
 (SELECT id FROM brands WHERE name = 'TechCorp'), 'pieces', 0.15, 0.25, 5000, 1000, 10000,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'), 'active', '1234567890123', 0.01, 10.00, 1000, 5000, 12,
 (SELECT id FROM origins WHERE name = 'China')),

('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'CAP-100UF-25V', 'Capacitor 100uF 25V', 'Electrolytic capacitor, 100 microfarad, 25 volt rating', 
 (SELECT id FROM categories WHERE name = 'Electronics'), (SELECT id FROM subcategories WHERE name = 'Capacitors'),
 (SELECT id FROM brands WHERE name = 'PowerMax'), 'pieces', 0.45, 0.75, 3000, 500, 8000,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'), 'active', '1234567890124', 0.02, 10.00, 500, 2000, 24,
 (SELECT id FROM origins WHERE name = 'Japan')),

('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'MCU-ARM-STM32', 'STM32 Microcontroller', '32-bit ARM Cortex-M4 microcontroller with 256KB Flash', 
 (SELECT id FROM categories WHERE name = 'Electronics'), (SELECT id FROM subcategories WHERE name = 'Microcontrollers'),
 (SELECT id FROM brands WHERE name = 'TechCorp'), 'pieces', 8.50, 15.00, 200, 50, 500,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP006'), 'active', '1234567890125', 0.05, 10.00, 50, 100, 36,
 (SELECT id FROM origins WHERE name = 'South Korea')),

('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'TEMP-SENSOR-DS18B20', 'Temperature Sensor DS18B20', 'Digital temperature sensor with 1-wire interface', 
 (SELECT id FROM categories WHERE name = 'Electronics'), (SELECT id FROM subcategories WHERE name = 'Sensors'),
 (SELECT id FROM brands WHERE name = 'TechCorp'), 'pieces', 2.25, 4.50, 800, 100, 2000,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'), 'active', '1234567890126', 0.01, 10.00, 100, 500, 24,
 (SELECT id FROM origins WHERE name = 'China')),

-- Mechanical Parts
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'SCREW-M6-20', 'M6x20 Hex Screw', 'Stainless steel hex head screw, M6x20mm', 
 (SELECT id FROM categories WHERE name = 'Mechanical Parts'), (SELECT id FROM subcategories WHERE name = 'Screws'),
 (SELECT id FROM brands WHERE name = 'MechanoMax'), 'pieces', 0.08, 0.15, 10000, 2000, 20000,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP002'), 'active', '1234567890127', 0.02, 20.00, 2000, 10000, 0,
 (SELECT id FROM origins WHERE name = 'Germany')),

('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'BEARING-6001-2RS', 'Ball Bearing 6001-2RS', 'Deep groove ball bearing with rubber seals', 
 (SELECT id FROM categories WHERE name = 'Mechanical Parts'), (SELECT id FROM subcategories WHERE name = 'Bearings'),
 (SELECT id FROM brands WHERE name = 'MechanoMax'), 'pieces', 3.50, 6.00, 500, 100, 1000,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP002'), 'active', '1234567890128', 0.15, 20.00, 100, 300, 12,
 (SELECT id FROM origins WHERE name = 'Germany')),

-- Raw Materials
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'ALU-SHEET-3MM', 'Aluminum Sheet 3mm', 'Aluminum sheet, 3mm thickness, 1000x2000mm', 
 (SELECT id FROM categories WHERE name = 'Raw Materials'), (SELECT id FROM subcategories WHERE name = 'Metals'),
 (SELECT id FROM brands WHERE name = 'MetalWorks'), 'sheets', 25.00, 45.00, 150, 20, 300,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP003'), 'active', '1234567890129', 8.10, 0.00, 20, 50, 0,
 (SELECT id FROM origins WHERE name = 'USA')),

('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'PLA-PELLETS-WHITE', 'PLA Pellets White', 'PLA plastic pellets for injection molding, white color', 
 (SELECT id FROM categories WHERE name = 'Raw Materials'), (SELECT id FROM subcategories WHERE name = 'Plastics'),
 (SELECT id FROM brands WHERE name = 'PlastiForm'), 'kg', 2.80, 4.20, 1000, 200, 2500,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP004'), 'active', '1234567890130', 1.00, 5.00, 200, 500, 0,
 (SELECT id FROM origins WHERE name = 'Japan')),

-- Tools & Equipment
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'DRILL-10MM-HSS', 'HSS Drill Bit 10mm', 'High-speed steel drill bit, 10mm diameter', 
 (SELECT id FROM categories WHERE name = 'Tools & Equipment'), (SELECT id FROM subcategories WHERE name = 'Hand Tools'),
 (SELECT id FROM brands WHERE name = 'PrecisionTools'), 'pieces', 4.50, 8.00, 100, 20, 200,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP010'), 'active', '1234567890131', 0.05, 20.00, 20, 50, 12,
 (SELECT id FROM origins WHERE name = 'Germany')),

('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'CALIPER-DIGITAL-150MM', 'Digital Caliper 150mm', 'Digital vernier caliper with LCD display, 0-150mm range', 
 (SELECT id FROM categories WHERE name = 'Tools & Equipment'), (SELECT id FROM subcategories WHERE name = 'Measuring Tools'),
 (SELECT id FROM brands WHERE name = 'PrecisionTools'), 'pieces', 15.00, 28.00, 50, 10, 100,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP010'), 'active', '1234567890132', 0.20, 20.00, 10, 25, 24,
 (SELECT id FROM origins WHERE name = 'Japan')),

-- Packaging Materials
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'BOX-200x150x100', 'Cardboard Box 200x150x100', 'Corrugated cardboard box, single wall, brown', 
 (SELECT id FROM categories WHERE name = 'Packaging'), (SELECT id FROM subcategories WHERE name = 'Boxes'),
 (SELECT id FROM brands WHERE name = 'EcoPackage'), 'pieces', 0.75, 1.25, 2000, 500, 5000,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP009'), 'active', '1234567890133', 0.08, 0.00, 500, 1000, 0,
 (SELECT id FROM origins WHERE name = 'Mexico')),

-- Safety Equipment
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'HELMET-SAFETY-WHITE', 'Safety Helmet White', 'Hard hat safety helmet, white color, adjustable', 
 (SELECT id FROM categories WHERE name = 'Safety Equipment'), NULL,
 (SELECT id FROM brands WHERE name = 'SafeGuard'), 'pieces', 8.50, 15.00, 200, 50, 400,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP005'), 'active', '1234567890134', 0.35, 0.00, 50, 100, 24,
 (SELECT id FROM origins WHERE name = 'USA')),

-- Chemicals
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'SOLVENT-IPA-99', 'Isopropyl Alcohol 99%', 'Isopropyl alcohol, 99% purity, 1 liter bottle', 
 (SELECT id FROM categories WHERE name = 'Chemicals'), NULL,
 (SELECT id FROM brands WHERE name = 'ChemLab'), 'liters', 3.50, 6.50, 300, 50, 600,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP007'), 'active', '1234567890135', 0.79, 15.00, 50, 150, 0,
 (SELECT id FROM origins WHERE name = 'Italy')),

-- Complex Assembly Product (will be used in BOM)
('PRD' || LPAD(nextval('product_code_sequence')::text, 6, '0'), 'MOTOR-CTRL-V1', 'Motor Controller V1', 'Complete motor controller assembly with microcontroller and sensors', 
 (SELECT id FROM categories WHERE name = 'Electronics'), NULL,
 (SELECT id FROM brands WHERE name = 'TechCorp'), 'pieces', 45.00, 85.00, 50, 10, 100,
 (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'), 'active', '1234567890136', 0.25, 10.00, 10, 25, 24,
 (SELECT id FROM origins WHERE name = 'China'))
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- PRICING RULES
-- =============================================================================

-- Insert Pricing Rules for various products
INSERT INTO pricing_rules (
    name, description, product_id, rule_type, rule_value, rule_percentage,
    min_quantity, max_quantity, start_date, end_date, customer_type, is_active, priority
) VALUES
-- Volume discount for resistors
('Resistor Volume Discount', 'Bulk discount for orders over 1000 pieces', 
 (SELECT id FROM products WHERE sku = 'RES-10K-1W'), 'discount', 0.00, 10.0,
 1000, NULL, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', NULL, true, 1),

-- VIP customer discount for microcontrollers
('MCU VIP Discount', 'VIP customer discount on microcontrollers', 
 (SELECT id FROM products WHERE sku = 'MCU-ARM-STM32'), 'discount', 0.00, 15.0,
 1, NULL, CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', 'vip', true, 2),

-- Wholesale pricing for mechanical parts
('Mechanical Parts Wholesale', 'Wholesale pricing for bulk mechanical orders', 
 (SELECT id FROM products WHERE sku = 'SCREW-M6-20'), 'discount', 0.00, 20.0,
 5000, NULL, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'wholesale', true, 1),

-- Fixed price for tools
('Tool Fixed Price', 'Fixed promotional price for drill bits', 
 (SELECT id FROM products WHERE sku = 'DRILL-10MM-HSS'), 'fixed_price', 6.50, NULL,
 1, 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months', NULL, true, 3),

-- Markup for premium tools
('Premium Tool Markup', 'Premium markup for digital calipers', 
 (SELECT id FROM products WHERE sku = 'CALIPER-DIGITAL-150MM'), 'markup', 0.00, 5.0,
 1, NULL, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', NULL, true, 1)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- BILL OF MATERIALS (BOM)
-- =============================================================================

-- Create a BOM for the Motor Controller (assembly product)
-- First, we need to get or create a user for created_by field
INSERT INTO bill_of_materials (
    parent_product_id, version, effective_date, total_cost, created_by, notes
) VALUES
(
    (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1'),
    'v1.0',
    CURRENT_DATE,
    0.00, -- Will be calculated from components
    1, -- Assuming user ID 1 exists, or use a default system user
    'Initial BOM for Motor Controller V1 assembly'
)
ON CONFLICT (parent_product_id, version) DO NOTHING;

-- Add BOM components for the Motor Controller
INSERT INTO bom_components (
    bom_id, component_product_id, quantity_required, unit_of_measure,
    is_optional, scrap_factor, unit_cost, total_cost, lead_time_days,
    supplier_id, specifications
) VALUES
-- Microcontroller (main component)
(
    (SELECT id FROM bill_of_materials WHERE parent_product_id = (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1') AND version = 'v1.0'),
    (SELECT id FROM products WHERE sku = 'MCU-ARM-STM32'),
    1.0, 'pieces', false, 2.0, 8.50, 8.50, 7,
    (SELECT id FROM suppliers WHERE supplier_code = 'SUP006'),
    'Primary microcontroller for motor control logic'
),
-- Temperature sensor
(
    (SELECT id FROM bill_of_materials WHERE parent_product_id = (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1') AND version = 'v1.0'),
    (SELECT id FROM products WHERE sku = 'TEMP-SENSOR-DS18B20'),
    2.0, 'pieces', false, 5.0, 2.25, 4.50, 3,
    (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'),
    'Temperature monitoring sensors'
),
-- Resistors
(
    (SELECT id FROM bill_of_materials WHERE parent_product_id = (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1') AND version = 'v1.0'),
    (SELECT id FROM products WHERE sku = 'RES-10K-1W'),
    10.0, 'pieces', false, 1.0, 0.15, 1.50, 1,
    (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'),
    'Pull-up and current limiting resistors'
),
-- Capacitors
(
    (SELECT id FROM bill_of_materials WHERE parent_product_id = (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1') AND version = 'v1.0'),
    (SELECT id FROM products WHERE sku = 'CAP-100UF-25V'),
    5.0, 'pieces', false, 2.0, 0.45, 2.25, 2,
    (SELECT id FROM suppliers WHERE supplier_code = 'SUP001'),
    'Power supply filtering capacitors'
),
-- Screws for assembly
(
    (SELECT id FROM bill_of_materials WHERE parent_product_id = (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1') AND version = 'v1.0'),
    (SELECT id FROM products WHERE sku = 'SCREW-M6-20'),
    4.0, 'pieces', false, 0.0, 0.08, 0.32, 1,
    (SELECT id FROM suppliers WHERE supplier_code = 'SUP002'),
    'Case mounting screws'
),
-- Packaging box
(
    (SELECT id FROM bill_of_materials WHERE parent_product_id = (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1') AND version = 'v1.0'),
    (SELECT id FROM products WHERE sku = 'BOX-200x150x100'),
    1.0, 'pieces', false, 0.0, 0.75, 0.75, 1,
    (SELECT id FROM suppliers WHERE supplier_code = 'SUP009'),
    'Product packaging box'
);

-- Update BOM total cost
UPDATE bill_of_materials 
SET total_cost = (
    SELECT SUM(total_cost * (1 + scrap_factor/100))
    FROM bom_components 
    WHERE bom_id = bill_of_materials.id
)
WHERE parent_product_id = (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1') AND version = 'v1.0';

-- =============================================================================
-- WORK ORDERS AND PRODUCTION DATA
-- =============================================================================

-- Note: This assumes production lines exist from the V21 migration
-- Insert some sample work orders for the Motor Controller
INSERT INTO work_orders (
    work_order_number, product_id, product_name, product_sku,
    quantity, unit_of_measure, deadline, status, priority,
    estimated_hours, production_line_id, production_line_name,
    created_by, notes, specifications
) VALUES
-- Work order for Motor Controllers
(
    'WO' || LPAD(nextval('work_order_sequence')::text, 6, '0'),
    (SELECT id FROM products WHERE sku = 'MOTOR-CTRL-V1'),
    'Motor Controller V1',
    'MOTOR-CTRL-V1',
    25.0, 'pieces',
    CURRENT_DATE + INTERVAL '2 weeks',
    'planned', 'medium',
    40.0,
    (SELECT id FROM production_lines WHERE code = 'PL002' LIMIT 1),
    'Production Line 2',
    1, -- Assuming user ID 1 exists
    'Initial production run for Motor Controller V1',
    'Follow assembly procedure MC-V1-001. Quality check required after each unit.'
),
-- Work order for Resistors (replenishment)
(
    'WO' || LPAD(nextval('work_order_sequence')::text, 6, '0'),
    (SELECT id FROM products WHERE sku = 'RES-10K-1W'),
    'Resistor 10K Ohm 1W',
    'RES-10K-1W',
    10000.0, 'pieces',
    CURRENT_DATE + INTERVAL '1 week',
    'released', 'high',
    8.0,
    (SELECT id FROM production_lines WHERE code = 'PL001' LIMIT 1),
    'Production Line 1',
    1,
    'Stock replenishment for resistors - low inventory alert',
    'Standard resistor packaging. Batch testing required per lot.'
);

-- Add material requirements for the Motor Controller work order
INSERT INTO work_order_material_requirements (
    work_order_id, material_id, material_name, material_sku,
    required_quantity, unit_of_measure, status, priority,
    required_date, unit_cost, total_cost, is_critical
) VALUES
-- MCU requirement
(
    (SELECT id FROM work_orders WHERE product_sku = 'MOTOR-CTRL-V1' LIMIT 1),
    (SELECT id FROM products WHERE sku = 'MCU-ARM-STM32'),
    'STM32 Microcontroller', 'MCU-ARM-STM32',
    25.0, 'pieces', 'pending', 1,
    CURRENT_DATE + INTERVAL '1 week',
    8.50, 212.50, true
),
-- Temperature sensors requirement
(
    (SELECT id FROM work_orders WHERE product_sku = 'MOTOR-CTRL-V1' LIMIT 1),
    (SELECT id FROM products WHERE sku = 'TEMP-SENSOR-DS18B20'),
    'Temperature Sensor DS18B20', 'TEMP-SENSOR-DS18B20',
    50.0, 'pieces', 'pending', 1,
    CURRENT_DATE + INTERVAL '1 week',
    2.25, 112.50, true
),
-- Resistors requirement
(
    (SELECT id FROM work_orders WHERE product_sku = 'MOTOR-CTRL-V1' LIMIT 1),
    (SELECT id FROM products WHERE sku = 'RES-10K-1W'),
    'Resistor 10K Ohm 1W', 'RES-10K-1W',
    250.0, 'pieces', 'allocated', 2,
    CURRENT_DATE + INTERVAL '1 week',
    0.15, 37.50, false
),
-- Capacitors requirement
(
    (SELECT id FROM work_orders WHERE product_sku = 'MOTOR-CTRL-V1' LIMIT 1),
    (SELECT id FROM products WHERE sku = 'CAP-100UF-25V'),
    'Capacitor 100uF 25V', 'CAP-100UF-25V',
    125.0, 'pieces', 'pending', 2,
    CURRENT_DATE + INTERVAL '1 week',
    0.45, 56.25, false
);

COMMIT;

-- =============================================================================
-- DATA VALIDATION AND SUMMARY
-- =============================================================================
-- Display comprehensive summary of inserted data
SELECT 'Summary of Seeded Data' as report_section, '' as table_name, 0 as record_count
UNION ALL
SELECT '', '========================', 0
UNION ALL
SELECT '', 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT '', 'Subcategories', COUNT(*) FROM subcategories  
UNION ALL
SELECT '', 'Brands', COUNT(*) FROM brands
UNION ALL
SELECT '', 'Origins', COUNT(*) FROM origins
UNION ALL
SELECT '', 'Suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT '', 'Products', COUNT(*) FROM products
UNION ALL
SELECT '', 'Pricing Rules', COUNT(*) FROM pricing_rules
UNION ALL
SELECT '', 'Bill of Materials', COUNT(*) FROM bill_of_materials
UNION ALL
SELECT '', 'BOM Components', COUNT(*) FROM bom_components
UNION ALL
SELECT '', 'Work Orders', COUNT(*) FROM work_orders
UNION ALL
SELECT '', 'Material Requirements', COUNT(*) FROM work_order_material_requirements
ORDER BY record_count DESC;

-- Product distribution by category
SELECT 
    'Product Distribution by Category:' as report_section,
    '' as category_name,
    0 as product_count
UNION ALL
SELECT 
    '',
    '================================',
    0
UNION ALL
SELECT 
    '',
    c.name,
    COUNT(p.id)
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.name
ORDER BY product_count DESC;

-- Data validation checks
SELECT 
    'Data Validation Checks:' as report_section,
    '' as check_name,
    '' as status
UNION ALL
SELECT 
    '',
    '========================',
    ''
UNION ALL
SELECT 
    '',
    'Products without categories',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE CONCAT('FAIL - ', COUNT(*)::text, ' products') END
FROM products WHERE category_id IS NULL
UNION ALL
SELECT 
    '',
    'Products without suppliers',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE CONCAT('FAIL - ', COUNT(*)::text, ' products') END
FROM products WHERE supplier_id IS NULL
UNION ALL
SELECT 
    '',
    'Products with negative stock',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE CONCAT('FAIL - ', COUNT(*)::text, ' products') END
FROM products WHERE current_stock < 0
UNION ALL
SELECT 
    '',
    'Products with cost > selling price',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE CONCAT('WARNING - ', COUNT(*)::text, ' products') END
FROM products WHERE cost_price > selling_price;

\echo ''
\echo '=== SEED SCRIPT COMPLETED SUCCESSFULLY ==='
\echo ''
\echo 'Seed data includes:'
\echo '- 8 product categories with subcategories'
\echo '- 10 brands and 10 origins'
\echo '- 10 suppliers from different countries'
\echo '- 15 diverse products with proper relationships'
\echo '- Pricing rules with different discount types'
\echo '- Complete BOM for Motor Controller assembly'
\echo '- Sample work orders with material requirements'
\echo '- All data follows the BIGSERIAL primary key pattern'
\echo '- Proper foreign key relationships maintained'
\echo ''
