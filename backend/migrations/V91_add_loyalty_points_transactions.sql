-- V91: Add Loyalty Points Transactions Table
-- This migration adds a table to track loyalty points history for customers

CREATE TABLE IF NOT EXISTS public.loyalty_points_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT loyalty_points_transactions_type_check CHECK (type IN ('earn', 'redeem', 'adjustment', 'expire'))
);

-- Index for faster lookups by customer
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON public.loyalty_points_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON public.loyalty_points_transactions(created_at);

-- Add comments for documentation
COMMENT ON TABLE public.loyalty_points_transactions IS 'History of loyalty points transactions for customers';
COMMENT ON COLUMN public.loyalty_points_transactions.type IS 'Type of transaction: earn, redeem, adjustment, or expire';
COMMENT ON COLUMN public.loyalty_points_transactions.points IS 'Points added (positive) or deducted (negative)';
COMMENT ON COLUMN public.loyalty_points_transactions.balance_after IS 'Snapshot of the customer loyalty points balance after this transaction';
COMMENT ON COLUMN public.loyalty_points_transactions.reference_id IS 'Optional reference to an order, invoice, or other entity';
