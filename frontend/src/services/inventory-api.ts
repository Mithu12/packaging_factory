import { makeRequest } from './api-utils';
import {
  InventoryItem,
  InventoryStats,
  InventoryQueryParams,
  StockMovement,
  StockMovementQueryParams
} from './types';

export class InventoryApi {
  private static baseUrl = '/inventory';

  // Get inventory items with filtering and pagination
  static async getInventoryItems(params?: InventoryQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<InventoryItem[]>(`${this.baseUrl}${queryString ? `?${queryString}` : ''}`);
  }

  // Get inventory statistics for dashboard
  static async getInventoryStats() {
    return makeRequest<InventoryStats>(`${this.baseUrl}/stats`);
  }

  // Get stock movements with filtering
  static async getStockMovements(params?: StockMovementQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<StockMovement[]>(`${this.baseUrl}/movements${queryString ? `?${queryString}` : ''}`);
  }

  // Get specific inventory item by ID
  static async getInventoryItem(id: number) {
    return makeRequest<InventoryItem>(`${this.baseUrl}/${id}`);
  }
}
