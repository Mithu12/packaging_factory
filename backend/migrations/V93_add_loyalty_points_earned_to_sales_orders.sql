-- V92: Add Loyalty Points Earned to Sales Orders
-- This column stores the loyalty points that will be awarded when the order is completed

ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0;

COMMENT ON COLUMN public.sales_orders.loyalty_points_earned IS 'Loyalty points to be awarded to the customer upon order completion';
