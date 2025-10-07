-- =========================================
-- Migration: V26_add_production_execution_system
-- Description: Creates production execution tracking tables
-- Author: Factory Module Implementation
-- Date: 2025-03-10
-- =========================================

-- Production Runs: Track individual production runs
CREATE TABLE IF NOT EXISTS production_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    production_line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
    operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    run_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Status and scheduling
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'scheduled',
        'in_progress',
        'paused',
        'completed',
        'cancelled'
    )) DEFAULT 'scheduled',
    
    -- Timing
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    total_runtime_minutes INTEGER DEFAULT 0,
    total_downtime_minutes INTEGER DEFAULT 0,
    
    -- Production quantities
    target_quantity NUMERIC(10, 2) NOT NULL,
    produced_quantity NUMERIC(10, 2) DEFAULT 0,
    good_quantity NUMERIC(10, 2) DEFAULT 0,
    rejected_quantity NUMERIC(10, 2) DEFAULT 0,
    
    -- Efficiency metrics
    planned_cycle_time_seconds INTEGER,
    actual_cycle_time_seconds INTEGER,
    efficiency_percentage NUMERIC(5, 2) DEFAULT 0,
    quality_percentage NUMERIC(5, 2) DEFAULT 0,
    
    -- Notes and tracking
    notes TEXT,
    started_by INTEGER REFERENCES users(id),
    completed_by INTEGER REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Production Run Events: Track state changes and actions
CREATE TABLE IF NOT EXISTS production_run_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'start',
        'pause',
        'resume',
        'stop',
        'complete',
        'quality_check',
        'material_change',
        'operator_change',
        'issue_reported',
        'issue_resolved'
    )),
    event_status VARCHAR(50) CHECK (event_status IN (
        'success',
        'failure',
        'warning'
    )),
    
    -- Event data
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quantity_at_event NUMERIC(10, 2),
    notes TEXT,
    metadata JSONB,
    
    -- User tracking
    performed_by INTEGER REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Production Downtime: Track downtime periods
CREATE TABLE IF NOT EXISTS production_downtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
    
    -- Downtime details
    downtime_reason VARCHAR(100) NOT NULL,
    downtime_category VARCHAR(50) NOT NULL CHECK (downtime_category IN (
        'machine_breakdown',
        'maintenance',
        'material_shortage',
        'quality_issue',
        'setup_changeover',
        'operator_absence',
        'power_outage',
        'other'
    )),
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN end_time IS NOT NULL THEN
                EXTRACT(EPOCH FROM (end_time - start_time)) / 60
            ELSE NULL
        END
    ) STORED,
    
    -- Impact
    is_planned BOOLEAN DEFAULT FALSE,
    cost_impact NUMERIC(10, 2),
    notes TEXT,
    
    -- Resolution
    resolution_notes TEXT,
    resolved_by INTEGER REFERENCES users(id),
    
    -- User tracking
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_production_runs_work_order 
    ON production_runs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_status 
    ON production_runs(status);
CREATE INDEX IF NOT EXISTS idx_production_runs_production_line 
    ON production_runs(production_line_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_operator 
    ON production_runs(operator_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_actual_start 
    ON production_runs(actual_start_time);

CREATE INDEX IF NOT EXISTS idx_production_run_events_run 
    ON production_run_events(production_run_id);
CREATE INDEX IF NOT EXISTS idx_production_run_events_type 
    ON production_run_events(event_type);
CREATE INDEX IF NOT EXISTS idx_production_run_events_timestamp 
    ON production_run_events(event_timestamp);

CREATE INDEX IF NOT EXISTS idx_production_downtime_run 
    ON production_downtime(production_run_id);
CREATE INDEX IF NOT EXISTS idx_production_downtime_category 
    ON production_downtime(downtime_category);
CREATE INDEX IF NOT EXISTS idx_production_downtime_start 
    ON production_downtime(start_time);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_production_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_production_downtime_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_production_runs_updated_at
    BEFORE UPDATE ON production_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_production_runs_updated_at();

CREATE TRIGGER trigger_update_production_downtime_updated_at
    BEFORE UPDATE ON production_downtime
    FOR EACH ROW
    EXECUTE FUNCTION update_production_downtime_updated_at();

-- Create sequence for production run numbers
CREATE SEQUENCE IF NOT EXISTS production_run_sequence START WITH 1000;

-- Comments
COMMENT ON TABLE production_runs IS 'Tracks individual production runs for work orders';
COMMENT ON TABLE production_run_events IS 'Logs all events and state changes during production runs';
COMMENT ON TABLE production_downtime IS 'Records downtime periods during production';

