// =====================================================
// Work Orders Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types (matching backend types)
// =====================================================

export type WorkOrderStatus =
  | 'draft'
  | 'planned'
  | 'released'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkOrder {
  id: number;
  work_order_number: string;
  customer_order_id?: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_of_measure: string;
  deadline: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  progress: number;
  estimated_hours: number;
  actual_hours: number;
  production_line_id?: number;
  production_line_name?: string;
  assigned_operators: string[];
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  specifications?: string;
}

export interface ProductionLine {
  id: number;
  name: string;
  code: string;
  description?: string;
  capacity: number;
  current_load: number;
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Operator {
  id: number;
  employee_id: string;
  name: string;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  current_work_order_id?: number;
  availability_status: 'available' | 'busy' | 'off_duty' | 'on_leave';
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WorkOrderAssignment {
  id: number;
  work_order_id: number;
  production_line_id: number;
  operator_id: number;
  assigned_at: string;
  assigned_by: string;
  estimated_start_time?: string;
  actual_start_time?: string;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  notes?: string;
}

// Request/Response Types for Work Orders
export interface CreateWorkOrderRequest {
  customer_order_id?: number;
  product_id: number;
  quantity: number;
  deadline: string;
  priority: WorkOrderPriority;
  estimated_hours: number;
  production_line_id?: number;
  assigned_operators?: number[];
  notes?: string;
  specifications?: string;
}

export interface UpdateWorkOrderRequest {
  quantity?: number;
  deadline?: string;
  priority?: WorkOrderPriority;
  estimated_hours?: number;
  production_line_id?: number;
  assigned_operators?: number[];
  notes?: string;
  specifications?: string;
  progress?: number;
  actual_hours?: number;
}

export interface WorkOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  production_line_id?: number;
  assigned_operator_id?: number;
  customer_order_id?: number;
  created_date_from?: string;
  created_date_to?: string;
  deadline_from?: string;
  deadline_to?: string;
  sort_by?: 'created_at' | 'deadline' | 'priority' | 'status' | 'progress';
  sort_order?: 'asc' | 'desc';
}

export interface WorkOrderStats {
  total_work_orders: number;
  draft_work_orders: number;
  planned_work_orders: number;
  in_progress_work_orders: number;
  completed_work_orders: number;
  on_hold_work_orders: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  average_completion_rate: number;
  on_time_delivery_rate: number;
}

// Production Line Management
export interface CreateProductionLineRequest {
  name: string;
  code: string;
  description?: string;
  capacity: number;
  location?: string;
}

export interface UpdateProductionLineRequest {
  name?: string;
  code?: string;
  description?: string;
  capacity?: number;
  location?: string;
  status?: 'available' | 'busy' | 'maintenance' | 'offline';
  is_active?: boolean;
}

// Operator Management
export interface CreateOperatorRequest {
  employee_id: string;
  name: string;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  hourly_rate?: number;
}

export interface UpdateOperatorRequest {
  employee_id?: string;
  name?: string;
  skill_level?: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  availability_status?: 'available' | 'busy' | 'off_duty' | 'on_leave';
  hourly_rate?: number;
  is_active?: boolean;
}

// Work Order Assignment
export interface CreateWorkOrderAssignmentRequest {
  work_order_id: number;
  production_line_id: number;
  operator_ids: number[];
  estimated_start_time?: string;
  notes?: string;
}

export interface UpdateWorkOrderAssignmentRequest {
  operator_ids?: number[];
  estimated_start_time?: string;
  actual_start_time?: string;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  notes?: string;
}

// =====================================================
// Work Orders API Service
// =====================================================

export class WorkOrdersApiService {
  private static readonly BASE_URL = '/factory/work-orders';
  private static readonly PRODUCTION_LINES_URL = '/factory/production-lines';
  private static readonly OPERATORS_URL = '/factory/operators';
  private static readonly ASSIGNMENTS_URL = '/factory/work-order-assignments';

  // =====================================================
  // Work Order CRUD Operations
  // =====================================================

  // Get all work orders with pagination and filtering
  static async getWorkOrders(params?: WorkOrderQueryParams): Promise<{
    work_orders: WorkOrder[];
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
      work_orders: WorkOrder[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.BASE_URL}${queryString}`);
  }

  // Get work order by ID
  static async getWorkOrderById(id: string): Promise<WorkOrder> {
    return makeRequest<WorkOrder>(`${this.BASE_URL}/${id}`);
  }

  // Get work order statistics
  static async getWorkOrderStats(): Promise<WorkOrderStats> {
    return makeRequest<WorkOrderStats>(`${this.BASE_URL}/stats`);
  }

  // Create new work order
  static async createWorkOrder(data: CreateWorkOrderRequest): Promise<WorkOrder> {
    return makeRequest<WorkOrder>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update work order
  static async updateWorkOrder(id: string, data: UpdateWorkOrderRequest): Promise<WorkOrder> {
    return makeRequest<WorkOrder>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Update work order status
  static async updateWorkOrderStatus(
    id: string,
    status: WorkOrderStatus,
    notes?: string
  ): Promise<WorkOrder> {
    return makeRequest<WorkOrder>(`${this.BASE_URL}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Start work order (move to in_progress)
  static async startWorkOrder(id: string, notes?: string): Promise<WorkOrder> {
    return this.updateWorkOrderStatus(id, 'in_progress', notes);
  }

  // Complete work order
  static async completeWorkOrder(id: string, actualHours?: number, notes?: string): Promise<WorkOrder> {
    const updateData: UpdateWorkOrderRequest = {
      progress: 100,
      actual_hours: actualHours,
      notes,
    };
    return this.updateWorkOrder(id, updateData);
  }

  // Delete work order
  static async deleteWorkOrder(id: string, force?: boolean): Promise<{ deleted: boolean }> {
    const queryString = force ? '?force=true' : '';
    return makeRequest<{ deleted: boolean }>(`${this.BASE_URL}/${id}${queryString}`, {
      method: 'DELETE',
    });
  }

  // =====================================================
  // Production Line Management
  // =====================================================

  // Get all production lines
  static async getProductionLines(): Promise<ProductionLine[]> {
    return makeRequest<ProductionLine[]>(this.PRODUCTION_LINES_URL);
  }

  // Get production line by ID
  static async getProductionLineById(id: string): Promise<ProductionLine> {
    return makeRequest<ProductionLine>(`${this.PRODUCTION_LINES_URL}/${id}`);
  }

  // Create production line
  static async createProductionLine(data: CreateProductionLineRequest): Promise<ProductionLine> {
    return makeRequest<ProductionLine>(this.PRODUCTION_LINES_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update production line
  static async updateProductionLine(id: string, data: UpdateProductionLineRequest): Promise<ProductionLine> {
    return makeRequest<ProductionLine>(`${this.PRODUCTION_LINES_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete production line
  static async deleteProductionLine(id: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`${this.PRODUCTION_LINES_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // =====================================================
  // Operator Management
  // =====================================================

  // Get all operators
  static async getOperators(): Promise<Operator[]> {
    return makeRequest<Operator[]>(this.OPERATORS_URL);
  }

  // Get operator by ID
  static async getOperatorById(id: string): Promise<Operator> {
    return makeRequest<Operator>(`${this.OPERATORS_URL}/${id}`);
  }

  // Create operator
  static async createOperator(data: CreateOperatorRequest): Promise<Operator> {
    return makeRequest<Operator>(this.OPERATORS_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update operator
  static async updateOperator(id: string, data: UpdateOperatorRequest): Promise<Operator> {
    return makeRequest<Operator>(`${this.OPERATORS_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete operator
  static async deleteOperator(id: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`${this.OPERATORS_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // Update operator availability
  static async updateOperatorAvailability(
    id: string,
    availabilityStatus: 'available' | 'busy' | 'off_duty' | 'on_leave'
  ): Promise<Operator> {
    return makeRequest<Operator>(`${this.OPERATORS_URL}/${id}/availability`, {
      method: 'POST',
      body: JSON.stringify({ availability_status: availabilityStatus }),
    });
  }

  // =====================================================
  // Work Order Assignment Management
  // =====================================================

  // Create work order assignment
  static async createWorkOrderAssignment(data: CreateWorkOrderAssignmentRequest): Promise<any> {
    return makeRequest<any>(this.ASSIGNMENTS_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update work order assignment
  static async updateWorkOrderAssignment(
    workOrderId: string,
    data: UpdateWorkOrderAssignmentRequest
  ): Promise<any> {
    return makeRequest<any>(`${this.ASSIGNMENTS_URL}/${workOrderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Get work order assignments
  static async getWorkOrderAssignments(workOrderId?: string): Promise<any[]> {
    const url = workOrderId ? `${this.ASSIGNMENTS_URL}?work_order_id=${workOrderId}` : this.ASSIGNMENTS_URL;
    return makeRequest<any[]>(url);
  }

  // Delete work order assignment
  static async deleteWorkOrderAssignment(assignmentId: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`${this.ASSIGNMENTS_URL}/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  // =====================================================
  // Bulk Operations
  // =====================================================

  // Bulk update work order status
  static async bulkUpdateWorkOrderStatus(
    workOrderIds: string[],
    status: WorkOrderStatus,
    notes?: string
  ): Promise<{ updated_work_orders: WorkOrder[] }> {
    return makeRequest<{ updated_work_orders: WorkOrder[] }>(`${this.BASE_URL}/bulk/status`, {
      method: 'POST',
      body: JSON.stringify({ work_order_ids: workOrderIds, status, notes }),
    });
  }

  // Bulk assign operators to work orders
  static async bulkAssignOperators(
    assignments: Array<{
      work_order_id: number;
      operator_ids: number[];
      estimated_start_time?: string;
      notes?: string;
    }>
  ): Promise<{ assignments: any[] }> {
    return makeRequest<{ assignments: any[] }>(`${this.ASSIGNMENTS_URL}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
  }
}

// =====================================================
// React Query Keys (Optional - for better integration)
// =====================================================

export const workOrdersQueryKeys = {
  all: ['work-orders'] as const,
  lists: () => [...workOrdersQueryKeys.all, 'list'] as const,
  list: (params?: WorkOrderQueryParams) => [...workOrdersQueryKeys.lists(), params] as const,
  stats: () => [...workOrdersQueryKeys.all, 'stats'] as const,
  detail: (id: string) => [...workOrdersQueryKeys.all, 'detail', id] as const,
  productionLines: () => [...workOrdersQueryKeys.all, 'production-lines'] as const,
  operators: () => [...workOrdersQueryKeys.all, 'operators'] as const,
  assignments: (workOrderId?: string) => [...workOrdersQueryKeys.all, 'assignments', workOrderId] as const,
};

export default WorkOrdersApiService;
