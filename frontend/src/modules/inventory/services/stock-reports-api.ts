import { apiClient } from "@/services/apiClient";

export interface StockSummary {
  total_products: number;
  out_of_stock: number;
  low_stock: number;
  total_stock_value: number;
  total_stock_qty: number;
  avg_stock_per_product: number;
  dc_count: number;
  categories: StockCategorySummary[];
}

export interface StockCategorySummary {
  category_name: string;
  product_count: number;
  total_stock: number;
  total_value: number;
}

export interface StockOverviewRow {
  id: number;
  product_code: string;
  sku: string;
  name: string;
  category_name: string;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  reorder_point: number;
  min_stock_level: number;
  max_stock_level: number;
  stock_qty: number;
  reserved_qty: number;
  available_qty: number;
  stock_value: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export interface StockByCategoryRow {
  category_name: string;
  product_count: number;
  total_stock: number;
  total_value: number;
  potential_revenue: number;
  out_of_stock_count: number;
  low_stock_count: number;
}

export interface LowStockRow {
  id: number;
  product_code: string;
  sku: string;
  name: string;
  category_name: string;
  unit_of_measure: string;
  cost_price: number;
  total_stock: number;
  reorder_point: number;
  min_stock_level: number;
  max_stock_level: number;
  stock_percentage: number;
  supplier_name: string | null;
  supplier_phone: string | null;
  shortage: number;
}

export interface StockReportParams {
  category_id?: number;
  distribution_center_id?: number;
  search?: string;
  only_in_stock?: boolean;
  low_stock_only?: boolean;
}

export const StockReportsApi = {
  async getSummary(): Promise<StockSummary> {
    const response = await apiClient.get("/inventory/reports/stock-summary");
    return response.data.data;
  },

  async getOverview(params: StockReportParams = {}): Promise<StockOverviewRow[]> {
    const response = await apiClient.get("/inventory/reports/stock-overview", { params });
    return response.data.data;
  },

  async getByCategory(): Promise<StockByCategoryRow[]> {
    const response = await apiClient.get("/inventory/reports/stock-by-category");
    return response.data.data;
  },

  async getLowStock(): Promise<LowStockRow[]> {
    const response = await apiClient.get("/inventory/reports/low-stock");
    return response.data.data;
  },
};
