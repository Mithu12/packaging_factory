ALTER TABLE purchase_order_line_items
    ADD COLUMN IF NOT EXISTS ordered_rolls NUMERIC(10,2);
