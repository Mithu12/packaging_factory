import { makeRequest } from '@/services/api-utils';

export interface MonthlyBill {
  id: number;
  bill_number: string;
  customer_id: number;
  customer_name: string;
  customer_vat_number: string | null;
  customer_address: string | null;
  from_date: string;
  to_date: string;
  vat_filter: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_qty: number;
  paid_amount: number;
  outstanding_amount: number;
  line_count: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyBillLineItem {
  id: number;
  monthly_bill_id: number;
  delivery_id: number;
  delivery_number: string | null;
  delivery_date: string | null;
  invoice_id: number | null;
  invoice_number: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_qty: number;
}

export interface MonthlyBillWithLines extends MonthlyBill {
  line_items: MonthlyBillLineItem[];
}

export interface MonthlyBillQueryParams {
  limit?: number;
  offset?: number;
  customer_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface CreateMonthlyBillRequest {
  customer_id: number;
  from_date: string;
  to_date: string;
  vat_filter?: 'with' | 'without' | null;
}

export class MonthlyBillsApiService {
  static async saveMonthlyBill(payload: CreateMonthlyBillRequest): Promise<MonthlyBillWithLines> {
    return makeRequest<MonthlyBillWithLines>(
      `/factory/customer-orders/customers/${payload.customer_id}/monthly-bill/save`,
      {
        method: 'POST',
        body: JSON.stringify({
          from_date: payload.from_date,
          to_date: payload.to_date,
          vat_filter: payload.vat_filter ?? null,
        }),
      }
    );
  }

  static async getMonthlyBills(params?: MonthlyBillQueryParams): Promise<MonthlyBill[]> {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
    return makeRequest<MonthlyBill[]>(`/factory/monthly-bills${qs}`);
  }

  static async getMonthlyBill(id: number): Promise<MonthlyBillWithLines> {
    return makeRequest<MonthlyBillWithLines>(`/factory/monthly-bills/${id}`);
  }

  static async deleteMonthlyBill(id: number): Promise<void> {
    await makeRequest<void>(`/factory/monthly-bills/${id}`, { method: 'DELETE' });
  }

  static async downloadMonthlyBillPdf(id: number): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
    const response = await fetch(
      `${baseUrl}/factory/monthly-bills/${id}/pdf`,
      { method: 'GET', credentials: 'include' }
    );
    if (!response.ok) {
      let message = `Failed to download bill (${response.status})`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch { /* non-JSON */ }
      throw new Error(message);
    }

    let filename = `bill-${id}.pdf`;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
}
