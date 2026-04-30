-- V131: Partial deliveries for factory customer orders
--
-- Adds a delivery (challan) aggregate so that a single customer order can be shipped
-- in multiple shipments. Each delivery carries its own line items and links 1:1 to a
-- sales invoice. Per-line rollup columns on the existing line-items table act as a
-- read-side cache for "how much of this line is already delivered/invoiced".
--
-- Companion changes (in app code, same release):
--   * SalesInvoiceMediator.createInvoiceFromDelivery posts the per-delivery invoice
--   * CreateDelivery mediator debits products.current_stock symmetrically to
--     creditWorkOrderProductStock
--   * Order status transitions: completed -> partially_shipped -> shipped (full)

-- 1) Sequence for human-friendly delivery numbers (DLV-YYYY-00001)
CREATE SEQUENCE IF NOT EXISTS delivery_number_sequence START 1 INCREMENT 1;

-- 2) Allow partially_shipped on the existing CHECK constraint.
-- The original V14/V16 constraint was created without an explicit name; postgres
-- auto-named it factory_customer_orders_status_check.
ALTER TABLE factory_customer_orders
    DROP CONSTRAINT IF EXISTS factory_customer_orders_status_check;
ALTER TABLE factory_customer_orders
    ADD CONSTRAINT factory_customer_orders_status_check
    CHECK (status IN (
        'draft', 'pending', 'quoted', 'approved', 'rejected',
        'in_production', 'completed', 'partially_shipped', 'shipped', 'cancelled'
    ));

COMMENT ON COLUMN factory_customer_orders.status IS
    'Order status: draft, pending, quoted, approved, rejected, in_production, completed, partially_shipped, shipped, cancelled';

-- 3) Per-line rollup columns (read-side cache; source of truth is delivery_items)
ALTER TABLE factory_customer_order_line_items
    ADD COLUMN IF NOT EXISTS delivered_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoiced_qty  DECIMAL(15,3) NOT NULL DEFAULT 0;

ALTER TABLE factory_customer_order_line_items
    DROP CONSTRAINT IF EXISTS chk_delivered_qty_le_quantity;
ALTER TABLE factory_customer_order_line_items
    ADD CONSTRAINT chk_delivered_qty_le_quantity
    CHECK (delivered_qty <= quantity);

ALTER TABLE factory_customer_order_line_items
    DROP CONSTRAINT IF EXISTS chk_invoiced_qty_le_delivered;
ALTER TABLE factory_customer_order_line_items
    ADD CONSTRAINT chk_invoiced_qty_le_delivered
    CHECK (invoiced_qty <= delivered_qty);

COMMENT ON COLUMN factory_customer_order_line_items.delivered_qty IS
    'Cumulative quantity shipped across all deliveries for this line. Source of truth: SUM(delivery_items.quantity)';
COMMENT ON COLUMN factory_customer_order_line_items.invoiced_qty IS
    'Cumulative quantity invoiced across all delivery invoices. Bounded by delivered_qty.';

-- 4) Delivery (challan) header
CREATE TABLE IF NOT EXISTS factory_customer_order_deliveries (
    id BIGSERIAL PRIMARY KEY,
    delivery_number VARCHAR(50) UNIQUE NOT NULL,
    customer_order_id BIGINT NOT NULL REFERENCES factory_customer_orders(id) ON DELETE RESTRICT,
    invoice_id BIGINT REFERENCES factory_sales_invoices(id) ON DELETE SET NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    estimated_delivery_date DATE,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'shipped'
        CHECK (delivery_status IN ('shipped', 'delivered', 'returned', 'cancelled')),
    notes TEXT,
    shipped_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deliveries_customer_order
    ON factory_customer_order_deliveries(customer_order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_invoice
    ON factory_customer_order_deliveries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_status
    ON factory_customer_order_deliveries(delivery_status);

CREATE TRIGGER update_factory_customer_order_deliveries_updated_at
    BEFORE UPDATE ON factory_customer_order_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE factory_customer_order_deliveries IS
    'One row per shipment of a customer order. Multiple deliveries per order = partial deliveries.';

-- 5) Delivery line items. Acts as the per-invoice line breakdown via delivery.invoice_id.
CREATE TABLE IF NOT EXISTS factory_customer_order_delivery_items (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES factory_customer_order_deliveries(id) ON DELETE CASCADE,
    order_line_item_id BIGINT NOT NULL REFERENCES factory_customer_order_line_items(id) ON DELETE RESTRICT,
    quantity DECIMAL(15,3) NOT NULL CHECK (quantity > 0),
    unit_price_snapshot DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (delivery_id, order_line_item_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery
    ON factory_customer_order_delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_order_line
    ON factory_customer_order_delivery_items(order_line_item_id);

COMMENT ON TABLE factory_customer_order_delivery_items IS
    'Line items contained in a single delivery. unit_price_snapshot freezes the price at ship time.';

DO $$
BEGIN
    RAISE NOTICE 'Migration V131 completed successfully';
    RAISE NOTICE '  - delivery_number_sequence created';
    RAISE NOTICE '  - factory_customer_orders status enum extended with partially_shipped';
    RAISE NOTICE '  - factory_customer_order_line_items: delivered_qty, invoiced_qty added';
    RAISE NOTICE '  - factory_customer_order_deliveries table created';
    RAISE NOTICE '  - factory_customer_order_delivery_items table created';
END $$;
