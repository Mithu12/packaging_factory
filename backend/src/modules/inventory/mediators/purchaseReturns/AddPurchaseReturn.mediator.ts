import pool from "@/database/connection";
import {
  CreatePurchaseReturnRequest,
  PurchaseReturn,
} from "@/types/purchaseReturn";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class AddPurchaseReturnMediator {
  async createPurchaseReturn(
    data: CreatePurchaseReturnRequest,
    createdBy: string
  ): Promise<PurchaseReturn> {
    const action = "Create Purchase Return";
    const client = await pool.connect();
    try {
      MyLogger.info(action, {
        purchaseOrderId: data.purchase_order_id,
        purchaseOrderReceiptId: data.purchase_order_receipt_id,
        createdBy,
      });

      await client.query("BEGIN");

      const poResult = await client.query(
        `SELECT id, supplier_id, status, approval_status, receipt_voucher_id
           FROM purchase_orders WHERE id = $1`,
        [data.purchase_order_id]
      );

      if (poResult.rows.length === 0) {
        throw createError("Purchase order not found", 404);
      }
      const purchaseOrder = poResult.rows[0];

      if (purchaseOrder.approval_status !== "approved") {
        throw createError(
          "Cannot create return for a purchase order that is not approved",
          400
        );
      }

      if (!["partially_received", "received"].includes(purchaseOrder.status)) {
        throw createError(
          "Cannot create return for a purchase order that has no received goods",
          400
        );
      }

      if (!purchaseOrder.receipt_voucher_id) {
        throw createError(
          "Original purchase-receipt voucher has not been posted yet — cannot create return",
          400
        );
      }

      let grnId: number | null = null;
      if (data.purchase_order_receipt_id) {
        const grnResult = await client.query(
          `SELECT id FROM purchase_order_receipts
            WHERE id = $1 AND purchase_order_id = $2`,
          [data.purchase_order_receipt_id, data.purchase_order_id]
        );
        if (grnResult.rows.length === 0) {
          throw createError(
            "Goods Receipt Note not found or does not belong to this purchase order",
            404
          );
        }
        grnId = grnResult.rows[0].id;
      }

      let distributionCenterId: number | null = data.distribution_center_id ?? null;
      if (!distributionCenterId) {
        const dcResult = await client.query(
          "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1"
        );
        distributionCenterId = dcResult.rows[0]?.id ?? null;
      }

      type ResolvedLine = {
        po_line_item_id: number;
        grn_line_item_id: number | null;
        product_id: number;
        product_sku: string | null;
        product_name: string;
        unit_of_measure: string | null;
        return_quantity: number;
        condition: string;
        notes: string | null;
      };

      const resolvedLines: ResolvedLine[] = [];

      for (const inputLine of data.line_items) {
        const poLineResult = await client.query(
          `SELECT poli.id, poli.product_id, poli.product_sku, poli.product_name,
                  poli.unit_of_measure, poli.quantity, poli.received_quantity,
                  poli.returned_quantity
             FROM purchase_order_line_items poli
            WHERE poli.id = $1 AND poli.purchase_order_id = $2`,
          [inputLine.po_line_item_id, data.purchase_order_id]
        );
        if (poLineResult.rows.length === 0) {
          throw createError(
            `Purchase order line item ${inputLine.po_line_item_id} not found on this PO`,
            404
          );
        }
        const poLine = poLineResult.rows[0];

        let maxReturnable: number;
        let grnLineItemId: number | null = null;

        if (grnId && inputLine.grn_line_item_id) {
          const grnLineResult = await client.query(
            `SELECT id, line_item_id, received_quantity, returned_quantity
               FROM purchase_order_receipt_line_items
              WHERE id = $1 AND receipt_id = $2`,
            [inputLine.grn_line_item_id, grnId]
          );
          if (grnLineResult.rows.length === 0) {
            throw createError(
              `GRN line item ${inputLine.grn_line_item_id} not found on this receipt`,
              404
            );
          }
          const grnLine = grnLineResult.rows[0];
          if (Number(grnLine.line_item_id) !== Number(inputLine.po_line_item_id)) {
            throw createError(
              `GRN line item ${inputLine.grn_line_item_id} does not match PO line item ${inputLine.po_line_item_id}`,
              400
            );
          }
          grnLineItemId = Number(grnLine.id);
          maxReturnable =
            Number(grnLine.received_quantity) - Number(grnLine.returned_quantity);
        } else {
          maxReturnable =
            Number(poLine.received_quantity) - Number(poLine.returned_quantity);
        }

        if (inputLine.return_quantity > maxReturnable) {
          throw createError(
            `Cannot return ${inputLine.return_quantity} of "${poLine.product_name}" — only ${maxReturnable} available to return`,
            400
          );
        }

        resolvedLines.push({
          po_line_item_id: Number(poLine.id),
          grn_line_item_id: grnLineItemId,
          product_id: Number(poLine.product_id),
          product_sku: poLine.product_sku,
          product_name: poLine.product_name,
          unit_of_measure: poLine.unit_of_measure,
          return_quantity: Number(inputLine.return_quantity),
          condition: inputLine.condition || "damaged",
          notes: inputLine.notes || null,
        });
      }

      const headerInsert = await client.query(
        `INSERT INTO purchase_returns (
            purchase_order_id, purchase_order_receipt_id, supplier_id,
            return_date, reason, reason_notes,
            distribution_center_id, created_by, notes
         ) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          data.purchase_order_id,
          grnId,
          purchaseOrder.supplier_id,
          data.return_date || null,
          data.reason,
          data.reason_notes || null,
          distributionCenterId,
          createdBy,
          data.notes || null,
        ]
      );
      const purchaseReturn = headerInsert.rows[0];

      for (const line of resolvedLines) {
        await client.query(
          `INSERT INTO purchase_return_line_items (
              purchase_return_id, po_line_item_id, grn_line_item_id,
              product_id, product_sku, product_name, unit_of_measure,
              return_quantity, unit_cost, total_cost, condition, notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, $9, $10)`,
          [
            purchaseReturn.id,
            line.po_line_item_id,
            line.grn_line_item_id,
            line.product_id,
            line.product_sku,
            line.product_name,
            line.unit_of_measure,
            line.return_quantity,
            line.condition,
            line.notes,
          ]
        );
      }

      await client.query("COMMIT");

      MyLogger.success(action, {
        purchaseReturnId: purchaseReturn.id,
        returnNumber: purchaseReturn.return_number,
        lineCount: resolvedLines.length,
      });

      return purchaseReturn;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, {
        purchaseOrderId: data.purchase_order_id,
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AddPurchaseReturnMediator();
