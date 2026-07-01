import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { eventBus, EVENT_NAMES } from "@/utils/eventBus";
import { interModuleConnector } from "@/utils/InterModuleConnector";
import {
  Payment,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  PaymentQueryParams,
  PaymentWithDetails,
  PaymentStats,
} from "@/types/payment";
import { InvoiceMediator } from "./InvoiceMediator";

export class PaymentMediator {
  static async generatePaymentNumber(): Promise<string> {
    const action = "Generate Payment Number";
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT nextval('payment_number_sequence') as next_number
      `);

      const nextNumber = result.rows[0].next_number;
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(
        nextNumber
      ).padStart(4, "0")}`;

      MyLogger.success(action, { paymentNumber });
      return paymentNumber;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async createPayment(data: CreatePaymentRequest): Promise<Payment> {
    const action = "Create Payment";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, {
        supplierId: data.supplier_id,
        amount: data.amount,
        invoiceId: data.invoice_id,
      });

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber();

      // Validate supplier exists
      const supplierCheck = await client.query(
        "SELECT id FROM suppliers WHERE id = $1",
        [data.supplier_id]
      );
      if (supplierCheck.rows.length === 0) {
        throw new Error("Supplier not found");
      }

      // Normalize the invoices being settled into allocation rows. A single
      // invoice_id (legacy / from-PO flow) is treated as one allocation; a
      // supplier-only "advance" payment carries none.
      const allocations =
        data.allocations && data.allocations.length > 0
          ? data.allocations
          : data.invoice_id
          ? [{ invoice_id: data.invoice_id, amount: data.amount }]
          : [];

      // Validate each invoice: it must belong to the supplier and have enough
      // outstanding balance to cover the allocated amount.
      for (const alloc of allocations) {
        const invoiceCheck = await client.query(
          "SELECT id, supplier_id, outstanding_amount FROM invoices WHERE id = $1",
          [alloc.invoice_id]
        );
        if (invoiceCheck.rows.length === 0) {
          throw new Error(`Invoice ${alloc.invoice_id} not found`);
        }
        const invoice = invoiceCheck.rows[0];
        if (invoice.supplier_id !== data.supplier_id) {
          throw new Error(
            `Invoice ${alloc.invoice_id} does not belong to this supplier`
          );
        }
        if (Number(alloc.amount) > parseFloat(invoice.outstanding_amount) + 0.005) {
          throw new Error(
            `Allocated amount exceeds outstanding amount on invoice ${alloc.invoice_id}`
          );
        }
      }

      // Keep payments.invoice_id populated for the single-invoice case so the
      // existing list/voucher joins keep working; multi-invoice leaves it null.
      const singleInvoiceId =
        allocations.length === 1 ? allocations[0].invoice_id : null;

      // Total supplier discount across the settled lines. Cash disbursed
      // (payments.amount) settles the invoices by amount + discount.
      const totalDiscount = allocations.reduce(
        (acc, a) => acc + Number(a.discount_amount || 0),
        0
      );

      const query = `
        INSERT INTO payments (
          payment_number, invoice_id, supplier_id, amount, discount_amount, payment_date,
          payment_method, bank_name, reference, notes, created_by, approval_status, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        paymentNumber,
        singleInvoiceId,
        data.supplier_id,
        data.amount,
        totalDiscount,
        data.payment_date,
        data.payment_method,
        data.bank_name || null,
        data.reference || null,
        data.notes || null,
        data.created_by || null,
        "draft", // Set default approval_status
        "pending",
      ];

      const result = await client.query(query, values);
      const payment = result.rows[0];

      // Persist the per-invoice allocation breakdown (settled amount + discount).
      for (const alloc of allocations) {
        await client.query(
          `INSERT INTO payment_invoice_allocations (payment_id, invoice_id, allocated_amount, discount_amount)
           VALUES ($1, $2, $3, $4)`,
          [payment.id, alloc.invoice_id, alloc.amount, alloc.discount_amount || 0]
        );
      }

      // Only update invoice if payment is approved (not for draft payments)
      // Invoice will be updated when payment is approved through the approval workflow
      if (data.invoice_id && payment.approval_status === "approved") {
        await this.updateInvoicePaymentStatus(data.invoice_id, data.amount);
      }

      await client.query("COMMIT");

      // Trigger accounting integration if payment is approved
      if (payment.approval_status === "approved") {
        await this.triggerPaymentAccounting(payment.id, payment.created_by);
      }

      // Add payment history entry after commit
      await this.addPaymentHistory(
        payment.id,
        data.invoice_id,
        "Payment Created",
        "Payment recorded",
        null,
        data.amount.toString(),
        data.created_by
      );

      MyLogger.success(action, {
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        supplierId: data.supplier_id,
      });

      return payment;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, {
        supplierId: data.supplier_id,
        amount: data.amount,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateInvoicePaymentStatus(
    invoiceId: number,
    paymentAmount: number
  ): Promise<void> {
    const action = "Update Invoice Payment Status";
    const client = await pool.connect();

    try {
      // Get current invoice status
      const invoiceResult = await client.query(
        "SELECT total_amount, paid_amount, outstanding_amount FROM invoices WHERE id = $1",
        [invoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice not found");
      }

      const invoice = invoiceResult.rows[0];
      const newPaidAmount = parseFloat(invoice.paid_amount) + paymentAmount;
      const newOutstandingAmount =
        parseFloat(invoice.outstanding_amount) - paymentAmount;

      // Determine new status
      let newStatus = "pending";
      if (newOutstandingAmount <= 0) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partial";
      }

      // Update invoice
      await client.query(
        `UPDATE invoices 
         SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newPaidAmount, newOutstandingAmount, newStatus, invoiceId]
      );

      MyLogger.success(action, {
        invoiceId,
        newPaidAmount,
        newOutstandingAmount,
        newStatus,
      });
    } catch (error: any) {
      MyLogger.error(action, error, { invoiceId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async addPaymentHistory(
    paymentId: number,
    invoiceId: number | undefined,
    event: string,
    description: string,
    oldValue: string | null,
    newValue: string | null,
    userName: string | undefined
  ): Promise<void> {
    const action = "Add Payment History";
    const client = await pool.connect();

    try {
      await client.query(
        `INSERT INTO payment_history (payment_id, invoice_id, event, description, old_value, new_value, user_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          paymentId,
          invoiceId || null,
          event,
          description,
          oldValue,
          newValue,
          userName || null,
        ]
      );

      MyLogger.success(action, { paymentId, event });
    } catch (error: any) {
      MyLogger.error(action, error, { paymentId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPayments(
    params: PaymentQueryParams = {}
  ): Promise<Payment[]> {
    const action = "Get Payments";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 50,
        search,
        supplier_id,
        invoice_id,
        status,
        payment_method,
        start_date,
        end_date,
        sortBy = "payment_date",
        sortOrder = "desc",
      } = params;

      const offset = (page - 1) * limit;

      let query = `
        SELECT
          p.*,
          s.name as supplier_name,
          s.supplier_code,
          i.invoice_number,
          (SELECT COUNT(*) FROM payment_invoice_allocations pia WHERE pia.payment_id = p.id) AS invoice_count
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add search filter
      if (search) {
        query += ` AND (
          p.payment_number ILIKE $${paramIndex} OR 
          s.name ILIKE $${paramIndex} OR 
          i.invoice_number ILIKE $${paramIndex} OR
          p.reference ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Add filters
      if (supplier_id) {
        query += ` AND p.supplier_id = $${paramIndex}`;
        queryParams.push(supplier_id);
        paramIndex++;
      }

      if (invoice_id) {
        query += ` AND p.invoice_id = $${paramIndex}`;
        queryParams.push(invoice_id);
        paramIndex++;
      }

      if (status) {
        query += ` AND p.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (payment_method) {
        query += ` AND p.payment_method = $${paramIndex}`;
        queryParams.push(payment_method);
        paramIndex++;
      }

      if (start_date) {
        query += ` AND p.payment_date >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND p.payment_date <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      // Add sorting
      const validSortColumns = [
        "payment_date",
        "amount",
        "status",
        "payment_number",
        "payment_method",
      ];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "payment_date";
      const sortDirection = sortOrder === "desc" ? "DESC" : "ASC";

      query += ` ORDER BY p.${sortColumn} ${sortDirection}`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);

      MyLogger.success(action, { count: result.rows.length, page, limit });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPaymentById(id: number): Promise<PaymentWithDetails | null> {
    const action = "Get Payment By ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { paymentId: id });

      const query = `
        SELECT 
          p.*,
          s.name as supplier_name,
          s.supplier_code,
          i.invoice_number
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE p.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        MyLogger.warn(action, { paymentId: id, message: "Payment not found" });
        return null;
      }

      const payment = result.rows[0];

      // Pull the per-invoice allocation breakdown for this payment.
      const allocationsResult = await client.query(
        `SELECT pia.invoice_id, pia.allocated_amount, pia.discount_amount, i.invoice_number
         FROM payment_invoice_allocations pia
         LEFT JOIN invoices i ON pia.invoice_id = i.id
         WHERE pia.payment_id = $1
         ORDER BY pia.id`,
        [id]
      );

      const allocations = allocationsResult.rows.map((row) => ({
        invoice_id: row.invoice_id,
        allocated_amount: parseFloat(row.allocated_amount),
        discount_amount: parseFloat(row.discount_amount),
        invoice_number: row.invoice_number,
      }));

      const paymentWithDetails: PaymentWithDetails = {
        ...payment,
        supplier: {
          id: payment.supplier_id,
          name: payment.supplier_name,
          supplier_code: payment.supplier_code,
        },
        invoice: payment.invoice_id
          ? {
              id: payment.invoice_id,
              invoice_number: payment.invoice_number,
            }
          : undefined,
        allocations,
        invoice_count: allocations.length,
      };

      MyLogger.success(action, {
        paymentId: id,
        paymentNumber: payment.payment_number,
      });
      return paymentWithDetails;
    } catch (error: any) {
      MyLogger.error(action, error, { paymentId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePayment(
    id: number,
    data: UpdatePaymentRequest
  ): Promise<Payment> {
    const action = "Update Payment";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { paymentId: id, updateData: data });

      // Get current payment
      const currentPayment = await client.query(
        "SELECT * FROM payments WHERE id = $1",
        [id]
      );

      if (currentPayment.rows.length === 0) {
        throw new Error("Payment not found");
      }

      const oldPayment = currentPayment.rows[0];

      // `allocations` is not a payments column — it is handled separately below.
      const { allocations, ...columnData } = data;

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(columnData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0 && allocations === undefined) {
        throw new Error("No fields to update");
      }

      let payment = oldPayment;
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
          UPDATE payments
          SET ${updateFields.join(", ")}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await client.query(query, values);
        payment = result.rows[0];
      }

      // Replace the invoice allocations only while the payment is still a draft;
      // once approved the invoice balances have been applied and must not shift.
      if (allocations !== undefined) {
        if (oldPayment.approval_status !== "draft") {
          throw new Error(
            "Invoice allocations can only be changed while the payment is a draft"
          );
        }
        await client.query(
          "DELETE FROM payment_invoice_allocations WHERE payment_id = $1",
          [id]
        );
        for (const alloc of allocations) {
          await client.query(
            `INSERT INTO payment_invoice_allocations (payment_id, invoice_id, allocated_amount, discount_amount)
             VALUES ($1, $2, $3, $4)`,
            [id, alloc.invoice_id, alloc.amount, alloc.discount_amount || 0]
          );
        }
        // Keep payments.invoice_id + total discount consistent with the allocations.
        const singleInvoiceId =
          allocations.length === 1 ? allocations[0].invoice_id : null;
        const totalDiscount = allocations.reduce(
          (acc, a) => acc + Number(a.discount_amount || 0),
          0
        );
        const synced = await client.query(
          `UPDATE payments SET invoice_id = $1, discount_amount = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 RETURNING *`,
          [singleInvoiceId, totalDiscount, id]
        );
        payment = synced.rows[0];
      }

      // Add payment history entry
      await this.addPaymentHistory(
        id,
        oldPayment.invoice_id,
        "Payment Updated",
        "Payment details updated",
        JSON.stringify(oldPayment),
        JSON.stringify(payment),
        data.created_by
      );

      await client.query("COMMIT");

      // Trigger accounting integration if status changed to approved
      if (payment.approval_status === "approved" && oldPayment.approval_status !== "approved") {
        await this.triggerPaymentAccounting(payment.id, payment.created_by);
      }

      MyLogger.success(action, {
        paymentId: id,
        paymentNumber: payment.payment_number,
      });

      return payment;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { paymentId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deletePayment(id: number): Promise<void> {
    const action = "Delete Payment";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { paymentId: id });

      // Get payment details before deletion
      const paymentResult = await client.query(
        "SELECT * FROM payments WHERE id = $1",
        [id]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error("Payment not found");
      }

      const payment = paymentResult.rows[0];

      // Reverse the invoice balances this payment had settled. Multi-invoice
      // payments record each share in the allocation table; legacy single-invoice
      // payments fall back to payments.invoice_id.
      const allocationsResult = await client.query(
        "SELECT invoice_id, allocated_amount FROM payment_invoice_allocations WHERE payment_id = $1",
        [id]
      );
      if (allocationsResult.rows.length > 0) {
        for (const alloc of allocationsResult.rows) {
          await this.reverseInvoicePaymentStatus(
            alloc.invoice_id,
            parseFloat(alloc.allocated_amount)
          );
        }
      } else if (payment.invoice_id) {
        await this.reverseInvoicePaymentStatus(
          payment.invoice_id,
          payment.amount
        );
      }

      // Delete payment (allocations cascade via FK)
      const result = await client.query("DELETE FROM payments WHERE id = $1", [
        id,
      ]);

      if (result.rowCount === 0) {
        throw new Error("Payment not found");
      }

      await client.query("COMMIT");

      MyLogger.success(action, { paymentId: id });
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { paymentId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async reverseInvoicePaymentStatus(
    invoiceId: number,
    paymentAmount: number
  ): Promise<void> {
    const action = "Reverse Invoice Payment Status";
    const client = await pool.connect();

    try {
      // Get current invoice status
      const invoiceResult = await client.query(
        "SELECT total_amount, paid_amount, outstanding_amount FROM invoices WHERE id = $1",
        [invoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice not found");
      }

      const invoice = invoiceResult.rows[0];
      const newPaidAmount = Math.max(
        0,
        parseFloat(invoice.paid_amount) - paymentAmount
      );
      const newOutstandingAmount =
        parseFloat(invoice.total_amount) - newPaidAmount;

      // Determine new status
      let newStatus = "pending";
      if (newOutstandingAmount <= 0) {
        newStatus = "paid";
      } else if (newPaidAmount > 0) {
        newStatus = "partial";
      }

      // Update invoice
      await client.query(
        `UPDATE invoices 
         SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newPaidAmount, newOutstandingAmount, newStatus, invoiceId]
      );

      MyLogger.success(action, {
        invoiceId,
        newPaidAmount,
        newOutstandingAmount,
        newStatus,
      });
    } catch (error: any) {
      MyLogger.error(action, error, { invoiceId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPaymentStats(): Promise<PaymentStats> {
    const action = "Get Payment Stats";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      // Get basic payment stats
      const paymentStatsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_payment_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
        FROM payments
        WHERE status != 'cancelled'
      `;

      const paymentStatsResult = await client.query(paymentStatsQuery);
      const paymentStats = paymentStatsResult.rows[0];

      // Get recent payments count (last 30 days)
      const recentPaymentsQuery = `
        SELECT COUNT(*) as recent_payments_count
        FROM payments
        WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const recentPaymentsResult = await client.query(recentPaymentsQuery);
      const recentPaymentsCount = parseInt(
        recentPaymentsResult.rows[0].recent_payments_count
      );

      // Get monthly payment trend (last 6 months)
      const trendQuery = `
        SELECT 
          TO_CHAR(payment_date, 'YYYY-MM') as month,
          COUNT(*) as total_payments,
          SUM(amount) as total_amount
        FROM payments
        WHERE payment_date >= CURRENT_DATE - INTERVAL '6 months'
        AND status = 'completed'
        GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
        ORDER BY month
      `;

      const trendResult = await client.query(trendQuery);

      // Get invoice stats
      const invoiceStats = await InvoiceMediator.getInvoiceStats();

      const paymentStatsData: PaymentStats = {
        total_invoices: invoiceStats.total_invoices,
        pending_invoices: invoiceStats.pending_invoices,
        partial_invoices: invoiceStats.partial_invoices,
        paid_invoices: invoiceStats.paid_invoices,
        overdue_invoices: invoiceStats.overdue_invoices,
        total_outstanding_amount: invoiceStats.total_outstanding_amount,
        total_paid_amount: parseFloat(paymentStats.total_payment_amount) || 0,
        overdue_amount: invoiceStats.overdue_amount,
        recent_payments_count: 0,
        monthly_payment_trend: [],
        recent_movements_count: recentPaymentsCount,
        monthly_movement_trend: trendResult.rows.map((row) => ({
          month: row.month,
          receipts: parseInt(row.total_payments),
          issues: 0, // Not applicable for payments
          adjustments: 0, // Not applicable for payments
        })),
      };

      MyLogger.success(action, paymentStatsData);
      return paymentStatsData;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Trigger accounting integration for a payment.
   * Public so ApprovalMediator can call it when payment is approved via approval workflow.
   */
  static async triggerPaymentAccounting(paymentId: number, userId: number): Promise<void> {
    try {
      // Get full payment details including joined fields
      const payment = await this.getPaymentById(paymentId);
      if (!payment) return;

      const invoiceNumbers = (payment.allocations || [])
        .map((a) => a.invoice_number)
        .filter((n): n is string => !!n);

      const paymentData = {
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        supplierId: payment.supplier_id,
        supplierName: payment.supplier_name,
        amount: parseFloat(payment.amount.toString()),
        discountAmount: payment.discount_amount != null ? parseFloat(payment.discount_amount.toString()) : 0,
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        bankName: payment.bank_name,
        reference: payment.reference,
        notes: payment.notes,
        invoiceId: payment.invoice_id,
        invoiceNumber: payment.invoice_number,
        invoiceNumbers: invoiceNumbers.length > 0 ? invoiceNumbers : undefined
      };

      // 1. Emit event
      eventBus.emit(EVENT_NAMES.SUPPLIER_PAYMENT_CREATED, {
        paymentData,
        userId
      });

      // 2. Direct call
      await interModuleConnector.accModule.addSupplierPaymentVoucher(paymentData, userId);

      MyLogger.success("Payment Accounting Triggered", { paymentId });
    } catch (error) {
      MyLogger.error("Failed to trigger payment accounting", error, { paymentId });
    }
  }
}
