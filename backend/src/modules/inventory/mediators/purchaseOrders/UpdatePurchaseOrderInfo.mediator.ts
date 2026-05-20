import pool from "@/database/connection";
import {
  UpdatePurchaseOrderRequest,
  UpdatePurchaseOrderStatusRequest,
  PurchaseOrder,
  ReceiveGoodsRequest,
  ReceiveGoodsResponse,
} from "@/types/purchaseOrder";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";
import { InvoiceMediator } from "../payments/InvoiceMediator";
import { eventBus, EVENT_NAMES } from "@/utils/eventBus";
import { interModuleConnector } from "@/utils/InterModuleConnector";

class UpdatePurchaseOrderInfoMediator {
  // Helper method to calculate due date based on payment terms
  private calculateDueDate(paymentTerms: string): string {
    const today = new Date();
    let daysToAdd = 30; // Default to Net 30

    if (paymentTerms) {
      const terms = paymentTerms.toLowerCase();
      if (terms.includes("net 15")) {
        daysToAdd = 15;
      } else if (terms.includes("net 30")) {
        daysToAdd = 30;
      } else if (terms.includes("net 45")) {
        daysToAdd = 45;
      } else if (terms.includes("net 60")) {
        daysToAdd = 60;
      } else if (terms.includes("net 90")) {
        daysToAdd = 90;
      }
    }

    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + daysToAdd);
    return dueDate.toISOString().split("T")[0];
  }

  // Update purchase order
  async updatePurchaseOrder(
    id: number,
    data: UpdatePurchaseOrderRequest,
    username: string = 'System User'
  ): Promise<PurchaseOrder> {
    let action = "Update Purchase Order";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseOrderId: id });

      await client.query("BEGIN");

      // Check if purchase order exists
      const checkQuery = `SELECT id, status FROM purchase_orders WHERE id = $1`;
      const checkResult = await client.query(checkQuery, [id]);

      if (checkResult.rows.length === 0) {
        throw createError("Purchase order not found", 404);
      }

      const currentPO = checkResult.rows[0];

      // Don't allow updates to received or cancelled orders
      if (["received", "cancelled"].includes(currentPO.status)) {
        throw createError(
          "Cannot update received or cancelled purchase orders",
          400
        );
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.supplier_id !== undefined) {
        updateFields.push(`supplier_id = $${paramIndex}`);
        updateValues.push(data.supplier_id);
        paramIndex++;
      }

      if (data.expected_delivery_date !== undefined) {
        updateFields.push(`expected_delivery_date = $${paramIndex}`);
        updateValues.push(data.expected_delivery_date);
        paramIndex++;
      }

      if (data.actual_delivery_date !== undefined) {
        updateFields.push(`actual_delivery_date = $${paramIndex}`);
        updateValues.push(data.actual_delivery_date);
        paramIndex++;
      }

      if (data.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex}`);
        updateValues.push(data.priority);
        paramIndex++;
      }

      if (data.payment_terms !== undefined) {
        updateFields.push(`payment_terms = $${paramIndex}`);
        updateValues.push(data.payment_terms);
        paramIndex++;
      }

      if (data.delivery_terms !== undefined) {
        updateFields.push(`delivery_terms = $${paramIndex}`);
        updateValues.push(data.delivery_terms);
        paramIndex++;
      }

      if (data.department !== undefined) {
        updateFields.push(`department = $${paramIndex}`);
        updateValues.push(data.department);
        paramIndex++;
      }

      if (data.project !== undefined) {
        updateFields.push(`project = $${paramIndex}`);
        updateValues.push(data.project);
        paramIndex++;
      }

      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(data.notes);
        paramIndex++;
      }

      if (data.work_order_id !== undefined) {
        updateFields.push(`work_order_id = $${paramIndex}`);
        updateValues.push(data.work_order_id);
        paramIndex++;
      }

      if (data.customer_order_id !== undefined) {
        updateFields.push(`customer_order_id = $${paramIndex}`);
        updateValues.push(data.customer_order_id);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw createError("No fields to update", 400);
      }

      // Update purchase order
      const updateQuery = `
                UPDATE purchase_orders 
                SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                RETURNING *
            `;

      updateValues.push(id);
      const result = await client.query(updateQuery, updateValues);
      const updatedPO = result.rows[0];

      // Update line items if provided
      if (data.line_items && data.line_items.length > 0) {
        // Delete existing line items
        await client.query(
          "DELETE FROM purchase_order_line_items WHERE purchase_order_id = $1",
          [id]
        );

        // Insert new line items
        let totalAmount = 0;
        for (const lineItem of data.line_items) {
          // Get product details
          const productQuery = `
                        SELECT sku, name, unit_of_measure 
                        FROM products 
                        WHERE id = $1
                    `;
          const productResult = await client.query(productQuery, [
            lineItem.product_id,
          ]);

          if (productResult.rows.length === 0) {
            throw createError(
              `Product with ID ${lineItem.product_id} not found`,
              404
            );
          }

          const product = productResult.rows[0];
          const totalPrice = lineItem.quantity * lineItem.unit_price;
          totalAmount += totalPrice;

          const lineItemQuery = `
                        INSERT INTO purchase_order_line_items (
                            purchase_order_id, product_id, product_sku, product_name,
                            description, quantity, unit_price, total_price,
                            received_quantity, pending_quantity, unit_of_measure
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `;

          await client.query(lineItemQuery, [
            id,
            lineItem.product_id,
            product.sku,
            product.name,
            lineItem.description,
            lineItem.quantity,
            lineItem.unit_price,
            totalPrice,
            0, // received_quantity
            lineItem.quantity, // pending_quantity
            product.unit_of_measure,
          ]);
        }

        // Update total amount
        await client.query(
          "UPDATE purchase_orders SET total_amount = $1 WHERE id = $2",
          [totalAmount, id]
        );
      }

      // Add timeline entry
      const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, "user", status
                )
                VALUES ($1, $2, $3, $4)
            `;

      await client.query(timelineQuery, [
        id,
        "Purchase Order Updated",
        username,
        "completed",
      ]);

      await client.query("COMMIT");

      MyLogger.success(action, {
        purchaseOrderId: id,
        updatedFields: updateFields.length,
      });

      return updatedPO;
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseOrderId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update purchase order status
  async updatePurchaseOrderStatus(
    id: number,
    data: UpdatePurchaseOrderStatusRequest,
    username: string = 'System User'
  ): Promise<PurchaseOrder> {
    let action = "Update Purchase Order Status";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseOrderId: id, newStatus: data.status });

      await client.query("BEGIN");

      // Check if purchase order exists
      const checkQuery = `SELECT id, status FROM purchase_orders WHERE id = $1`;
      const checkResult = await client.query(checkQuery, [id]);

      if (checkResult.rows.length === 0) {
        throw createError("Purchase order not found", 404);
      }

      const currentPO = checkResult.rows[0];

      // Update status
      const updateQuery = `
                UPDATE purchase_orders 
                SET status = $1, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

      const result = await client.query(updateQuery, [data.status, id]);

      // Update approval fields if status is approved
      if (data.status === "approved") {
        await client.query(
          "UPDATE purchase_orders SET approved_by = $1, approved_date = CURRENT_DATE WHERE id = $2",
          [username, id]
        );
      }
      const updatedPO = result.rows[0];

      // Add timeline entry
      const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, description, "user", status
                )
                VALUES ($1, $2, $3, $4, $5)
            `;

      const eventMap: { [key: string]: string } = {
        draft: "Status Changed to Draft",
        pending: "Submitted for Approval",
        approved: "Approved",
        sent: "Sent to Supplier",
        partially_received: "Partially Received",
        received: "Fully Received",
        cancelled: "Cancelled",
      };

      await client.query(timelineQuery, [
        id,
        eventMap[data.status] || `Status Changed to ${data.status}`,
        data.notes,
        username,
        "completed",
      ]);

      // Create invoice when status is changed to received
      if (data.status === "received") {
        try {
          const invoiceData = {
            purchase_order_id: id,
            supplier_id: updatedPO.supplier_id,
            invoice_date: new Date().toISOString().split("T")[0],
            due_date: this.calculateDueDate(updatedPO.payment_terms),
            total_amount: parseFloat(updatedPO.total_amount),
            terms: updatedPO.payment_terms,
            notes: `Invoice for Purchase Order ${updatedPO.po_number}`,
          };

          const invoice = await InvoiceMediator.createInvoice(invoiceData);

          // Add timeline entry for invoice creation
          await client.query(timelineQuery, [
            id,
            "Invoice Created",
            `Invoice ${invoice.invoice_number} created automatically`,
            username,
            "completed",
          ]);

          MyLogger.success("Invoice Created", {
            purchaseOrderId: id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
          });
        } catch (invoiceError: any) {
          MyLogger.error("Failed to create invoice", invoiceError, {
            purchaseOrderId: id,
          });
          // Don't fail the entire transaction if invoice creation fails
        }
      }

      await client.query("COMMIT");

      MyLogger.success(action, {
        purchaseOrderId: id,
        oldStatus: currentPO.status,
        newStatus: data.status,
      });

      return updatedPO;
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseOrderId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Receive goods for purchase order
  async receiveGoods(
    id: number,
    data: ReceiveGoodsRequest,
    username: string = 'System User',
    userId?: number
  ): Promise<ReceiveGoodsResponse> {
    let action = "Receive Goods";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseOrderId: id });

      await client.query("BEGIN");

      // Check if purchase order exists and is in correct status
      const checkQuery = `
                SELECT id, status, total_amount
                FROM purchase_orders
                WHERE id = $1
            `;
      const checkResult = await client.query(checkQuery, [id]);

      if (checkResult.rows.length === 0) {
        throw createError("Purchase order not found", 404);
      }

      const currentPO = checkResult.rows[0];

      if (
        !["approved", "sent", "partially_received"].includes(currentPO.status)
      ) {
        throw createError(
          "Cannot receive goods for purchase order in current status",
          400
        );
      }

      let allItemsReceived = true;
      let newStatus = "partially_received";

      // 1. Get Primary Distribution Center (Default for receipts)
      const primaryDcQuery = "SELECT id FROM distribution_centers WHERE is_primary = true LIMIT 1";
      const primaryDcResult = await client.query(primaryDcQuery);
      let distributionCenterId: number | undefined = primaryDcResult.rows[0]?.id;

      // Create the GRN (Goods Receipt Note) header row up front so child
      // line-item receipt rows can reference it. Each receive event gets
      // its own immutable receipt_number for re-downloadable GRN PDFs.
      const grnSeqResult = await client.query(
        `SELECT nextval('grn_number_sequence') as seq`
      );
      const grnSeq = parseInt(grnSeqResult.rows[0].seq);
      const receiptYear = new Date(data.received_date || Date.now()).getFullYear();
      const receiptNumber = `GRN-${receiptYear}-${grnSeq.toString().padStart(3, '0')}`;

      const receiptInsert = await client.query(
        `INSERT INTO purchase_order_receipts (
            purchase_order_id, receipt_number, receipt_date,
            received_by_user_id, received_by_name,
            delivery_challan, transport_company, transport_no, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          id,
          receiptNumber,
          data.received_date || new Date().toISOString().split('T')[0],
          userId || null,
          data.received_by_name,
          data.delivery_challan || null,
          data.transport_company || null,
          data.transport_no || null,
          data.notes || null,
        ]
      );
      const receiptId: number = receiptInsert.rows[0].id;

      // Update line items
      for (const receivedItem of data.line_items) {
        const lineItemQuery = `
                    SELECT id, product_id, quantity, received_quantity, pending_quantity, unit_price
                    FROM purchase_order_line_items
                    WHERE id = $1 AND purchase_order_id = $2
                `;
        const lineItemResult = await client.query(lineItemQuery, [
          receivedItem.line_item_id,
          id,
        ]);

        if (lineItemResult.rows.length === 0) {
          throw createError(
            `Line item with ID ${receivedItem.line_item_id} not found`,
            404
          );
        }

        const lineItem = lineItemResult.rows[0];
        const newReceivedQuantity =
          Number(lineItem.received_quantity) +
          Number(receivedItem.received_quantity);
        const newPendingQuantity =
          lineItem.pending_quantity - receivedItem.received_quantity;
        const lineUnitPrice = Number(lineItem.unit_price);

        // Debug logging
        MyLogger.info("Receive Goods Calculation", {
          lineItemId: receivedItem.line_item_id,
          currentReceived: lineItem.received_quantity,
          currentPending: lineItem.pending_quantity,
          receivingQuantity: receivedItem.received_quantity,
          newReceivedQuantity,
          newPendingQuantity,
        });

        // Validate that we don't exceed ordered quantity
        if (newReceivedQuantity > lineItem.quantity) {
          throw createError(
            `Cannot receive more than ordered quantity for line item ${receivedItem.line_item_id}. Ordered: ${lineItem.quantity}, Already received: ${lineItem.received_quantity}, Trying to receive: ${receivedItem.received_quantity}`,
            400
          );
        }

        // Validate that we don't receive more than what's pending
        if (receivedItem.received_quantity > lineItem.pending_quantity) {
          throw createError(
            `Cannot receive more than pending quantity for line item ${receivedItem.line_item_id}. Pending: ${lineItem.pending_quantity}, Trying to receive: ${receivedItem.received_quantity}`,
            400
          );
        }

        // Validate that pending quantity doesn't go negative
        if (newPendingQuantity < 0) {
          throw createError(
            `Invalid pending quantity calculation for line item ${receivedItem.line_item_id}. Current pending: ${lineItem.pending_quantity}, Receiving: ${receivedItem.received_quantity}`,
            400
          );
        }

        // Update line item - try separate updates to isolate the issue
        const updateReceivedQuery = `
                    UPDATE purchase_order_line_items
                    SET received_quantity = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `;

        const updatePendingQuery = `
                    UPDATE purchase_order_line_items
                    SET pending_quantity = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `;

        // Ensure proper data type conversion
        const receivedQtyStr = newReceivedQuantity.toString();
        const pendingQtyStr = newPendingQuantity.toString();

        MyLogger.info("Update Query Parameters", {
          lineItemId: receivedItem.line_item_id,
          receivedQtyStr,
          pendingQtyStr,
          newReceivedQuantity,
          newPendingQuantity,
        });

        // Update received_quantity first
        await client.query(updateReceivedQuery, [
          receivedQtyStr,
          receivedItem.line_item_id,
        ]);

        // Update pending_quantity second
        await client.query(updatePendingQuery, [
          pendingQtyStr,
          receivedItem.line_item_id,
        ]);

        // Record this line in the GRN child table for permanent history
        await client.query(
          `INSERT INTO purchase_order_receipt_line_items (
              receipt_id, line_item_id, received_quantity, condition, notes
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            receiptId,
            receivedItem.line_item_id,
            receivedItem.received_quantity,
            receivedItem.condition || 'good',
            receivedItem.notes || null,
          ]
        );

        // Debug: Check what was actually stored in the database
        const verifyQuery = `
                    SELECT id, quantity, received_quantity, pending_quantity
                    FROM purchase_order_line_items
                    WHERE id = $1
                `;
        const verifyResult = await client.query(verifyQuery, [
          receivedItem.line_item_id,
        ]);
        const storedData = verifyResult.rows[0];

        MyLogger.info("Database Verification After Update", {
          lineItemId: receivedItem.line_item_id,
          storedReceivedQuantity: storedData.received_quantity,
          storedPendingQuantity: storedData.pending_quantity,
          expectedReceivedQuantity: receivedQtyStr,
          expectedPendingQuantity: pendingQtyStr,
        });

        // Update product stock - INCREASE stock when goods are received
        MyLogger.info("Updating product stock for received goods", {
          lineItemId: receivedItem.line_item_id,
          productId: lineItem.product_id,
          receivedQuantity: receivedItem.received_quantity,
        });

        // Get current stock and cost before updating
        const currentProductQuery = `
                    SELECT current_stock, cost_price FROM products WHERE id = $1
                `;
        const currentProductResult = await client.query(currentProductQuery, [
          lineItem.product_id,
        ]);
        const currentStock = Number(currentProductResult.rows[0].current_stock);
        const currentCostPrice = Number(currentProductResult.rows[0].cost_price);
        const receivedQty = Number(receivedItem.received_quantity);
        const newStock = currentStock + receivedQty;

        // Moving-average cost: weight the existing stock value with the newly received value.
        // If current_stock or current_cost is 0 (or unknown), the received price becomes the new cost.
        const hasExistingValue = currentStock > 0 && currentCostPrice > 0;
        const newCostPrice = hasExistingValue
          ? (currentStock * currentCostPrice + receivedQty * lineUnitPrice) / newStock
          : lineUnitPrice;

        const updateStockQuery = `
                    UPDATE products
                    SET current_stock = $1,
                        cost_price = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                `;
        await client.query(updateStockQuery, [
          newStock,
          newCostPrice.toFixed(2),
          lineItem.product_id,
        ]);

        MyLogger.info("Moving-average cost recomputed", {
          productId: lineItem.product_id,
          previousCostPrice: currentCostPrice,
          receivedUnitPrice: lineUnitPrice,
          newCostPrice: Number(newCostPrice.toFixed(2)),
          previousStock: currentStock,
          receivedQty,
        });

        // Update Product Location (Default Warehouse)
        if (distributionCenterId) {
          const locationQuery = `
                INSERT INTO product_locations (
                    product_id, distribution_center_id, current_stock
                ) VALUES ($1, $2, $3)
                ON CONFLICT (product_id, distribution_center_id)
                DO UPDATE SET 
                    current_stock = product_locations.current_stock + EXCLUDED.current_stock,
                    updated_at = CURRENT_TIMESTAMP
            `;
          await client.query(locationQuery, [
            lineItem.product_id,
            distributionCenterId,
            receivedItem.received_quantity
          ]);

          MyLogger.info("Updated product location stock", {
            productId: lineItem.product_id,
            distributionCenterId,
            addedStock: receivedItem.received_quantity
          });
        }

        // Create stock adjustment record for audit trail
        const stockAdjustmentQuery = `
                    INSERT INTO stock_adjustments (
                        product_id, adjustment_type, quantity, 
                        previous_stock, new_stock,
                        reason, reference, notes, adjusted_by, distribution_center_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `;
        await client.query(stockAdjustmentQuery, [
          lineItem.product_id,
          "increase",
          receivedItem.received_quantity,
          currentStock,
          newStock,
          "Purchase Order Receipt",
          `PO-${id}`,
          `Goods received for Purchase Order ${id}`,
          username,
          distributionCenterId || null // Log the DC ID
        ]);

        // Check if all items are fully received
        if (newReceivedQuantity < lineItem.quantity) {
          allItemsReceived = false;
        }
      }

      // Update purchase order status
      if (allItemsReceived) {
        newStatus = "received";
      }

      const updatePOQuery = `
                UPDATE purchase_orders
                SET status = $1, 
                    actual_delivery_date = COALESCE($2, CURRENT_DATE),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

      const result = await client.query(updatePOQuery, [
        newStatus,
        data.received_date,
        id,
      ]);
      const updatedPO = result.rows[0];

      // Add timeline entry
      const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, description, "user", status
                )
                VALUES ($1, $2, $3, $4, $5)
            `;

      const eventDescription = allItemsReceived
        ? "All goods received"
        : `Partial goods received: ${data.line_items.length} items`;

      await client.query(timelineQuery, [
        id,
        allItemsReceived ? "Goods Received" : "Partial Goods Received",
        data.notes || eventDescription,
        username,
        "completed",
      ]);

      // Create invoice when all goods are received
      if (allItemsReceived) {
        try {
          const invoiceData = {
            purchase_order_id: id,
            supplier_id: updatedPO.supplier_id,
            invoice_date: new Date().toISOString().split("T")[0],
            due_date: this.calculateDueDate(updatedPO.payment_terms),
            total_amount: parseFloat(updatedPO.total_amount),
            terms: updatedPO.payment_terms,
            notes: `Invoice for Purchase Order ${updatedPO.po_number}`,
          };

          const invoice = await InvoiceMediator.createInvoice(invoiceData);

          // Add timeline entry for invoice creation
          await client.query(timelineQuery, [
            id,
            "Invoice Created",
            `Invoice ${invoice.invoice_number} created automatically`,
            username,
            "completed",
          ]);

          MyLogger.success("Invoice Created", {
            purchaseOrderId: id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
          });
        } catch (invoiceError: any) {
          MyLogger.error("Failed to create invoice", invoiceError, {
            purchaseOrderId: id,
          });
          // Don't fail the entire transaction if invoice creation fails
        }
      }

      // Emit accounting integration event for received goods
      try {
        // Get supplier information for the event
        const supplierQuery = `SELECT name FROM suppliers WHERE id = $1`;
        const supplierResult = await client.query(supplierQuery, [updatedPO.supplier_id]);
        const supplierName = supplierResult.rows[0]?.name || 'Unknown Supplier';

        // Get line items with product information
        const lineItemsQuery = `
          SELECT
            poli.id as line_item_id,
            poli.product_id,
            p.name as product_name,
            poli.quantity,
            poli.unit_price,
            poli.total_price
          FROM purchase_order_line_items poli
          JOIN products p ON poli.product_id = p.id
          WHERE poli.purchase_order_id = $1
        `;
        const lineItemsResult = await client.query(lineItemsQuery, [id]);

        const purchaseOrderData = {
          purchaseOrderId: id,
          poNumber: updatedPO.po_number,
          supplierId: updatedPO.supplier_id,
          supplierName: supplierName,
          totalAmount: parseFloat(updatedPO.total_amount),
          receivedDate: data.received_date || new Date().toISOString().split("T")[0],
          currency: 'USD', // Default currency, should be configurable
          lineItems: lineItemsResult.rows.map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unit_price),
            totalPrice: parseFloat(item.total_price)
          })),
          distributionCenterId: distributionCenterId || undefined
        };

        // Emit event for accounting integration
        eventBus.emit(EVENT_NAMES.PURCHASE_ORDER_RECEIVED, {
          purchaseOrderData,
          userId: username
        });

        // Central Bridge: Call accounts module directly via InterModuleConnector
        MyLogger.info("Purchase Order Bridge: Calling accModule.addPurchaseVoucher", { purchaseOrderId: id });
        await interModuleConnector.accModule.addPurchaseVoucher(purchaseOrderData, username);

        MyLogger.success("Purchase Order Accounting Event Emitted", {
          purchaseOrderId: id,
          event: EVENT_NAMES.PURCHASE_ORDER_RECEIVED,
          totalItems: lineItemsResult.rows.length
        });
      } catch (eventError: any) {
        MyLogger.error("Failed to emit purchase order accounting event", eventError, {
          purchaseOrderId: id,
        });
        // Don't fail the entire transaction if event emission fails
      }

      await client.query("COMMIT");

      MyLogger.success(action, {
        purchaseOrderId: id,
        newStatus,
        receivedItemsCount: data.line_items.length,
        allItemsReceived,
        receiptId,
        receiptNumber,
      });

      return {
        purchase_order: updatedPO,
        receipt_id: receiptId,
        receipt_number: receiptNumber,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseOrderId: id });
      throw error;
    } finally {
      client.release();
    }
  }
  // Submit a purchase order for approval (draft -> pending)
  async submitForApproval(
    id: number,
    userId: number,
    username: string,
    notes?: string
  ): Promise<PurchaseOrder> {
    const action = "Submit Purchase Order for Approval";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseOrderId: id, userId });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, status, approval_status FROM purchase_orders WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase order not found", 404);
      }
      const currentPO = checkResult.rows[0];

      if (
        currentPO.approval_status &&
        !["draft", "rejected"].includes(currentPO.approval_status)
      ) {
        throw createError(
          `Cannot submit purchase order with approval status '${currentPO.approval_status}'`,
          400
        );
      }
      if (!["draft", "cancelled"].includes(currentPO.status) && currentPO.status !== "pending") {
        // Allow submit from draft; cancelled/received/etc. cannot be resubmitted
        if (currentPO.status !== "draft") {
          throw createError(
            `Cannot submit purchase order in status '${currentPO.status}'`,
            400
          );
        }
      }

      const result = await client.query(
        `UPDATE purchase_orders
         SET status = 'pending',
             approval_status = 'submitted',
             submitted_by = $1,
             submitted_at = CURRENT_TIMESTAMP,
             approval_notes = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [userId, notes || null, id]
      );
      const updatedPO = result.rows[0];

      await client.query(
        `INSERT INTO purchase_order_timeline (purchase_order_id, event, description, "user", status)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, "Submitted for Approval", notes || null, username, "completed"]
      );

      await client.query(
        `INSERT INTO approval_history (entity_type, entity_id, action, performed_by, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["purchase_order", id, "submitted", userId, notes || null, currentPO.approval_status || "draft", "submitted"]
      );

      await client.query("COMMIT");
      MyLogger.success(action, { purchaseOrderId: id });
      return updatedPO;
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseOrderId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Approve a purchase order (pending -> approved)
  async approvePurchaseOrder(
    id: number,
    userId: number,
    username: string,
    notes?: string
  ): Promise<PurchaseOrder> {
    const action = "Approve Purchase Order";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseOrderId: id, userId });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, status, approval_status FROM purchase_orders WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase order not found", 404);
      }
      const currentPO = checkResult.rows[0];

      if (currentPO.approval_status !== "submitted") {
        throw createError(
          `Only submitted purchase orders can be approved (current: '${currentPO.approval_status}')`,
          400
        );
      }

      const result = await client.query(
        `UPDATE purchase_orders
         SET status = 'approved',
             approval_status = 'approved',
             approved_by = $1,
             approved_date = CURRENT_DATE,
             approved_at = CURRENT_TIMESTAMP,
             approval_notes = COALESCE($2, approval_notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [username, notes || null, id]
      );
      const updatedPO = result.rows[0];

      await client.query(
        `INSERT INTO purchase_order_timeline (purchase_order_id, event, description, "user", status)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, "Approved", notes || null, username, "completed"]
      );

      await client.query(
        `INSERT INTO approval_history (entity_type, entity_id, action, performed_by, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["purchase_order", id, "approved", userId, notes || null, "submitted", "approved"]
      );

      await client.query("COMMIT");
      MyLogger.success(action, { purchaseOrderId: id });
      return updatedPO;
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseOrderId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Reject a purchase order (pending -> rejected, status stays draft for resubmit)
  async rejectPurchaseOrder(
    id: number,
    userId: number,
    username: string,
    notes?: string
  ): Promise<PurchaseOrder> {
    const action = "Reject Purchase Order";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { purchaseOrderId: id, userId });
      await client.query("BEGIN");

      const checkResult = await client.query(
        `SELECT id, status, approval_status FROM purchase_orders WHERE id = $1`,
        [id]
      );
      if (checkResult.rows.length === 0) {
        throw createError("Purchase order not found", 404);
      }
      const currentPO = checkResult.rows[0];

      if (currentPO.approval_status !== "submitted") {
        throw createError(
          `Only submitted purchase orders can be rejected (current: '${currentPO.approval_status}')`,
          400
        );
      }

      const result = await client.query(
        `UPDATE purchase_orders
         SET status = 'draft',
             approval_status = 'rejected',
             approval_notes = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [notes || null, id]
      );
      const updatedPO = result.rows[0];

      await client.query(
        `INSERT INTO purchase_order_timeline (purchase_order_id, event, description, "user", status)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, "Rejected", notes || null, username, "completed"]
      );

      await client.query(
        `INSERT INTO approval_history (entity_type, entity_id, action, performed_by, notes, previous_status, new_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ["purchase_order", id, "rejected", userId, notes || null, "submitted", "rejected"]
      );

      await client.query("COMMIT");
      MyLogger.success(action, { purchaseOrderId: id });
      return updatedPO;
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { purchaseOrderId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new UpdatePurchaseOrderInfoMediator();
