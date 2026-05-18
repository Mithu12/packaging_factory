-- V142: Carton-specific attributes on products
--
-- Ready Goods in this factory are corrugated cartons. The product form
-- needs to capture ply (corrugation layers), three free-text size fields
-- (reel, cutting, carton), and the buyer's own item code. These columns
-- are nullable and stay NULL for Raw Materials / Ready Raw Materials.

BEGIN;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS ply                SMALLINT,
    ADD COLUMN IF NOT EXISTS reel_size          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cutting_size       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS carton_size        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS customer_item_code VARCHAR(100);

COMMENT ON COLUMN products.ply IS
    'Corrugation layers for cartons (3, 5, 7, 9, 11). NULL outside Ready Goods.';
COMMENT ON COLUMN products.reel_size IS
    'Free-text reel size for cartons. Internal use only; not printed on the challan.';
COMMENT ON COLUMN products.cutting_size IS
    'Free-text cutting size for cartons. Internal use only; not printed on the challan.';
COMMENT ON COLUMN products.carton_size IS
    'Free-text finished carton size. Internal use only; not printed on the challan.';
COMMENT ON COLUMN products.customer_item_code IS
    'Buyer-supplied item code distinct from the system SKU. Not printed on the challan.';

COMMIT;
