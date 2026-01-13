-- V77: Add Customer Payments Tracking for Sales Orders
-- Description: Creates customer_payments table to track all payment transactions (upfront, due payments, refunds, adjustments)

BEGIN;

-- Create customer_payments table
CREATE TABLE IF NOT EXISTS customer_payments (
    id BIGSERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE SET NULL,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('upfront', 'due_payment', 'refund', 'adjustment')),
    payment_amount DECIMAL(15,2) NOT NULL CHECK (payment_amount > 0),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    payment_reference VARCHAR(100),
    notes TEXT,
    recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    additional_metadata JSONB DEFAULT '{}'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_sales_order_id ON customer_payments(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_payment_date ON customer_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_customer_payments_payment_type ON customer_payments(payment_type);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_customer_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_payments_updated_at
    BEFORE UPDATE ON customer_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_payments_updated_at();

-- Comments for documentation
COMMENT ON TABLE customer_payments IS 'Tracks all payment transactions for sales order customers including upfront payments, due payments, refunds, and adjustments';
COMMENT ON COLUMN customer_payments.payment_type IS 'Type of payment: upfront (at order creation), due_payment (collected later), refund, adjustment';
COMMENT ON COLUMN customer_payments.payment_amount IS 'Amount of the payment transaction';
COMMENT ON COLUMN customer_payments.payment_method IS 'Method: cash, card, credit, check, bank_transfer';
COMMENT ON COLUMN customer_payments.sales_order_id IS 'Related sales order ID (NULL for standalone due payments)';

-- Backfill existing upfront payments from sales_orders
-- Create payment records for existing orders with cash_received > 0
INSERT INTO customer_payments (
    customer_id,
    sales_order_id,
    payment_type,
    payment_amount,
    payment_date,
    payment_method,
    recorded_by,
    notes
)
SELECT 
    so.customer_id,
    so.id as sales_order_id,
    'upfront' as payment_type,
    so.cash_received as payment_amount,
    so.order_date as payment_date,
    COALESCE(so.payment_method, 'cash') as payment_method,
    COALESCE(so.cashier_id, 1) as recorded_by,
    'Backfilled from existing order' as notes
FROM sales_orders so
WHERE so.cash_received > 0
  AND so.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_payments cp 
    WHERE cp.sales_order_id = so.id AND cp.payment_type = 'upfront'
  );

COMMIT;
