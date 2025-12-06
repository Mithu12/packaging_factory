import { makeRequest } from '@/services/api-utils';
import {
  Invoice,
  Payment,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  InvoiceQueryParams,
  PaymentQueryParams,
  PaymentStats,
  InvoiceWithDetails,
  PaymentWithDetails
} from '@/services/types';

export class PaymentApi {
  private static baseUrl = '/payments';

  // ==================== INVOICE METHODS ====================

  // Get invoices with filtering and pagination
  static async getInvoices(params?: InvoiceQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<Invoice[]>(`${this.baseUrl}/invoices${queryString ? `?${queryString}` : ''}`);
  }

  // Get invoice statistics
  static async getInvoiceStats() {
    return makeRequest<PaymentStats>(`${this.baseUrl}/invoices/stats`);
  }

  // Get specific invoice by ID
  static async getInvoice(id: number) {
    return makeRequest<InvoiceWithDetails>(`${this.baseUrl}/invoices/${id}`);
  }

  // Create new invoice
  static async createInvoice(data: CreateInvoiceRequest) {
    return makeRequest<Invoice>(`${this.baseUrl}/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update invoice
  static async updateInvoice(id: number, data: UpdateInvoiceRequest) {
    return makeRequest<Invoice>(`${this.baseUrl}/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete invoice
  static async deleteInvoice(id: number) {
    return makeRequest<{ message: string }>(`${this.baseUrl}/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== PAYMENT METHODS ====================

  // Get payments with filtering and pagination
  static async getPayments(params?: PaymentQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<Payment[]>(`${this.baseUrl}${queryString ? `?${queryString}` : ''}`);
  }

  // Get payment statistics
  static async getPaymentStats() {
    return makeRequest<PaymentStats>(`${this.baseUrl}/stats`);
  }

  // Get specific payment by ID
  static async getPayment(id: number) {
    return makeRequest<PaymentWithDetails>(`${this.baseUrl}/${id}`);
  }

  // Create new payment
  static async createPayment(data: CreatePaymentRequest) {
    return makeRequest<Payment>(`${this.baseUrl}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update payment
  static async updatePayment(id: number, data: UpdatePaymentRequest) {
    return makeRequest<Payment>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete payment
  static async deletePayment(id: number) {
    return makeRequest<{ message: string }>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== UTILITY METHODS ====================

  // Get payments for a specific supplier
  static async getSupplierPayments(supplierId: number, params?: PaymentQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    queryParams.append('supplier_id', supplierId.toString());
    const queryString = queryParams.toString();
    return makeRequest<Payment[]>(`${this.baseUrl}?${queryString}`);
  }

  // Get invoices for a specific supplier
  static async getSupplierInvoices(supplierId: number, params?: InvoiceQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    queryParams.append('supplier_id', supplierId.toString());
    const queryString = queryParams.toString();
    return makeRequest<Invoice[]>(`${this.baseUrl}/invoices?${queryString}`);
  }

  // Get payments for a specific invoice
  static async getInvoicePayments(invoiceId: number, params?: PaymentQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    queryParams.append('invoice_id', invoiceId.toString());
    const queryString = queryParams.toString();
    return makeRequest<Payment[]>(`${this.baseUrl}?${queryString}`);
  }

  // Submit payment for approval
  static async submitPaymentForApproval(paymentId: number, notes?: string) {
    return makeRequest<{ message: string }>(`${this.baseUrl}/${paymentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes || '' }),
    });
  }

  // Approve or reject payment
  static async approvePayment(paymentId: number, data: { action: 'approve' | 'reject', notes?: string }) {
    return makeRequest<{ message: string }>(`${this.baseUrl}/${paymentId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
