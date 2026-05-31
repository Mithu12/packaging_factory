import { apiClient } from "@/services/apiClient";
import { format } from "date-fns";

export interface SupplierDueRow {
  id: number;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  invoice_outstanding: number;
  total_due: number;
  invoice_count: number;
  overdue_count: number;
}

export interface SupplierDueTotals {
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  invoice_outstanding: number;
  total_due: number;
  supplier_count: number;
  suppliers_with_dues: number;
}

export interface SupplierDueReport {
  suppliers: SupplierDueRow[];
  totals: SupplierDueTotals;
}

export interface SupplierDueReportParams {
  supplier_id?: number;
  asOfDate?: Date;
  onlyWithDues?: boolean;
}

export const SupplierDueReportsApi = {
  async getSupplierDueReport(params: SupplierDueReportParams = {}): Promise<SupplierDueReport> {
    const response = await apiClient.get("/inventory/reports/supplier-due", {
      params: {
        supplier_id: params.supplier_id,
        as_of_date: params.asOfDate ? format(params.asOfDate, "yyyy-MM-dd") : undefined,
        only_with_dues: params.onlyWithDues ? "true" : undefined,
      },
    });
    return response.data.data;
  },
};
