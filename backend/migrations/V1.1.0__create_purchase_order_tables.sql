-- Purchase Order Management Tables
-- Version: 1.1.0
-- Description: Creates tables for purchase orders, line items, and timeline tracking

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE NOT NULL,
  actual_delivery_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'sent', 'partially_received', 'received', 'cancelled')),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_terms VARCHAR(50),
  delivery_terms VARCHAR(50),
  department VARCHAR(100),
  project VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  approved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_order_line_items table
CREATE TABLE IF NOT EXISTS purchase_order_line_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
  received_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  pending_quantity DECIMAL(10,2) NOT NULL CHECK (pending_quantity >= 0),
  unit_of_measure VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_order_timeline table
CREATE TABLE IF NOT EXISTS purchase_order_timeline (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  description TEXT,
  "user" VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sequence for PO numbers
CREATE SEQUENCE IF NOT EXISTS po_number_sequence;

-- Create indexes for purchase orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_priority ON purchase_orders(priority);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery ON purchase_orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);

CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_po_id ON purchase_order_line_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_product_id ON purchase_order_line_items(product_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_timeline_po_id ON purchase_order_timeline(purchase_order_id);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_order_line_items_updated_at ON purchase_order_line_items;
CREATE TRIGGER update_purchase_order_line_items_updated_at
  BEFORE UPDATE ON purchase_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
