import { apiClient } from "@/services/apiClient";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

export interface SalesSummary {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  unique_customers: number;
  paid_orders: number;
  completed_orders: number;
  payment_rate: number;
  completion_rate: number;
}

export interface CustomerPerformance {
  id: number;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  last_order_date: string;
}

export interface PaymentMethod {
  method: string;
  order_count: number;
  total_amount: number;
}

export interface PaymentAnalysis {
  payment_methods: PaymentMethod[];
  outstanding_payments: {
    total_outstanding: number;
    outstanding_orders: number;
  };
}

export interface StatusDistribution {
  status: string;
  order_count: number;
  total_amount: number;
}

export interface OrderFulfillment {
  status_distribution: StatusDistribution[];
  fulfillment_metrics: {
    avg_fulfillment_days: number;
    total_orders: number;
    completed_orders: number;
    fulfillment_rate: number;
  };
}

export interface DailySalesItem {
  date: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
}

export interface ProductSalesItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity_sold: number;
  total_revenue: number;
  avg_price: number;
}

export interface ReturnsAnalysis {
  summary: {
    total_returns: number;
    total_refund_amount: number;
    avg_refund_amount: number;
    return_rate: number;
  };
  reasons_distribution: Array<{
    reason: string;
    return_count: number;
    total_amount: number;
  }>;
}

interface ReportParams {
  dateRange?: DateRange;
  distributionCenterId?: number;
  limit?: number;
}

function buildParams(params: ReportParams) {
  return {
    start_date: params.dateRange?.from ? format(params.dateRange.from, "yyyy-MM-dd") : undefined,
    end_date: params.dateRange?.to ? format(params.dateRange.to, "yyyy-MM-dd") : undefined,
    distribution_center_id: params.distributionCenterId,
    limit: params.limit,
  };
}

export const SalesReportsApi = {
  async getSalesSummary(params: ReportParams): Promise<SalesSummary> {
    const response = await apiClient.get("/sales/reports/sales-summary", {
      params: buildParams(params),
    });
    return response.data.data;
  },

  async getCustomerPerformance(params: ReportParams & { limit?: number }): Promise<CustomerPerformance[]> {
    const response = await apiClient.get("/sales/reports/customer-performance", {
      params: buildParams({ ...params, limit: params.limit || 20 }),
    });
    return response.data.data;
  },

  async getPaymentAnalysis(params: ReportParams): Promise<PaymentAnalysis> {
    const response = await apiClient.get("/sales/reports/payment-analysis", {
      params: buildParams(params),
    });
    return response.data.data;
  },

  async getOrderFulfillment(params: ReportParams): Promise<OrderFulfillment> {
    const response = await apiClient.get("/sales/reports/order-fulfillment", {
      params: buildParams(params),
    });
    return response.data.data;
  },

  async getReturnsAnalysis(params: ReportParams): Promise<ReturnsAnalysis> {
    const response = await apiClient.get("/sales/reports/returns-analysis", {
      params: buildParams(params),
    });
    return response.data.data;
  },

  async exportReport(reportType: string, params: ReportParams, format: "pdf" | "excel" = "pdf"): Promise<Blob> {
    const response = await apiClient.post(
      "/sales/reports/export",
      {
        report_type: reportType,
        ...buildParams(params),
        format,
      },
      { responseType: "blob" }
    );
    return response.data;
  },
};
