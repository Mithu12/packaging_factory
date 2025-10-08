-- =========================================
-- Migration: V34_add_revenue_recognition_and_returns
-- Description: Add configurable revenue recognition and customer returns support
-- Author: Factory-Accounts Integration - Advanced Features
-- Date: 2025-10-08
-- Related: FACTORY_ACCOUNTS_INTEGRATION_ENHANCEMENTS.md
-- =========================================

-- =============================================
-- Part 1: Revenue Recognition Configuration
-- =============================================

-- Create revenue recognition policy enum type
DO $$ BEGIN
    CREATE TYPE revenue_recognition_policy AS ENUM ('on_approval', 'on_shipment', 'on_payment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create system settings table if not exists
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'json', 'enum'
    description TEXT,
    category VARCHAR(50), -- 'accounting', 'factory', 'system', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Insert default revenue recognition policy
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, created_by)
VALUES (
    'factory.revenue_recognition_policy',
    'on_approval',
    'enum',
    'When to recognize revenue: on_approval (immediate), on_shipment (when shipped), on_payment (when paid)',
    'accounting',
    1
) ON CONFLICT (setting_key) DO NOTHING;

-- Add shipped_at timestamp to customer orders
ALTER TABLE factory_customer_orders
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shipped_by INTEGER REFERENCES users(id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_factory_orders_shipped_at ON factory_customer_orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

COMMENT ON COLUMN factory_customer_orders.shipped_at IS 'Timestamp when order was shipped (for revenue recognition)';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique key for the setting (e.g., factory.revenue_recognition_policy)';

-- =============================================
-- Part 2: Customer Returns System
-- =============================================

-- Create return reason enum
DO $$ BEGIN
    CREATE TYPE return_reason_type AS ENUM (
        'defective',
        'wrong_item',
        'damaged',
        'quality_issue',
        'customer_request',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create return status enum
DO $$ BEGIN
    CREATE TYPE return_status_type AS ENUM (
        'pending',
        'approved',
        'rejected',
        'processing',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create customer returns table
CREATE TABLE IF NOT EXISTS factory_customer_returns (
    id BIGSERIAL PRIMARY KEY,
    return_number VARCHAR(50) NOT NULL UNIQUE,
    customer_order_id BIGINT REFERENCES factory_customer_orders(id) ON DELETE RESTRICT,
    factory_id BIGINT NOT NULL,
    
    -- Customer info
    factory_customer_id BIGINT NOT NULL,
    factory_customer_name VARCHAR(255) NOT NULL,
    factory_customer_email VARCHAR(255),
    
    -- Return details
    return_reason return_reason_type NOT NULL,
    return_description TEXT,
    status return_status_type NOT NULL DEFAULT 'pending',
    
    -- Financial
    total_return_value DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'BDT',
    
    -- Dates
    return_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Users
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    
    -- Accounting integration
    reversal_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
    credit_note_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
    inventory_adjustment_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
    accounting_integrated BOOLEAN DEFAULT FALSE,
    accounting_integration_error TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_return_value_positive CHECK (total_return_value >= 0)
);

-- Create return line items table
CREATE TABLE IF NOT EXISTS factory_return_line_items (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES factory_customer_returns(id) ON DELETE CASCADE,
    
    -- Original order reference
    order_line_item_id BIGINT, -- Reference to original order line item
    
    -- Product details
    product_id BIGINT,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    
    -- Quantity
    returned_quantity DECIMAL(15,3) NOT NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    
    -- Pricing
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    
    -- Return specifics
    condition VARCHAR(50), -- 'damaged', 'unopened', 'used', etc.
    return_to_inventory BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_returned_quantity_positive CHECK (returned_quantity > 0),
    CONSTRAINT check_unit_price_positive CHECK (unit_price >= 0)
);

-- Add indexes for returns
CREATE INDEX IF NOT EXISTS idx_returns_customer_order ON factory_customer_returns(customer_order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON factory_customer_returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON factory_customer_returns(factory_customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_factory ON factory_customer_returns(factory_id);
CREATE INDEX IF NOT EXISTS idx_returns_return_date ON factory_customer_returns(return_date DESC);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON factory_return_line_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON factory_return_line_items(product_id);

-- Add comments
COMMENT ON TABLE factory_customer_returns IS 'Customer return requests for factory orders';
COMMENT ON COLUMN factory_customer_returns.return_number IS 'Unique return number (e.g., RET-2024-001)';
COMMENT ON COLUMN factory_customer_returns.reversal_voucher_id IS 'Voucher that reverses original AR/Revenue';
COMMENT ON COLUMN factory_customer_returns.credit_note_voucher_id IS 'Credit note voucher for customer';
COMMENT ON COLUMN factory_customer_returns.inventory_adjustment_voucher_id IS 'Voucher for inventory adjustment if returned to stock';
COMMENT ON TABLE factory_return_line_items IS 'Individual items being returned';

-- =============================================
-- Part 3: Sequence for Return Numbers
-- =============================================

-- Create sequence for return numbers
CREATE SEQUENCE IF NOT EXISTS factory_return_number_seq START WITH 1;

-- Function to generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val BIGINT;
    year_str VARCHAR(4);
    return_no VARCHAR(50);
BEGIN
    next_val := nextval('factory_return_number_seq');
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    return_no := 'RET-' || year_str || '-' || LPAD(next_val::TEXT, 6, '0');
    RETURN return_no;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_return_number IS 'Generates unique return number (e.g., RET-2024-000001)';

-- =============================================
-- Part 4: Views for Returns Management
-- =============================================

-- View: Returns with full details
CREATE OR REPLACE VIEW factory_returns_detailed AS
SELECT 
    fr.id,
    fr.return_number,
    fr.customer_order_id,
    fco.order_number,
    fr.factory_id,
    fr.factory_customer_id,
    fr.factory_customer_name,
    fr.factory_customer_email,
    fr.return_reason,
    fr.return_description,
    fr.status,
    fr.total_return_value,
    fr.currency,
    fr.return_date,
    fr.approved_at,
    fr.completed_at,
    fr.created_by,
    u1.username as created_by_username,
    fr.approved_by,
    u2.username as approved_by_username,
    fr.accounting_integrated,
    fr.accounting_integration_error,
    fr.reversal_voucher_id,
    v1.voucher_no as reversal_voucher_no,
    fr.credit_note_voucher_id,
    v2.voucher_no as credit_note_voucher_no,
    fr.notes,
    fr.created_at,
    
    -- Count of line items
    (SELECT COUNT(*) FROM factory_return_line_items WHERE return_id = fr.id) as item_count,
    
    -- Status indicators
    CASE 
        WHEN fr.status = 'approved' AND fr.accounting_integrated = FALSE THEN 'Pending Accounting'
        WHEN fr.status = 'approved' AND fr.accounting_integrated = TRUE THEN 'Completed'
        ELSE INITCAP(fr.status::TEXT)
    END as status_display
    
FROM factory_customer_returns fr
LEFT JOIN factory_customer_orders fco ON fr.customer_order_id = fco.id
LEFT JOIN users u1 ON fr.created_by = u1.id
LEFT JOIN users u2 ON fr.approved_by = u2.id
LEFT JOIN vouchers v1 ON fr.reversal_voucher_id = v1.id
LEFT JOIN vouchers v2 ON fr.credit_note_voucher_id = v2.id;

COMMENT ON VIEW factory_returns_detailed IS 'Detailed view of customer returns with related information';

-- View: Returns pending approval
CREATE OR REPLACE VIEW factory_returns_pending_approval AS
SELECT 
    id,
    return_number,
    order_number,
    factory_customer_name,
    return_reason,
    total_return_value,
    currency,
    return_date,
    created_by_username,
    item_count
FROM factory_returns_detailed
WHERE status = 'pending'
ORDER BY return_date DESC;

COMMENT ON VIEW factory_returns_pending_approval IS 'Returns waiting for approval';

-- View: Returns requiring accounting integration
CREATE OR REPLACE VIEW factory_returns_pending_accounting AS
SELECT 
    id,
    return_number,
    order_number,
    factory_customer_name,
    total_return_value,
    currency,
    approved_at,
    accounting_integration_error
FROM factory_returns_detailed
WHERE status = 'approved'
  AND accounting_integrated = FALSE
ORDER BY approved_at;

COMMENT ON VIEW factory_returns_pending_accounting IS 'Approved returns that need accounting vouchers created';

-- =============================================
-- Part 5: Triggers
-- =============================================

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_factory_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_factory_returns_updated_at
    BEFORE UPDATE ON factory_customer_returns
    FOR EACH ROW
    EXECUTE FUNCTION update_factory_returns_updated_at();

CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_factory_returns_updated_at();

-- =============================================
-- Part 6: Permissions (Optional)
-- =============================================

DO $$
BEGIN
    -- Grant to finance roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finance_manager') THEN
        GRANT SELECT, INSERT, UPDATE ON factory_customer_returns TO finance_manager;
        GRANT SELECT, INSERT, UPDATE ON factory_return_line_items TO finance_manager;
        GRANT SELECT, UPDATE ON system_settings TO finance_manager;
        GRANT SELECT ON factory_returns_detailed TO finance_manager;
        GRANT SELECT ON factory_returns_pending_accounting TO finance_manager;
    END IF;
    
    -- Grant to factory roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'factory_manager') THEN
        GRANT SELECT, INSERT, UPDATE ON factory_customer_returns TO factory_manager;
        GRANT SELECT, INSERT, UPDATE ON factory_return_line_items TO factory_manager;
        GRANT SELECT ON factory_returns_detailed TO factory_manager;
        GRANT SELECT ON factory_returns_pending_approval TO factory_manager;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Roles don't exist yet, skip
        NULL;
END $$;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration V34 completed: Revenue recognition and returns system';
    RAISE NOTICE '  - Added revenue recognition policy configuration';
    RAISE NOTICE '  - Added shipped_at to customer orders';
    RAISE NOTICE '  - Created factory_customer_returns table';
    RAISE NOTICE '  - Created factory_return_line_items table';
    RAISE NOTICE '  - Created system_settings table';
    RAISE NOTICE '  - Created return management views';
    RAISE NOTICE '  - Ready for advanced accounting features';
END $$;

