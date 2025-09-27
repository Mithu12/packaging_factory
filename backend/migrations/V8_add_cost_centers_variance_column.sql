-- =====================================================
-- Migration: V9 - Add Variance Column to Cost Centers
-- Description: Add variance column to existing cost_centers table
-- Author: System
-- Date: 2024-01-01
-- =====================================================

-- Add variance column as a computed column
ALTER TABLE cost_centers 
ADD COLUMN IF NOT EXISTS variance DECIMAL(15,2) GENERATED ALWAYS AS (budget - actual_spend) STORED;

-- Add comment for the new column
COMMENT ON COLUMN cost_centers.variance IS 'Calculated variance (budget - actual_spend)';
