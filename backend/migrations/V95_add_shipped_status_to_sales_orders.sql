-- V95: Add "shipped" status to sales orders
-- This adds 'shipped' to the allowed values for order status

ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;

ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_status_check 
CHECK (status = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'shipped'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'refunded'::character varying]));
