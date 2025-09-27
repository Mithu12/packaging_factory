// Factory Module Types

export interface Factory {
  id: string;
  name: string;
  location: string;
  managers: string[];
  status: "active" | "inactive" | "maintenance";
  createdDate: string;
  capacity: number;
  currentLoad: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  managers: string[];
  status: "active" | "inactive" | "maintenance";
  createdDate: string;
  capacity: number;
  currentStock: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerId: string;
  totalLines: number;
  totalQuantity: number;
  totalValue: number;
  deadline: string;
  status: "pending" | "accepted" | "rejected" | "in_production";
  priority: "low" | "medium" | "high" | "urgent";
  createdDate: string;
  factoryManager?: string;
  notes?: string;
}

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deadline: string;
  specifications?: string;
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  product: string;
  quantity: number;
  deadline: string;
  status:
    | "draft"
    | "planned"
    | "released"
    | "in_progress"
    | "completed"
    | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
  progress: number;
  estimatedHours: number;
  actualHours: number;
  productionLine: string;
  assignedOperators: string[];
  createdDate: string;
  startDate?: string;
  completionDate?: string;
  notes?: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  capacity: number;
  currentLoad: number;
  status: "available" | "busy" | "maintenance";
  operators: string[];
}

export interface Operator {
  id: string;
  name: string;
  skill: "beginner" | "intermediate" | "expert";
  currentWorkOrder?: string;
  availability: "available" | "busy" | "off_duty";
}

export interface ProductionRun {
  id: string;
  workOrderId: string;
  product: string;
  quantity: number;
  status: "running" | "paused" | "stopped" | "completed";
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  output: number;
  targetOutput: number;
  efficiency: number;
  operator: string;
  productionLine: string;
  downtime: number; // in minutes
  downtimeReasons: string[];
}

export interface WastageRecord {
  id: string;
  workOrderId: string;
  product: string;
  quantity: number;
  wastageReason: string;
  cost: number;
  status: "pending" | "approved" | "rejected";
  recordedBy: string;
  recordedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
  category: "material" | "production" | "quality" | "handling";
}

export interface WastageReason {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface FactoryExpense {
  id: string;
  description: string;
  amount: number;
  category:
    | "rent"
    | "utilities"
    | "handling"
    | "maintenance"
    | "consumables"
    | "other";
  workOrderId?: string;
  productionLine?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  submittedBy: string;
  submittedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  paidDate?: string;
  attachments: string[];
  notes?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  requiresApproval: boolean;
}

export interface FactoryStats {
  totalOrders: number;
  activeWorkOrders: number;
  completedToday: number;
  pendingApprovals: number;
  efficiency: number;
  onTimeDelivery: number;
}

export interface ProductionStats {
  totalRuns: number;
  activeRuns: number;
  completedToday: number;
  averageEfficiency: number;
  totalDowntime: number;
  onTimeDelivery: number;
}

export interface WastageStats {
  totalWastage: number;
  pendingApprovals: number;
  totalCost: number;
  averageWastage: number;
  topReason: string;
  monthlyTrend: number;
}

export interface ExpenseStats {
  totalExpenses: number;
  pendingApprovals: number;
  totalAmount: number;
  averageExpense: number;
  monthlyTrend: number;
  topCategory: string;
}

export interface RecentActivity {
  id: string;
  type:
    | "order_accepted"
    | "wo_created"
    | "production_started"
    | "production_completed"
    | "wastage_recorded";
  description: string;
  timestamp: string;
  user: string;
}

export interface DowntimeReason {
  id: string;
  reason: string;
  duration: number;
  timestamp: string;
}

// API Request/Response Types
export interface CreateFactoryRequest {
  name: string;
  location: string;
  managers: string[];
  capacity: number;
}

export interface CreateWarehouseRequest {
  name: string;
  location: string;
  managers: string[];
  capacity: number;
}

export interface CreateWorkOrderRequest {
  orderNumber: string;
  product: string;
  quantity: number;
  deadline: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedHours: number;
  productionLine: string;
  assignedOperators: string[];
  notes?: string;
}

export interface UpdateWorkOrderRequest {
  status?:
    | "draft"
    | "planned"
    | "released"
    | "in_progress"
    | "completed"
    | "on_hold";
  progress?: number;
  actualHours?: number;
  productionLine?: string;
  assignedOperators?: string[];
  notes?: string;
}

export interface CreateWastageRecordRequest {
  workOrderId: string;
  product: string;
  quantity: number;
  wastageReason: string;
  cost: number;
  category: "material" | "production" | "quality" | "handling";
  notes?: string;
}

export interface CreateFactoryExpenseRequest {
  description: string;
  amount: number;
  category:
    | "rent"
    | "utilities"
    | "handling"
    | "maintenance"
    | "consumables"
    | "other";
  workOrderId?: string;
  productionLine?: string;
  attachments: string[];
  notes?: string;
}

export interface ApproveWastageRequest {
  wastageRecordId: string;
  approved: boolean;
  notes?: string;
}

export interface ApproveExpenseRequest {
  expenseId: string;
  approved: boolean;
  notes?: string;
}
