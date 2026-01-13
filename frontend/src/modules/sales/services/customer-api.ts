import { makeRequest } from '@/services/api-utils';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerQueryParams,
  CustomerStats
} from '@/services/types';

export class CustomerApi {
  static async getCustomers(params?: CustomerQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<{
      customers: Customer[];
      total: number;
      page: number;
      limit: number;
    }>(`/customers${queryString ? `?${queryString}` : ''}`);
  }

  static async getCustomer(id: number) {
    return makeRequest<Customer>(`/customers/${id}`);
  }

  static async createCustomer(data: CreateCustomerRequest) {
    return makeRequest<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCustomer(id: number, data: UpdateCustomerRequest) {
    return makeRequest<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async toggleCustomerStatus(id: number) {
    return makeRequest<Customer>(`/customers/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static async updateCustomerLoyaltyPoints(id: number, points: number) {
    return makeRequest<Customer>(`/customers/${id}/loyalty-points`, {
      method: 'PATCH',
      body: JSON.stringify({ points }),
    });
  }

  static async deleteCustomer(id: number) {
    return makeRequest<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  static async hardDeleteCustomer(id: number) {
    return makeRequest<{ message: string }>(`/customers/${id}/hard`, {
      method: 'DELETE',
    });
  }

  static async getCustomerStats() {
    return makeRequest<CustomerStats>('/customers/stats');
  }

  static async searchCustomers(query: string, limit = 10) {
    return makeRequest<Customer[]>(`/customers/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  static async getCustomersByType(customerType: string) {
    return makeRequest<Customer[]>(`/customers/type/${customerType}`);
  }

  static async checkCustomerReferences(id: number) {
    return makeRequest<{
      hasReferences: boolean;
      references: {
        sales_orders: number;
      };
    }>(`/customers/${id}/references`);
  }

  static async collectDuePayment(id: number, amount: number, paymentMethod: string) {
    return makeRequest<Customer>(`/customers/${id}/collect-payment`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, payment_method: paymentMethod }),
    });
  }

  static async getCustomerPaymentHistory(id: number) {
    return makeRequest<CustomerPaymentHistoryResponse>(`/sales/customers/${id}/payment-history`);
  }
}

export interface CustomerPaymentHistoryResponse {
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    due_amount: number;
  };
  summary: {
    total_orders: number;
    total_order_value: number;
    total_upfront_payments: number;
    total_due_payments_collected: number;
    total_due_amounts: number;
    current_outstanding: number;
    total_paid: number;
    total_refunds: number;
    last_order_date: string | null;
    last_payment_date: string | null;
  };
  payments: Array<{
    id: number;
    payment_type: 'upfront' | 'due_payment' | 'refund' | 'adjustment';
    payment_amount: number;
    payment_date: string;
    payment_method: string;
    payment_reference: string | null;
    notes: string | null;
    sales_order_id: number | null;
    order_number: string | null;
    recorded_by_username: string | null;
    recorded_at: string;
  }>;
  orders: Array<{
    id: number;
    order_number: string;
    order_date: string;
    total_amount: number;
    cash_received: number;
    due_amount: number;
    payment_method: string | null;
    payment_status: string;
    status: string;
    payment_type: 'full_cash' | 'partial' | 'credit' | 'full_card' | 'full_bank_transfer';
  }>;
}
