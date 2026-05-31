-- V159: Bank Reconciliation (manual)
--
-- Reconciles a bank ledger account's book entries (ledger_entries) against a
-- manually entered bank-statement balance. The user ticks which ledger entries
-- have cleared the bank; the difference between the statement balance and the
-- cleared book balance surfaces outstanding (uncleared) items. No statement-file
-- import — entries come from the existing GL.

CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id BIGSERIAL PRIMARY KEY,
    bank_account_id BIGINT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    statement_date DATE NOT NULL,
    statement_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    -- Book balance snapshot (SUM debit - credit) for the account up to statement_date.
    book_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    -- Cleared balance: SUM(debit - credit) over the ticked (cleared) entries.
    reconciled_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    -- statement_balance - reconciled_balance. Zero = reconciled.
    difference NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed')),
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_account ON bank_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_status ON bank_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_bank_recon_statement_date ON bank_reconciliations(statement_date DESC);

COMMENT ON TABLE bank_reconciliations IS 'Manual bank reconciliation header: statement vs cleared book balance.';

CREATE TRIGGER update_bank_reconciliations_updated_at
    BEFORE UPDATE ON bank_reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS bank_reconciliation_lines (
    id BIGSERIAL PRIMARY KEY,
    reconciliation_id BIGINT NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
    ledger_entry_id BIGINT NOT NULL REFERENCES ledger_entries(id) ON DELETE RESTRICT,
    is_cleared BOOLEAN NOT NULL DEFAULT TRUE,
    cleared_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reconciliation_id, ledger_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_lines_recon ON bank_reconciliation_lines(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_lines_entry ON bank_reconciliation_lines(ledger_entry_id);

COMMENT ON TABLE bank_reconciliation_lines IS 'Ledger entries marked as cleared within a reconciliation.';

DO $$
BEGIN
    RAISE NOTICE 'Migration V159 completed: bank reconciliation tables created';
END $$;
