// Factory Sales Invoice Types

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_order_id: string;
  customer_order_number?: string;
  factory_customer_id: string;
  factory_customer_name?: string;
  factory_id?: string;
  factory_name?: string;
  
  // Invoice details
  invoice_date: string;
  due_date: string;
  
  // Amounts
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  shipping_cost?: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  
  // Status
  status: SalesInvoiceStatus;
  payment_terms?: string;
  
  // Additional info
  notes?: string;
  billing_address?: any;
  shipping_address?: any;
  
  // Accounting integration
  voucher_id?: number;
  voucher_no?: string;
  
  // Audit fields
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

export enum SalesInvoiceStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export interface CreateSalesInvoiceRequest {
  customer_order_id: string;
  invoice_date?: string; // Defaults to today
  due_date?: string; // Will be calculated from payment terms if not provided
  payment_terms?: string;
  notes?: string;
  // Amounts will be calculated from order
}

export interface UpdateSalesInvoiceRequest {
  due_date?: string;
  payment_terms?: string;
  notes?: string;
  status?: SalesInvoiceStatus;
}

export interface RecordPaymentRequest {
  invoice_id: string;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface SalesInvoiceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SalesInvoiceStatus;
  factory_customer_id?: string;
  factory_id?: string;
  date_from?: string;
  date_to?: string;
  overdue_only?: boolean;
  sort_by?: 'invoice_date' | 'due_date' | 'total_amount' | 'outstanding_amount';
  sort_order?: 'asc' | 'desc';
}

export interface SalesInvoiceStats {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  unpaid_count: number;
  partial_count: number;
  paid_count: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  voucher_id?: number;
  created_by: string;
  created_at: string;
}

