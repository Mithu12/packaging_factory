-- V163: Per-DC stock as single source of truth
--
-- Makes products.current_stock a DERIVED value equal to the sum of that
-- product's per-distribution-center stock (product_locations.current_stock).
-- A trigger on product_locations keeps products.current_stock in sync, so
-- application code must only ever move stock through product_locations.
--
-- Also adds the DC context that factory production and shipping previously
-- lacked (work_orders / deliveries get a distribution_center_id).
--
-- Backfill strategy: preserve each product's CURRENT global total by dumping the
-- gap (global - sum of locations) into the primary DC's row.

-- =============================================================
-- Part 1: DC columns for production target + shipment source
-- =============================================================

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS distribution_center_id BIGINT REFERENCES distribution_centers(id);

ALTER TABLE factory_customer_order_deliveries
    ADD COLUMN IF NOT EXISTS distribution_center_id BIGINT REFERENCES distribution_centers(id);

DO $$
DECLARE
    primary_dc BIGINT;
BEGIN
    SELECT id INTO primary_dc FROM distribution_centers WHERE is_primary = true LIMIT 1;
    IF primary_dc IS NULL THEN
        RAISE EXCEPTION 'No primary distribution center configured; cannot run V163';
    END IF;

    -- Backfill existing work orders / deliveries to the primary DC.
    UPDATE work_orders SET distribution_center_id = primary_dc WHERE distribution_center_id IS NULL;
    UPDATE factory_customer_order_deliveries SET distribution_center_id = primary_dc WHERE distribution_center_id IS NULL;

    -- =========================================================
    -- Part 2: Ensure every product has a primary-DC location row
    -- =========================================================
    INSERT INTO product_locations (product_id, distribution_center_id, current_stock)
    SELECT p.id, primary_dc, 0
      FROM products p
     WHERE NOT EXISTS (
         SELECT 1 FROM product_locations pl
          WHERE pl.product_id = p.id AND pl.distribution_center_id = primary_dc
     );

    -- =========================================================
    -- Part 3: Reconcile — push (global - sum of locations) into the
    -- primary DC row so SUM(locations) matches the current global total.
    -- Clamp at 0 to honor the current_stock >= 0 CHECK (the final sync in
    -- Part 4 then makes products.current_stock exactly equal the sum).
    -- =========================================================
    UPDATE product_locations pl
       SET current_stock = GREATEST(
             0,
             pl.current_stock + (
                 p.current_stock
                 - COALESCE((SELECT SUM(pl2.current_stock)
                               FROM product_locations pl2
                              WHERE pl2.product_id = p.id), 0)
             )
           )
      FROM products p
     WHERE pl.product_id = p.id
       AND pl.distribution_center_id = primary_dc;
END $$;

-- =============================================================
-- Part 4: Derive trigger — products.current_stock = SUM(locations)
-- =============================================================

CREATE OR REPLACE FUNCTION sync_product_current_stock()
RETURNS TRIGGER AS $$
DECLARE
    pid BIGINT := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
    UPDATE products
       SET current_stock = COALESCE(
               (SELECT SUM(current_stock) FROM product_locations WHERE product_id = pid), 0),
           updated_at = CURRENT_TIMESTAMP
     WHERE id = pid;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_current_stock ON product_locations;
CREATE TRIGGER trg_sync_product_current_stock
    AFTER INSERT OR UPDATE OF current_stock OR DELETE ON product_locations
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_current_stock();

-- Final one-time sync so the invariant holds for every product immediately
-- (covers any product whose reconcile was clamped).
UPDATE products p
   SET current_stock = COALESCE(
         (SELECT SUM(current_stock) FROM product_locations pl WHERE pl.product_id = p.id), 0);

COMMENT ON FUNCTION sync_product_current_stock IS
    'Keeps products.current_stock = SUM(product_locations.current_stock). product_locations is the source of truth; never write products.current_stock directly.';

DO $$
BEGIN
    RAISE NOTICE 'Migration V163 completed: per-DC stock invariant + derive trigger';
END $$;
