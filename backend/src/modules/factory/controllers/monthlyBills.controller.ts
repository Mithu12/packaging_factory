import { Request, Response, NextFunction } from 'express';
import { MonthlyBillMediator } from '../mediators/monthlyBills/MonthlyBill.mediator';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

// Accept only the two supported split values; anything else means "all".
function parseVatFilter(raw: unknown): 'with' | 'without' | undefined {
  return raw === 'with' || raw === 'without' ? raw : undefined;
}

class MonthlyBillsController {
  /**
   * GET /api/factory/customer-orders/customers/:customerId/monthly-bill
   *   ?from=YYYY-MM-DD&to=YYYY-MM-DD
   *
   * Returns a single consolidated PDF listing every challan (delivery) for the
   * customer in the given date range, plus a payment summary. Read-only — does
   * not create any invoice or voucher (per-delivery invoices already exist).
   */
  async exportMonthlyBillPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/customer-orders/customers/:customerId/monthly-bill';
      const { customerId } = req.params;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const vat = parseVatFilter(req.query.vat);
      MyLogger.info(action, { customerId, from, to, vat });

      if (!from || !to) {
        throw createError('Both "from" and "to" date query params are required (YYYY-MM-DD)', 400);
      }

      const data = await MonthlyBillMediator.getMonthlyBillData(Number(customerId), from, to, vat);

      if (data.rows.length === 0) {
        const scope = vat === 'with' ? ' (VAT)' : vat === 'without' ? ' (without VAT)' : '';
        res
          .status(404)
          .json({ success: false, message: `No challans found in the selected period${scope}`, data: null });
        return;
      }

      const { PDFGenerator } = await import('@/services/pdf-generator');
      const pdfBuffer = await PDFGenerator.generateMonthlyBillPDF(data);

      // Sanitise customer name for filename — no slashes, quotes, etc.
      const safeName = (data.customer.company || data.customer.name || `customer-${customerId}`)
        .replace(/[^A-Za-z0-9_-]+/g, '_')
        .slice(0, 60);
      const vatTag = vat === 'with' ? '-vat' : vat === 'without' ? '-without-vat' : '';
      const filename = `monthly-bill${vatTag}-${safeName}-${from}-to-${to}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
      MyLogger.success(action, { customerId, from, to, vat, rowCount: data.rows.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/factory/customer-orders/customers/:customerId/monthly-bill/data
   *   ?from=YYYY-MM-DD&to=YYYY-MM-DD
   *
   * Returns the consolidated bill data as JSON (no PDF) so the UI can preview
   * the challans in the period before downloading the VAT / without-VAT bills.
   */
  async getMonthlyBillData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/customer-orders/customers/:customerId/monthly-bill/data';
      const { customerId } = req.params;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      MyLogger.info(action, { customerId, from, to });

      if (!from || !to) {
        throw createError('Both "from" and "to" date query params are required (YYYY-MM-DD)', 400);
      }

      const data = await MonthlyBillMediator.getMonthlyBillData(Number(customerId), from, to);
      res.json({ success: true, data });
      MyLogger.success(action, { customerId, from, to, rowCount: data.rows.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/factory/customer-orders/customers/:customerId/monthly-bill/save
   *
   * Generate and persist a monthly bill for the given customer + period.
   * Body: { from_date, to_date, vat_filter? }
   */
  async saveMonthlyBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/customer-orders/customers/:customerId/monthly-bill/save';
      const { customerId } = req.params;
      const { from_date, to_date, vat_filter } = req.body;
      MyLogger.info(action, { customerId, from_date, to_date, vat_filter });

      if (!from_date || !to_date) {
        throw createError('Both "from_date" and "to_date" are required (YYYY-MM-DD)', 400);
      }

      const bill = await MonthlyBillMediator.createMonthlyBill(
        {
          customer_id: Number(customerId),
          from_date,
          to_date,
          vat_filter: vat_filter ?? null,
        },
        req.user?.username || 'System',
      );

      res.status(201).json({ success: true, data: bill });
      MyLogger.success(action, { billId: bill.id, billNumber: bill.bill_number });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/factory/monthly-bills
   *    ?limit=10&offset=0&customer_id=
   *
   * List saved monthly bills.
   */
  async listMonthlyBills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/monthly-bills';
      const { limit, offset, customer_id, start_date, end_date } = req.query;
      MyLogger.info(action, { limit, offset, customer_id });

      const bills = await MonthlyBillMediator.getMonthlyBills({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        customer_id: customer_id ? parseInt(customer_id as string) : undefined,
        start_date: start_date as string | undefined,
        end_date: end_date as string | undefined,
      });

      res.json({ success: true, data: bills });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/factory/monthly-bills/:id
   *
   * Get a saved monthly bill with its line items.
   */
  async getMonthlyBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/monthly-bills/:id';
      const { id } = req.params;
      MyLogger.info(action, { billId: id });

      const bill = await MonthlyBillMediator.getMonthlyBillById(Number(id));
      res.json({ success: true, data: bill });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/factory/monthly-bills/:id
   *
   * Delete a saved monthly bill.
   */
  async deleteMonthlyBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'DELETE /api/factory/monthly-bills/:id';
      const { id } = req.params;
      MyLogger.info(action, { billId: id });

      await MonthlyBillMediator.deleteMonthlyBill(Number(id));
      res.json({ success: true, message: 'Monthly bill deleted' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/factory/monthly-bills/:id/payments
   *
   * Record a consolidated payment against a saved monthly bill.
   * The payment is distributed proportionally across the bill's underlying
   * delivery invoices.
   */
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/monthly-bills/:id/payments';
      const { id } = req.params;
      const {
        payment_amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        bank_name,
        cheque_date,
        ait_amount,
      } = req.body;
      MyLogger.info(action, { billId: id, amount: payment_amount });

      if (!payment_amount || payment_amount <= 0) {
        res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
        return;
      }

      const result = await MonthlyBillMediator.recordPayment(
        Number(id),
        {
          payment_amount: Number(payment_amount),
          payment_date,
          payment_method: payment_method || 'cash',
          reference_number,
          notes,
          bank_name,
          cheque_date,
          ait_amount: ait_amount ? Number(ait_amount) : undefined,
        },
        req.user?.user_id || 0,
      );

      res.status(201).json({ success: true, data: result });
      MyLogger.success(action, { billId: id, paymentAmount: payment_amount, paymentIds: result.paymentIds });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/factory/monthly-bills/:id/pdf
   *
   * Download PDF for a saved monthly bill.
   */
  async exportSavedMonthlyBillPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/monthly-bills/:id/pdf';
      const { id } = req.params;
      MyLogger.info(action, { billId: id });

      const bill = await MonthlyBillMediator.getMonthlyBillById(Number(id));

      // Rebuild MonthlyBillData from the saved line items for the PDF generator
      const { PDFGenerator } = await import('@/services/pdf-generator');
      const pdfBuffer = await PDFGenerator.generateMonthlyBillPDF({
        customer: {
          id: bill.customer_id,
          name: bill.customer_name,
          company: bill.customer_name,
          vat_number: bill.customer_vat_number,
          address_line: bill.customer_address || '',
        },
        invoice_no: bill.bill_number,
        period: {
          from_date: bill.from_date,
          to_date: bill.to_date,
          generated_at: bill.created_at,
        },
        rows: bill.line_items.map((li) => ({
          delivery_id: li.delivery_id,
          delivery_number: li.delivery_number || '',
          delivery_date: li.delivery_date || '',
          invoice_id: li.invoice_id,
          invoice_number: li.invoice_number,
          vat_number: null,
          po_numbers: '',
          total_qty: li.total_qty,
          subtotal: li.subtotal,
          tax_amount: li.tax_amount,
          total_amount: li.total_amount,
          paid_amount: 0,
          outstanding_amount: 0,
          status: null,
        })),
        totals: {
          subtotal: bill.subtotal,
          tax_amount: bill.tax_amount,
          total_amount: bill.total_amount,
          total_qty: bill.total_qty,
        },
        payments: {
          paid_in_period: bill.paid_amount,
          last_payment_date: null,
          payment_count: 0,
        },
        outstanding_now: bill.outstanding_amount,
      });

      const safeName = bill.customer_name.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60);
      const filename = `${bill.bill_number}-${safeName}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
      MyLogger.success(action, { billId: id, billNumber: bill.bill_number });
    } catch (error) {
      next(error);
    }
  }
}

export const monthlyBillsController = new MonthlyBillsController();
