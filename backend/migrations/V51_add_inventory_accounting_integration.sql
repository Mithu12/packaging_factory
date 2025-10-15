-- Migration V51: Add inventory accounting integration
-- Adds voucher_id columns to purchase_orders and stock_adjustments tables
-- This enables linking inventory operations to accounting vouchers

-- Add voucher_id column to purchase_orders table
ALTER TABLE purchase_orders
ADD COLUMN receipt_voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_purchase_orders_receipt_voucher_id
ON purchase_orders(receipt_voucher_id);

-- Add voucher_id column to stock_adjustments table
ALTER TABLE stock_adjustments
ADD COLUMN voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_stock_adjustments_voucher_id
ON stock_adjustments(voucher_id);

-- Add comments for documentation
COMMENT ON COLUMN purchase_orders.receipt_voucher_id IS 'References the voucher created when goods are received from this purchase order';
COMMENT ON COLUMN stock_adjustments.voucher_id IS 'References the voucher created for this stock adjustment';
