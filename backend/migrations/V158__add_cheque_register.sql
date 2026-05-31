-- V158: Cheque / Pay-Order register
--
-- Tracks cheques and pay-orders issued (typically when paying a Payment voucher
-- by cheque) through their lifecycle: issued -> cleared / bounced / cancelled.
-- A cheque optionally links to the originating voucher and always names the
-- drawee bank ledger account, so clearing a cheque can later feed bank
-- reconciliation (V158).

CREATE TABLE IF NOT EXISTS cheques (
    id BIGSERIAL PRIMARY KEY,
    cheque_no VARCHAR(50) NOT NULL,
    cheque_date DATE NOT NULL,
    instrument_type VARCHAR(20) NOT NULL DEFAULT 'cheque'
        CHECK (instrument_type IN ('cheque', 'pay_order')),
    -- Drawee bank: a posting account under the chart of accounts (e.g. "Bank Account").
    bank_account_id BIGINT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    drawee_bank_name VARCHAR(255),
    payee VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) DEFAULT 'BDT',
    status VARCHAR(20) NOT NULL DEFAULT 'issued'
        CHECK (status IN ('issued', 'cleared', 'bounced', 'cancelled')),
    cleared_date DATE,
    voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    memo TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheques(status);
CREATE INDEX IF NOT EXISTS idx_cheques_bank_account ON cheques(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cheques_voucher ON cheques(voucher_id);
CREATE INDEX IF NOT EXISTS idx_cheques_cheque_date ON cheques(cheque_date DESC);

COMMENT ON TABLE cheques IS 'Cheque / pay-order register; lifecycle issued -> cleared/bounced/cancelled.';

CREATE TRIGGER update_cheques_updated_at
    BEFORE UPDATE ON cheques
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE 'Migration V158 completed: cheque register created';
END $$;
