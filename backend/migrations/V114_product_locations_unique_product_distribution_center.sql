-- product_locations must have a UNIQUE (product_id, distribution_center_id) for
-- ON CONFLICT used in AddProductMediator and auto_allocate_product_to_main_warehouse (V40).
-- Some databases may be missing this constraint even though V2 defined it inline.

DO $$
DECLARE
    has_pair_unique boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'product_locations'
          AND indexdef LIKE '%UNIQUE%'
          AND indexdef LIKE '%product_id%'
          AND indexdef LIKE '%distribution_center_id%'
    )
    INTO has_pair_unique;

    IF NOT has_pair_unique THEN
        DELETE FROM product_locations pl
        WHERE EXISTS (
            SELECT 1
            FROM product_locations pl2
            WHERE pl2.product_id = pl.product_id
              AND pl2.distribution_center_id = pl.distribution_center_id
              AND pl2.id < pl.id
        );

        CREATE UNIQUE INDEX idx_product_locations_product_dc_unique
            ON product_locations (product_id, distribution_center_id);
    END IF;
END $$;
