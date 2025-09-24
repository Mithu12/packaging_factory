import { makeRequest } from '@/services/api-utils';
import {
  SalesOrder,
  SalesOrderWithDetails,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
  SalesOrderQueryParams,
  POSStats
} from '@/services/types';

export class SalesOrderApi {
  static async getSalesOrders(params?: SalesOrderQueryParams) {
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
      sales_orders: SalesOrder[];
      total: number;
      page: number;
      limit: number;
    }>(`/sales-orders${queryString ? `?${queryString}` : ''}`);
  }

  static async getSalesOrder(id: number) {
    return makeRequest<SalesOrderWithDetails>(`/sales-orders/${id}`);
  }

  static async createSalesOrder(data: CreateSalesOrderRequest) {
    return makeRequest<SalesOrder>('/sales-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateSalesOrder(id: number, data: UpdateSalesOrderRequest) {
    return makeRequest<SalesOrder>(`/sales-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async getPOSStats() {
    return makeRequest<POSStats>('/sales-orders/stats');
  }

  static async searchSalesOrders(query: string, limit = 10) {
    return makeRequest<SalesOrder[]>(`/sales-orders/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
}
