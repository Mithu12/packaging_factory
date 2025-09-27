// Factory API Service
// This is a placeholder service with mock data - in a real app, this would make actual API calls

import {
  Factory,
  Warehouse,
  Order,
  OrderLine,
  WorkOrder,
  ProductionLine,
  Operator,
  ProductionRun,
  WastageRecord,
  WastageReason,
  FactoryExpense,
  ExpenseCategory,
  FactoryStats,
  ProductionStats,
  WastageStats,
  ExpenseStats,
  RecentActivity,
  CreateFactoryRequest,
  CreateWarehouseRequest,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  CreateWastageRecordRequest,
  CreateFactoryExpenseRequest,
  ApproveWastageRequest,
  ApproveExpenseRequest,
} from "../types";

// Mock data - in real app, this would come from API calls
const mockFactories: Factory[] = [
  {
    id: "FACT-001",
    name: "Main Production Factory",
    location: "Industrial Zone A, City",
    managers: ["John Smith", "Jane Doe"],
    status: "active",
    createdDate: "2024-01-15T00:00:00Z",
    capacity: 1000,
    currentLoad: 750,
  },
  {
    id: "FACT-002",
    name: "Secondary Factory",
    location: "Industrial Zone B, City",
    managers: ["Mike Johnson"],
    status: "active",
    createdDate: "2024-02-01T00:00:00Z",
    capacity: 500,
    currentLoad: 300,
  },
];

const mockWarehouses: Warehouse[] = [
  {
    id: "WH-001",
    name: "Main Warehouse",
    location: "Warehouse District, City",
    managers: ["Sarah Wilson", "Tom Brown"],
    status: "active",
    createdDate: "2024-01-10T00:00:00Z",
    capacity: 2000,
    currentStock: 1500,
  },
  {
    id: "WH-002",
    name: "Secondary Warehouse",
    location: "Industrial Zone C, City",
    managers: ["Lisa Davis"],
    status: "active",
    createdDate: "2024-02-15T00:00:00Z",
    capacity: 1000,
    currentStock: 600,
  },
];

const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-2024-001",
    customer: "ABC Manufacturing Ltd",
    customerId: "CUST-001",
    totalLines: 3,
    totalQuantity: 1500,
    totalValue: 45000,
    deadline: "2024-03-20",
    status: "pending",
    priority: "high",
    createdDate: "2024-03-10",
    notes: "Rush order for new product launch",
  },
  {
    id: "2",
    orderNumber: "ORD-2024-002",
    customer: "XYZ Industries",
    customerId: "CUST-002",
    totalLines: 2,
    totalQuantity: 800,
    totalValue: 24000,
    deadline: "2024-03-25",
    status: "accepted",
    priority: "medium",
    createdDate: "2024-03-09",
    factoryManager: "John Smith",
  },
];

const mockWorkOrders: WorkOrder[] = [
  {
    id: "WO-001",
    orderNumber: "ORD-2024-001",
    product: "Premium Widget A",
    quantity: 500,
    deadline: "2024-03-20",
    status: "planned",
    priority: "high",
    progress: 0,
    estimatedHours: 40,
    actualHours: 0,
    productionLine: "Line 1",
    assignedOperators: ["John Doe", "Jane Smith"],
    createdDate: "2024-03-10",
    notes: "High priority order for key customer",
  },
  {
    id: "WO-002",
    orderNumber: "ORD-2024-002",
    product: "Standard Widget B",
    quantity: 1000,
    deadline: "2024-03-25",
    status: "draft",
    priority: "medium",
    progress: 0,
    estimatedHours: 60,
    actualHours: 0,
    productionLine: "",
    assignedOperators: [],
    createdDate: "2024-03-09",
  },
];

const mockProductionLines: ProductionLine[] = [
  {
    id: "1",
    name: "Line 1",
    capacity: 100,
    currentLoad: 75,
    status: "busy",
    operators: ["John Doe", "Jane Smith"],
  },
  {
    id: "2",
    name: "Line 2",
    capacity: 80,
    currentLoad: 60,
    status: "busy",
    operators: ["Mike Johnson", "Sarah Wilson"],
  },
  {
    id: "3",
    name: "Line 3",
    capacity: 120,
    currentLoad: 0,
    status: "available",
    operators: [],
  },
];

const mockOperators: Operator[] = [
  {
    id: "1",
    name: "John Doe",
    skill: "expert",
    currentWorkOrder: "WO-001",
    availability: "busy",
  },
  {
    id: "2",
    name: "Jane Smith",
    skill: "intermediate",
    currentWorkOrder: "WO-001",
    availability: "busy",
  },
  {
    id: "3",
    name: "Mike Johnson",
    skill: "expert",
    currentWorkOrder: "WO-003",
    availability: "busy",
  },
  {
    id: "4",
    name: "Sarah Wilson",
    skill: "beginner",
    currentWorkOrder: "WO-003",
    availability: "busy",
  },
  {
    id: "5",
    name: "Tom Brown",
    skill: "intermediate",
    availability: "available",
  },
  {
    id: "6",
    name: "Lisa Davis",
    skill: "expert",
    availability: "available",
  },
];

const mockProductionRuns: ProductionRun[] = [
  {
    id: "RUN-001",
    workOrderId: "WO-001",
    product: "Premium Widget A",
    quantity: 500,
    status: "running",
    startTime: "2024-03-10T08:00:00Z",
    duration: 240,
    output: 320,
    targetOutput: 400,
    efficiency: 80,
    operator: "John Doe",
    productionLine: "Line 1",
    downtime: 30,
    downtimeReasons: ["Machine maintenance", "Material shortage"],
  },
  {
    id: "RUN-002",
    workOrderId: "WO-002",
    product: "Standard Widget B",
    quantity: 1000,
    status: "paused",
    startTime: "2024-03-10T10:00:00Z",
    duration: 120,
    output: 150,
    targetOutput: 200,
    efficiency: 75,
    operator: "Jane Smith",
    productionLine: "Line 2",
    downtime: 15,
    downtimeReasons: ["Quality check"],
  },
];

const mockWastageRecords: WastageRecord[] = [
  {
    id: "WASTE-001",
    workOrderId: "WO-001",
    product: "Premium Widget A",
    quantity: 25,
    wastageReason: "Material Defect",
    cost: 750,
    status: "pending",
    recordedBy: "John Doe",
    recordedDate: "2024-03-10T14:30:00Z",
    notes: "Material quality issue during production",
    category: "material",
  },
  {
    id: "WASTE-002",
    workOrderId: "WO-002",
    product: "Standard Widget B",
    quantity: 50,
    wastageReason: "Machine Malfunction",
    cost: 1000,
    status: "approved",
    recordedBy: "Jane Smith",
    recordedDate: "2024-03-09T10:15:00Z",
    approvedBy: "Mike Johnson",
    approvedDate: "2024-03-09T16:45:00Z",
    notes: "Machine breakdown caused material waste",
    category: "production",
  },
];

const mockWastageReasons: WastageReason[] = [
  {
    id: "1",
    name: "Material Defect",
    category: "material",
    description: "Raw material quality issues",
  },
  {
    id: "2",
    name: "Machine Malfunction",
    category: "production",
    description: "Equipment breakdown during production",
  },
  {
    id: "3",
    name: "Quality Rejection",
    category: "quality",
    description: "Product failed quality inspection",
  },
  {
    id: "4",
    name: "Handling Damage",
    category: "handling",
    description: "Damage during material handling",
  },
];

const mockFactoryExpenses: FactoryExpense[] = [
  {
    id: "EXP-001",
    description: "Factory rent for March 2024",
    amount: 5000,
    category: "rent",
    status: "approved",
    submittedBy: "John Doe",
    submittedDate: "2024-03-01T09:00:00Z",
    approvedBy: "Mike Johnson",
    approvedDate: "2024-03-02T14:30:00Z",
    attachments: ["rent_invoice.pdf"],
    notes: "Monthly factory rent payment",
  },
  {
    id: "EXP-002",
    description: "Electricity bill - Production Line 1",
    amount: 1200,
    category: "utilities",
    productionLine: "Line 1",
    status: "pending",
    submittedBy: "Jane Smith",
    submittedDate: "2024-03-10T11:15:00Z",
    attachments: ["electricity_bill.pdf"],
    notes: "High electricity usage due to increased production",
  },
];

const mockExpenseCategories: ExpenseCategory[] = [
  {
    id: "1",
    name: "Rent",
    description: "Factory and facility rent",
    requiresApproval: true,
  },
  {
    id: "2",
    name: "Utilities",
    description: "Electricity, water, gas bills",
    requiresApproval: true,
  },
  {
    id: "3",
    name: "Handling",
    description: "Material handling costs",
    requiresApproval: false,
  },
  {
    id: "4",
    name: "Maintenance",
    description: "Equipment maintenance and repairs",
    requiresApproval: true,
  },
  {
    id: "5",
    name: "Consumables",
    description: "Production consumables and supplies",
    requiresApproval: false,
  },
  {
    id: "6",
    name: "Other",
    description: "Other factory expenses",
    requiresApproval: true,
  },
];

// API Service Class
export class FactoryApiService {
  // Factory Management
  static async getFactories(): Promise<Factory[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockFactories;
  }

  static async getFactoryById(id: string): Promise<Factory | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockFactories.find((factory) => factory.id === id) || null;
  }

  static async createFactory(request: CreateFactoryRequest): Promise<Factory> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newFactory: Factory = {
      id: `FACT-${Date.now()}`,
      name: request.name,
      location: request.location,
      managers: request.managers,
      status: "active",
      createdDate: new Date().toISOString(),
      capacity: request.capacity,
      currentLoad: 0,
    };
    mockFactories.push(newFactory);
    return newFactory;
  }

  // Warehouse Management
  static async getWarehouses(): Promise<Warehouse[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockWarehouses;
  }

  static async getWarehouseById(id: string): Promise<Warehouse | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockWarehouses.find((warehouse) => warehouse.id === id) || null;
  }

  static async createWarehouse(
    request: CreateWarehouseRequest
  ): Promise<Warehouse> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newWarehouse: Warehouse = {
      id: `WH-${Date.now()}`,
      name: request.name,
      location: request.location,
      managers: request.managers,
      status: "active",
      createdDate: new Date().toISOString(),
      capacity: request.capacity,
      currentStock: 0,
    };
    mockWarehouses.push(newWarehouse);
    return newWarehouse;
  }

  // Order Management
  static async getOrders(): Promise<Order[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockOrders;
  }

  static async getOrderById(id: string): Promise<Order | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockOrders.find((order) => order.id === id) || null;
  }

  static async acceptOrder(orderId: string): Promise<Order> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const order = mockOrders.find((o) => o.id === orderId);
    if (order) {
      order.status = "accepted";
      order.factoryManager = "Current User";
    }
    return order!;
  }

  static async rejectOrder(orderId: string): Promise<Order> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const order = mockOrders.find((o) => o.id === orderId);
    if (order) {
      order.status = "rejected";
    }
    return order!;
  }

  // Work Order Management
  static async getWorkOrders(): Promise<WorkOrder[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockWorkOrders;
  }

  static async getWorkOrderById(id: string): Promise<WorkOrder | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockWorkOrders.find((wo) => wo.id === id) || null;
  }

  static async createWorkOrder(
    request: CreateWorkOrderRequest
  ): Promise<WorkOrder> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newWorkOrder: WorkOrder = {
      id: `WO-${Date.now()}`,
      orderNumber: request.orderNumber,
      product: request.product,
      quantity: request.quantity,
      deadline: request.deadline,
      status: "draft",
      priority: request.priority,
      progress: 0,
      estimatedHours: request.estimatedHours,
      actualHours: 0,
      productionLine: request.productionLine,
      assignedOperators: request.assignedOperators,
      createdDate: new Date().toISOString(),
      notes: request.notes,
    };
    mockWorkOrders.push(newWorkOrder);
    return newWorkOrder;
  }

  static async updateWorkOrder(
    id: string,
    request: UpdateWorkOrderRequest
  ): Promise<WorkOrder> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const workOrder = mockWorkOrders.find((wo) => wo.id === id);
    if (workOrder) {
      Object.assign(workOrder, request);
    }
    return workOrder!;
  }

  // Production Line Management
  static async getProductionLines(): Promise<ProductionLine[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockProductionLines;
  }

  static async getProductionLineById(
    id: string
  ): Promise<ProductionLine | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockProductionLines.find((line) => line.id === id) || null;
  }

  // Operator Management
  static async getOperators(): Promise<Operator[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockOperators;
  }

  static async getOperatorById(id: string): Promise<Operator | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockOperators.find((operator) => operator.id === id) || null;
  }

  // Production Run Management
  static async getProductionRuns(): Promise<ProductionRun[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockProductionRuns;
  }

  static async getProductionRunById(id: string): Promise<ProductionRun | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockProductionRuns.find((run) => run.id === id) || null;
  }

  static async startProductionRun(runId: string): Promise<ProductionRun> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const run = mockProductionRuns.find((r) => r.id === runId);
    if (run) {
      run.status = "running";
    }
    return run!;
  }

  static async pauseProductionRun(runId: string): Promise<ProductionRun> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const run = mockProductionRuns.find((r) => r.id === runId);
    if (run) {
      run.status = "paused";
    }
    return run!;
  }

  static async stopProductionRun(runId: string): Promise<ProductionRun> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const run = mockProductionRuns.find((r) => r.id === runId);
    if (run) {
      run.status = "stopped";
    }
    return run!;
  }

  static async completeProductionRun(runId: string): Promise<ProductionRun> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const run = mockProductionRuns.find((r) => r.id === runId);
    if (run) {
      run.status = "completed";
      run.endTime = new Date().toISOString();
    }
    return run!;
  }

  // Wastage Management
  static async getWastageRecords(): Promise<WastageRecord[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockWastageRecords;
  }

  static async getWastageRecordById(id: string): Promise<WastageRecord | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockWastageRecords.find((record) => record.id === id) || null;
  }

  static async createWastageRecord(
    request: CreateWastageRecordRequest
  ): Promise<WastageRecord> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newRecord: WastageRecord = {
      id: `WASTE-${Date.now()}`,
      workOrderId: request.workOrderId,
      product: request.product,
      quantity: request.quantity,
      wastageReason: request.wastageReason,
      cost: request.cost,
      status: "pending",
      recordedBy: "Current User",
      recordedDate: new Date().toISOString(),
      notes: request.notes,
      category: request.category,
    };
    mockWastageRecords.push(newRecord);
    return newRecord;
  }

  static async getWastageReasons(): Promise<WastageReason[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockWastageReasons;
  }

  static async approveWastageRecord(
    request: ApproveWastageRequest
  ): Promise<WastageRecord> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const record = mockWastageRecords.find(
      (r) => r.id === request.wastageRecordId
    );
    if (record) {
      record.status = request.approved ? "approved" : "rejected";
      record.approvedBy = "Current User";
      record.approvedDate = new Date().toISOString();
    }
    return record!;
  }

  // Factory Expense Management
  static async getFactoryExpenses(): Promise<FactoryExpense[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockFactoryExpenses;
  }

  static async getFactoryExpenseById(
    id: string
  ): Promise<FactoryExpense | null> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockFactoryExpenses.find((expense) => expense.id === id) || null;
  }

  static async createFactoryExpense(
    request: CreateFactoryExpenseRequest
  ): Promise<FactoryExpense> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const newExpense: FactoryExpense = {
      id: `EXP-${Date.now()}`,
      description: request.description,
      amount: request.amount,
      category: request.category,
      workOrderId: request.workOrderId,
      productionLine: request.productionLine,
      status: "pending",
      submittedBy: "Current User",
      submittedDate: new Date().toISOString(),
      attachments: request.attachments,
      notes: request.notes,
    };
    mockFactoryExpenses.push(newExpense);
    return newExpense;
  }

  static async getExpenseCategories(): Promise<ExpenseCategory[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockExpenseCategories;
  }

  static async approveFactoryExpense(
    request: ApproveExpenseRequest
  ): Promise<FactoryExpense> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const expense = mockFactoryExpenses.find((e) => e.id === request.expenseId);
    if (expense) {
      expense.status = request.approved ? "approved" : "rejected";
      expense.approvedBy = "Current User";
      expense.approvedDate = new Date().toISOString();
    }
    return expense!;
  }

  // Statistics
  static async getFactoryStats(): Promise<FactoryStats> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      totalOrders: 24,
      activeWorkOrders: 8,
      completedToday: 12,
      pendingApprovals: 3,
      efficiency: 87,
      onTimeDelivery: 92,
    };
  }

  static async getProductionStats(): Promise<ProductionStats> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      totalRuns: 15,
      activeRuns: 2,
      completedToday: 8,
      averageEfficiency: 87,
      totalDowntime: 45,
      onTimeDelivery: 92,
    };
  }

  static async getWastageStats(): Promise<WastageStats> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      totalWastage: 90,
      pendingApprovals: 1,
      totalCost: 2200,
      averageWastage: 30,
      topReason: "Material Defect",
      monthlyTrend: -5,
    };
  }

  static async getExpenseStats(): Promise<ExpenseStats> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      totalExpenses: 15,
      pendingApprovals: 3,
      totalAmount: 12500,
      averageExpense: 833,
      monthlyTrend: 12,
      topCategory: "Rent",
    };
  }

  // Recent Activity
  static async getRecentActivity(): Promise<RecentActivity[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [
      {
        id: "1",
        type: "order_accepted",
        description: "Order ORD-2024-001 accepted by Factory Manager",
        timestamp: "2024-03-10T10:30:00Z",
        user: "John Smith",
      },
      {
        id: "2",
        type: "wo_created",
        description: "Work Order WO-001 created for Premium Widget A",
        timestamp: "2024-03-10T11:15:00Z",
        user: "Jane Doe",
      },
      {
        id: "3",
        type: "production_started",
        description: "Production started for WO-001",
        timestamp: "2024-03-10T14:00:00Z",
        user: "Mike Johnson",
      },
    ];
  }
}
