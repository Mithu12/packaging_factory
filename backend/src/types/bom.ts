// Bill of Materials (BOM) Types

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
  unit_cost: number;
  total_cost: number;
  lead_time_days: number;
  supplier_id?: string;
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
  unit_cost?: number;
  total_cost?: number;
  unit_of_measure?: string;
  is_optional?: boolean;
  scrap_factor?: number;
  specifications?: string;
  notes?: string;
}

// Work Order Material Requirements Types
export interface WorkOrderMaterialRequirement {
  id: string;
  work_order_id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  required_quantity: number;
  allocated_quantity: number;
  consumed_quantity: number;
  unit_cost: number;
  total_cost: number;
  unit_of_measure: string;
  status: 'pending' | 'allocated' | 'short' | 'fulfilled' | 'cancelled';
  priority: number;
  required_date: string;
  bom_component_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  lead_time_days: number;
  is_critical: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkOrderMaterialAllocation {
  id: string;
  work_order_requirement_id: string;
  inventory_item_id: number;
  allocated_quantity: number;
  unit_cost: number;
  total_cost: number;
  allocated_from_location: string;
  allocated_date: string;
  allocated_by: number;
  status: 'allocated' | 'consumed' | 'returned' | 'short';
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkOrderMaterialConsumption {
  id: string;
  work_order_id: string;
  material_id: string;
  material_name: string;
  consumed_quantity: number;
  unit_cost: number;
  total_cost: number;
  consumption_date: string;
  production_line_id?: string;
  production_line_name?: string;
  consumed_by: number;
  wastage_quantity: number;
  wastage_reason?: string;
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
  unit_cost: number;
  total_cost: number;
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

// Material Cost Analysis Types
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
  unit_cost: number;
  total_cost: number;
  quantity_used: number;
  cost_percentage: number;
  wastage_quantity: number;
  wastage_cost: number;
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
  search?: string;
  work_order_id?: string;
  status?: string;
  priority?: string;
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
