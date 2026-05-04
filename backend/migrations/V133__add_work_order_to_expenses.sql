-- V133: Link expenses to work orders
--
-- Allows operations/finance to attribute discretionary expenses (subcontracted ops,
-- machine repair mid-run, special materials bought outside POs, overtime allowances)
-- to a specific production work order. Sales-order traceability follows automatically
-- via work_orders.customer_order_id (V21), so a single nullable FK is enough.

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS work_order_id BIGINT REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_work_order_id ON expenses(work_order_id);

COMMENT ON COLUMN expenses.work_order_id IS
  'Optional FK to work_orders. Sales-order traceability follows via work_orders.customer_order_id.';
