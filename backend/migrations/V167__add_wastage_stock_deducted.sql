-- Wastage now physically deducts stock at recording time; rejection credits it
-- back. Records created before this flag existed never deducted stock, so the
-- flag guards rejection from restoring stock that was never taken.
ALTER TABLE material_wastage
  ADD COLUMN stock_deducted BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN material_wastage.stock_deducted IS
  'True when the wasted quantity was deducted from location stock at recording; rejection only restores stock for these records';
