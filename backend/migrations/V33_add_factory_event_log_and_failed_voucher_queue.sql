-- =========================================
-- Migration: V33_add_factory_event_log_and_failed_voucher_queue
-- Description: Add event logging for idempotency and failed voucher queue for retry mechanism
-- Author: Factory-Accounts Integration - Phase 4
-- Date: 2025-10-08
-- Related: FACTORY_ACCOUNTS_INTEGRATION_ENHANCEMENTS.md
-- =========================================

-- =============================================
-- Part 1: Factory Event Log (Idempotency)
-- =============================================

-- Create factory_event_log table to track all processed events
-- Prevents duplicate voucher creation if events are replayed
CREATE TABLE IF NOT EXISTS factory_event_log (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE, -- Unique event identifier (e.g., "order_approved_12345_1696800000")
    event_type VARCHAR(100) NOT NULL, -- Type of event (e.g., "FACTORY_ORDER_APPROVED")
    event_source VARCHAR(100) NOT NULL, -- Source entity type (e.g., "customer_order", "production_run")
    source_id BIGINT NOT NULL, -- ID of source entity
    payload JSONB NOT NULL, -- Full event payload for debugging
    
    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    processed_at TIMESTAMP WITH TIME ZONE, -- When event was successfully processed
    
    -- Voucher tracking
    voucher_ids INTEGER[], -- Array of voucher IDs created by this event
    voucher_count INTEGER DEFAULT 0, -- Number of vouchers created
    
    -- Error tracking
    error_message TEXT, -- Error message if processing failed
    retry_count INTEGER DEFAULT 0, -- Number of retry attempts
    last_retry_at TIMESTAMP WITH TIME ZONE, -- Last retry timestamp
    
    -- Metadata
    created_by INTEGER NOT NULL, -- User who triggered the event
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT factory_event_log_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_factory_event_log_event_type ON factory_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_factory_event_log_status ON factory_event_log(status);
CREATE INDEX IF NOT EXISTS idx_factory_event_log_source ON factory_event_log(event_source, source_id);
CREATE INDEX IF NOT EXISTS idx_factory_event_log_created_at ON factory_event_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_factory_event_log_processed_at ON factory_event_log(processed_at DESC);

-- Add comments
COMMENT ON TABLE factory_event_log IS 'Logs all factory events for idempotency and audit trail';
COMMENT ON COLUMN factory_event_log.event_id IS 'Unique identifier for the event (prevents duplicate processing)';
COMMENT ON COLUMN factory_event_log.event_type IS 'Type of event from EVENT_NAMES enum';
COMMENT ON COLUMN factory_event_log.status IS 'Current processing status of the event';
COMMENT ON COLUMN factory_event_log.voucher_ids IS 'Array of accounting voucher IDs created from this event';

-- =============================================
-- Part 2: Failed Voucher Queue (Retry Mechanism)
-- =============================================

-- Create failed_voucher_queue table for manual review and retry
CREATE TABLE IF NOT EXISTS failed_voucher_queue (
    id BIGSERIAL PRIMARY KEY,
    event_log_id BIGINT REFERENCES factory_event_log(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(100) NOT NULL,
    source_id BIGINT NOT NULL,
    event_payload JSONB NOT NULL,
    
    -- Failure details
    failure_reason TEXT NOT NULL,
    failure_category VARCHAR(50) NOT NULL, -- 'missing_accounts', 'validation_error', 'system_error', 'network_error'
    stack_trace TEXT,
    
    -- Retry tracking
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    last_retry_error TEXT,
    
    -- Resolution tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, resolved, abandoned
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL, -- Voucher created on manual resolution
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT failed_voucher_queue_status_check CHECK (status IN ('pending', 'in_progress', 'resolved', 'abandoned')),
    CONSTRAINT failed_voucher_queue_category_check CHECK (
        failure_category IN ('missing_accounts', 'validation_error', 'system_error', 'network_error', 'other')
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_failed_voucher_queue_status ON failed_voucher_queue(status);
CREATE INDEX IF NOT EXISTS idx_failed_voucher_queue_event_type ON failed_voucher_queue(event_type);
CREATE INDEX IF NOT EXISTS idx_failed_voucher_queue_next_retry ON failed_voucher_queue(next_retry_at) 
    WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_failed_voucher_queue_source ON failed_voucher_queue(event_source, source_id);
CREATE INDEX IF NOT EXISTS idx_failed_voucher_queue_created_at ON failed_voucher_queue(created_at DESC);

-- Add comments
COMMENT ON TABLE failed_voucher_queue IS 'Queue of failed voucher creations for manual review and retry';
COMMENT ON COLUMN failed_voucher_queue.failure_category IS 'Category of failure for easier troubleshooting';
COMMENT ON COLUMN failed_voucher_queue.next_retry_at IS 'Scheduled time for next automatic retry attempt';
COMMENT ON COLUMN failed_voucher_queue.status IS 'Current status of the failed voucher';

-- =============================================
-- Part 3: Helper Functions
-- =============================================

-- Function to generate event ID
CREATE OR REPLACE FUNCTION generate_factory_event_id(
    p_event_type VARCHAR,
    p_source_id BIGINT,
    p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) RETURNS VARCHAR AS $$
BEGIN
    -- Format: {event_type}_{source_id}_{unix_timestamp}
    -- Example: "order_approved_12345_1696800000"
    RETURN LOWER(p_event_type) || '_' || p_source_id || '_' || EXTRACT(EPOCH FROM p_timestamp)::BIGINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_factory_event_id IS 'Generates unique event ID for idempotency tracking';

-- Function to check if event already processed
CREATE OR REPLACE FUNCTION is_factory_event_processed(p_event_id VARCHAR) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM factory_event_log 
        WHERE event_id = p_event_id 
        AND status IN ('completed', 'processing')
    );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_factory_event_processed IS 'Checks if an event has already been processed (idempotency check)';

-- Function to calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION calculate_next_retry(
    p_retry_count INTEGER,
    p_base_delay_minutes INTEGER DEFAULT 5
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Exponential backoff: base_delay * 2^retry_count
    -- Max delay: 24 hours
    RETURN CURRENT_TIMESTAMP + INTERVAL '1 minute' * LEAST(
        p_base_delay_minutes * POWER(2, p_retry_count),
        1440  -- Max 24 hours
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_next_retry IS 'Calculates next retry time using exponential backoff';

-- =============================================
-- Part 4: Triggers for updated_at
-- =============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_factory_event_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_factory_event_log_updated_at
    BEFORE UPDATE ON factory_event_log
    FOR EACH ROW
    EXECUTE FUNCTION update_factory_event_log_updated_at();

CREATE TRIGGER trigger_failed_voucher_queue_updated_at
    BEFORE UPDATE ON failed_voucher_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_factory_event_log_updated_at();

-- =============================================
-- Part 5: Views for Monitoring
-- =============================================

-- View: Failed vouchers pending retry
CREATE OR REPLACE VIEW failed_vouchers_pending_retry AS
SELECT 
    fvq.id,
    fvq.event_type,
    fvq.event_source,
    fvq.source_id,
    fvq.failure_reason,
    fvq.failure_category,
    fvq.retry_count,
    fvq.max_retries,
    fvq.next_retry_at,
    fvq.created_at,
    CASE 
        WHEN fvq.next_retry_at IS NULL THEN 'No Retry Scheduled'
        WHEN fvq.next_retry_at <= CURRENT_TIMESTAMP THEN 'Ready for Retry'
        ELSE 'Scheduled'
    END as retry_status,
    fvq.event_payload
FROM failed_voucher_queue fvq
WHERE fvq.status = 'pending'
  AND fvq.retry_count < fvq.max_retries
ORDER BY fvq.next_retry_at NULLS LAST, fvq.created_at;

COMMENT ON VIEW failed_vouchers_pending_retry IS 'Failed vouchers that are pending automatic retry';

-- View: Event processing statistics
CREATE OR REPLACE VIEW factory_event_processing_stats AS
SELECT 
    event_type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    AVG(voucher_count) FILTER (WHERE status = 'completed') as avg_vouchers_per_event,
    SUM(voucher_count) FILTER (WHERE status = 'completed') as total_vouchers_created,
    MIN(created_at) as first_event_at,
    MAX(created_at) as last_event_at
FROM factory_event_log
GROUP BY event_type
ORDER BY total_events DESC;

COMMENT ON VIEW factory_event_processing_stats IS 'Statistics on factory event processing by type';

-- View: Recent failed vouchers for dashboard
CREATE OR REPLACE VIEW recent_failed_vouchers AS
SELECT 
    fvq.id,
    fvq.event_type,
    fvq.event_source,
    fvq.source_id,
    fvq.failure_category,
    fvq.failure_reason,
    fvq.retry_count,
    fvq.status,
    fvq.created_at,
    fvq.next_retry_at,
    el.event_id,
    el.created_by,
    u.username as created_by_username
FROM failed_voucher_queue fvq
LEFT JOIN factory_event_log el ON fvq.event_log_id = el.id
LEFT JOIN users u ON el.created_by = u.id
WHERE fvq.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY fvq.created_at DESC
LIMIT 50;

COMMENT ON VIEW recent_failed_vouchers IS 'Last 50 failed vouchers from the past 7 days';

-- =============================================
-- Part 6: Grant Permissions
-- =============================================

-- Grant appropriate permissions (adjust role names as needed)
DO $$
BEGIN
    -- Grant to finance roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finance_manager') THEN
        GRANT SELECT, INSERT, UPDATE ON factory_event_log TO finance_manager;
        GRANT SELECT, INSERT, UPDATE ON failed_voucher_queue TO finance_manager;
        GRANT SELECT ON failed_vouchers_pending_retry TO finance_manager;
        GRANT SELECT ON factory_event_processing_stats TO finance_manager;
        GRANT SELECT ON recent_failed_vouchers TO finance_manager;
    END IF;
    
    -- Grant to factory roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'factory_manager') THEN
        GRANT SELECT ON factory_event_log TO factory_manager;
        GRANT SELECT ON failed_voucher_queue TO factory_manager;
        GRANT SELECT ON recent_failed_vouchers TO factory_manager;
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Roles don't exist yet, skip
        NULL;
END $$;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration V33 completed: Factory event log and failed voucher queue created';
    RAISE NOTICE '  - Created factory_event_log table for idempotency tracking';
    RAISE NOTICE '  - Created failed_voucher_queue table for retry mechanism';
    RAISE NOTICE '  - Created helper functions for event processing';
    RAISE NOTICE '  - Created monitoring views for dashboard';
    RAISE NOTICE '  - Ready for Phase 4: Idempotency and retry implementation';
END $$;

