-- Add reversing voucher linking columns to vouchers table
-- Notes:
-- - reversed_by_voucher_id: Points to the voucher that reverses this one
-- - reverses_voucher_id: Points to the original voucher being reversed
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS reversing_voucher_id BIGINT REFERENCES public.vouchers(id);

ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS reversed_by_voucher_id BIGINT REFERENCES public.vouchers(id),
  ADD COLUMN IF NOT EXISTS reverses_voucher_id BIGINT REFERENCES public.vouchers(id);

-- Optional indexes for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_reversed_by ON public.vouchers(reversed_by_voucher_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_reverses ON public.vouchers(reverses_voucher_id);
