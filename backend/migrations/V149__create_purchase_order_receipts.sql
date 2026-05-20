-- V149: Persistent Goods Receipt Notes (GRN) for purchase order receive events
--
-- Each call to /purchase-orders/:id/receive now records a row here so the
-- receipt can be re-downloaded as a PDF with a stable receipt number.
-- Cumulative received_quantity on purchase_order_line_items is still
-- maintained by receiveGoods() so existing fully-received detection and
-- auto-invoice creation keep working.

CREATE SEQUENCE IF NOT EXISTS grn_number_sequence START 1;

CREATE TABLE IF NOT EXISTS purchase_order_receipts (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL,
    received_by_user_id BIGINT REFERENCES users(id),
    received_by_name VARCHAR(150) NOT NULL,
    delivery_challan VARCHAR(100),
    transport_company VARCHAR(150),
    transport_no VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_receipts_po_id
    ON purchase_order_receipts(purchase_order_id);

CREATE TABLE IF NOT EXISTS purchase_order_receipt_line_items (
    id BIGSERIAL PRIMARY KEY,
    receipt_id BIGINT NOT NULL REFERENCES purchase_order_receipts(id) ON DELETE CASCADE,
    line_item_id BIGINT NOT NULL REFERENCES purchase_order_line_items(id),
    received_quantity NUMERIC(15, 3) NOT NULL,
    condition VARCHAR(30) DEFAULT 'good',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_receipt_lines_receipt_id
    ON purchase_order_receipt_line_items(receipt_id);
