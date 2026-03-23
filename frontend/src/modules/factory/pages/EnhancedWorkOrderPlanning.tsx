"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Package,
  Users,
  Factory,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  Zap,
  MapPin,
  ShoppingCart,
  History,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import { WorkOrdersApiService, WorkOrder as ApiWorkOrder, ProductionLine as ApiProductionLine, Operator as ApiOperator } from "@/services/work-orders-api";
import { CreatePurchaseOrderForm } from "@/modules/inventory/components/forms/CreatePurchaseOrderForm";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  MaterialRequirement,
  MaterialAllocation,
  MaterialCostAnalysis,
} from "../types/bom";

interface EnhancedWorkOrder {
  id: string;
  orderNumber: string;
  customerOrderNumber?: string;
  customerOrderId?: number;
  product: string;
  productId: string;
  quantity: number;
  deadline: string;
  status:
    | "draft"
    | "planned"
    | "released"
    | "in_progress"
    | "completed"
    | "on_hold"
    | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  progress: number;
  estimatedHours: number;
  actualHours: number;
  productionLine: string;
  productionLineId?: string;
  assignedOperators: string[];
  createdDate: string;
  startDate?: string;
  completionDate?: string;
  notes?: string;
  // Enhanced fields for material management
  materialRequirements: any[];
  materialAllocations?: any[];
  materialCost: number;
  laborCost: number;
  totalCost: number;
  costPerUnit: number;
  materialAvailability: "available" | "short" | "unavailable";
  criticalPath: boolean;
  bomVersion?: string;
  poProductIds?: number[];
}

interface ProductionLine {
  id: string;
  name: string;
  capacity: number;
  currentLoad: number;
  status: "available" | "busy" | "maintenance";
  operators: string[];
}

interface Operator {
  id: string;
  name: string;
  skill: "beginner" | "intermediate" | "expert";
  currentWorkOrder?: string;
  availability: "available" | "busy" | "off_duty";
}

export default function EnhancedWorkOrderPlanning() {
  const router = useRouter();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const [workOrders, setWorkOrders] = useState<EnhancedWorkOrder[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] =
    useState<EnhancedWorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showShortageWarning, setShowShortageWarning] = useState(false);
  const [workOrderToRelease, setWorkOrderToRelease] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePODialog, setShowCreatePODialog] = useState(false);
  const [poDefaultValues, setPoDefaultValues] = useState<{
    work_order_id?: number;
    customer_order_id?: number;
    items?: { product_id: number; product_name: string; quantity: number }[];
  } | undefined>(undefined);
  const [associatedPurchases, setAssociatedPurchases] = useState<any[]>([]);

  const fetchPlanningData = async () => {
    setIsLoading(true);
    try {
      const [woResponse, plResponse, opResponse] = await Promise.all([
        WorkOrdersApiService.getWorkOrders({ limit: 100 }),
        WorkOrdersApiService.getProductionLines(),
        WorkOrdersApiService.getOperators()
      ]);

      setWorkOrders(woResponse.work_orders.map(wo => ({
        id: wo.id,
        orderNumber: wo.work_order_number,
        customerOrderNumber: wo.customer_order_number,
        customerOrderId: wo.customer_order_id,
        product: wo.product_name,
        productId: wo.product_id,
        quantity: wo.quantity,
        deadline: wo.deadline,
        status: wo.status as any,
        priority: wo.priority as any,
        progress: wo.progress,
        estimatedHours: wo.estimated_hours,
        actualHours: wo.actual_hours,
        productionLine: wo.production_line_name || "",
        productionLineId: wo.production_line_id?.toString() || "",
        assignedOperators: wo.assigned_operators?.map(o => o.toString()) || [],
        createdDate: wo.created_at,
        notes: wo.notes,
        materialRequirements: wo.material_requirements || [],
        materialAllocations: [],
        materialCost: wo.total_material_cost || 0,
        laborCost: 0,
        totalCost: wo.total_material_cost || 0,
        costPerUnit: (wo.total_material_cost || 0) / (wo.quantity || 1),
        materialAvailability: wo.has_material_shortages ? "short" : "available",
        criticalPath: false,
        bomVersion: "",
        poProductIds: wo.po_product_ids || []
      })));

      setProductionLines(plResponse.map(pl => ({
        id: pl.id,
        name: pl.name,
        capacity: pl.capacity,
        currentLoad: pl.current_load,
        status: pl.status === 'offline' ? 'maintenance' : pl.status as any,
        operators: [] // We'd need to fetch assignments to populate this
      })));

      setOperators(opResponse.map(op => ({
        id: op.id,
        name: op.user_name || "Unknown",
        skill: op.skill_level === 'master' ? 'expert' : op.skill_level as any,
        currentWorkOrder: op.current_work_order_id,
        availability: op.availability_status === 'on_leave' ? 'off_duty' : op.availability_status as any
      })));
    } catch (error) {
      console.error("Failed to fetch planning data", error);
      toast.error("Failed to load production planning data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
  }, []);

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "released":
        return "bg-purple-100 text-purple-800";
      case "planned":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "on_hold":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMaterialAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available":
        return "bg-green-100 text-green-800";
      case "short":
        return "bg-yellow-100 text-yellow-800";
      case "unavailable":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const mapMaterialRequirements = (requirements: any[]) => {
    return requirements.map((req) => ({
      id: req.id,
      materialId: req.material_id,
      materialName: req.material_name,
      materialSku: req.material_sku,
      requiredQuantity: parseFloat(req.required_quantity || 0),
      allocatedQuantity: parseFloat(req.allocated_quantity || 0),
      unitOfMeasure: req.unit_of_measure,
      status: req.status,
      supplierName: req.supplier_name,
      totalCost: parseFloat(req.total_cost || 0),
    }));
  };

  const handleAllocateMaterial = async (requirement: any) => {
    try {
      if (!selectedWorkOrder) return;
      
      const quantityToAllocate = requirement.requiredQuantity - requirement.allocatedQuantity;
      if (quantityToAllocate <= 0) {
        toast.info("Material already fully allocated");
        return;
      }

      await WorkOrdersApiService.createMaterialAllocation({
        work_order_requirement_id: requirement.id,
        inventory_item_id: Number(requirement.materialId),
        allocated_quantity: quantityToAllocate,
        allocated_from_location: 'Main Warehouse'
      });
      
      toast.success(`Allocated ${quantityToAllocate} units of ${requirement.materialName}`);
      
      const fullWo = await WorkOrdersApiService.getWorkOrderById(selectedWorkOrder.id);
      setSelectedWorkOrder({
        ...selectedWorkOrder,
        materialRequirements: mapMaterialRequirements(fullWo.material_requirements || [])
      });
      
      fetchPlanningData();
    } catch (error: any) {
      toast.error(error.message || "Failed to allocate material");
    }
  };

  const handleCreatePO = (wo: EnhancedWorkOrder, shortageItems?: any[]) => {
    setPoDefaultValues({
      work_order_id: Number(wo.id),
      customer_order_id: wo.customerOrderId,
      items: shortageItems ? shortageItems.map(item => ({
        product_id: Number(item.materialId),
        product_name: item.materialName,
        quantity: item.requiredQuantity - item.allocatedQuantity
      })) : []
    });
    setShowCreatePODialog(true);
  };

  const fetchAssociatedPurchases = async (workOrderId: string) => {
    try {
      const purchases = await WorkOrdersApiService.getWorkOrderPurchases(workOrderId);
      setAssociatedPurchases(purchases);
    } catch (error) {
      console.error("Failed to fetch associated purchases", error);
    }
  };

  const handleViewWorkOrder = async (workOrder: EnhancedWorkOrder) => {
    try {
      const fullWo = await WorkOrdersApiService.getWorkOrderById(workOrder.id);
      setSelectedWorkOrder({
        ...workOrder,
        materialRequirements: mapMaterialRequirements(fullWo.material_requirements || []),
        poProductIds: fullWo.po_product_ids
      });
      fetchAssociatedPurchases(workOrder.id);
      setShowDetailsDialog(true);
    } catch (error) {
      toast.error("Failed to load work order details");
    }
  };

  const handlePlanWorkOrder = (workOrder: EnhancedWorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowPlanningDialog(true);
  };

  const handleViewMaterials = async (workOrder: EnhancedWorkOrder) => {
    try {
      const fullWo = await WorkOrdersApiService.getWorkOrderById(workOrder.id);
      setSelectedWorkOrder({
        ...workOrder,
        materialRequirements: mapMaterialRequirements(fullWo.material_requirements || [])
      });
      setShowMaterialDialog(true);
    } catch (error) {
      toast.error("Failed to load material requirements");
    }
  };

  const handleViewCosts = async (workOrder: EnhancedWorkOrder) => {
    try {
      const fullWo = await WorkOrdersApiService.getWorkOrderById(workOrder.id);
      setSelectedWorkOrder({
        ...workOrder,
        materialRequirements: mapMaterialRequirements(fullWo.material_requirements || [])
      });
      setShowCostDialog(true);
    } catch (error) {
      toast.error("Failed to load cost breakdown");
    }
  };

  const handleReleaseWorkOrder = async (workOrderId: string) => {
    const wo = workOrders.find(w => w.id === workOrderId);
    if (wo?.materialAvailability === 'short' && !showShortageWarning) {
      setWorkOrderToRelease(workOrderId);
      setShowShortageWarning(true);
      return;
    }

    try {
      await WorkOrdersApiService.updateWorkOrderStatus(workOrderId, "released");
      toast.success("Work order released to production");
      setShowShortageWarning(false);
      setWorkOrderToRelease(null);
      fetchPlanningData();
    } catch (error) {
      toast.error("Failed to release work order");
    }
  };

  const handleStartWorkOrder = async (workOrderId: string) => {
    try {
      await WorkOrdersApiService.startWorkOrder(workOrderId);
      toast.success("Work order started");
      fetchPlanningData();
    } catch (error) {
      toast.error("Failed to start work order");
    }
  };

  const handleCompleteWorkOrder = async (workOrderId: string) => {
    try {
      await WorkOrdersApiService.updateWorkOrderStatus(workOrderId, "completed");
      toast.success("Work order completed");
      fetchPlanningData();
    } catch (error) {
      toast.error("Failed to complete work order");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Work Order Planning</h1>
          <p className="text-muted-foreground">
            Plan work orders with integrated material and cost management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button type="button" variant="add" onClick={() => router.push("/factory/customer-orders")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Work Order
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Work Orders
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrders.filter((wo) => wo.status === "in_progress").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in production
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Material Issues
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                workOrders.filter(
                  (wo) => wo.materialAvailability !== "available"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              work orders with material issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                workOrders.reduce((sum, wo) => sum + wo.totalCost, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">planned work orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Path</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrders.filter((wo) => wo.criticalPath).length}
            </div>
            <p className="text-xs text-muted-foreground">critical path items</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="work-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="materials">Material Status</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="planning">Planning View</TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search work orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="planned">Planned</TabsTrigger>
                    <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Work Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-medium">{wo.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{wo.product}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            {wo.customerOrderNumber || wo.orderNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{wo.quantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(wo.deadline)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(wo.status)}>
                          {wo.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(wo.priority)}>
                          {wo.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getMaterialAvailabilityColor(
                              wo.materialAvailability
                            )}
                          >
                            {wo.materialAvailability.toUpperCase()}
                          </Badge>
                          {wo.criticalPath && (
                            <Badge variant="outline" className="text-red-600">
                              CRITICAL
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatCurrency(wo.totalCost)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(wo.costPerUnit)}/unit
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewWorkOrder(wo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMaterials(wo)}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCosts(wo)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          {wo.status === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlanWorkOrder(wo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {wo.status === "planned" && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Release to Production"
                              onClick={() => handleReleaseWorkOrder(wo.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {wo.status === "released" && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Start Production"
                              onClick={() => handleStartWorkOrder(wo.id)}
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          )}
                          {wo.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Complete Work Order"
                              onClick={() => handleCompleteWorkOrder(wo.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders.map((wo) => (
                  <Card key={wo.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium">{wo.product}</h3>
                          <p className="text-sm text-muted-foreground">
                            {wo.id} • {wo.orderNumber}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            className={getMaterialAvailabilityColor(
                              wo.materialAvailability
                            )}
                          >
                            {wo.materialAvailability.toUpperCase()}
                          </Badge>
                          {wo.criticalPath && (
                            <Badge variant="outline" className="text-red-600">
                              CRITICAL PATH
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">BOM Version</div>
                          <div className="text-sm text-muted-foreground">
                            {wo.bomVersion || "Not assigned"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Material Requirements
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {wo.materialRequirements.length} items
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Material Cost
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(wo.materialCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Allocations</div>
                          <div className="text-sm text-muted-foreground">
                            {wo.materialAllocations?.length} allocated
                          </div>
                        </div>
                      </div>

                      {wo.materialRequirements.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            Material Requirements:
                          </div>
                          <div className="space-y-1">
                            {wo.materialRequirements.map((req) => (
                              <div
                                key={req.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>{req.materialName}</span>
                                <div className="flex items-center gap-2">
                                  <span>
                                    {req.requiredQuantity} {req.unitOfMeasure}
                                  </span>
                                  <Badge className={getStatusColor(req.status)}>
                                    {req.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMaterials(wo)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          View Materials
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const shortRequirements = wo.materialRequirements.filter(r => r.status === 'short');
                            const filteredRequirements = shortRequirements.filter(r => 
                              !wo.poProductIds?.includes(Number(r.materialId))
                            );
                            
                            if (filteredRequirements.length === 0 && shortRequirements.length > 0) {
                              toast.info("All short items already have associated Purchase Orders");
                              return;
                            }
                            
                            handleCreatePO(wo, filteredRequirements);
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Create Purchase Order
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Material Cost</TableHead>
                    <TableHead>Labor Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Cost/Unit</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-medium">{wo.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{wo.product}</div>
                          <div className="text-sm text-muted-foreground">
                            {wo.orderNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{wo.quantity.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(wo.materialCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(wo.laborCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(wo.totalCost)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(wo.costPerUnit)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCosts(wo)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Planning View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productionLines.map((line) => (
                  <Card key={line.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium">{line.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Capacity: {line.capacity}% • Current Load:{" "}
                            {line.currentLoad}%
                          </p>
                        </div>
                        <Badge
                          className={
                            line.status === "available"
                              ? "bg-green-100 text-green-800"
                              : line.status === "busy"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {line.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Capacity Utilization</span>
                          <span>{line.currentLoad}%</span>
                        </div>
                        <Progress value={line.currentLoad} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Assigned Operators:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {line.operators.length > 0 ? (
                            line.operators.map((operator, index) => (
                              <Badge key={index} variant="outline">
                                {operator}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">
                              No operators assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Work Order Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Work Order Details - {selectedWorkOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Comprehensive work order information including materials and costs
            </DialogDescription>
          </DialogHeader>

          {selectedWorkOrder && (
            <div className="space-y-6">
              {/* Work Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">Product</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedWorkOrder.product}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Quantity</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedWorkOrder.quantity.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Deadline</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(selectedWorkOrder.deadline)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Status</div>
                      <Badge
                        className={getStatusColor(selectedWorkOrder.status)}
                      >
                        {selectedWorkOrder.status
                          .replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-medium">BOM Version</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedWorkOrder.bomVersion || "Not assigned"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Material Status</div>
                      <Badge
                        className={getMaterialAvailabilityColor(
                          selectedWorkOrder.materialAvailability
                        )}
                      >
                        {selectedWorkOrder.materialAvailability.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Total Cost</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(selectedWorkOrder.totalCost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Cost per Unit</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(selectedWorkOrder.costPerUnit)}
                      </div>
                    </div>
                    {selectedWorkOrder.customerOrderNumber && (
                      <div className="col-span-2">
                        <div className="text-sm font-medium">Parent Order/Quotation</div>
                        <div className="flex items-center gap-2 mt-1">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-primary">
                            {selectedWorkOrder.customerOrderNumber}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => router.push(`/factory/customer-orders?search=${selectedWorkOrder.customerOrderNumber}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Order
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Material Requirements */}
              {selectedWorkOrder.materialRequirements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Material Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Required</TableHead>
                          <TableHead>Allocated</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedWorkOrder.materialRequirements.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {req.materialName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {req.materialSku}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {req.requiredQuantity}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {req.unitOfMeasure}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {req.allocatedQuantity}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {req.unitOfMeasure}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(req.status)}>
                                {req.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {req.supplierName || "Not assigned"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(req.totalCost)}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const existingPO = associatedPurchases.find(po => 
                                  Array.isArray(po.product_ids) && po.product_ids.includes(Number(req.materialId))
                                );

                                return (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex gap-1">
                                      {(req.status === 'pending' || req.status === 'short') && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => handleAllocateMaterial(req)}
                                          title="Allocate Material"
                                        >
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        </Button>
                                      )}
                                      
                                      {req.status === 'short' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => handleCreatePO(selectedWorkOrder, [req])}
                                          title={existingPO ? `PO ${existingPO.po_number} already exists` : "Create Purchase Order"}
                                          disabled={!!existingPO}
                                        >
                                          <ShoppingCart className={`h-4 w-4 ${existingPO ? 'text-muted-foreground' : 'text-blue-600'}`} />
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {existingPO && (
                                      <div 
                                        className="text-[10px] text-blue-600 font-medium cursor-pointer hover:underline flex items-center gap-0.5"
                                        onClick={() => router.push(`/inventory/purchase-orders/${existingPO.id}`)}
                                      >
                                        <ShoppingCart className="h-2 w-2" />
                                        {existingPO.po_number}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Material Cost</span>
                      <span className="font-medium">
                        {formatCurrency(selectedWorkOrder.materialCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Labor Cost</span>
                      <span className="font-medium">
                        {formatCurrency(selectedWorkOrder.laborCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Cost</span>
                      <span className="font-medium text-lg">
                        {formatCurrency(selectedWorkOrder.totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cost per Unit</span>
                      <span className="font-medium">
                        {formatCurrency(selectedWorkOrder.costPerUnit)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Associated Purchases */}
              {associatedPurchases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Associated Purchase Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {associatedPurchases.map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-medium">{po.po_number}</TableCell>
                            <TableCell>{po.supplier_name}</TableCell>
                            <TableCell>{formatDate(po.order_date)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(po.status)}>
                                {po.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/inventory/purchase-orders/${po.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
 
      {/* Material Requirements Dialog */}
      <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Material Requirements - {selectedWorkOrder?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedWorkOrder && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedWorkOrder.materialRequirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{req.materialName}</div>
                          <div className="text-sm text-muted-foreground">{req.materialSku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.requiredQuantity} {req.unitOfMeasure}
                      </TableCell>
                      <TableCell>
                        {req.allocatedQuantity} {req.unitOfMeasure}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(req.status)}>{req.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{req.supplierName || "Not assigned"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(req.totalCost)}</TableCell>
                      <TableCell>
                        {(req.status === 'pending' || req.status === 'short') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleAllocateMaterial(req)}
                            title="Allocate Material"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cost Analysis Dialog */}
      <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cost Analysis - {selectedWorkOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedWorkOrder && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Material Cost</span>
                <span className="font-medium">{formatCurrency(selectedWorkOrder.materialCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Labor Cost</span>
                <span className="font-medium">{formatCurrency(selectedWorkOrder.laborCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-bold">Total Cost</span>
                <span className="font-bold text-lg">{formatCurrency(selectedWorkOrder.totalCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Cost per Unit</span>
                <span className="font-medium">{formatCurrency(selectedWorkOrder.costPerUnit)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
 
      {/* Planning Dialog */}
      <Dialog open={showPlanningDialog} onOpenChange={setShowPlanningDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Work Order</DialogTitle>
            <DialogDescription>
              Assign production line and operators to {selectedWorkOrder?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="production-line" className="text-right">
                Line
              </Label>
              <Select 
                onValueChange={(val) => setSelectedWorkOrder(prev => prev ? {...prev, productionLineId: val} : null)}
                value={selectedWorkOrder?.productionLineId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select production line" />
                </SelectTrigger>
                <SelectContent>
                  {productionLines.map(line => (
                    <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Operators</Label>
              <div className="col-span-3 space-y-2">
                {operators.filter(op => op.availability === 'available').map(op => (
                  <div key={op.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`op-${op.id}`}
                      checked={selectedWorkOrder?.assignedOperators.includes(op.id)}
                      onCheckedChange={(checked) => {
                        setSelectedWorkOrder(prev => {
                          if (!prev) return null;
                          const ops = prev.assignedOperators || [];
                          if (checked) return {...prev, assignedOperators: [...ops, op.id]};
                          return {...prev, assignedOperators: ops.filter(id => id !== op.id)};
                        });
                      }}
                    />
                    <label htmlFor={`op-${op.id}`} className="text-sm font-medium leading-none">
                      {op.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPlanningDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!selectedWorkOrder) return;
              try {
                await WorkOrdersApiService.planWorkOrder(selectedWorkOrder.id, {
                  production_line_id: Number(selectedWorkOrder.productionLineId),
                  assigned_operators: selectedWorkOrder.assignedOperators.map(Number),
                  notes: selectedWorkOrder.notes
                });
                toast.success("Work order planned and assigned");
                setShowPlanningDialog(false);
                fetchPlanningData();
              } catch (error) {
                toast.error("Failed to plan work order");
              }
            }}>
              Confirm Planning
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortage Warning Dialog */}
      <Dialog open={showShortageWarning} onOpenChange={setShowShortageWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Material Shortage Warning
            </DialogTitle>
            <DialogDescription>
              This work order has material shortages. Releasing it now will only allocate currently available stock.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            <p>You will need to manually allocate the missing materials once they are purchased and received in inventory.</p>
            <p className="mt-2 font-medium">Do you still want to release this work order to production?</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setShowShortageWarning(false);
              setWorkOrderToRelease(null);
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => workOrderToRelease && handleReleaseWorkOrder(workOrderToRelease)}
            >
              Continue to Release
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreatePurchaseOrderForm
        open={showCreatePODialog}
        onOpenChange={setShowCreatePODialog}
        defaultValues={poDefaultValues}
        onOrderCreated={() => {
          if (selectedWorkOrder) {
            fetchAssociatedPurchases(selectedWorkOrder.id);
          }
          fetchPlanningData();
        }}
      />
    </div>
  );
}
