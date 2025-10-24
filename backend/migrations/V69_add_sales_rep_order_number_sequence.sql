-- Create sequence for sales rep order numbers
CREATE SEQUENCE IF NOT EXISTS sales_rep_order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create sequence for sales rep invoice numbers
CREATE SEQUENCE IF NOT EXISTS sales_rep_invoice_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create sequence for sales rep payment numbers
CREATE SEQUENCE IF NOT EXISTS sales_rep_payment_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create sequence for sales rep delivery numbers
CREATE SEQUENCE IF NOT EXISTS sales_rep_delivery_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Set the sequences to start from the current maximum values
-- This ensures existing records don't conflict with new sequence-based numbers

-- Set order number sequence
DO $$
DECLARE
    max_order_num INTEGER;
BEGIN
    -- Get the maximum numeric part from existing order numbers
    SELECT COALESCE(MAX(
        CASE 
            WHEN order_number ~ '^SR-[0-9]{8}-[0-9]+$' 
            THEN CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_order_num
    FROM sales_rep_orders;
    
    -- Set the sequence to start from max + 1
    IF max_order_num > 0 THEN
        EXECUTE format('ALTER SEQUENCE sales_rep_order_number_seq RESTART WITH %s', max_order_num + 1);
    END IF;
END $$;

-- Set invoice number sequence
DO $$
DECLARE
    max_invoice_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number ~ '^INV-[0-9]{8}-[0-9]+$' 
            THEN CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_invoice_num
    FROM sales_rep_invoices;
    
    IF max_invoice_num > 0 THEN
        EXECUTE format('ALTER SEQUENCE sales_rep_invoice_number_seq RESTART WITH %s', max_invoice_num + 1);
    END IF;
END $$;

-- Set payment number sequence
DO $$
DECLARE
    max_payment_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CASE 
            WHEN payment_number ~ '^PAY-[0-9]{8}-[0-9]+$' 
            THEN CAST(SPLIT_PART(payment_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_payment_num
    FROM sales_rep_payments;
    
    IF max_payment_num > 0 THEN
        EXECUTE format('ALTER SEQUENCE sales_rep_payment_number_seq RESTART WITH %s', max_payment_num + 1);
    END IF;
END $$;

-- Set delivery number sequence
DO $$
DECLARE
    max_delivery_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CASE 
            WHEN delivery_number ~ '^DEL-[0-9]{8}-[0-9]+$' 
            THEN CAST(SPLIT_PART(delivery_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_delivery_num
    FROM sales_rep_deliveries;
    
    IF max_delivery_num > 0 THEN
        EXECUTE format('ALTER SEQUENCE sales_rep_delivery_number_seq RESTART WITH %s', max_delivery_num + 1);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_order_number ON sales_rep_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_sales_rep_invoices_invoice_number ON sales_rep_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_rep_payments_payment_number ON sales_rep_payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_sales_rep_deliveries_delivery_number ON sales_rep_deliveries(delivery_number);
