import { apiClient } from "@/services/apiClient";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Payment, Invoice, PaymentStats } from "@/services/types";

export interface SupplierPaymentReportParams {
  dateRange?: DateRange;
  supplier_id?: number;
  status?: string;
  payment_method?: string;
  limit?: number;
  page?: number;
}

function buildParams(params: SupplierPaymentReportParams) {
  return {
    start_date: params.dateRange?.from ? format(params.dateRange.from, "yyyy-MM-dd") : undefined,
    end_date: params.dateRange?.to ? format(params.dateRange.to, "yyyy-MM-dd") : undefined,
    supplier_id: params.supplier_id,
    status: params.status,
    payment_method: params.payment_method,
    limit: params.limit,
    page: params.page,
  };
}

export interface SupplierPaymentsSummary {
  total_payments: number;
  total_amount: number;
  pending_amount: number;
  completed_amount: number;
  payment_methods: Array<{ method: string; count: number; total: number }>;
  top_suppliers: Array<{ supplier_id: number; supplier_name: string; total_paid: number; payment_count: number }>;
}

export const SupplierPaymentsReportsApi = {
  async getPaymentStats(params: SupplierPaymentReportParams): Promise<PaymentStats> {
    const response = await apiClient.get("/payments/stats", {
      params: buildParams(params),
    });
    return response.data.data;
  },

  async getPaymentsList(params: SupplierPaymentReportParams): Promise<{ payments: Payment[]; total: number }> {
    const response = await apiClient.get("/payments", {
      params: buildParams({ ...params, limit: params.limit || 100 }),
    });
    return response.data.data;
  },

  async getInvoicesList(params: SupplierPaymentReportParams): Promise<{ invoices: Invoice[]; total: number }> {
    const response = await apiClient.get("/payments/invoices", {
      params: buildParams({ ...params, limit: params.limit || 100 }),
    });
    return response.data.data;
  },
};
