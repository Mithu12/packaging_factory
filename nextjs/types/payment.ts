export interface Invoice {
  id: number;
  invoice_number: string;
  purchase_order_id?: number;
  supplier_id: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier_name?: string;
  supplier_code?: string;
  po_number?: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id?: number;
  supplier_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  notes?: string;
  created_by?: string;
  // New approval fields
  submitted_at?: string;
  submitted_by?: number;
  approved_at?: string;
  approved_by?: number;
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approval_notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier_name?: string;
  supplier_code?: string;
  invoice_number?: string;
}

export interface PaymentHistory {
  id: number;
  payment_id?: number;
  invoice_id?: number;
  event: string;
  description?: string;
  old_value?: string;
  new_value?: string;
  user_name?: string;
  created_at: string;
  payment_number?: string;
}

export interface CreateInvoiceRequest {
  purchase_order_id?: number;
  supplier_id: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  terms?: string;
  notes?: string;
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
}

export interface CreatePaymentRequest {
  invoice_id?: number;
  supplier_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdatePaymentRequest extends Partial<CreatePaymentRequest> {
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  purchase_order_id?: number;
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  start_date?: string;
  end_date?: string;
  due_date_from?: string;
  due_date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  invoice_id?: number;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  start_date?: string;
  end_date?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentStats {
  total_invoices: number;
  pending_invoices: number;
  partial_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_outstanding_amount: number;
  total_paid_amount: number;
  overdue_amount: number;
  recent_payments_count: number;
    recent_movements_count: number;
  monthly_payment_trend: {
    month: string;
    total_payments: number;
    total_amount: number;
  }[];
    monthly_movement_trend: {
      month: number,
      receipts: number,
      issues: number, // Not applicable for payments
      adjustments: number // Not applicable for payments
  }[];
}

export interface InvoiceWithDetails extends Invoice {
  supplier: {
    id: number;
    name: string;
    supplier_code: string;
  };
  purchase_order?: {
    id: number;
    po_number: string;
  };
  payments?: Payment[];
  payment_history?: PaymentHistory[];
}

export interface PaymentWithDetails extends Payment {
  supplier: {
    id: number;
    name: string;
    supplier_code: string;
  };
  invoice?: {
    id: number;
    invoice_number: string;
  };
}

// Approval workflow interfaces for payments
export interface SubmitPaymentRequest {
  notes?: string;
}

export interface ApprovePaymentRequest {
  action: 'approve' | 'reject';
  notes?: string;
}
