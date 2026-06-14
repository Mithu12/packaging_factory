import { Request, Response, NextFunction } from 'express';
import { MonthlyBillMediator } from '../mediators/monthlyBills/MonthlyBill.mediator';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

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
}

// Accept only the two supported split values; anything else means "all".
function parseVatFilter(raw: unknown): 'with' | 'without' | undefined {
  return raw === 'with' || raw === 'without' ? raw : undefined;
}

export const monthlyBillsController = new MonthlyBillsController();
