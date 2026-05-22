import pool from "@/database/connection";
import {
  PurchaseReturn,
  UpdatePurchaseReturnRequest,
} from "@/types/purchaseReturn";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";
import { interModuleConnector } from "@/utils/InterModuleConnector";

class UpdatePurchaseReturnInfoMediator {
  async updatePurchaseReturn(
    id: number,
    data: UpdatePurchaseReturnRequest,
    username: string = "System User"
  ): Promise<PurchaseReturn> {
    const action = "Update Purchase Return";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseReturnId: id });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, purchase_order_id, purchase_order_receipt_id, status
           FROM purchase_returns WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase return not found", 404);
      }
      const current = checkResult.rows[0];
      if (current.status !== "draft") {
        throw createError(
          `Only draft purchase returns can be updated (current status: ${current.status})`,
          400
        );
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.reason !== undefined) {
        updateFields.push(`reason = $${paramIndex++}`);
        updateValues.push(data.reason);
      }
      if (data.reason_notes !== undefined) {
        updateFields.push(`reason_notes = $${paramIndex++}`);
        updateValues.push(data.reason_notes);
      }
      if (data.distribution_center_id !== undefined) {
        updateFields.push(`distribution_center_id = $${paramIndex++}`);
        updateValues.push(data.distribution_center_id);
      }
      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(data.notes);
      }
      if (data.return_date !== undefined) {
        updateFields.push(`return_date = $${paramIndex++}`);
        updateValues.push(data.return_date);
      }

      if (updateFields.length > 0) {
        updateValues.push(id);
        await client.query(
          `UPDATE purchase_returns SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}`,
          updateValues
        );
      }

      if (data.line_items && data.line_items.length > 0) {
        await client.query(
          `DELETE FROM purchase_return_line_items WHERE purchase_return_id = $1`,
          [id]
        );

        for (const inputLine of data.line_items) {
          const poLineResult = await client.query(
            `SELECT id, product_id, product_sku, product_name, unit_of_measure,
                    received_quantity, returned_quantity
               FROM purchase_order_line_items
              WHERE id = $1 AND purchase_order_id = $2`,
            [inputLine.po_line_item_id, current.purchase_order_id]
          );
          if (poLineResult.rows.length === 0) {
            throw createError(
              `Purchase order line item ${inputLine.po_line_item_id} not found on this PO`,
              404
            );
          }
          const poLine = poLineResult.rows[0];

          let grnLineItemId: number | null = null;
          let maxReturnable: number;
          if (current.purchase_order_receipt_id && inputLine.grn_line_item_id) {
            const grnLineResult = await client.query(
              `SELECT id, line_item_id, received_quantity, returned_quantity
                 FROM purchase_order_receipt_line_items
                WHERE id = $1 AND receipt_id = $2`,
              [inputLine.grn_line_item_id, current.purchase_order_receipt_id]
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
          } else if (current.purchase_order_receipt_id) {
            throw createError(
              `Line item is missing grn_line_item_id for a GRN-linked return`,
              400
            );
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

          await client.query(
            `INSERT INTO purchase_return_line_items (
                purchase_return_id, po_line_item_id, grn_line_item_id,
                product_id, product_sku, product_name, unit_of_measure,
                return_quantity, unit_cost, total_cost, condition, notes
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, $9, $10)`,
            [
              id,
              poLine.id,
              grnLineItemId,
              poLine.product_id,
              poLine.product_sku,
              poLine.product_name,
              poLine.unit_of_measure,
              inputLine.return_quantity,
              inputLine.condition || "damaged",
              inputLine.notes || null,
            ]
          );
        }
      }

      const final = await client.query(
        `SELECT * FROM purchase_returns WHERE id = $1`,
        [id]
      );

      await client.query("COMMIT");
      MyLogger.success(action, { purchaseReturnId: id });
      return final.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseReturnId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async submitPurchaseReturn(
    id: number,
    userId: number,
    username: string,
    notes?: string
  ): Promise<PurchaseReturn> {
    const action = "Submit Purchase Return";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseReturnId: id, userId });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, status FROM purchase_returns WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase return not found", 404);
      }
      const previousStatus = checkResult.rows[0].status;
      if (previousStatus !== "draft") {
        throw createError(
          `Only draft purchase returns can be submitted (current: ${previousStatus})`,
          400
        );
      }

      const linesResult = await client.query(
        `SELECT COUNT(*)::int AS c FROM purchase_return_line_items WHERE purchase_return_id = $1`,
        [id]
      );
      if (linesResult.rows[0].c === 0) {
        throw createError("Cannot submit a purchase return with no line items", 400);
      }

      const result = await client.query(
        `UPDATE purchase_returns
            SET status = 'submitted',
                submitted_by = $1,
                submitted_at = CURRENT_TIMESTAMP,
                approval_notes = COALESCE($2, approval_notes),
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *`,
        [userId, notes || null, id]
      );

      await client.query(
        `INSERT INTO approval_history (entity_type, entity_id, action, performed_by, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["purchase_return", id, "submitted", userId, notes || null, previousStatus, "submitted"]
      );

      await client.query("COMMIT");
      MyLogger.success(action, { purchaseReturnId: id });
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseReturnId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async approvePurchaseReturn(
    id: number,
    userId: number,
    username: string,
    notes?: string
  ): Promise<PurchaseReturn> {
    const action = "Approve Purchase Return";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseReturnId: id, userId });
      await client.query("BEGIN");

      const headerResult = await client.query(
        `SELECT pr.*,
                po.po_number, po.receipt_voucher_id,
                s.name AS supplier_name
           FROM purchase_returns pr
           JOIN purchase_orders po ON pr.purchase_order_id = po.id
           JOIN suppliers s ON pr.supplier_id = s.id
          WHERE pr.id = $1
          FOR UPDATE`,
        [id]
      );
      if (headerResult.rows.length === 0) {
        throw createError("Purchase return not found", 404);
      }
      const header = headerResult.rows[0];

      if (header.status !== "submitted") {
        throw createError(
          `Only submitted purchase returns can be approved (current: ${header.status})`,
          400
        );
      }

      if (!header.receipt_voucher_id) {
        throw createError(
          "Original purchase-receipt voucher has not been posted — cannot approve return",
          400
        );
      }

      const linesResult = await client.query(
        `SELECT prli.id, prli.po_line_item_id, prli.grn_line_item_id,
                prli.product_id, prli.product_name, prli.return_quantity
           FROM purchase_return_line_items prli
          WHERE prli.purchase_return_id = $1
          ORDER BY prli.id`,
        [id]
      );
      const lines: any[] = linesResult.rows;
      if (lines.length === 0) {
        throw createError("Cannot approve a return with no line items", 400);
      }

      const isGrnLinked = !!header.purchase_order_receipt_id;
      let costBasisSource: "grn" | "po" = isGrnLinked ? "grn" : "po";
      let totalAmount = 0;

      const voucherLineDetails: Array<{
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      for (const line of lines) {
        await client.query(
          `SELECT id, received_quantity, returned_quantity, unit_price
             FROM purchase_order_line_items WHERE id = $1 FOR UPDATE`,
          [line.po_line_item_id]
        );

        let unitCost = 0;
        let maxReturnable = 0;

        if (isGrnLinked && line.grn_line_item_id) {
          const grnLineResult = await client.query(
            `SELECT id, received_quantity, returned_quantity
               FROM purchase_order_receipt_line_items WHERE id = $1 FOR UPDATE`,
            [line.grn_line_item_id]
          );
          if (grnLineResult.rows.length === 0) {
            throw createError(
              `GRN line item ${line.grn_line_item_id} no longer exists`,
              400
            );
          }
          const grnLine = grnLineResult.rows[0];
          maxReturnable =
            Number(grnLine.received_quantity) - Number(grnLine.returned_quantity);

          const poLinePriceResult = await client.query(
            `SELECT unit_price FROM purchase_order_line_items WHERE id = $1`,
            [line.po_line_item_id]
          );
          unitCost = Number(poLinePriceResult.rows[0].unit_price);
        } else {
          const poLineResult = await client.query(
            `SELECT received_quantity, returned_quantity FROM purchase_order_line_items WHERE id = $1`,
            [line.po_line_item_id]
          );
          const poLine = poLineResult.rows[0];
          maxReturnable =
            Number(poLine.received_quantity) - Number(poLine.returned_quantity);

          const productResult = await client.query(
            `SELECT cost_price FROM products WHERE id = $1`,
            [line.product_id]
          );
          unitCost = Number(productResult.rows[0]?.cost_price ?? 0);
        }

        const qty = Number(line.return_quantity);
        if (qty > maxReturnable) {
          throw createError(
            `Cannot return ${qty} of "${line.product_name}" — only ${maxReturnable} now available (stock may have shifted since submission)`,
            400
          );
        }

        const productStockResult = await client.query(
          `SELECT current_stock FROM products WHERE id = $1 FOR UPDATE`,
          [line.product_id]
        );
        const currentStock = Number(productStockResult.rows[0]?.current_stock ?? 0);
        if (currentStock < qty) {
          throw createError(
            `Insufficient stock to approve return for "${line.product_name}" — on hand ${currentStock}, returning ${qty}`,
            400
          );
        }

        const lineTotal = Number((qty * unitCost).toFixed(2));
        totalAmount += lineTotal;

        await client.query(
          `UPDATE purchase_return_line_items
              SET unit_cost = $1, total_cost = $2
            WHERE id = $3`,
          [unitCost, lineTotal, line.id]
        );

        const newStock = currentStock - qty;
        await client.query(
          `UPDATE products
              SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [newStock, line.product_id]
        );

        if (header.distribution_center_id) {
          await client.query(
            `INSERT INTO product_locations (product_id, distribution_center_id, current_stock)
             VALUES ($1, $2, 0)
             ON CONFLICT (product_id, distribution_center_id)
             DO UPDATE SET
                current_stock = product_locations.current_stock - $3,
                updated_at = CURRENT_TIMESTAMP`,
            [line.product_id, header.distribution_center_id, qty]
          );
        }

        await client.query(
          `INSERT INTO stock_adjustments (
              product_id, adjustment_type, quantity,
              previous_stock, new_stock,
              reason, reference, notes, adjusted_by, distribution_center_id
           ) VALUES ($1, 'decrease', $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            line.product_id,
            qty,
            currentStock,
            newStock,
            "Purchase Return",
            header.return_number,
            `Goods returned to supplier via ${header.return_number}`,
            username,
            header.distribution_center_id || null,
          ]
        );

        await client.query(
          `UPDATE purchase_order_line_items
              SET returned_quantity = returned_quantity + $1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [qty, line.po_line_item_id]
        );
        if (line.grn_line_item_id) {
          await client.query(
            `UPDATE purchase_order_receipt_line_items
                SET returned_quantity = returned_quantity + $1,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $2`,
            [qty, line.grn_line_item_id]
          );
        }

        voucherLineDetails.push({
          productId: Number(line.product_id),
          productName: line.product_name,
          quantity: qty,
          unitPrice: unitCost,
          totalPrice: lineTotal,
        });
      }

      totalAmount = Number(totalAmount.toFixed(2));

      const updateResult = await client.query(
        `UPDATE purchase_returns
            SET status = 'approved',
                approved_by = $1,
                approved_by_id = $2,
                approved_at = CURRENT_TIMESTAMP,
                approval_notes = COALESCE($3, approval_notes),
                total_amount = $4,
                cost_basis_source = $5,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
          RETURNING *`,
        [username, userId, notes || null, totalAmount, costBasisSource, id]
      );

      await client.query(
        `INSERT INTO approval_history (entity_type, entity_id, action, performed_by, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["purchase_return", id, "approved", userId, notes || null, "submitted", "approved"]
      );

      await client.query("COMMIT");

      try {
        const voucherResult = await interModuleConnector.accModule.addPurchaseReturnVoucher(
          {
            purchaseReturnId: Number(updateResult.rows[0].id),
            returnNumber: updateResult.rows[0].return_number,
            purchaseOrderId: Number(header.purchase_order_id),
            poNumber: header.po_number,
            supplierId: Number(header.supplier_id),
            supplierName: header.supplier_name,
            originalVoucherId: Number(header.receipt_voucher_id),
            totalAmount,
            currency: updateResult.rows[0].currency || "BDT",
            returnDate: updateResult.rows[0].return_date,
            distributionCenterId: header.distribution_center_id
              ? Number(header.distribution_center_id)
              : undefined,
            lineItems: voucherLineDetails,
          },
          userId
        );

        if (voucherResult?.success) {
          await pool.query(
            `UPDATE purchase_returns
                SET voucher_id = $1,
                    accounting_integrated = TRUE,
                    accounting_integration_error = NULL,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $2`,
            [voucherResult.voucherId, id]
          );
          updateResult.rows[0].voucher_id = voucherResult.voucherId;
          updateResult.rows[0].accounting_integrated = true;
        } else if (voucherResult?.error) {
          await pool.query(
            `UPDATE purchase_returns
                SET accounting_integrated = FALSE,
                    accounting_integration_error = $1,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $2`,
            [voucherResult.error, id]
          );
          updateResult.rows[0].accounting_integration_error = voucherResult.error;
        }
      } catch (voucherError: any) {
        MyLogger.error("Purchase Return Voucher Posting Failed", voucherError, {
          purchaseReturnId: id,
        });
        await pool.query(
          `UPDATE purchase_returns
              SET accounting_integrated = FALSE,
                  accounting_integration_error = $1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [voucherError.message || "Unknown voucher error", id]
        );
        updateResult.rows[0].accounting_integration_error =
          voucherError.message || "Unknown voucher error";
      }

      MyLogger.success(action, { purchaseReturnId: id, totalAmount });
      return updateResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseReturnId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectPurchaseReturn(
    id: number,
    userId: number,
    username: string,
    notes?: string
  ): Promise<PurchaseReturn> {
    const action = "Reject Purchase Return";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseReturnId: id, userId });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, status FROM purchase_returns WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase return not found", 404);
      }
      if (checkResult.rows[0].status !== "submitted") {
        throw createError(
          `Only submitted purchase returns can be rejected (current: ${checkResult.rows[0].status})`,
          400
        );
      }

      const result = await client.query(
        `UPDATE purchase_returns
            SET status = 'rejected',
                rejected_by_id = $1,
                rejected_at = CURRENT_TIMESTAMP,
                approval_notes = COALESCE($2, approval_notes),
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *`,
        [userId, notes || null, id]
      );

      await client.query(
        `INSERT INTO approval_history (entity_type, entity_id, action, performed_by, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["purchase_return", id, "rejected", userId, notes || null, "submitted", "rejected"]
      );

      await client.query("COMMIT");
      MyLogger.success(action, { purchaseReturnId: id });
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseReturnId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelPurchaseReturn(
    id: number,
    userId: number,
    username: string,
    reason: string
  ): Promise<PurchaseReturn> {
    const action = "Cancel Purchase Return";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseReturnId: id, userId });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, status FROM purchase_returns WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase return not found", 404);
      }
      const status = checkResult.rows[0].status;
      if (status === "approved") {
        throw createError(
          "Approved purchase returns cannot be cancelled — post a corrective entry instead",
          400
        );
      }
      if (status === "cancelled") {
        throw createError("Purchase return is already cancelled", 400);
      }

      const result = await client.query(
        `UPDATE purchase_returns
            SET status = 'cancelled',
                cancelled_by_id = $1,
                cancelled_at = CURRENT_TIMESTAMP,
                cancellation_reason = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *`,
        [userId, reason, id]
      );

      await client.query("COMMIT");
      MyLogger.success(action, { purchaseReturnId: id });
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseReturnId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new UpdatePurchaseReturnInfoMediator();
