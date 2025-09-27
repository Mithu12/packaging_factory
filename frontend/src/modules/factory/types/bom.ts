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
  materialId: string;
  materialName: string;
  materialSku: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortfallQuantity: number;
  workOrderId: string;
  workOrderNumber: string;
  requiredDate: string;
  priority: "low" | "medium" | "high" | "critical";
  supplierId?: string;
  supplierName?: string;
  leadTimeDays: number;
  suggestedAction: "purchase" | "substitute" | "delay" | "split";
  notes?: string;
}

export interface MaterialCostAnalysis {
  workOrderId: string;
  workOrderNumber: string;
  productName: string;
  quantity: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerUnit: number;
  materialBreakdown: MaterialCostBreakdown[];
  costVariance: number;
  costVariancePercentage: number;
}

export interface MaterialCostBreakdown {
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unitCost: number;
  totalCost: number;
  costPercentage: number;
  wastageQuantity: number;
  wastageCost: number;
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
