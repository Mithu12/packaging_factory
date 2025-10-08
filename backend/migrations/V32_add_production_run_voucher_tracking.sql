-- =========================================
-- Migration: V32_add_production_run_voucher_tracking
-- Description: Add voucher tracking for production runs (Phase 3)
-- Author: Factory-Accounts Integration
-- Date: 2025-10-08
-- Related: Phase 3 - Production Execution Integration
-- =========================================

-- Add voucher references to production runs for labor and overhead
ALTER TABLE production_runs
ADD COLUMN IF NOT EXISTS labor_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS overhead_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_cost DECIMAL(15,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_production_runs_labor_voucher 
ON production_runs(labor_voucher_id);

CREATE INDEX IF NOT EXISTS idx_production_runs_overhead_voucher 
ON production_runs(overhead_voucher_id);

COMMENT ON COLUMN production_runs.labor_voucher_id 
IS 'Voucher created for labor cost allocation (Debit: WIP, Credit: Wages Payable)';

COMMENT ON COLUMN production_runs.overhead_voucher_id 
IS 'Voucher created for overhead allocation (Debit: WIP, Credit: Factory Overhead Applied)';

COMMENT ON COLUMN production_runs.labor_cost 
IS 'Total labor cost for this production run (hours × rate)';

COMMENT ON COLUMN production_runs.overhead_cost 
IS 'Total overhead allocated to this production run';

-- Add cost center reference to production lines for cost allocation
ALTER TABLE production_lines
ADD COLUMN IF NOT EXISTS cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_lines_cost_center 
ON production_lines(cost_center_id);

COMMENT ON COLUMN production_lines.cost_center_id 
IS 'Cost center for tracking production line specific costs';

-- Create view for production cost tracking
CREATE OR REPLACE VIEW production_runs_cost_status AS
SELECT 
    pr.id,
    pr.run_number,
    pr.status,
    pr.work_order_id,
    wo.work_order_number,
    wo.product_name,
    
    -- Production details
    pr.target_quantity,
    pr.produced_quantity,
    pr.good_quantity,
    pr.rejected_quantity,
    
    -- Time tracking
    pr.actual_start_time,
    pr.actual_end_time,
    pr.total_runtime_minutes,
    
    -- Cost tracking
    pr.labor_cost,
    pr.overhead_cost,
    pr.labor_cost + pr.overhead_cost as total_production_cost,
    
    -- Voucher tracking
    pr.labor_voucher_id,
    v1.voucher_no as labor_voucher_no,
    v1.status as labor_voucher_status,
    
    pr.overhead_voucher_id,
    v2.voucher_no as overhead_voucher_no,
    v2.status as overhead_voucher_status,
    
    -- Production line and cost center
    pl.name as production_line_name,
    pl.cost_center_id,
    cc.name as cost_center_name,
    
    -- Integration status
    CASE 
        WHEN pr.status = 'completed' AND pr.labor_voucher_id IS NULL THEN 'Missing Labor Voucher'
        WHEN pr.status = 'completed' AND pr.overhead_voucher_id IS NULL THEN 'Missing Overhead Voucher'
        WHEN pr.status = 'completed' THEN 'Fully Integrated'
        WHEN pr.status = 'in_progress' THEN 'In Progress'
        ELSE 'Pending'
    END as integration_status
    
FROM production_runs pr
LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
LEFT JOIN production_lines pl ON pr.production_line_id = pl.id
LEFT JOIN cost_centers cc ON pl.cost_center_id = cc.id
LEFT JOIN vouchers v1 ON pr.labor_voucher_id = v1.id
LEFT JOIN vouchers v2 ON pr.overhead_voucher_id = v2.id;

COMMENT ON VIEW production_runs_cost_status 
IS 'View showing production cost accumulation and voucher integration status';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration V32 completed: Production run cost tracking added';
    RAISE NOTICE '  - Added labor and overhead voucher references to production_runs';
    RAISE NOTICE '  - Added cost_center_id to production_lines';
    RAISE NOTICE '  - Created production_runs_cost_status view';
    RAISE NOTICE '  - Ready for Phase 3 implementation';
END $$;

