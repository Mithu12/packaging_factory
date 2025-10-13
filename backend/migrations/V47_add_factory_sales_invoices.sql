-- V47: Add Factory Sales Invoices
-- Description: Create sales invoices table for factory customer orders
-- This enables invoice generation for delivered/shipped customer orders

-- Create sales invoice number sequence
CREATE SEQUENCE IF NOT EXISTS sales_invoice_number_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create factory sales invoices table
CREATE TABLE IF NOT EXISTS factory_sales_invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_order_id BIGINT NOT NULL REFERENCES factory_customer_orders(id) ON DELETE RESTRICT,
    factory_customer_id BIGINT NOT NULL REFERENCES factory_customers(id) ON DELETE RESTRICT,
    factory_id BIGINT REFERENCES factories(id) ON DELETE SET NULL,
    
    -- Invoice details
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    outstanding_amount DECIMAL(15,2) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
    payment_terms VARCHAR(50),
    
    -- Additional info
    notes TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    
    -- Accounting integration
    voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    
    -- Audit fields
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_total_amount_positive CHECK (total_amount >= 0),
    CONSTRAINT check_paid_amount_positive CHECK (paid_amount >= 0),
    CONSTRAINT check_outstanding_amount CHECK (outstanding_amount >= 0),
    CONSTRAINT check_paid_not_exceed_total CHECK (paid_amount <= total_amount),
    CONSTRAINT check_tax_rate_valid CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_number 
ON factory_sales_invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_order 
ON factory_sales_invoices(customer_order_id);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_factory_customer 
ON factory_sales_invoices(factory_customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_factory 
ON factory_sales_invoices(factory_id);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_status 
ON factory_sales_invoices(status);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_date 
ON factory_sales_invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_due_date 
ON factory_sales_invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_voucher 
ON factory_sales_invoices(voucher_id);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_created_at 
ON factory_sales_invoices(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sales_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_invoices_updated_at
    BEFORE UPDATE ON factory_sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_invoices_updated_at();

-- Add invoice_id column to factory_customer_orders for reference
ALTER TABLE factory_customer_orders 
ADD COLUMN IF NOT EXISTS invoice_id BIGINT REFERENCES factory_sales_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_orders_invoice 
ON factory_customer_orders(invoice_id);

-- Add comments for documentation
COMMENT ON TABLE factory_sales_invoices IS 'Sales invoices generated for factory customer orders';
COMMENT ON COLUMN factory_sales_invoices.invoice_number IS 'Unique invoice number (e.g., INV-2025-00001)';
COMMENT ON COLUMN factory_sales_invoices.customer_order_id IS 'Reference to the customer order this invoice is for';
COMMENT ON COLUMN factory_sales_invoices.factory_customer_id IS 'Customer who will pay this invoice';
COMMENT ON COLUMN factory_sales_invoices.factory_id IS 'Factory that fulfilled the order';
COMMENT ON COLUMN factory_sales_invoices.outstanding_amount IS 'Amount still owed (total - paid)';
COMMENT ON COLUMN factory_sales_invoices.voucher_id IS 'Optional link to accounting voucher';
COMMENT ON COLUMN factory_customer_orders.invoice_id IS 'Link to generated sales invoice';

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Migration V47 completed successfully';
    RAISE NOTICE '  - Created sales_invoice_number_sequence';
    RAISE NOTICE '  - Created factory_sales_invoices table';
    RAISE NOTICE '  - Added invoice_id to factory_customer_orders';
    RAISE NOTICE '  - Created indexes and triggers';
    RAISE NOTICE '  - Invoices can now be generated for customer orders';
END $$;

