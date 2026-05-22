import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface VatRegisterParams {
  dateFrom?: string;
  dateTo?: string;
  customerId?: number;
}

interface VatEntry {
  date: string;
  invoice_number: string;
  customer_name: string;
  vat_number: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
}

export interface VatRegisterResult {
  period: { dateFrom: string | null; dateTo: string | null };
  total: number;
  entries: VatEntry[];
}

export class GetVatRegisterMediator {
  /**
   * Output VAT collected from customers, aggregated from sales invoices.
   * Each sales invoice snapshots its tax_rate from the parent order at
   * invoice-creation time, so a partial delivery's rate is preserved even if
   * the order's rate changes later.
   */
  static async getVatRegister(params: VatRegisterParams): Promise<VatRegisterResult> {
    const action = 'Get VAT Register';
    const { dateFrom, dateTo, customerId } = params;

    try {
      MyLogger.info(action, { params });

      const where: string[] = ['si.tax_amount > 0'];
      const args: unknown[] = [];

      if (dateFrom) {
        args.push(dateFrom);
        where.push(`si.invoice_date >= $${args.length}`);
      }
      if (dateTo) {
        args.push(dateTo);
        where.push(`si.invoice_date <= $${args.length}`);
      }
      if (customerId) {
        args.push(customerId);
        where.push(`si.factory_customer_id = $${args.length}`);
      }

      const res = await pool.query<{
        invoice_date: Date;
        invoice_number: string;
        customer_name: string;
        vat_number: string | null;
        subtotal: string;
        tax_rate: string;
        tax_amount: string;
      }>(
        `SELECT si.invoice_date,
                si.invoice_number,
                fc.name AS customer_name,
                fc.vat_number,
                si.subtotal,
                si.tax_rate,
                si.tax_amount
           FROM factory_sales_invoices si
           JOIN factory_customers fc ON fc.id = si.factory_customer_id
          WHERE ${where.join(' AND ')}
          ORDER BY si.invoice_date ASC, si.id ASC`,
        args,
      );

      const entries: VatEntry[] = res.rows.map(r => ({
        date: r.invoice_date.toISOString().split('T')[0],
        invoice_number: r.invoice_number,
        customer_name: r.customer_name,
        vat_number: r.vat_number,
        subtotal: parseFloat(r.subtotal ?? '0'),
        vat_rate: parseFloat(r.tax_rate ?? '0'),
        vat_amount: parseFloat(r.tax_amount ?? '0'),
      }));

      const total = +entries.reduce((s, e) => s + e.vat_amount, 0).toFixed(2);

      return {
        period: { dateFrom: dateFrom ?? null, dateTo: dateTo ?? null },
        total,
        entries,
      };
    } catch (error) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }
}
