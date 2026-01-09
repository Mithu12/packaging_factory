import { apiClient } from "@/services/apiClient";

export interface PurchaseSummary {
  total_orders: number;
  total_value: number;
  avg_order_value: number;
  unique_suppliers: number;
  received_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  received_rate: number;
}

export interface SupplierPerformance {
  id: number;
  supplier_code: string;
  name: string;
  contact_person: string;
  phone: string;
  total_orders: number;
  total_purchase_value: number;
  avg_purchase_value: number;
  last_purchase_date: string;
}

export interface PurchasePayments {
  status_distribution: {
    status: string;
    count: number;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
  }[];
  totals: {
    total_invoices: number;
    total_amount: number;
    total_paid: number;
    total_outstanding: number;
  };
}

export interface ReportParams {
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export const PurchaseReportsApi = {
  getPurchaseSummary: async (params: ReportParams): Promise<PurchaseSummary> => {
    const response = await apiClient.get("/inventory/reports/purchase-summary", { params });
    return response.data.data;
  },

  getSupplierPerformance: async (params: ReportParams): Promise<SupplierPerformance[]> => {
    const response = await apiClient.get("/inventory/reports/supplier-performance", { params });
    return response.data.data;
  },

  getPurchasePayments: async (params: ReportParams): Promise<PurchasePayments> => {
    const response = await apiClient.get("/inventory/reports/purchase-payments", { params });
    return response.data.data;
  },
};
