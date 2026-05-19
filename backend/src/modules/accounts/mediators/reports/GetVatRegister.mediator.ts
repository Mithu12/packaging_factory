import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface VatRegisterParams {
  dateFrom?: string;
  dateTo?: string;
}

interface VatEntry {
  date: string;
  invoice_number: string;
  party_name: string;
  vat_number: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
}

export interface VatRegisterResult {
  period: { dateFrom: string | null; dateTo: string | null };
  outputVat: { total: number; entries: VatEntry[] };
  inputVat: { total: number; entries: VatEntry[] };
  netPayable: number;
}

export class GetVatRegisterMediator {
  static async getVatRegister(params: VatRegisterParams): Promise<VatRegisterResult> {
    const action = 'Get VAT Register';
    const { dateFrom, dateTo } = params;

    try {
      MyLogger.info(action, { params });

      const dateFilterSales: string[] = [];
      const dateFilterPurch: string[] = [];
      const argsSales: unknown[] = [];
      const argsPurch: unknown[] = [];

      if (dateFrom) {
        argsSales.push(dateFrom);
        dateFilterSales.push(`si.invoice_date >= $${argsSales.length}`);
        argsPurch.push(dateFrom);
        dateFilterPurch.push(`i.invoice_date >= $${argsPurch.length}`);
      }
      if (dateTo) {
        argsSales.push(dateTo);
        dateFilterSales.push(`si.invoice_date <= $${argsSales.length}`);
        argsPurch.push(dateTo);
        dateFilterPurch.push(`i.invoice_date <= $${argsPurch.length}`);
      }

      const salesWhere = dateFilterSales.length
        ? `WHERE si.tax_amount > 0 AND ${dateFilterSales.join(' AND ')}`
        : `WHERE si.tax_amount > 0`;
      const purchWhere = dateFilterPurch.length
        ? `WHERE i.vat_amount > 0 AND ${dateFilterPurch.join(' AND ')}`
        : `WHERE i.vat_amount > 0`;

      const salesRes = await pool.query<{
        invoice_date: Date;
        invoice_number: string;
        party_name: string;
        vat_number: string | null;
        subtotal: string;
        tax_rate: string;
        tax_amount: string;
      }>(
        `SELECT si.invoice_date,
                si.invoice_number,
                fc.name AS party_name,
                fc.vat_number,
                si.subtotal,
                si.tax_rate,
                si.tax_amount
           FROM factory_sales_invoices si
           JOIN factory_customers fc ON fc.id = si.factory_customer_id
           ${salesWhere}
          ORDER BY si.invoice_date ASC, si.id ASC`,
        argsSales,
      );

      const purchRes = await pool.query<{
        invoice_date: Date;
        invoice_number: string;
        party_name: string;
        vat_number: string | null;
        subtotal: string;
        vat_rate: string;
        vat_amount: string;
      }>(
        `SELECT i.invoice_date,
                i.invoice_number,
                s.name AS party_name,
                s.vat_id AS vat_number,
                i.subtotal,
                i.vat_rate,
                i.vat_amount
           FROM public.invoices i
           JOIN public.suppliers s ON s.id = i.supplier_id
           ${purchWhere}
          ORDER BY i.invoice_date ASC, i.id ASC`,
        argsPurch,
      );

      const outputEntries: VatEntry[] = salesRes.rows.map(r => ({
        date: r.invoice_date.toISOString().split('T')[0],
        invoice_number: r.invoice_number,
        party_name: r.party_name,
        vat_number: r.vat_number,
        subtotal: parseFloat(r.subtotal ?? '0'),
        vat_rate: parseFloat(r.tax_rate ?? '0'),
        vat_amount: parseFloat(r.tax_amount ?? '0'),
      }));

      const inputEntries: VatEntry[] = purchRes.rows.map(r => ({
        date: r.invoice_date.toISOString().split('T')[0],
        invoice_number: r.invoice_number,
        party_name: r.party_name,
        vat_number: r.vat_number,
        subtotal: parseFloat(r.subtotal ?? '0'),
        vat_rate: parseFloat(r.vat_rate ?? '0'),
        vat_amount: parseFloat(r.vat_amount ?? '0'),
      }));

      const outputTotal = +outputEntries.reduce((s, e) => s + e.vat_amount, 0).toFixed(2);
      const inputTotal = +inputEntries.reduce((s, e) => s + e.vat_amount, 0).toFixed(2);
      const netPayable = +(outputTotal - inputTotal).toFixed(2);

      return {
        period: { dateFrom: dateFrom ?? null, dateTo: dateTo ?? null },
        outputVat: { total: outputTotal, entries: outputEntries },
        inputVat: { total: inputTotal, entries: inputEntries },
        netPayable,
      };
    } catch (error) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }
}
