export type MonthlyBillVatFilter = 'with' | 'without' | null;

export interface MonthlyBill {
  id: number;
  bill_number: string;
  customer_id: number;
  customer_name: string;
  customer_vat_number: string | null;
  customer_address: string | null;
  from_date: string;
  to_date: string;
  vat_filter: MonthlyBillVatFilter;
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

export interface CreateMonthlyBillRequest {
  customer_id: number;
  from_date: string;
  to_date: string;
  vat_filter?: MonthlyBillVatFilter;
}

export interface MonthlyBillQueryParams {
  limit?: number;
  offset?: number;
  customer_id?: number;
  start_date?: string;
  end_date?: string;
}
