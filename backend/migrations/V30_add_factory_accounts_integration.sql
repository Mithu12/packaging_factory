-- =========================================
-- Migration: V30_add_factory_accounts_integration
-- Description: Add support for factory-accounts integration (Phase 1)
--              Adds voucher reference columns to track accounting entries
-- Author: Factory-Accounts Integration
-- Date: 2025-10-08
-- Related: FACTORY_ACCOUNTS_INTEGRATION_PHASE1_COMPLETE.md
-- =========================================

-- Add voucher reference columns to factory_customer_orders
-- These track the accounting vouchers created for each order lifecycle event

ALTER TABLE factory_customer_orders
ADD COLUMN IF NOT EXISTS receivable_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revenue_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cogs_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_factory_orders_receivable_voucher 
ON factory_customer_orders(receivable_voucher_id);

CREATE INDEX IF NOT EXISTS idx_factory_orders_revenue_voucher 
ON factory_customer_orders(revenue_voucher_id);

CREATE INDEX IF NOT EXISTS idx_factory_orders_cogs_voucher 
ON factory_customer_orders(cogs_voucher_id);

-- Add comments for documentation
COMMENT ON COLUMN factory_customer_orders.receivable_voucher_id 
IS 'Voucher created when order approved (Debit: A/R, Credit: Deferred Revenue)';

COMMENT ON COLUMN factory_customer_orders.revenue_voucher_id 
IS 'Voucher created when order shipped (Debit: Deferred Revenue, Credit: Sales Revenue)';

COMMENT ON COLUMN factory_customer_orders.cogs_voucher_id 
IS 'Voucher created when order shipped (Debit: COGS, Credit: Finished Goods Inventory)';

-- Add optional tracking columns for integration status
ALTER TABLE factory_customer_orders
ADD COLUMN IF NOT EXISTS accounting_integrated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accounting_integration_error TEXT;

COMMENT ON COLUMN factory_customer_orders.accounting_integrated 
IS 'Flag indicating if order has been fully integrated with accounts module';

COMMENT ON COLUMN factory_customer_orders.accounting_integration_error 
IS 'Stores last integration error message if voucher creation failed';

-- Update existing orders to set default values
UPDATE factory_customer_orders 
SET accounting_integrated = FALSE 
WHERE accounting_integrated IS NULL;

-- Create a view for easy reconciliation between factory orders and accounting vouchers
CREATE OR REPLACE VIEW factory_orders_accounting_status AS
SELECT 
    fco.id,
    fco.order_number,
    fco.status,
    fco.total_value,
    fco.currency,
    fco.approved_at,
    fco.accounting_integrated,
    fco.accounting_integration_error,
    
    -- Receivable voucher info
    fco.receivable_voucher_id,
    v1.voucher_no as receivable_voucher_no,
    v1.status as receivable_voucher_status,
    v1.date as receivable_voucher_date,
    
    -- Revenue voucher info
    fco.revenue_voucher_id,
    v2.voucher_no as revenue_voucher_no,
    v2.status as revenue_voucher_status,
    v2.date as revenue_voucher_date,
    
    -- COGS voucher info
    fco.cogs_voucher_id,
    v3.voucher_no as cogs_voucher_no,
    v3.status as cogs_voucher_status,
    v3.date as cogs_voucher_date,
    
    -- Integration status
    CASE 
        WHEN fco.status = 'approved' AND fco.receivable_voucher_id IS NULL THEN 'Missing A/R Voucher'
        WHEN fco.status = 'shipped' AND fco.revenue_voucher_id IS NULL THEN 'Missing Revenue Voucher'
        WHEN fco.status = 'shipped' AND fco.cogs_voucher_id IS NULL THEN 'Missing COGS Voucher'
        WHEN fco.accounting_integration_error IS NOT NULL THEN 'Integration Error'
        WHEN fco.accounting_integrated THEN 'Fully Integrated'
        ELSE 'Pending Integration'
    END as integration_status
    
FROM factory_customer_orders fco
LEFT JOIN vouchers v1 ON fco.receivable_voucher_id = v1.id
LEFT JOIN vouchers v2 ON fco.revenue_voucher_id = v2.id
LEFT JOIN vouchers v3 ON fco.cogs_voucher_id = v3.id;

COMMENT ON VIEW factory_orders_accounting_status 
IS 'Reconciliation view showing accounting integration status for factory orders';

-- Grant permissions to appropriate roles
-- Note: Adjust role names based on your actual RBAC setup
DO $$
BEGIN
    -- Grant view access to finance and factory manager roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finance_manager') THEN
        GRANT SELECT ON factory_orders_accounting_status TO finance_manager;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'factory_manager') THEN
        GRANT SELECT ON factory_orders_accounting_status TO factory_manager;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Roles don't exist yet, skip
        NULL;
END $$;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration V30 completed: Factory-Accounts integration columns and views created';
    RAISE NOTICE '  - Added voucher reference columns to factory_customer_orders';
    RAISE NOTICE '  - Created factory_orders_accounting_status reconciliation view';
    RAISE NOTICE '  - Integration is now ready for Phase 1 (Customer Order → A/R)';
END $$;

