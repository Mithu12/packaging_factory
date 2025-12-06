// =====================================================
// BOM (Bill of Materials) Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types (matching backend types)
// =====================================================

export type MaterialRequirementStatus =
  | 'pending'
  | 'allocated'
  | 'short'
  | 'fulfilled'
  | 'cancelled';

export type MaterialRequirementPriority = 'low' | 'medium' | 'high' | 'critical';

export interface BillOfMaterials {
  id: string;
  parent_product_id: string;
  parent_product_name?: string;
  parent_product_sku?: string;
  version: string;
  effective_date: string;
  is_active: boolean;
  total_cost: number;
  created_by: number;
  created_at: string;
  updated_by?: number;
  updated_at?: string;
  notes?: string;
  components?: BOMComponent[];
}

export interface BOMComponent {
  id: string;
  bom_id: string;
  component_product_id: string;
  component_product_name?: string;
  component_product_sku?: string;
  quantity_required: number;
  unit_of_measure: string;
  is_optional: boolean;
  scrap_factor: number;
  unit_cost: number;
  total_cost: number;
  lead_time_days: number;
  supplier_id?: string;
  supplier_name?: string;
  specifications?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkOrderMaterialRequirement {
  id: string;
  work_order_id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  required_quantity: number;
  allocated_quantity: number;
  consumed_quantity: number;
  unit_of_measure: string;
  status: MaterialRequirementStatus;
  priority: number;
  required_date: string;
  bom_component_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  unit_cost: number;
  total_cost: number;
  lead_time_days: number;
  is_critical: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface MaterialShortage {
  id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  required_quantity: number;
  available_quantity: number;
  shortfall_quantity: number;
  work_order_id: string;
  work_order_number: string;
  required_date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  supplier_id?: string;
  supplier_name?: string;
  lead_time_days: number;
  suggested_action: 'purchase' | 'substitute' | 'delay' | 'split' | 'po_created';
  status: 'open' | 'resolved' | 'cancelled';
  resolved_date?: string;
  resolved_by?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface MaterialCostAnalysis {
  work_order_id: string;
  work_order_number: string;
  product_name: string;
  quantity: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_unit: number;
  material_breakdown: MaterialCostBreakdown[];
  cost_variance: number;
  cost_variance_percentage: number;
}

export interface MaterialCostBreakdown {
  material_id: string;
  material_name: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  cost_percentage: number;
  wastage_quantity: number;
  wastage_cost: number;
}

// Request/Response Types for BOM
export interface CreateBOMRequest {
  parent_product_id: string;
  version: string;
  effective_date: string;
  components: CreateBOMComponentRequest[];
  notes?: string;
}

export interface CreateBOMComponentRequest {
  component_product_id: string;
  quantity_required: number;
  unit_of_measure: string;
  is_optional: boolean;
  scrap_factor: number;
  specifications?: string;
  notes?: string;
}

export interface UpdateBOMRequest {
  version?: string;
  effective_date?: string;
  is_active?: boolean;
  components?: UpdateBOMComponentRequest[];
  notes?: string;
}

export interface UpdateBOMComponentRequest {
  id?: string;
  component_product_id?: string;
  quantity_required?: number;
  unit_of_measure?: string;
  is_optional?: boolean;
  scrap_factor?: number;
  specifications?: string;
  notes?: string;
}

// Query Parameters
export interface BOMQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  parent_product_id?: string;
  is_active?: boolean;
  sort_by?: 'created_at' | 'version' | 'total_cost';
  sort_order?: 'asc' | 'desc';
}

export interface MaterialRequirementsQueryParams {
  page?: number;
  limit?: number;
  work_order_id?: string;
  status?: string;
  priority?: number;
  material_id?: string;
  required_date_from?: string;
  required_date_to?: string;
  sort_by?: 'required_date' | 'priority' | 'status';
  sort_order?: 'asc' | 'desc';
}

// Statistics Types
export interface BOMStats {
  total_boms: number;
  active_boms: number;
  average_components: number;
  average_cost: number;
  most_expensive_bom: string;
  least_expensive_bom: string;
  components_without_supplier: number;
  outdated_boms: number;
}

export interface MaterialPlanningStats {
  total_requirements: number;
  pending_allocations: number;
  material_shortages: number;
  critical_shortages: number;
  total_material_value: number;
  average_lead_time: number;
  on_time_delivery: number;
  cost_variance: number;
}

// =====================================================
// BOM API Service
// =====================================================

export class BOMApiService {
  private static readonly BASE_URL = '/factory/boms';
  private static readonly MATERIAL_REQUIREMENTS_URL = '/material-requirements';

  // =====================================================
  // BOM CRUD Operations
  // =====================================================

  // Get all BOMs with pagination and filtering
  static async getBOMs(params?: BOMQueryParams): Promise<{
    boms: BillOfMaterials[];
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
      boms: BillOfMaterials[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.BASE_URL}${queryString}`);
  }

  // Get BOM by ID with components
  static async getBOMById(id: string): Promise<BillOfMaterials> {
    return makeRequest<BillOfMaterials>(`${this.BASE_URL}/${id}`);
  }

  // Get BOM statistics
  static async getBOMStats(): Promise<BOMStats> {
    return makeRequest<BOMStats>(`${this.BASE_URL}/stats`);
  }

  // Create new BOM
  static async createBOM(data: CreateBOMRequest): Promise<BillOfMaterials> {
    return makeRequest<BillOfMaterials>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update BOM
  static async updateBOM(id: string, data: UpdateBOMRequest): Promise<BillOfMaterials> {
    return makeRequest<BillOfMaterials>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete BOM
  static async deleteBOM(id: string, force?: boolean): Promise<{ deleted: boolean }> {
    const queryString = force ? '?force=true' : '';
    return makeRequest<{ deleted: boolean }>(`${this.BASE_URL}/${id}${queryString}`, {
      method: 'DELETE',
    });
  }

  // =====================================================
  // Material Requirements Operations
  // =====================================================

  // Get material requirements for work orders
  static async getMaterialRequirements(params?: MaterialRequirementsQueryParams): Promise<{
    requirements: WorkOrderMaterialRequirement[];
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
      requirements: WorkOrderMaterialRequirement[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.BASE_URL}${this.MATERIAL_REQUIREMENTS_URL}${queryString}`);
  }

  // Get material requirement by ID
  static async getMaterialRequirementById(id: string): Promise<WorkOrderMaterialRequirement> {
    return makeRequest<WorkOrderMaterialRequirement>(`${this.BASE_URL}${this.MATERIAL_REQUIREMENTS_URL}/${id}`);
  }

  // Update material requirement status
  static async updateMaterialRequirementStatus(
    id: string,
    status: MaterialRequirementStatus,
    notes?: string
  ): Promise<WorkOrderMaterialRequirement> {
    return makeRequest<WorkOrderMaterialRequirement>(`${this.BASE_URL}${this.MATERIAL_REQUIREMENTS_URL}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Allocate materials for requirement
  static async allocateMaterials(
    requirementId: string,
    allocationData: {
      allocated_quantity: number;
      allocated_from_location: string;
      notes?: string;
    }
  ): Promise<WorkOrderMaterialRequirement> {
    return makeRequest<WorkOrderMaterialRequirement>(`${this.BASE_URL}${this.MATERIAL_REQUIREMENTS_URL}/${requirementId}/allocate`, {
      method: 'POST',
      body: JSON.stringify(allocationData),
    });
  }

  // Consume materials for requirement
  static async consumeMaterials(
    requirementId: string,
    consumptionData: {
      consumed_quantity: number;
      wastage_quantity?: number;
      wastage_reason?: string;
      notes?: string;
    }
  ): Promise<WorkOrderMaterialRequirement> {
    return makeRequest<WorkOrderMaterialRequirement>(`${this.BASE_URL}${this.MATERIAL_REQUIREMENTS_URL}/${requirementId}/consume`, {
      method: 'POST',
      body: JSON.stringify(consumptionData),
    });
  }

  // Get material planning statistics
  static async getMaterialPlanningStats(): Promise<MaterialPlanningStats> {
    return makeRequest<MaterialPlanningStats>(`${this.BASE_URL}/material-planning/stats`);
  }

  // =====================================================
  // Material Shortages Operations
  // =====================================================

  // Get all material shortages
  static async getMaterialShortages(params?: {
    status?: string;
    priority?: string;
    material_id?: string;
    work_order_id?: string;
  }): Promise<MaterialShortage[]> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    return makeRequest<MaterialShortage[]>(`${this.BASE_URL}/material-shortages${queryString}`);
  }

  // Resolve material shortage
  static async resolveMaterialShortage(
    shortageId: string,
    resolutionData: {
      resolved_action: string;
      notes?: string;
    }
  ): Promise<MaterialShortage> {
    return makeRequest<MaterialShortage>(`${this.BASE_URL}/material-shortages/${shortageId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(resolutionData),
    });
  }

  // =====================================================
  // Material Cost Analysis
  // =====================================================

  // Get material cost analysis for work order
  static async getMaterialCostAnalysis(workOrderId: string): Promise<MaterialCostAnalysis> {
    return makeRequest<MaterialCostAnalysis>(`${this.BASE_URL}/material-cost-analysis/${workOrderId}`);
  }

  // Get material cost analysis for multiple work orders
  static async getBulkMaterialCostAnalysis(workOrderIds: string[]): Promise<MaterialCostAnalysis[]> {
    return makeRequest<MaterialCostAnalysis[]>(`${this.BASE_URL}/material-cost-analysis/bulk`, {
      method: 'POST',
      body: JSON.stringify({ work_order_ids: workOrderIds }),
    });
  }

  // Run MRP calculation
  static async runMRPCalculation(): Promise<{
    processed: number;
    shortages_created: number;
    shortages_resolved: number;
    message: string;
  }> {
    return makeRequest<{
      processed: number;
      shortages_created: number;
      shortages_resolved: number;
      message: string;
    }>(`${this.BASE_URL}/run-mrp`, {
      method: 'POST',
    });
  }

  // Generate purchase orders for material shortages
  static async generatePurchaseOrdersForShortages(shortageIds: string[]): Promise<{
    generated_orders: number;
    purchase_orders: string[];
    message: string;
  }> {
    return makeRequest<{
      generated_orders: number;
      purchase_orders: string[];
      message: string;
    }>(`${this.BASE_URL}/generate-purchase-orders`, {
      method: 'POST',
      body: JSON.stringify({ shortageIds }),
    });
  }
}

// =====================================================
// React Query Keys (Optional - for better integration)
// =====================================================

export const bomQueryKeys = {
  all: ['boms'] as const,
  lists: () => [...bomQueryKeys.all, 'list'] as const,
  list: (params?: BOMQueryParams) => [...bomQueryKeys.lists(), params] as const,
  stats: () => [...bomQueryKeys.all, 'stats'] as const,
  detail: (id: string) => [...bomQueryKeys.all, 'detail', id] as const,
  materialRequirements: () => [...bomQueryKeys.all, 'material-requirements'] as const,
  materialRequirementsList: (params?: MaterialRequirementsQueryParams) => [...bomQueryKeys.materialRequirements(), params] as const,
  materialRequirementsDetail: (id: string) => [...bomQueryKeys.materialRequirements(), 'detail', id] as const,
  materialPlanningStats: () => [...bomQueryKeys.all, 'material-planning-stats'] as const,
  materialShortages: () => [...bomQueryKeys.all, 'material-shortages'] as const,
  materialCostAnalysis: (workOrderId: string) => [...bomQueryKeys.all, 'material-cost-analysis', workOrderId] as const,
};

export default BOMApiService;
