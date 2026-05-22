-- V150: Purchase Returns
--
-- Adds the ability to record goods returned to suppliers, following an
-- approval workflow that mirrors the existing purchase order flow.
-- On approval, stock is decremented and a debit-note Journal voucher is
-- posted (Debit Accounts Payable, Credit Inventory) linked to the
-- original GRN voucher via vouchers.reverses_voucher_id (V39).

-- =============================================================
-- Part 1: Enums
-- =============================================================

DO $$ BEGIN
    CREATE TYPE purchase_return_status_type AS ENUM (
        'draft',
        'submitted',
        'approved',
        'rejected',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE purchase_return_reason_type AS ENUM (
        'defective',
        'wrong_item',
        'damaged',
        'quality_issue',
        'over_supply',
        'expired',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================
-- Part 2: Sequence + number-generation function
-- =============================================================

CREATE SEQUENCE IF NOT EXISTS purchase_return_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_purchase_return_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_val BIGINT;
    year_str VARCHAR(4);
    return_no VARCHAR(50);
BEGIN
    next_val := nextval('purchase_return_number_seq');
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    return_no := 'PR-' || year_str || '-' || LPAD(next_val::TEXT, 6, '0');
    RETURN return_no;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_purchase_return_number IS 'Generates unique purchase return number (e.g., PR-2026-000001)';

-- =============================================================
-- Part 3: Widen approval_history.entity_type CHECK constraint
-- =============================================================
-- Original constraint (V1): ('purchase_order','payment','expense')

ALTER TABLE public.approval_history
    DROP CONSTRAINT IF EXISTS approval_history_entity_type_check;

ALTER TABLE public.approval_history
    ADD CONSTRAINT approval_history_entity_type_check
    CHECK (((entity_type)::text = ANY ((ARRAY[
        'purchase_order'::character varying,
        'payment'::character varying,
        'expense'::character varying,
        'purchase_return'::character varying
    ])::text[])));

-- =============================================================
-- Part 4: Header table purchase_returns
-- =============================================================

CREATE TABLE IF NOT EXISTS purchase_returns (
    id BIGSERIAL PRIMARY KEY,
    return_number VARCHAR(50) NOT NULL UNIQUE DEFAULT generate_purchase_return_number(),
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    purchase_order_receipt_id BIGINT REFERENCES purchase_order_receipts(id) ON DELETE RESTRICT,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason purchase_return_reason_type NOT NULL,
    reason_notes TEXT,
    status purchase_return_status_type NOT NULL DEFAULT 'draft',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'BDT',
    distribution_center_id BIGINT REFERENCES distribution_centers(id),
    cost_basis_source VARCHAR(20) CHECK (cost_basis_source IN ('grn', 'po')),
    created_by VARCHAR(150) NOT NULL,
    submitted_by BIGINT REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(150),
    approved_by_id BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by_id BIGINT REFERENCES users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    cancelled_by_id BIGINT REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    accounting_integrated BOOLEAN DEFAULT FALSE,
    accounting_integration_error TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_pr_total_amount_nonneg CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_po_id ON purchase_returns(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_grn_id ON purchase_returns(purchase_order_receipt_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_status ON purchase_returns(status);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_return_date ON purchase_returns(return_date DESC);

COMMENT ON TABLE purchase_returns IS 'Goods returned to suppliers (debit notes)';
COMMENT ON COLUMN purchase_returns.purchase_order_receipt_id IS 'Optional GRN reference - if set, return is tied to a specific receipt';
COMMENT ON COLUMN purchase_returns.cost_basis_source IS 'grn = used GRN line unit_price; po = used products.cost_price moving average';
COMMENT ON COLUMN purchase_returns.voucher_id IS 'Debit-note Journal voucher created when return is approved';

-- =============================================================
-- Part 5: Line-item table purchase_return_line_items
-- =============================================================

CREATE TABLE IF NOT EXISTS purchase_return_line_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_return_id BIGINT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    po_line_item_id BIGINT NOT NULL REFERENCES purchase_order_line_items(id) ON DELETE RESTRICT,
    grn_line_item_id BIGINT REFERENCES purchase_order_receipt_line_items(id) ON DELETE RESTRICT,
    product_id BIGINT NOT NULL REFERENCES products(id),
    product_sku VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    unit_of_measure VARCHAR(50),
    return_quantity NUMERIC(15, 3) NOT NULL CHECK (return_quantity > 0),
    unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
    condition VARCHAR(30) DEFAULT 'damaged',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pr_lines_return_id ON purchase_return_line_items(purchase_return_id);
CREATE INDEX IF NOT EXISTS idx_pr_lines_po_line ON purchase_return_line_items(po_line_item_id);
CREATE INDEX IF NOT EXISTS idx_pr_lines_grn_line ON purchase_return_line_items(grn_line_item_id);
CREATE INDEX IF NOT EXISTS idx_pr_lines_product ON purchase_return_line_items(product_id);

-- =============================================================
-- Part 6: Cumulative-return tracking on PO + GRN line items
-- =============================================================
-- Used to prevent over-return across multiple approved returns.
-- Updated only inside approvePurchaseReturn() (protected by SELECT FOR UPDATE).

ALTER TABLE purchase_order_line_items
    ADD COLUMN IF NOT EXISTS returned_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0;

ALTER TABLE purchase_order_receipt_line_items
    ADD COLUMN IF NOT EXISTS returned_quantity NUMERIC(15, 3) NOT NULL DEFAULT 0;

-- =============================================================
-- Part 7: updated_at trigger for purchase_returns
-- =============================================================

CREATE OR REPLACE FUNCTION update_purchase_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_purchase_returns_updated_at ON purchase_returns;
CREATE TRIGGER trigger_purchase_returns_updated_at
    BEFORE UPDATE ON purchase_returns
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_returns_updated_at();

-- =============================================================
-- Part 8: Permissions seed
-- =============================================================

INSERT INTO permissions (name, display_name, description, module, action, resource)
VALUES
    ('purchase_returns.create',  'Create Purchase Returns',  'Create purchase returns',                       'Purchase', 'create',  'purchase_returns'),
    ('purchase_returns.read',    'View Purchase Returns',    'View purchase returns',                         'Purchase', 'read',    'purchase_returns'),
    ('purchase_returns.update',  'Update Purchase Returns',  'Update draft or cancel non-approved returns',   'Purchase', 'update',  'purchase_returns'),
    ('purchase_returns.delete',  'Delete Purchase Returns',  'Delete draft purchase returns',                 'Purchase', 'delete',  'purchase_returns'),
    ('purchase_returns.approve', 'Approve Purchase Returns', 'Approve or reject submitted purchase returns',  'Purchase', 'approve', 'purchase_returns')
ON CONFLICT (name) DO NOTHING;

-- Keep the sequence aligned (other permission migrations do this too)
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM public.permissions), true);

-- Grant all five purchase_returns permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name IN (
    'purchase_returns.create',
    'purchase_returns.read',
    'purchase_returns.update',
    'purchase_returns.delete',
    'purchase_returns.approve'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant the corresponding purchase_returns.* permission to any role that already
-- holds the matching purchase_orders.* permission (per-action mapping)
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp_po.role_id, p_new.id
FROM role_permissions rp_po
JOIN permissions p_po
    ON p_po.id = rp_po.permission_id
   AND p_po.module = 'Purchase'
   AND p_po.resource = 'purchase_orders'
   AND p_po.action IN ('create', 'read', 'update', 'delete', 'approve')
JOIN permissions p_new
    ON p_new.module = 'Purchase'
   AND p_new.resource = 'purchase_returns'
   AND p_new.action = p_po.action
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================================
-- Part 9: Log completion
-- =============================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration V150 completed: Purchase returns';
    RAISE NOTICE '  - Created purchase_returns + purchase_return_line_items tables';
    RAISE NOTICE '  - Added returned_quantity tracking columns to PO + GRN line items';
    RAISE NOTICE '  - Widened approval_history.entity_type CHECK to include purchase_return';
    RAISE NOTICE '  - Seeded purchase_returns permissions and granted to existing PO holders';
END $$;
