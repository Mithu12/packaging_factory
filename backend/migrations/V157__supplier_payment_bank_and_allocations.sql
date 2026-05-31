-- Supplier payments: capture the paying bank, and allow one payment (e.g. a single
-- check) to settle several outstanding invoices via an allocation junction table.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

CREATE TABLE IF NOT EXISTS payment_invoice_allocations (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (payment_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_pia_payment ON payment_invoice_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_pia_invoice ON payment_invoice_allocations(invoice_id);
