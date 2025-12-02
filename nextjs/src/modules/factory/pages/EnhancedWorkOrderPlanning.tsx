"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
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
  // Enhanced fields for material management
  bomId?: string;
  bomVersion?: string;
  materialRequirements: MaterialRequirement[];
  materialAllocations: MaterialAllocation[];
  materialCost: number;
  laborCost: number;
  totalCost: number;
  costPerUnit: number;
  materialAvailability: "available" | "short" | "unavailable";
  criticalPath: boolean;
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

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setWorkOrders([
      {
        id: "WO-001",
        orderNumber: "ORD-2024-001",
        product: "Premium Widget A",
        productId: "PROD-001",
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
        bomId: "BOM-001",
        bomVersion: "1.2",
        materialRequirements: [
          {
            id: "REQ-001",
            workOrderId: "WO-001",
            materialId: "MAT-001",
            materialName: "Steel Frame",
            materialSku: "SF-001",
            requiredQuantity: 100,
            allocatedQuantity: 80,
            consumedQuantity: 0,
            unitOfMeasure: "pcs",
            status: "allocated",
            priority: 1,
            requiredDate: "2024-03-20",
            bomComponentId: "COMP-001",
            supplierId: "SUP-001",
            supplierName: "Steel Works Ltd",
            unitCost: 25.0,
            totalCost: 2500.0,
            leadTimeDays: 7,
            isCritical: true,
            notes: "Critical component",
          },
        ],
        materialAllocations: [],
        materialCost: 2500.0,
        laborCost: 1200.0,
        totalCost: 3700.0,
        costPerUnit: 7.4,
        materialAvailability: "available",
        criticalPath: true,
      },
      {
        id: "WO-002",
        orderNumber: "ORD-2024-002",
        product: "Standard Widget B",
        productId: "PROD-002",
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
        bomId: "BOM-002",
        bomVersion: "2.0",
        materialRequirements: [],
        materialAllocations: [],
        materialCost: 0,
        laborCost: 0,
        totalCost: 0,
        costPerUnit: 0,
        materialAvailability: "unavailable",
        criticalPath: false,
      },
    ]);

    setProductionLines([
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
    ]);

    setOperators([
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
    ]);
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

  const handleViewWorkOrder = (workOrder: EnhancedWorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailsDialog(true);
  };

  const handlePlanWorkOrder = (workOrder: EnhancedWorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowPlanningDialog(true);
  };

  const handleViewMaterials = (workOrder: EnhancedWorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowMaterialDialog(true);
  };

  const handleViewCosts = (workOrder: EnhancedWorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowCostDialog(true);
  };

  const handleReleaseWorkOrder = (workOrderId: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === workOrderId ? { ...wo, status: "released" as const } : wo
      )
    );
  };

  const handleStartWorkOrder = (workOrderId: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === workOrderId
          ? {
              ...wo,
              status: "in_progress" as const,
              startDate: new Date().toISOString().split("T")[0],
            }
          : wo
      )
    );
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
          <Button>
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
                          <div className="text-sm text-muted-foreground">
                            {wo.orderNumber}
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
                              onClick={() => handleReleaseWorkOrder(wo.id)}
                            >
                              <Play className="h-4 w-4" />
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
                            Material Requirementsnts
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
                            {wo.materialAllocations.length} allocated
                          </div>
                        </div>
                      </div>

                      {wo.materialRequirements.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            Material Requirementsnts:
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
                        <Button variant="outline" size="sm">
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
        <DialogContent className="max-w-4xl">
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
                  </div>
                </CardContent>
              </Card>

              {/* Material Requirementsnts */}
              {selectedWorkOrder.materialRequirements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Material Requirementsnts</CardTitle>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
