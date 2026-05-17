-- V140: Backfill suppliers.vat_id from suppliers.tax_id
-- The supplier form historically wrote VAT numbers to the tax_id column.
-- Going forward the form writes to vat_id; this copies legacy values so
-- the edit screen continues to surface them.

BEGIN;

UPDATE suppliers
SET vat_id = tax_id
WHERE vat_id IS NULL
  AND tax_id IS NOT NULL
  AND tax_id <> '';

COMMIT;
