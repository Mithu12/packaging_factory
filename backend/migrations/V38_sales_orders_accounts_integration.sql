-- Add accounting integration tracking columns to sales_orders
-- Notes:
-- - voucher_id references vouchers(id)
-- - accounting_integrated marks successful voucher posting
-- - accounting_integration_error stores last error message

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS voucher_id BIGINT REFERENCES public.vouchers(id),
  ADD COLUMN IF NOT EXISTS accounting_integrated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accounting_integration_error TEXT;

-- Optional index to quickly find non-integrated completed orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_completed_not_integrated
  ON public.sales_orders (status)
  WHERE accounting_integrated = FALSE;


