-- Supplier Enhancements
-- Version: 1.5.0
-- Description: Adds WhatsApp field and supplier categories table

-- Add WhatsApp field to suppliers table
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

-- Create supplier_categories table
CREATE TABLE IF NOT EXISTS supplier_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color for UI
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_categories_name ON supplier_categories(name);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_supplier_categories_updated_at ON supplier_categories;
CREATE TRIGGER update_supplier_categories_updated_at
  BEFORE UPDATE ON supplier_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories if table is empty
INSERT INTO supplier_categories (name, description, color)
VALUES 
  ('Electronics', 'Electronic components and devices', '#3B82F6'),
  ('Raw Materials', 'Basic materials used in production', '#10B981'),
  ('Furniture', 'Office and industrial furniture', '#F59E0B'),
  ('Components', 'Mechanical and electrical components', '#EF4444'),
  ('Textiles', 'Fabric and textile materials', '#8B5CF6'),
  ('Food & Beverage', 'Food and beverage products', '#06B6D4'),
  ('Industrial Equipment', 'Heavy machinery and equipment', '#84CC16'),
  ('Office Supplies', 'Office and stationery supplies', '#F97316')
ON CONFLICT (name) DO NOTHING;
