-- V179: Monthly bills (saved consolidated bills)
--
-- Previously monthly bills were read-only PDF reports. This migration
-- adds tables to persist generated monthly bills so they can be tracked,
-- viewed, and re-downloaded.

BEGIN;

CREATE SEQUENCE IF NOT EXISTS monthly_bill_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_monthly_bill_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val BIGINT;
    year_month VARCHAR(6);
    bill_no VARCHAR(50);
BEGIN
    next_val := nextval('monthly_bill_number_seq');
    year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');
    bill_no := 'MB-' || year_month || '-' || LPAD(next_val::TEXT, 5, '0');
    RETURN bill_no;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_monthly_bill_number IS 'Generates unique monthly bill number (e.g., MB-202607-00001)';

CREATE TABLE IF NOT EXISTS monthly_bills (
    id BIGSERIAL PRIMARY KEY,
    bill_number VARCHAR(50) NOT NULL UNIQUE DEFAULT generate_monthly_bill_number(),
    customer_id BIGINT NOT NULL REFERENCES factory_customers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_vat_number VARCHAR(50),
    customer_address TEXT,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    vat_filter VARCHAR(10),
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_qty NUMERIC(15,3) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    outstanding_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    line_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'generated',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mb_vat_filter CHECK (vat_filter IN ('with', 'without', NULL)),
    CONSTRAINT chk_mb_status CHECK (status IN ('generated'))
);

CREATE INDEX IF NOT EXISTS idx_mb_customer_id ON monthly_bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_mb_created_at ON monthly_bills(created_at DESC);

COMMENT ON TABLE monthly_bills IS 'Persisted monthly consolidated bills aggregating challans for a customer/period';

CREATE TABLE IF NOT EXISTS monthly_bill_line_items (
    id BIGSERIAL PRIMARY KEY,
    monthly_bill_id BIGINT NOT NULL REFERENCES monthly_bills(id) ON DELETE CASCADE,
    delivery_id BIGINT NOT NULL,
    delivery_number VARCHAR(50),
    delivery_date DATE,
    invoice_id BIGINT,
    invoice_number VARCHAR(50),
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_qty NUMERIC(15,3) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mbli_bill_id ON monthly_bill_line_items(monthly_bill_id);

COMMENT ON TABLE monthly_bill_line_items IS 'Line items (challans) that make up a saved monthly bill';

COMMIT;
