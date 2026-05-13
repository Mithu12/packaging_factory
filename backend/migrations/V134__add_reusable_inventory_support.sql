-- V134: Multi-usable raw products (reusable inventory)
--
-- Some raw materials (slates, molds, fixtures) can be reused N times per
-- physical unit before being depleted. We model this as a per-product
-- attribute (uses_per_unit) plus per-location state tracking the active
-- (in-progress) unit's remaining uses and the uses reserved by open work
-- orders. Physical unit accounting stays in current_stock; a unit is only
-- decremented when its remaining uses reach zero.

BEGIN;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS uses_per_unit DECIMAL(10,2) NOT NULL DEFAULT 1
    CHECK (uses_per_unit >= 1);

COMMENT ON COLUMN products.uses_per_unit IS
    'Number of times a single physical unit can be consumed before it is depleted. 1 = single-use (default).';

ALTER TABLE product_locations
    ADD COLUMN IF NOT EXISTS active_unit_remaining_uses DECIMAL(10,2)
    CHECK (active_unit_remaining_uses IS NULL OR active_unit_remaining_uses >= 0);

ALTER TABLE product_locations
    ADD COLUMN IF NOT EXISTS reserved_uses DECIMAL(10,2) NOT NULL DEFAULT 0
    CHECK (reserved_uses >= 0);

COMMENT ON COLUMN product_locations.active_unit_remaining_uses IS
    'Remaining uses on the physical unit currently in progress at this location. NULL = no unit mid-use.';
COMMENT ON COLUMN product_locations.reserved_uses IS
    'Uses reserved by open work-order material allocations for reusable products.';

CREATE TABLE IF NOT EXISTS product_use_consumptions (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    distribution_center_id INTEGER NOT NULL REFERENCES distribution_centers(id),
    uses_consumed DECIMAL(10,2) NOT NULL CHECK (uses_consumed > 0),
    units_depleted INTEGER NOT NULL DEFAULT 0 CHECK (units_depleted >= 0),
    source VARCHAR(50) NOT NULL CHECK (source IN ('manual_adjustment', 'work_order_consumption')),
    source_reference_id BIGINT,
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_use_consumptions IS
    'Per-use audit log for reusable inventory items. One row per consumption event (manual or work-order driven).';

CREATE INDEX IF NOT EXISTS idx_product_use_consumptions_product_location_time
    ON product_use_consumptions (product_id, distribution_center_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_use_consumptions_source
    ON product_use_consumptions (source, source_reference_id);

COMMIT;
