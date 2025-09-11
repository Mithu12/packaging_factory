import { makeRequest } from './api-utils';
import {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierQueryParams,
  SupplierStats
} from './types';

export class SupplierApi {
  static async getSuppliers(params?: SupplierQueryParams) {
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
      suppliers: Supplier[];
      total: number;
      page: number;
      limit: number;
    }>(`/suppliers${queryString ? `?${queryString}` : ''}`);
  }

  static async getSupplier(id: number) {
    return makeRequest<Supplier>(`/suppliers/${id}`);
  }

  static async createSupplier(data: CreateSupplierRequest) {
    return makeRequest<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateSupplier(id: number, data: UpdateSupplierRequest) {
    return makeRequest<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async toggleSupplierStatus(id: number) {
    return makeRequest<Supplier>(`/suppliers/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static async deleteSupplier(id: number) {
    return makeRequest<{ message: string }>(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  static async getSupplierStats() {
    return makeRequest<SupplierStats>('/suppliers/stats');
  }

  static async getSupplierCategories() {
    return makeRequest<{ categories: string[] }>('/suppliers/categories');
  }

  static async searchSuppliers(query: string, limit = 10) {
    return makeRequest<Supplier[]>(`/suppliers/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
}
