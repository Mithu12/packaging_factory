-- Sell wastage (scrap sale): approved wastage records are sold in bulk to a
-- buyer for cash/bank payment. Stock already left at wastage recording, so a
-- sale is a GL-only event (Debit Cash/Bank, Credit Scrap Sales Income).

-- 1. Sale header
CREATE TABLE IF NOT EXISTS factory_wastage_sales (
    id BIGSERIAL PRIMARY KEY,
    sale_number VARCHAR(50) NOT NULL UNIQUE,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_phone VARCHAR(50),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer')),
    payment_reference VARCHAR(255),
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    voucher_id INTEGER REFERENCES vouchers(id) ON DELETE SET NULL,
    sold_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sale number sequence (same pattern as delivery_number_sequence, V131)
CREATE SEQUENCE IF NOT EXISTS wastage_sale_number_sequence START 1 INCREMENT 1;

-- 3. Link wastage records to their sale (1:N — a record is sold whole, at most once)
ALTER TABLE material_wastage
    ADD COLUMN IF NOT EXISTS wastage_sale_id BIGINT REFERENCES factory_wastage_sales(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_material_wastage_sale_id ON material_wastage(wastage_sale_id);

-- 4. Extend status workflow with 'sold' (approved -> sold)
ALTER TABLE material_wastage DROP CONSTRAINT IF EXISTS material_wastage_status_check;
ALTER TABLE material_wastage ADD CONSTRAINT material_wastage_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'sold'));

-- 5. Income account for scrap proceeds. 'Revenue' is the only income-like
--    category allowed by the chart_of_accounts CHECK (V6).
INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '4250', 'Scrap Sales Income', 'Posting', 'Revenue', 'Income recovered from selling scrap / wasted materials', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '4250' OR (category = 'Revenue' AND name ILIKE '%Scrap%'));

-- 6. Permission: selling moves money, so it is distinct from approve.
--    Role names are lowercase (see V168 note about V28's dead grants).
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('FACTORY_WASTAGE_SELL','Sell Wastage','Sell approved scrap/wastage to a buyer','Factory','sell','wastage',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('admin', 'factory_manager')
AND p.name = 'FACTORY_WASTAGE_SELL'
ON CONFLICT (role_id, permission_id) DO NOTHING;
