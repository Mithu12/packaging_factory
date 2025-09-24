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
}
