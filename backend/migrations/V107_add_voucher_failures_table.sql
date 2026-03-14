-- V107: Add voucher_failures table for logging failed voucher creation
-- Independent of factory_event_log; used by all modules (factory, inventory, sales, etc.)

CREATE TABLE IF NOT EXISTS voucher_failures (
  id BIGSERIAL PRIMARY KEY,
  source_module VARCHAR(50) NOT NULL,
  operation_type VARCHAR(100) NOT NULL,
  source_entity_type VARCHAR(50) NOT NULL,
  source_entity_id BIGINT NOT NULL,
  error_message TEXT NOT NULL,
  failure_category VARCHAR(50) NOT NULL,
  payload JSONB,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_voucher_failures_source_module ON voucher_failures(source_module);
CREATE INDEX IF NOT EXISTS idx_voucher_failures_operation_type ON voucher_failures(operation_type);
CREATE INDEX IF NOT EXISTS idx_voucher_failures_created_at ON voucher_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voucher_failures_source_entity ON voucher_failures(source_entity_type, source_entity_id);

COMMENT ON TABLE voucher_failures IS 'Logs failed voucher creation attempts from factory, inventory, sales, and other modules';
