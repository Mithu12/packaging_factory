/**
 * Per-supplier payable aggregates, as LATERAL joins against `suppliers s`.
 * Shared by the Supplier Due report and the Factory Dashboard so both agree with
 * the Supplier Ledger (PurchaseReportsController.getSupplierLedger):
 *
 *   due = s.opening_balance + invoiced - paid - returned
 *
 * - invoiced: non-cancelled invoices, excluding the OB-INV-* invoice created at
 *   supplier onboarding (it duplicates s.opening_balance).
 * - paid: approved, non-cancelled/failed payments, including discount taken
 *   (discount settles the invoice alongside cash).
 * - returned: approved purchase returns — these post a debit note but never
 *   reduce invoices.outstanding_amount, so they must be subtracted here.
 *
 * Exposes columns inv.total_invoiced, inv.invoice_outstanding, inv.invoice_count,
 * inv.overdue_count, pay.total_paid, ret.total_returned (all non-null).
 *
 * @param asOfParam optional SQL placeholder (e.g. "$1") holding a YYYY-MM-DD
 *   cut-off; activity dated after it is ignored.
 */
export const supplierPayablesLateralSql = (asOfParam?: string): string => {
  const asOf = (column: string) => (asOfParam ? `AND ${column} <= ${asOfParam}::date` : '');
  return `
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(i.total_amount), 0) AS total_invoiced,
        COALESCE(SUM(i.outstanding_amount), 0) AS invoice_outstanding,
        COUNT(*) AS invoice_count,
        COUNT(*) FILTER (WHERE i.due_date < CURRENT_DATE AND i.status <> 'paid') AS overdue_count
      FROM invoices i
      WHERE i.supplier_id = s.id
        AND i.status <> 'cancelled'
        AND i.invoice_number NOT LIKE 'OB-INV-%'
        ${asOf('i.invoice_date')}
    ) inv ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(p.amount + p.discount_amount), 0) AS total_paid
      FROM payments p
      WHERE p.supplier_id = s.id
        AND p.approval_status = 'approved'
        AND p.status NOT IN ('cancelled', 'failed')
        ${asOf('p.payment_date')}
    ) pay ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(pr.total_amount), 0) AS total_returned
      FROM purchase_returns pr
      WHERE pr.supplier_id = s.id
        AND pr.status = 'approved'
        ${asOf('pr.return_date')}
    ) ret ON TRUE
  `;
};

/** SQL expression for a supplier's due; use alongside supplierPayablesLateralSql. */
export const SUPPLIER_DUE_SQL =
  `(COALESCE(s.opening_balance, 0) + inv.total_invoiced - pay.total_paid - ret.total_returned)`;
