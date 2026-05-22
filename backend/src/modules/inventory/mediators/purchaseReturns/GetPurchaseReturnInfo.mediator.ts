import pool from "@/database/connection";
import {
  PurchaseReturn,
  PurchaseReturnWithDetails,
  PurchaseReturnLineItem,
  PurchaseReturnQueryParams,
  PurchaseReturnStats,
  EligiblePurchaseReturnLine,
} from "@/types/purchaseReturn";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetPurchaseReturnInfoMediator {
  async getPurchaseReturnList(params: PurchaseReturnQueryParams): Promise<{
    purchase_returns: PurchaseReturn[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const action = "Get Purchase Return List";
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        supplier_id,
        purchase_order_id,
        start_date,
        end_date,
        sortBy = "created_at",
        sortOrder = "desc",
      } = params;

      const offset = (page - 1) * limit;
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let idx = 1;

      if (search) {
        whereConditions.push(
          `(pr.return_number ILIKE $${idx} OR po.po_number ILIKE $${idx} OR s.name ILIKE $${idx})`
        );
        queryParams.push(`%${search}%`);
        idx++;
      }
      if (status) {
        whereConditions.push(`pr.status = $${idx}`);
        queryParams.push(status);
        idx++;
      }
      if (supplier_id) {
        whereConditions.push(`pr.supplier_id = $${idx}`);
        queryParams.push(supplier_id);
        idx++;
      }
      if (purchase_order_id) {
        whereConditions.push(`pr.purchase_order_id = $${idx}`);
        queryParams.push(purchase_order_id);
        idx++;
      }
      if (start_date) {
        whereConditions.push(`pr.return_date >= $${idx}`);
        queryParams.push(start_date);
        idx++;
      }
      if (end_date) {
        whereConditions.push(`pr.return_date <= $${idx}`);
        queryParams.push(end_date);
        idx++;
      }

      const whereClause = whereConditions.length
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
           FROM purchase_returns pr
           LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
           LEFT JOIN suppliers s ON pr.supplier_id = s.id
           ${whereClause}`,
        queryParams
      );
      const total = countResult.rows[0].total;

      const listResult = await pool.query(
        `SELECT pr.*,
                po.po_number AS purchase_order_number,
                por.receipt_number AS purchase_order_receipt_number,
                s.name AS supplier_name,
                v.voucher_no,
                (SELECT COUNT(*)::int FROM purchase_return_line_items WHERE purchase_return_id = pr.id) AS line_items_count
           FROM purchase_returns pr
           LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
           LEFT JOIN purchase_order_receipts por ON pr.purchase_order_receipt_id = por.id
           LEFT JOIN suppliers s ON pr.supplier_id = s.id
           LEFT JOIN vouchers v ON pr.voucher_id = v.id
           ${whereClause}
           ORDER BY pr.${sortBy} ${sortOrder.toUpperCase()}
           LIMIT $${idx} OFFSET $${idx + 1}`,
        [...queryParams, limit, offset]
      );

      MyLogger.success(action, {
        total,
        page,
        returned: listResult.rows.length,
      });

      return {
        purchase_returns: listResult.rows,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      };
    } catch (error) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }

  async getPurchaseReturnById(id: number): Promise<PurchaseReturnWithDetails> {
    const action = "Get Purchase Return By ID";
    try {
      const headerResult = await pool.query(
        `SELECT pr.*,
                s.id AS s_id, s.name AS s_name, s.contact_person AS s_contact_person,
                s.email AS s_email, s.phone AS s_phone, s.address AS s_address,
                po.id AS po_id, po.po_number AS po_number,
                por.id AS por_id, por.receipt_number AS por_receipt_number, por.receipt_date AS por_receipt_date,
                v.id AS v_id, v.voucher_no AS v_voucher_no
           FROM purchase_returns pr
           LEFT JOIN suppliers s ON pr.supplier_id = s.id
           LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
           LEFT JOIN purchase_order_receipts por ON pr.purchase_order_receipt_id = por.id
           LEFT JOIN vouchers v ON pr.voucher_id = v.id
          WHERE pr.id = $1`,
        [id]
      );

      if (headerResult.rows.length === 0) {
        throw createError("Purchase return not found", 404);
      }
      const row = headerResult.rows[0];

      const linesResult = await pool.query(
        `SELECT prli.*,
                poli.quantity AS ordered_quantity,
                poli.received_quantity AS received_quantity,
                poli.returned_quantity AS po_already_returned,
                grnli.received_quantity AS grn_received_quantity,
                grnli.returned_quantity AS grn_already_returned
           FROM purchase_return_line_items prli
           LEFT JOIN purchase_order_line_items poli ON prli.po_line_item_id = poli.id
           LEFT JOIN purchase_order_receipt_line_items grnli ON prli.grn_line_item_id = grnli.id
          WHERE prli.purchase_return_id = $1
          ORDER BY prli.id`,
        [id]
      );

      const lineItems: PurchaseReturnLineItem[] = linesResult.rows.map(
        (r: any) => {
          const alreadyReturned = r.grn_line_item_id
            ? Number(r.grn_already_returned || 0)
            : Number(r.po_already_returned || 0);
          const receivedQty = r.grn_line_item_id
            ? Number(r.grn_received_quantity || 0)
            : Number(r.received_quantity || 0);
          return {
            id: Number(r.id),
            purchase_return_id: Number(r.purchase_return_id),
            po_line_item_id: Number(r.po_line_item_id),
            grn_line_item_id: r.grn_line_item_id ? Number(r.grn_line_item_id) : null,
            product_id: Number(r.product_id),
            product_sku: r.product_sku,
            product_name: r.product_name,
            unit_of_measure: r.unit_of_measure,
            return_quantity: Number(r.return_quantity),
            unit_cost: Number(r.unit_cost),
            total_cost: Number(r.total_cost),
            condition: r.condition,
            notes: r.notes,
            created_at: r.created_at,
            ordered_quantity: Number(r.ordered_quantity || 0),
            received_quantity: receivedQty,
            already_returned_quantity: alreadyReturned,
            max_returnable_quantity: Math.max(receivedQty - alreadyReturned, 0),
          };
        }
      );

      const result: PurchaseReturnWithDetails = {
        id: Number(row.id),
        return_number: row.return_number,
        purchase_order_id: Number(row.purchase_order_id),
        purchase_order_receipt_id: row.purchase_order_receipt_id
          ? Number(row.purchase_order_receipt_id)
          : null,
        supplier_id: Number(row.supplier_id),
        return_date: row.return_date,
        reason: row.reason,
        reason_notes: row.reason_notes,
        status: row.status,
        total_amount: Number(row.total_amount),
        currency: row.currency,
        distribution_center_id: row.distribution_center_id
          ? Number(row.distribution_center_id)
          : null,
        cost_basis_source: row.cost_basis_source,
        created_by: row.created_by,
        submitted_by: row.submitted_by,
        submitted_at: row.submitted_at,
        approved_by: row.approved_by,
        approved_by_id: row.approved_by_id,
        approved_at: row.approved_at,
        rejected_by_id: row.rejected_by_id,
        rejected_at: row.rejected_at,
        approval_notes: row.approval_notes,
        cancelled_by_id: row.cancelled_by_id,
        cancelled_at: row.cancelled_at,
        cancellation_reason: row.cancellation_reason,
        voucher_id: row.voucher_id ? Number(row.voucher_id) : null,
        accounting_integrated: row.accounting_integrated,
        accounting_integration_error: row.accounting_integration_error,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        supplier: {
          id: Number(row.s_id),
          name: row.s_name,
          contact_person: row.s_contact_person,
          email: row.s_email,
          phone: row.s_phone,
          address: row.s_address,
        },
        purchase_order: {
          id: Number(row.po_id),
          po_number: row.po_number,
        },
        purchase_order_receipt: row.por_id
          ? {
              id: Number(row.por_id),
              receipt_number: row.por_receipt_number,
              receipt_date: row.por_receipt_date,
            }
          : null,
        voucher: row.v_id
          ? { id: Number(row.v_id), voucher_no: row.v_voucher_no }
          : null,
        line_items: lineItems,
      };

      MyLogger.success(action, {
        purchaseReturnId: id,
        lineItems: lineItems.length,
      });
      return result;
    } catch (error) {
      MyLogger.error(action, error, { purchaseReturnId: id });
      throw error;
    }
  }

  async getPurchaseReturnStats(): Promise<PurchaseReturnStats> {
    const action = "Get Purchase Return Stats";
    try {
      const result = await pool.query(
        `SELECT
            COUNT(*)::int AS total_returns,
            COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_returns,
            COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted_returns,
            COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_returns,
            COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_returns,
            COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_returns,
            COALESCE(SUM(total_amount) FILTER (WHERE status = 'approved'), 0)::numeric AS total_value,
            COUNT(*) FILTER (
              WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            )::int AS returns_this_month
           FROM purchase_returns`
      );
      const row = result.rows[0];
      return {
        total_returns: row.total_returns,
        draft_returns: row.draft_returns,
        submitted_returns: row.submitted_returns,
        approved_returns: row.approved_returns,
        rejected_returns: row.rejected_returns,
        cancelled_returns: row.cancelled_returns,
        total_value: Number(row.total_value),
        returns_this_month: row.returns_this_month,
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async searchPurchaseReturns(query: string, limit: number = 10): Promise<PurchaseReturn[]> {
    const action = "Search Purchase Returns";
    try {
      const result = await pool.query(
        `SELECT pr.*,
                po.po_number AS purchase_order_number,
                s.name AS supplier_name
           FROM purchase_returns pr
           LEFT JOIN purchase_orders po ON pr.purchase_order_id = po.id
           LEFT JOIN suppliers s ON pr.supplier_id = s.id
          WHERE pr.return_number ILIKE $1
             OR po.po_number ILIKE $1
             OR s.name ILIKE $1
          ORDER BY pr.created_at DESC
          LIMIT $2`,
        [`%${query}%`, limit]
      );
      return result.rows;
    } catch (error) {
      MyLogger.error(action, error, { query, limit });
      throw error;
    }
  }

  async getEligibleLinesForPO(
    purchaseOrderId: number,
    purchaseOrderReceiptId?: number
  ): Promise<EligiblePurchaseReturnLine[]> {
    const action = "Get Eligible Purchase Return Lines";
    try {
      MyLogger.info(action, { purchaseOrderId, purchaseOrderReceiptId });

      if (purchaseOrderReceiptId) {
        const result = await pool.query(
          `SELECT poli.id AS po_line_item_id,
                  grnli.id AS grn_line_item_id,
                  poli.product_id, poli.product_sku, poli.product_name, poli.unit_of_measure,
                  poli.quantity AS ordered_quantity,
                  grnli.received_quantity AS received_quantity,
                  grnli.returned_quantity AS already_returned_quantity,
                  poli.unit_price,
                  p.cost_price AS current_cost_price
             FROM purchase_order_receipt_line_items grnli
             JOIN purchase_order_line_items poli ON grnli.line_item_id = poli.id
             LEFT JOIN products p ON poli.product_id = p.id
            WHERE grnli.receipt_id = $1
              AND poli.purchase_order_id = $2
            ORDER BY grnli.id`,
          [purchaseOrderReceiptId, purchaseOrderId]
        );
        return result.rows.map((r: any) => {
          const received = Number(r.received_quantity || 0);
          const alreadyReturned = Number(r.already_returned_quantity || 0);
          return {
            po_line_item_id: Number(r.po_line_item_id),
            grn_line_item_id: Number(r.grn_line_item_id),
            product_id: Number(r.product_id),
            product_sku: r.product_sku,
            product_name: r.product_name,
            unit_of_measure: r.unit_of_measure,
            ordered_quantity: Number(r.ordered_quantity),
            received_quantity: received,
            already_returned_quantity: alreadyReturned,
            max_returnable_quantity: Math.max(received - alreadyReturned, 0),
            unit_price: Number(r.unit_price || 0),
            current_cost_price: Number(r.current_cost_price || 0),
          };
        });
      }

      const result = await pool.query(
        `SELECT poli.id AS po_line_item_id,
                poli.product_id, poli.product_sku, poli.product_name, poli.unit_of_measure,
                poli.quantity AS ordered_quantity,
                poli.received_quantity AS received_quantity,
                poli.returned_quantity AS already_returned_quantity,
                poli.unit_price,
                p.cost_price AS current_cost_price
           FROM purchase_order_line_items poli
           LEFT JOIN products p ON poli.product_id = p.id
          WHERE poli.purchase_order_id = $1
            AND poli.received_quantity > 0
          ORDER BY poli.id`,
        [purchaseOrderId]
      );

      return result.rows.map((r: any) => {
        const received = Number(r.received_quantity || 0);
        const alreadyReturned = Number(r.already_returned_quantity || 0);
        return {
          po_line_item_id: Number(r.po_line_item_id),
          grn_line_item_id: null,
          product_id: Number(r.product_id),
          product_sku: r.product_sku,
          product_name: r.product_name,
          unit_of_measure: r.unit_of_measure,
          ordered_quantity: Number(r.ordered_quantity),
          received_quantity: received,
          already_returned_quantity: alreadyReturned,
          max_returnable_quantity: Math.max(received - alreadyReturned, 0),
          unit_price: Number(r.unit_price || 0),
          current_cost_price: Number(r.current_cost_price || 0),
        };
      });
    } catch (error) {
      MyLogger.error(action, error, {
        purchaseOrderId,
        purchaseOrderReceiptId,
      });
      throw error;
    }
  }
}

export default new GetPurchaseReturnInfoMediator();
