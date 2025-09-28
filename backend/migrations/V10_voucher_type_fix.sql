-- 1. Ensure column has correct type
ALTER TABLE vouchers 
    ALTER COLUMN type TYPE VARCHAR(20),
    ALTER COLUMN type SET NOT NULL;

-- 2. Drop old constraint if it exists (optional but safer)
ALTER TABLE vouchers 
    DROP CONSTRAINT IF EXISTS vouchers_type_check;

-- 3. Add the new CHECK constraint
ALTER TABLE vouchers 
    ADD CONSTRAINT vouchers_type_check 
    CHECK (type IN ('Payment', 'Receipt', 'Journal', 'Balance Transfer'));

-- 4. Add column comment
COMMENT ON COLUMN vouchers.type 
    IS 'Type of voucher: Payment, Receipt, Journal, or Balance Transfer';
