-- Adds VAT capture columns to supplier (purchase-side) invoices so the
-- Input VAT side of the VAT register has data to aggregate. The sales-side
-- factory_sales_invoices already has tax_rate / tax_amount (V47).

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill subtotal from total_amount for existing rows where no VAT was tracked.
UPDATE public.invoices SET subtotal = total_amount WHERE subtotal IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_vat_rate_valid'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT invoices_vat_rate_valid CHECK (vat_rate >= 0 AND vat_rate <= 100);
    END IF;
END
$$;
