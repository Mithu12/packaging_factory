-- Track how many times a cheque has been cancelled
ALTER TABLE cheques
    ADD COLUMN IF NOT EXISTS cancellation_count INT NOT NULL DEFAULT 0;
