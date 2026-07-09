import { apiClient } from "@/services/apiClient";

export interface CostingSummary {
  total_boms: number;
  products_with_bom: number;
  total_bom_cost: number;
  avg_bom_cost: number;
  max_bom_cost: number;
  min_bom_cost: number;
  unique_materials: number;
  total_material_cost: number;
  top_cost_products: Array<{
    product_name: string;
    sku: string;
    total_cost: number;
    version: string;
    component_count: number;
  }>;
}

export interface BomDetail {
  bom_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  cost_price: number;
  selling_price: number;
  version: string;
  effective_date: string;
  total_cost: number;
  bom_notes: string | null;
  margin: number;
}

export interface MaterialCost {
  material_id: number;
  material_name: string;
  sku: string;
  cost_price: number;
  unit_of_measure: string;
  supplier_name: string | null;
  used_in_boms: number;
  total_required: number;
  total_cost_in_boms: number;
  avg_unit_cost: number;
}

export const CostingReportApi = {
  async getSummary(): Promise<CostingSummary> {
    const response = await apiClient.get("/factory/costing-reports/summary");
    return response.data.data;
  },

  async getBomDetails(productId?: number): Promise<BomDetail[]> {
    const response = await apiClient.get("/factory/costing-reports/bom-details", {
      params: productId ? { product_id: productId } : {},
    });
    return response.data.data;
  },

  async getMaterialCosts(): Promise<MaterialCost[]> {
    const response = await apiClient.get("/factory/costing-reports/material-costs");
    return response.data.data;
  },
};
