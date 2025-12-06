import { makeRequest } from '@/services/api-utils';

// Operator Types
export interface Operator {
  id: string;
  user_id: number;
  employee_id: string;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  current_work_order_id?: string;
  availability_status: 'available' | 'busy' | 'off_duty' | 'on_leave';
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
}

export interface CreateOperatorRequest {
  user_id: number;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  hourly_rate?: number;
}

export interface UpdateOperatorRequest {
  skill_level?: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  availability_status?: 'available' | 'busy' | 'off_duty' | 'on_leave';
  hourly_rate?: number;
  is_active?: boolean;
}

export interface OperatorStats {
  total_operators: number;
  active_operators: number;
  available_operators: number;
  busy_operators: number;
  off_duty_operators: number;
  on_leave_operators: number;
  beginner_operators: number;
  intermediate_operators: number;
  expert_operators: number;
  master_operators: number;
  average_hourly_rate: number;
}

export interface OperatorQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  skill_level?: string;
  department?: string;
  availability_status?: string;
  is_active?: boolean;
  factory_id?: number;
  sort_by?: 'employee_id' | 'skill_level' | 'department' | 'availability_status' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// API Service Class
export class OperatorsApiService {
  private static readonly BASE_URL = '/factory/operators';

  // =====================================================
  // Operator CRUD Operations
  // =====================================================

  // Get all operators with pagination and filtering
  static async getOperators(params?: OperatorQueryParams): Promise<{
    operators: Operator[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    return makeRequest<{
      operators: Operator[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.BASE_URL}${queryString}`);
  }

  // Get operator by ID
  static async getOperatorById(id: string): Promise<Operator> {
    return makeRequest<Operator>(`${this.BASE_URL}/${id}`);
  }

  // Get operator by employee ID
  static async getOperatorByEmployeeId(employee_id: string): Promise<Operator> {
    return makeRequest<Operator>(`${this.BASE_URL}/employee/${employee_id}`);
  }

  // Create new operator
  static async createOperator(data: CreateOperatorRequest): Promise<Operator> {
    return makeRequest<Operator>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update operator
  static async updateOperator(
    id: string,
    data: UpdateOperatorRequest
  ): Promise<Operator> {
    return makeRequest<Operator>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete operator
  static async deleteOperator(id: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`${this.BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // Update operator availability
  static async updateOperatorAvailability(
    id: string,
    availability_status: string,
    current_work_order_id?: string
  ): Promise<Operator> {
    return makeRequest<Operator>(`${this.BASE_URL}/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ availability_status, current_work_order_id }),
    });
  }

  // Get operator statistics
  static async getOperatorStats(factory_id?: number): Promise<OperatorStats> {
    const queryString = factory_id ? `?factory_id=${factory_id}` : '';
    return makeRequest<OperatorStats>(`${this.BASE_URL}/stats${queryString}`);
  }
}

// =====================================================
// React Query Keys
// =====================================================

export const operatorsQueryKeys = {
  all: ['operators'] as const,
  lists: () => [...operatorsQueryKeys.all, 'list'] as const,
  list: (params?: OperatorQueryParams) => [...operatorsQueryKeys.lists(), params] as const,
  details: () => [...operatorsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...operatorsQueryKeys.details(), id] as const,
  stats: () => [...operatorsQueryKeys.all, 'stats'] as const,
};
