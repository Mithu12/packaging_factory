import { apiClient } from "@/services/apiClient";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Expense, ExpenseStats, ExpenseListResponse } from "@/services/types";

export interface ExpenseReportParams {
  dateRange?: DateRange;
  department?: string;
  project?: string;
  category_id?: number;
  status?: string;
  limit?: number;
  page?: number;
}

function buildParams(params: ExpenseReportParams) {
  return {
    start_date: params.dateRange?.from ? format(params.dateRange.from, "yyyy-MM-dd") : undefined,
    end_date: params.dateRange?.to ? format(params.dateRange.to, "yyyy-MM-dd") : undefined,
    department: params.department,
    project: params.project,
    category_id: params.category_id,
    status: params.status,
    limit: params.limit,
    page: params.page,
  };
}

export const ExpenseReportsApi = {
  async getExpenseSummary(params: ExpenseReportParams): Promise<ExpenseStats> {
    const response = await apiClient.get("/expenses/stats", {
      params: buildParams(params),
    });
    return response.data.data;
  },

  async getDetailedExpenses(params: ExpenseReportParams): Promise<ExpenseListResponse> {
    const response = await apiClient.get("/expenses", {
      params: buildParams({ ...params, limit: params.limit || 100 }),
    });
    return response.data.data;
  },
};
