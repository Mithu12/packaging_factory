import { makeRequest } from './api-utils';
import { ApiError } from './types';
import {
  PurchaseOrder,
  PurchaseOrderWithDetails,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  UpdatePurchaseOrderStatusRequest,
  PurchaseOrderQueryParams,
  PurchaseOrderStats,
  ReceiveGoodsRequest
} from './types';

export class PurchaseOrderApi {
  private static baseUrl = '/purchase-orders';

  // Get all purchase orders with pagination and filtering
  static async getPurchaseOrders(params?: PurchaseOrderQueryParams): Promise<{
    purchase_orders: PurchaseOrder[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = queryParams.toString() 
        ? `${this.baseUrl}?${queryParams.toString()}`
        : this.baseUrl;

      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  }

  // Get purchase order by ID with full details
  static async getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}`, { method: 'GET' });
    } catch (error) {
      console.error(`Error fetching purchase order ${id}:`, error);
      throw error;
    }
  }

  // Create new purchase order
  static async createPurchaseOrder(data: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
    try {
      return await makeRequest(this.baseUrl, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  }

  // Update purchase order
  static async updatePurchaseOrder(id: number, data: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error(`Error updating purchase order ${id}:`, error);
      throw error;
    }
  }

  // Update purchase order status
  static async updatePurchaseOrderStatus(id: number, data: UpdatePurchaseOrderStatusRequest): Promise<PurchaseOrder> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}/status`, { 
        method: 'PATCH', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error(`Error updating purchase order status ${id}:`, error);
      throw error;
    }
  }

  // Receive goods for purchase order
  static async receiveGoods(id: number, data: ReceiveGoodsRequest): Promise<PurchaseOrder> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}/receive`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error(`Error receiving goods for purchase order ${id}:`, error);
      throw error;
    }
  }

  // Delete purchase order
  static async deletePurchaseOrder(id: number): Promise<void> {
    try {
      await makeRequest(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error(`Error deleting purchase order ${id}:`, error);
      throw error;
    }
  }

  // Cancel purchase order
  static async cancelPurchaseOrder(id: number, reason?: string): Promise<void> {
    try {
      await makeRequest(`${this.baseUrl}/${id}/cancel`, { 
        method: 'PATCH', 
        body: JSON.stringify({ reason }) 
      });
    } catch (error) {
      console.error(`Error cancelling purchase order ${id}:`, error);
      throw error;
    }
  }

  // Get purchase order statistics
  static async getPurchaseOrderStats(): Promise<PurchaseOrderStats> {
    try {
      return await makeRequest(`${this.baseUrl}/stats`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching purchase order stats:', error);
      throw error;
    }
  }

  // Search purchase orders
  static async searchPurchaseOrders(query: string, limit: number = 10): Promise<PurchaseOrder[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString()
      });
      return await makeRequest(`${this.baseUrl}/search?${params.toString()}`, { method: 'GET' });
    } catch (error) {
      console.error('Error searching purchase orders:', error);
      throw error;
    }
  }
}
