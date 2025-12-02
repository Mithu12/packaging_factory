import { makeRequest } from '@/services/api-utils';
import { MaterialCostAnalysis, CostVariance, CostTrend, CostCenter } from '../types/bom';

export interface CostAnalysisQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  work_order_id?: string;
  product_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'work_order_number' | 'product_name' | 'total_cost' | 'cost_per_unit' | 'cost_variance';
  sort_order?: 'asc' | 'desc';
}

export interface CostVarianceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "favorable" | "unfavorable" | "on_target";
  min_variance?: number;
  max_variance?: number;
  start_date?: string;
  end_date?: string;
  sort_by?: 'work_order_number' | 'product_name' | 'variance' | 'variance_percentage';
  sort_order?: 'asc' | 'desc';
}

export interface CostTrendQueryParams {
  period_type?: 'month' | 'quarter' | 'year';
  start_date?: string;
  end_date?: string;
}

export interface CostCenterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: 'name' | 'total_cost' | 'efficiency' | 'variance';
  sort_order?: 'asc' | 'desc';
}

export class CostAnalysisApi {
  private static BASE_URL = '/factory/cost-analysis';

  // Get material cost analyses
  static async getMaterialCostAnalyses(params?: CostAnalysisQueryParams): Promise<{
    analyses: MaterialCostAnalysis[];
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
        ? `${this.BASE_URL}/material-analyses?${queryParams.toString()}`
        : `${this.BASE_URL}/material-analyses`;

      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching material cost analyses:', error);
      throw error;
    }
  }

  // Get cost variances
  static async getCostVariances(params?: CostVarianceQueryParams): Promise<{
    variances: CostVariance[];
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
        ? `${this.BASE_URL}/variances?${queryParams.toString()}`
        : `${this.BASE_URL}/variances`;

      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching cost variances:', error);
      throw error;
    }
  }

  // Get cost trends
  static async getCostTrends(params?: CostTrendQueryParams): Promise<CostTrend[]> {
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
        ? `${this.BASE_URL}/trends?${queryParams.toString()}`
        : `${this.BASE_URL}/trends`;

      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching cost trends:', error);
      throw error;
    }
  }

  // Get cost centers
  static async getCostCenters(params?: CostCenterQueryParams): Promise<{
    cost_centers: CostCenter[];
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
        ? `${this.BASE_URL}/cost-centers?${queryParams.toString()}`
        : `${this.BASE_URL}/cost-centers`;

      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      throw error;
    }
  }
}

export default CostAnalysisApi;
