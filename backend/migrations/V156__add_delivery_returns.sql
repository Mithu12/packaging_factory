-- V156: Delivery Challan Returns
--
-- Records goods returned by a customer against a specific delivery (challan).
-- Mirrors the purchase-returns workflow (V150) for structure and the
-- CancelDelivery mediator for stock/accounting reversal, but is linked to a
-- delivery rather than an order.
--
-- On approval the mediator:
--   * credits products.current_stock back (goods physically returned)
--   * reduces the touched order lines' delivered_qty / invoiced_qty rollups
--   * bumps factory_customer_order_delivery_items.returned_qty (over-return guard)
--   * recomputes each touched order's status
--   * posts a credit-note + inventory-restoration voucher pair (post-commit)

-- =============================================================
-- Part 1: Sequence + number-generation function (DLR-YYYY-000001)
-- =============================================================

CREATE SEQUENCE IF NOT EXISTS delivery_return_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_delivery_return_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val BIGINT;
    year_str VARCHAR(4);
BEGIN
    next_val := nextval('delivery_return_number_seq');
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    RETURN 'DLR-' || year_str || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_delivery_return_number IS 'Generates unique delivery return number (e.g., DLR-2026-000001)';

-- =============================================================
-- Part 2: Cumulative-return tracking on delivery items
-- =============================================================
-- Source of truth for "how much of this delivery line has been returned".
-- Updated only inside approveDeliveryReturn() under SELECT FOR UPDATE.

ALTER TABLE factory_customer_order_delivery_items
    ADD COLUMN IF NOT EXISTS returned_qty DECIMAL(15,3) NOT NULL DEFAULT 0;

COMMENT ON COLUMN factory_customer_order_delivery_items.returned_qty IS
    'Cumulative quantity returned across all approved delivery returns for this delivery line.';

-- =============================================================
-- Part 3: Header table factory_delivery_returns
-- =============================================================

CREATE TABLE IF NOT EXISTS factory_delivery_returns (
    id BIGSERIAL PRIMARY KEY,
    return_number VARCHAR(50) NOT NULL UNIQUE DEFAULT generate_delivery_return_number(),
    delivery_id BIGINT NOT NULL REFERENCES factory_customer_order_deliveries(id) ON DELETE RESTRICT,
    factory_customer_id BIGINT NOT NULL REFERENCES factory_customers(id) ON DELETE RESTRICT,
    customer_order_id BIGINT REFERENCES factory_customer_orders(id) ON DELETE SET NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_reason VARCHAR(50) NOT NULL DEFAULT 'other',
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved', 'rejected', 'cancelled')),
    total_return_value NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_return_value >= 0),
    currency VARCHAR(10) DEFAULT 'BDT',
    reversal_voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    credit_note_voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    accounting_integrated BOOLEAN DEFAULT FALSE,
    accounting_integration_error TEXT,
    created_by BIGINT REFERENCES users(id),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_returns_delivery ON factory_delivery_returns(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_customer ON factory_delivery_returns(factory_customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_status ON factory_delivery_returns(status);
CREATE INDEX IF NOT EXISTS idx_delivery_returns_date ON factory_delivery_returns(return_date DESC);

COMMENT ON TABLE factory_delivery_returns IS 'Goods returned by a customer against a delivery (challan).';

CREATE TRIGGER update_factory_delivery_returns_updated_at
    BEFORE UPDATE ON factory_delivery_returns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- Part 4: Line-item table factory_delivery_return_items
-- =============================================================

CREATE TABLE IF NOT EXISTS factory_delivery_return_items (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL REFERENCES factory_delivery_returns(id) ON DELETE CASCADE,
    delivery_item_id BIGINT NOT NULL REFERENCES factory_customer_order_delivery_items(id) ON DELETE RESTRICT,
    order_line_item_id BIGINT NOT NULL REFERENCES factory_customer_order_line_items(id) ON DELETE RESTRICT,
    product_id BIGINT REFERENCES products(id),
    product_name VARCHAR(255),
    returned_quantity NUMERIC(15, 3) NOT NULL CHECK (returned_quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
    condition VARCHAR(30) DEFAULT 'damaged',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (return_id, delivery_item_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_return_items_return ON factory_delivery_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_delivery_return_items_delivery_item ON factory_delivery_return_items(delivery_item_id);
CREATE INDEX IF NOT EXISTS idx_delivery_return_items_product ON factory_delivery_return_items(product_id);

COMMENT ON TABLE factory_delivery_return_items IS 'Line items contained in a single delivery return.';

DO $$
BEGIN
    RAISE NOTICE 'Migration V156 completed: Delivery challan returns';
    RAISE NOTICE '  - factory_delivery_returns + factory_delivery_return_items created';
    RAISE NOTICE '  - returned_qty tracking column added to delivery items';
    RAISE NOTICE '  - delivery_return_number_seq + generator function created';
END $$;
