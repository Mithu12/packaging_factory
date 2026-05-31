-- V160: Distribution center on delivery returns
--
-- Returned goods must re-enter a specific distribution center's stock
-- (product_locations), not just the global products.current_stock. Deliveries
-- carry no source DC, so the return captures the destination DC (defaulting to
-- the primary warehouse). Approval credits product_locations for this DC.

ALTER TABLE factory_delivery_returns
    ADD COLUMN IF NOT EXISTS distribution_center_id BIGINT REFERENCES distribution_centers(id);

-- Backfill existing rows to the primary DC so historical returns have a target.
UPDATE factory_delivery_returns r
   SET distribution_center_id = (SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1)
 WHERE distribution_center_id IS NULL;

COMMENT ON COLUMN factory_delivery_returns.distribution_center_id IS
    'DC whose product_locations stock is credited when the return is approved.';

DO $$
BEGIN
    RAISE NOTICE 'Migration V160 completed: distribution_center_id added to factory_delivery_returns';
END $$;
