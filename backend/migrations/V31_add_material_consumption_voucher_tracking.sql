-- =========================================
-- Migration: V31_add_material_consumption_voucher_tracking
-- Description: Add voucher tracking for material consumption and wastage (Phase 2)
-- Author: Factory-Accounts Integration
-- Date: 2025-10-08
-- Related: Phase 2 - Material Consumption Integration
-- =========================================

-- Add voucher reference to material consumption records
ALTER TABLE work_order_material_consumptions
ADD COLUMN IF NOT EXISTS voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_material_consumptions_voucher 
ON work_order_material_consumptions(voucher_id);

COMMENT ON COLUMN work_order_material_consumptions.voucher_id 
IS 'Voucher created for material consumption (Debit: WIP, Credit: Raw Materials Inventory)';

-- Add voucher reference to wastage records
ALTER TABLE material_wastage
ADD COLUMN IF NOT EXISTS voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_material_wastage_voucher 
ON material_wastage(voucher_id);

COMMENT ON COLUMN material_wastage.voucher_id 
IS 'Voucher created for approved wastage (Debit: Wastage Expense, Credit: Raw Materials Inventory)';

-- Add accounting integration tracking to work orders
ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS total_material_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_labor_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_overhead_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_wip_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS finished_goods_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_finished_goods_voucher 
ON work_orders(finished_goods_voucher_id);

COMMENT ON COLUMN work_orders.total_material_cost 
IS 'Sum of all material consumption costs for this work order';

COMMENT ON COLUMN work_orders.total_labor_cost 
IS 'Sum of all labor costs allocated to this work order';

COMMENT ON COLUMN work_orders.total_overhead_cost 
IS 'Sum of all overhead costs allocated to this work order';

COMMENT ON COLUMN work_orders.total_wip_cost 
IS 'Total WIP cost = material + labor + overhead';

COMMENT ON COLUMN work_orders.finished_goods_voucher_id 
IS 'Voucher created when work order completed (Debit: Finished Goods, Credit: WIP)';

-- Create view for WIP tracking
CREATE OR REPLACE VIEW work_orders_wip_status AS
SELECT 
    wo.id,
    wo.work_order_number,
    wo.status,
    wo.product_name,
    wo.quantity,
    
    -- Cost breakdown
    wo.total_material_cost,
    wo.total_labor_cost,
    wo.total_overhead_cost,
    wo.total_wip_cost,
    
    -- Unit cost
    CASE 
        WHEN wo.quantity > 0 THEN wo.total_wip_cost / wo.quantity
        ELSE 0
    END as unit_cost,
    
    -- Material consumption count
    (SELECT COUNT(*) 
     FROM work_order_material_consumptions wmc 
     WHERE wmc.work_order_id = wo.id) as material_consumption_count,
    
    -- Vouchers created count
    (SELECT COUNT(*) 
     FROM work_order_material_consumptions wmc 
     WHERE wmc.work_order_id = wo.id AND wmc.voucher_id IS NOT NULL) as material_vouchers_created,
    
    -- Finished goods transfer
    wo.finished_goods_voucher_id,
    v.voucher_no as finished_goods_voucher_no,
    v.status as finished_goods_voucher_status,
    
    -- Integration status
    CASE 
        WHEN wo.status = 'completed' AND wo.finished_goods_voucher_id IS NULL THEN 'Missing FG Transfer'
        WHEN wo.status IN ('in_progress', 'released') THEN 'WIP Active'
        WHEN wo.status = 'completed' AND wo.finished_goods_voucher_id IS NOT NULL THEN 'Completed & Transferred'
        ELSE 'Pending'
    END as wip_status
    
FROM work_orders wo
LEFT JOIN vouchers v ON wo.finished_goods_voucher_id = v.id;

COMMENT ON VIEW work_orders_wip_status 
IS 'View showing WIP cost accumulation and accounting integration status for work orders';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration V31 completed: Material consumption and WIP tracking added';
    RAISE NOTICE '  - Added voucher references to material consumptions and wastage';
    RAISE NOTICE '  - Added WIP cost tracking columns to work orders';
    RAISE NOTICE '  - Created work_orders_wip_status view';
    RAISE NOTICE '  - Ready for Phase 2 implementation';
END $$;

