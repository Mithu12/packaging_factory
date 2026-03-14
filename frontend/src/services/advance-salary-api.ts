import { makeRequest } from '@/services/api-utils';

export interface AdvanceSalary {
  id: number;
  advance_number: string;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  loan_type: string;
  amount: number;
  monthly_installment: number;
  total_installments: number;
  paid_installments: number;
  remaining_amount: number;
  start_date: string;
  end_date?: string;
  disbursement_date?: string;
  status: 'active' | 'completed' | 'cancelled';
  approved_by?: number;
  approved_at?: string;
  notes?: string;
  next_deduction: number;
  created_at: string;
  updated_at?: string;
}

export interface AdvanceSalaryStats {
  active_count: number;
  completed_count: number;
  cancelled_count: number;
  total_count: number;
  total_disbursed: number;
  total_outstanding: number;
  next_payroll_deduction: number;
}

export interface UpcomingDeduction {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  active_advances: number;
  total_deduction: number;
  advance_details: Array<{
    advance_number: string;
    monthly_installment: number;
    remaining_amount: number;
    paid_installments: number;
    total_installments: number;
  }>;
}

export interface CreateAdvanceSalaryRequest {
  employee_id: number;
  amount: number;
  monthly_installment: number;
  total_installments: number;
  start_date: string;
  loan_type?: string;
  notes?: string;
}

export class AdvanceSalaryApi {
  private static readonly BASE_URL = '/hrm/advance-salary';

  static async getAdvanceSalaries(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    employee_id?: number;
  }): Promise<{
    advances: AdvanceSalary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryString = params
      ? '?' + new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    return makeRequest(`${this.BASE_URL}${queryString}`);
  }

  static async getAdvanceSalaryById(id: number): Promise<AdvanceSalary> {
    return makeRequest(`${this.BASE_URL}/${id}`);
  }

  static async createAdvanceSalary(data: CreateAdvanceSalaryRequest): Promise<AdvanceSalary> {
    return makeRequest(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async approveAdvanceSalary(id: number, approved: boolean, notes?: string): Promise<AdvanceSalary> {
    return makeRequest(`${this.BASE_URL}/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, notes }),
    });
  }

  static async getStats(): Promise<AdvanceSalaryStats> {
    return makeRequest(`${this.BASE_URL}/stats`);
  }

  static async getUpcomingDeductions(): Promise<UpcomingDeduction[]> {
    return makeRequest(`${this.BASE_URL}/deductions`);
  }
}

export default AdvanceSalaryApi;
