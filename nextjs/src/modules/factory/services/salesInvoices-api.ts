import { makeRequest } from '@/services/api-utils';

export interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer_order_id: number;
  factory_id: number;
  factory_customer_id: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  tax_amount: number;
  sub_total: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  payment_terms?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Populated from joins
  customer_order_number?: string;
  factory_name?: string;
  factory_customer_name?: string;
  created_by_name?: string;
}

export interface CreateSalesInvoiceRequest {
  customer_order_id: string;
  invoice_date?: string;
  due_date?: string;
  payment_terms?: string;
  notes?: string;
}

export interface UpdateSalesInvoiceRequest {
  due_date?: string;
  payment_terms?: string;
  notes?: string;
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
}

export interface RecordPaymentRequest {
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

export interface SalesInvoiceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customer_order_id?: number;
  factory_id?: number;
  factory_customer_id?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: 'invoice_date' | 'due_date' | 'total_amount' | 'invoice_number';
  sort_order?: 'asc' | 'desc';
}

export interface SalesInvoiceStats {
  total_invoices: number;
  total_amount: number;
  total_outstanding: number;
  total_paid: number;
  overdue_count: number;
  overdue_amount: number;
}

export class SalesInvoicesApi {
  private static readonly BASE_URL = '/factory/sales-invoices';

  /**
   * Get all sales invoices with pagination and filtering
   */
  static async getSalesInvoices(params?: SalesInvoiceQueryParams): Promise<{
    invoices: SalesInvoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return makeRequest<{
      invoices: SalesInvoice[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.BASE_URL}${queryString}`);
  }

  /**
   * Get sales invoice by ID
   */
  static async getSalesInvoiceById(id: number): Promise<SalesInvoice> {
    return makeRequest<SalesInvoice>(`${this.BASE_URL}/${id}`);
  }

  /**
   * Create sales invoice from customer order
   */
  static async createSalesInvoice(data: CreateSalesInvoiceRequest): Promise<SalesInvoice> {
    return makeRequest<SalesInvoice>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update sales invoice
   */
  static async updateSalesInvoice(id: number, data: UpdateSalesInvoiceRequest): Promise<SalesInvoice> {
    return makeRequest<SalesInvoice>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Record payment against invoice
   */
  static async recordPayment(id: number, data: RecordPaymentRequest): Promise<SalesInvoice> {
    return makeRequest<SalesInvoice>(`${this.BASE_URL}/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Cancel sales invoice
   */
  static async cancelSalesInvoice(id: number, reason?: string): Promise<SalesInvoice> {
    return makeRequest<SalesInvoice>(`${this.BASE_URL}/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Get sales invoice statistics
   */
  static async getSalesInvoiceStats(params?: { factory_id?: number; date_from?: string; date_to?: string }): Promise<SalesInvoiceStats> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return makeRequest<SalesInvoiceStats>(`${this.BASE_URL}/stats${queryString}`);
  }

  /**
   * Download invoice as PDF
   */
  static async downloadInvoicePDF(id: number, invoiceNumber: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${this.BASE_URL}/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Invoice_${invoiceNumber}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading PDF for invoice ${id}:`, error);
      throw error;
    }
  }
}

