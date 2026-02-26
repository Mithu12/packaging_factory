// Bill of Materials (BOM) Types

export interface BillOfMaterials {
  id: string;
  parentProductId: string;
  parentProductName: string;
  parentProductSku: string;
  version: string;
  effectiveDate: string;
  isActive: boolean;
  components: BOMComponent[];
  totalCost: number;
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  notes?: string;
}

export interface BOMComponent {
  id: string;
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
  unitOfMeasure: string;
  isOptional: boolean;
  scrapFactor: number; // Percentage of material lost in production
  unitCost: number;
  totalCost: number;
  leadTimeDays: number;
  supplierId?: string;
  supplierName?: string;
  specifications?: string;
  notes?: string;
}

export interface BOMVersion {
  id: string;
  bomId: string;
  versionNumber: string;
  effectiveDate: string;
  isActive: boolean;
  createdBy: string;
  createdDate: string;
  changeDescription?: string;
}

export interface CreateBOMRequest {
  parentProductId: string;
  version: string;
  effectiveDate: string;
  components: CreateBOMComponentRequest[];
  notes?: string;
}

export interface CreateBOMComponentRequest {
  componentId: string;
  quantityRequired: number;
  unitOfMeasure: string;
  isOptional: boolean;
  scrapFactor: number;
  specifications?: string;
  notes?: string;
}

export interface UpdateBOMRequest {
  version?: string;
  effectiveDate?: string;
  isActive?: boolean;
  components?: UpdateBOMComponentRequest[];
  notes?: string;
}

export interface UpdateBOMComponentRequest {
  id: string;
  quantityRequired?: number;
  unitOfMeasure?: string;
  isOptional?: boolean;
  scrapFactor?: number;
  specifications?: string;
  notes?: string;
}

// Material Requirements Planning Types
export interface MaterialRequirement {
  id: string;
  workOrderId: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  requiredQuantity: number;
  allocatedQuantity: number;
  consumedQuantity: number;
  unitOfMeasure: string;
  status: "pending" | "allocated" | "short" | "fulfilled";
  priority: number;
  requiredDate: string;
  bomComponentId?: string;
  supplierId?: string;
  supplierName?: string;
  unitCost: number;
  totalCost: number;
  leadTimeDays: number;
  isCritical: boolean;
  notes?: string;
}

export interface MaterialAllocation {
  id: string;
  workOrderId: string;
  materialId: string;
  materialName: string;
  allocatedQuantity: number;
  allocatedFromLocation: string;
  allocatedDate: string;
  allocatedBy: string;
  status: "allocated" | "consumed" | "returned" | "short";
  expiryDate?: string;
  notes?: string;
}

export interface MaterialConsumption {
  id: string;
  workOrderId: string;
  materialId: string;
  materialName: string;
  consumedQuantity: number;
  consumptionDate: string;
  productionLineId: string;
  productionLineName: string;
  consumedBy: string;
  wastageQuantity: number;
  wastageReason?: string;
  notes?: string;
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
  priority: "low" | "medium" | "high" | "critical";
  supplier_id?: string;
  supplier_name?: string;
  lead_time_days: number;
  suggested_action: "purchase" | "substitute" | "delay" | "split" | "po_created";
  status: "open" | "resolved" | "cancelled";
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

// BOM Statistics
export interface BOMStats {
  totalBOMs: number;
  activeBOMs: number;
  averageComponents: number;
  averageCost: number;
  mostExpensiveBOM: string;
  leastExpensiveBOM: string;
  componentsWithoutSupplier: number;
  outdatedBOMs: number;
}

// Material Planning Statistics
export interface MaterialPlanningStats {
  totalRequirements: number;
  pendingAllocations: number;
  materialShortages: number;
  criticalShortages: number;
  totalMaterialValue: number;
  averageLeadTime: number;
  onTimeDelivery: number;
  costVariance: number;
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

export interface BOMQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  parent_product_id?: string;
  is_active?: boolean;
  sort_by?: 'created_at' | 'version' | 'total_cost';
  sort_order?: 'asc' | 'desc';
}

export interface CostVariance {
  work_order_id: string;
  work_order_number: string;
  product_name: string;
  planned_cost: number;
  actual_cost: number;
  variance: number;
  variance_percentage: number;
  status: "favorable" | "unfavorable" | "on_target";
}

export interface CostTrend {
  period: string;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_unit: number;
}

export interface CostCenter {
  id: string;
  name: string;
  total_cost: number;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  efficiency: number;
  variance: number;
}
