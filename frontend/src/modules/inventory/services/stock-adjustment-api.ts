import { makeRequest } from '@/services/api-utils';
import {
  StockAdjustment,
  StockAdjustmentQueryParams,
  StockAdjustmentStats
} from '@/services/types';

export class StockAdjustmentApi {
  static async getStockAdjustments(params?: StockAdjustmentQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<StockAdjustment[]>(`/stock-adjustments${queryString ? `?${queryString}` : ''}`);
  }

  static async getStockAdjustmentStats(productId?: number) {
    const queryParams = new URLSearchParams();
    if (productId) {
      queryParams.append('product_id', productId.toString());
    }
    const queryString = queryParams.toString();
    return makeRequest<StockAdjustmentStats>(`/stock-adjustments/stats${queryString ? `?${queryString}` : ''}`);
  }

  static async getStockAdjustment(id: number) {
    return makeRequest<StockAdjustment>(`/stock-adjustments/${id}`);
  }
}
