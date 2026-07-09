import { apiClient } from "@/services/apiClient";

export interface ProductionSummary {
  total_work_orders: number;
  completed_orders: number;
  in_progress_orders: number;
  pending_orders: number;
  on_hold_orders: number;
  cancelled_orders: number;
  completion_rate: number;
  total_target_qty: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  total_runs: number;
  completed_runs: number;
  total_produced: number;
  total_good: number;
  total_rejected: number;
  rejection_rate: number;
  avg_efficiency: number;
  avg_quality: number;
}

export interface WorkOrderRow {
  id: number;
  work_order_number: string;
  product_name: string;
  product_sku: string;
  target_quantity: number;
  unit_of_measure: string;
  status: string;
  priority: string;
  progress: number;
  estimated_hours: number;
  actual_hours: number;
  production_line_name: string | null;
  deadline: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  produced_quantity: number;
  good_quantity: number;
  rejected_quantity: number;
  run_count: number;
}

export interface ProductionRunRow {
  id: number;
  run_number: string;
  status: string;
  target_quantity: number;
  produced_quantity: number;
  good_quantity: number;
  rejected_quantity: number;
  efficiency_percentage: number;
  quality_percentage: number;
  total_runtime_minutes: number;
  total_downtime_minutes: number;
  actual_start_time: string | null;
  actual_end_time: string | null;
  created_at: string;
  work_order_number: string;
  product_name: string;
  line_name: string | null;
}

export interface LineUtilizationRow {
  id: number;
  name: string;
  code: string;
  capacity: number;
  current_load: number;
  line_status: string;
  total_runs: number;
  completed_runs: number;
  total_produced: number;
  total_good: number;
  total_rejected: number;
  total_runtime_minutes: number;
  avg_efficiency: number;
  utilization_rate: number;
}

export interface WastageItem {
  material_name: string;
  wastage_reason: string;
  status: string;
  record_count: number;
  total_quantity: number;
  total_cost: number;
}

export interface WastageTotals {
  total_records: number;
  total_quantity: number;
  total_cost: number;
  approved_cost: number;
  pending_count: number;
}

export interface WastageReport {
  wastage: WastageItem[];
  totals: WastageTotals;
}

export interface ReportParams {
  start_date?: string;
  end_date?: string;
}

export const ProductionReportApi = {
  async getSummary(params: ReportParams): Promise<ProductionSummary> {
    const response = await apiClient.get("/factory/production-reports/summary", { params });
    return response.data.data;
  },

  async getWorkOrders(params: ReportParams & { status?: string }): Promise<WorkOrderRow[]> {
    const response = await apiClient.get("/factory/production-reports/work-orders", { params });
    return response.data.data;
  },

  async getProductionRuns(params: ReportParams): Promise<ProductionRunRow[]> {
    const response = await apiClient.get("/factory/production-reports/runs", { params });
    return response.data.data;
  },

  async getLineUtilization(params: ReportParams): Promise<LineUtilizationRow[]> {
    const response = await apiClient.get("/factory/production-reports/line-utilization", { params });
    return response.data.data;
  },

  async getWastageSummary(params: ReportParams): Promise<WastageReport> {
    const response = await apiClient.get("/factory/production-reports/wastage", { params });
    return response.data.data;
  },
};
