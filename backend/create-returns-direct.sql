-- Create sales_returns table
CREATE TABLE IF NOT EXISTS sales_returns (
  id SERIAL PRIMARY KEY,
  return_number VARCHAR(20) UNIQUE NOT NULL,
  original_order_id INTEGER NOT NULL REFERENCES sales_orders(id),
  original_order_number VARCHAR(20) NOT NULL,
  return_type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (return_type IN ('full', 'partial')),
  return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  return_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (return_status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  
  -- Financial fields
  subtotal_returned DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_returned DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  processing_fee DECIMAL(10,2) DEFAULT 0,
  final_refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Customer and processing info
  customer_id INTEGER REFERENCES customers(id),
  processed_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  rejected_by INTEGER REFERENCES users(id),
  completed_at TIMESTAMP,
  
  -- Additional info
  notes TEXT,
  return_location VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_return_items table
CREATE TABLE IF NOT EXISTS sales_return_items (
  id SERIAL PRIMARY KEY,
  return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  original_line_item_id INTEGER NOT NULL REFERENCES sales_order_line_items(id),
  
  -- Product info (denormalized for history)
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  
  -- Quantity and pricing
  original_quantity DECIMAL(10,2) NOT NULL,
  returned_quantity DECIMAL(10,2) NOT NULL,
  original_unit_price DECIMAL(10,2) NOT NULL,
  refund_unit_price DECIMAL(10,2) NOT NULL,
  line_refund_amount DECIMAL(10,2) NOT NULL,
  
  -- Return item details
  item_condition VARCHAR(20) DEFAULT 'good' 
    CHECK (item_condition IN ('good', 'damaged', 'defective', 'expired', 'opened')),
  restockable BOOLEAN DEFAULT true,
  restock_fee DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create return_inventory_adjustments table
CREATE TABLE IF NOT EXISTS return_inventory_adjustments (
  id SERIAL PRIMARY KEY,
  return_id INTEGER NOT NULL REFERENCES sales_returns(id),
  return_item_id INTEGER NOT NULL REFERENCES sales_return_items(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  
  adjustment_type VARCHAR(30) NOT NULL 
    CHECK (adjustment_type IN ('return_restock', 'return_damaged', 'return_write_off')),
  quantity_adjusted DECIMAL(10,2) NOT NULL,
  stock_before DECIMAL(10,2) NOT NULL,
  stock_after DECIMAL(10,2) NOT NULL,
  
  adjusted_by INTEGER REFERENCES users(id),
  adjustment_reason TEXT,
  adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create return_refund_transactions table
CREATE TABLE IF NOT EXISTS return_refund_transactions (
  id SERIAL PRIMARY KEY,
  return_id INTEGER NOT NULL REFERENCES sales_returns(id),
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_method VARCHAR(20) NOT NULL 
    CHECK (refund_method IN ('cash', 'card', 'bank_transfer', 'store_credit', 'original_payment')),
  transaction_id VARCHAR(100),
  processed_by INTEGER REFERENCES users(id),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_returns_order_id ON sales_returns(original_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_customer_id ON sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_status ON sales_returns(return_status);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_product_id ON sales_return_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_inventory_adjustments_return_id ON return_inventory_adjustments(return_id);
CREATE INDEX IF NOT EXISTS idx_return_refund_transactions_return_id ON return_refund_transactions(return_id);

-- Add total_returned_amount column to sales_orders if it doesn't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS total_returned_amount DECIMAL(10,2) DEFAULT 0;
