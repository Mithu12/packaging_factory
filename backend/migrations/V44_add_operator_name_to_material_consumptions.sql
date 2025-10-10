-- =========================================
-- Migration: V44_add_operator_name_to_material_consumptions
-- Description: Add operator_name column to work_order_material_consumptions table
-- Author: Material Consumption Fix
-- Date: 2025-01-11
-- =========================================

-- Add operator_name column to work_order_material_consumptions table
ALTER TABLE work_order_material_consumptions
ADD COLUMN IF NOT EXISTS operator_name VARCHAR(255);

-- Add operator_id column if it doesn't exist (for compatibility)
ALTER TABLE work_order_material_consumptions
ADD COLUMN IF NOT EXISTS operator_id BIGINT REFERENCES operators(id) ON DELETE SET NULL;

-- Add batch_number column if it doesn't exist (for material tracking)
ALTER TABLE work_order_material_consumptions
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_material_consumptions_operator
    ON work_order_material_consumptions(operator_id);

-- Comments
COMMENT ON COLUMN work_order_material_consumptions.operator_name IS 'Name of the operator who performed the material consumption';
COMMENT ON COLUMN work_order_material_consumptions.operator_id IS 'ID of the operator who performed the material consumption';
