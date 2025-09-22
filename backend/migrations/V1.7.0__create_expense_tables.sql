-- Expense Management Tables
-- Version: 1.7.0
-- Description: Creates tables for expense categories and expense tracking

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  vendor_name VARCHAR(255),
  vendor_contact VARCHAR(255),
  receipt_number VARCHAR(100),
  receipt_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  department VARCHAR(100),
  project VARCHAR(100),
  tags TEXT[],
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create expense number sequence
CREATE SEQUENCE IF NOT EXISTS expense_number_seq START 1;

-- Create indexes for expense_categories
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON expense_categories(is_active);

-- Create indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_expense_number ON expenses(expense_number);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_name ON expenses(vendor_name);
CREATE INDEX IF NOT EXISTS idx_expenses_department ON expenses(department);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default expense categories
INSERT INTO expense_categories (name, description, color) VALUES
('Office Supplies', 'Office equipment, stationery, and supplies', '#3B82F6'),
('Travel & Transportation', 'Business travel, fuel, and transportation costs', '#10B981'),
('Meals & Entertainment', 'Business meals, client entertainment', '#F59E0B'),
('Utilities', 'Electricity, water, internet, phone bills', '#EF4444'),
('Marketing & Advertising', 'Marketing campaigns, advertising costs', '#8B5CF6'),
('Professional Services', 'Legal, accounting, consulting fees', '#06B6D4'),
('Equipment & Maintenance', 'Equipment purchase and maintenance', '#84CC16'),
('Software & Subscriptions', 'Software licenses, subscriptions', '#F97316'),
('Training & Development', 'Employee training, courses, certifications', '#EC4899'),
('Other', 'Miscellaneous expenses', '#6B7280')
ON CONFLICT (name) DO NOTHING;
