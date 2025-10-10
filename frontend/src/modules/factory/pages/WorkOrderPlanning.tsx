import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  WorkOrdersApiService,
  WorkOrder,
  ProductionLine,
  Operator,
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderQueryParams,
  WorkOrderStats,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
} from "@/services/work-orders-api";
import { BOMApiService } from "@/services/bom-api";
import { ProductsApiService, Product, ProductQueryParams as ProductQueryParamsType } from "@/services/products-api";
import { CustomerOrdersApiService, FactoryCustomerOrder } from "../services/customer-orders-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workOrdersQueryKeys } from "@/services/work-orders-api";

// Using types from API service

export default function WorkOrderPlanning() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useFormatting();
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state for creating work orders
  const [newWorkOrder, setNewWorkOrder] = useState<Partial<CreateWorkOrderRequest>>({
    quantity: 1,
    priority: 'medium',
    estimated_hours: 1,
  });

  // Form state for planning work orders
  const [planningData, setPlanningData] = useState<{
    production_line_id?: string;
    assigned_operators: number[];
    notes?: string;
  }>({
    assigned_operators: [],
  });
  const [planningSubmitType, setPlanningSubmitType] = useState<"save" | "plan" | null>(null);

  // Form state for editing work orders
  const [editWorkOrder, setEditWorkOrder] = useState<Partial<UpdateWorkOrderRequest>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();

  // API query parameters
  const queryParams: WorkOrderQueryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter as WorkOrderStatus : "",
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 50,
  };

  // Fetch work orders
  const { data: workOrdersData, isLoading: workOrdersLoading, error: workOrdersError } = useQuery({
    queryKey: workOrdersQueryKeys.list(queryParams),
    queryFn: () => WorkOrdersApiService.getWorkOrders(queryParams),
  });

  // Fetch work order statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: workOrdersQueryKeys.stats(),
    queryFn: () => WorkOrdersApiService.getWorkOrderStats(),
  });

  // Fetch production lines and operators
  const { data: productionLinesData } = useQuery({
    queryKey: workOrdersQueryKeys.productionLines(),
    queryFn: () => WorkOrdersApiService.getProductionLines(),
  });

  const { data: operatorsData } = useQuery({
    queryKey: workOrdersQueryKeys.operators(),
    queryFn: () => WorkOrdersApiService.getOperators(),
  });

  // Fetch products for work order creation
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => ProductsApiService.getProducts({
      status: 'active',
      limit: 100,
    }),
  });

  // Fetch customer orders for work order linking
  const { data: customerOrdersData, isLoading: customerOrdersLoading } = useQuery({
    queryKey: ['customer-orders', 'approved'],
    queryFn: () => CustomerOrdersApiService.getCustomerOrders({
      status: 'approved', // Only show approved orders for linking
      limit: 50,
    }),
  });

  const workOrders = workOrdersData?.work_orders || [];
  const stats = statsData || null;
  const productionLines = productionLinesData || [];
  const operators = operatorsData || [];
  const products = productsData?.products || [];
  const customerOrders = customerOrdersData?.orders || [];
  const loading = workOrdersLoading || statsLoading || productsLoading || customerOrdersLoading;

  // Derived state for selected product
  const selectedProduct = products.find(p => p.id.toString() === newWorkOrder.product_id);

  // Mutation for creating work orders
  const createWorkOrderMutation = useMutation({
    mutationFn: (data: CreateWorkOrderRequest) => WorkOrdersApiService.createWorkOrder(data),
    onSuccess: (result) => {
      console.log("Work order created:", result);
      setShowCreateDialog(false);
      setNewWorkOrder({
        quantity: 1,
        priority: 'medium',
        estimated_hours: 1,
        customer_order_id: undefined,
      });
      // Refresh work orders data and products (for stock updates)
      queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['products', 'active'] });
    },
    onError: (error) => {
      console.error("Failed to create work order:", error);
      setError(error instanceof Error ? error.message : 'Failed to create work order');
    },
  });

  // Mutation for updating work orders (planning)
  const updateWorkOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkOrderRequest }) =>
      WorkOrdersApiService.updateWorkOrder(id, data),
    onSuccess: (result) => {
      console.log("Work order updated:", result);
      setPlanningData({ assigned_operators: [] });
      setEditWorkOrder({});
      // Refresh work orders data and products (for stock updates)
      queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['products', 'active'] });
    },
    onError: (error) => {
      console.error("Failed to update work order:", error);
      setError(error instanceof Error ? error.message : 'Failed to update work order');
    },
  });

  // Mutation for status changes
  const statusChangeMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: WorkOrderStatus; notes?: string }) =>
      WorkOrdersApiService.updateWorkOrderStatus(id, status, notes),
    onSuccess: (result) => {
      console.log("Work order status updated:", result);
      // Refresh work orders data and products (for stock updates)
      queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['products', 'active'] });
    },
    onError: (error) => {
      console.error("Failed to update work order status:", error);
      setError(error instanceof Error ? error.message : 'Failed to update work order status');
    },
  });

  const handleReleaseWorkOrder = (workOrderId: string) => {
    statusChangeMutation.mutate({ id: workOrderId, status: 'released' });
  };

  const handleStartWorkOrder = (workOrderId: string) => {
    statusChangeMutation.mutate({ id: workOrderId, status: 'in_progress' });
  };

  const handleCompleteWorkOrder = (workOrderId: string) => {
    statusChangeMutation.mutate({
      id: workOrderId,
      status: 'completed',
      notes: "Completed via planning interface"
    });
  };

  const planningMutationsPending = updateWorkOrderMutation.isPending || statusChangeMutation.isPending;
  const isSavePlanningPending = planningSubmitType === "save" && planningMutationsPending;
  const isPlanAndPromotePending = planningSubmitType === "plan" && planningMutationsPending;

  // Handle loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Work Order Planning</h1>
            <p className="text-muted-foreground">
              Plan and manage production work orders
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (workOrdersError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Work Order Planning</h1>
            <p className="text-muted-foreground">
              Plan and manage production work orders
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading work orders: {workOrdersError.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  // Work orders are already filtered by the API, so we use them directly
  const filteredWorkOrders = workOrders;

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
        return "bg-orange-100 text-orange-800";
      case "cancelled":
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

  const getLineStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "busy":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewWorkOrder = async (workOrder: WorkOrder) => {
    try {
      // Fetch detailed work order with material requirements
      const detailedWorkOrder = await WorkOrdersApiService.getWorkOrderById(workOrder.id);
      setSelectedWorkOrder(detailedWorkOrder);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error("Failed to fetch work order details:", error);
    }
  };

  const handleViewMaterialRequirements = (workOrder: WorkOrder) => {
    // Navigate to material requirements planning page filtered by this work order
    navigate(`/factory/mrp?work_order_id=${workOrder.id}`);
  };

  const handlePlanWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setPlanningData({
      production_line_id: workOrder.production_line_id,
      assigned_operators: workOrder.assigned_operators || [],
      notes: '',
    });
    setShowPlanningDialog(true);
  };

  const handleEditWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setEditWorkOrder({
      quantity: workOrder.quantity,
      deadline: workOrder.deadline,
      priority: workOrder.priority,
      estimated_hours: workOrder.estimated_hours,
      notes: workOrder.notes,
      specifications: workOrder.specifications,
    });
    setShowEditDialog(true);
  };

  const handleCreateWorkOrder = () => {
    setSelectedWorkOrder(null);
    setNewWorkOrder({
      quantity: 1,
      priority: 'medium',
      estimated_hours: 1,
      customer_order_id: undefined,
    });
    setShowCreateDialog(true);
  };

  const handleSubmitCreateWorkOrder = () => {
    if (!newWorkOrder.product_id || !newWorkOrder.deadline) {
      setError('Product and deadline are required');
      return;
    }

    // Check if quantity exceeds available stock
    if (selectedProduct && newWorkOrder.quantity && newWorkOrder.quantity > selectedProduct.current_stock) {
      setError(`Requested quantity (${newWorkOrder.quantity}) exceeds available stock (${selectedProduct.current_stock})`);
      return;
    }

    // Warning for low stock (less than reorder point)
    if (selectedProduct && newWorkOrder.quantity && newWorkOrder.quantity > selectedProduct.reorder_point) {
      // Could add a confirmation dialog here, but for now just proceed
      console.warn(`Warning: Requested quantity (${newWorkOrder.quantity}) is above reorder point (${selectedProduct.reorder_point})`);
    }

    createWorkOrderMutation.mutate(newWorkOrder as CreateWorkOrderRequest);
  };

  const handleSavePlanning = async (promoteToPlanned: boolean = false) => {
    if (!selectedWorkOrder) return;

    const productionLineId = planningData.production_line_id
      ? parseInt(planningData.production_line_id, 10)
      : undefined;

    if (promoteToPlanned && !productionLineId) {
      setError("Select a production line before marking the work order as planned.");
      return;
    }

    const workOrderId = selectedWorkOrder.id.toString();

    try {
      setPlanningSubmitType(promoteToPlanned ? "plan" : "save");

      if (promoteToPlanned) {
        // Use the new combined planning API that handles both assignment and status change atomically
        const planningRequest = {
          production_line_id: productionLineId,
          assigned_operators: planningData.assigned_operators,
          notes: planningData.notes,
        };

        await WorkOrdersApiService.planWorkOrder(workOrderId, planningRequest);
        console.log("Work order planned successfully with combined API");
      } else {
        // For save-only operations, use the regular update
        const updateData: UpdateWorkOrderRequest = {
          production_line_id: productionLineId,
          assigned_operators: planningData.assigned_operators,
          notes: planningData.notes,
        };

        await updateWorkOrderMutation.mutateAsync({
          id: workOrderId,
          data: updateData,
        });
      }

      setShowPlanningDialog(false);
    } catch (err) {
      console.error("Planning action failed:", err);
      // The new API handles rollback automatically, so we just show the error
      setError(err instanceof Error ? err.message : 'Planning failed. Please try again.');
      // Leave dialog open so the planner can adjust and retry
      setShowPlanningDialog(true);
    } finally {
      setPlanningSubmitType(null);
    }
  };

  const handleSubmitEditWorkOrder = async () => {
    if (!selectedWorkOrder) return;

    try {
      await updateWorkOrderMutation.mutateAsync({
        id: selectedWorkOrder.id.toString(),
        data: editWorkOrder as UpdateWorkOrderRequest,
      });
      setShowEditDialog(false);
    } catch (err) {
      console.error("Failed to save work order edits:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Order Planning</h1>
          <p className="text-muted-foreground">
            Plan and manage production work orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.stats() });
          }}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateWorkOrder} disabled={createWorkOrderMutation.isPending}>
            {createWorkOrderMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Work Order
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.lists() });
                  queryClient.invalidateQueries({ queryKey: workOrdersQueryKeys.stats() });
                }}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Work Orders
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.in_progress_work_orders || workOrders.filter((wo) => wo.status === "in_progress").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in production
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Planned Work Orders
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.planned_work_orders || workOrders.filter((wo) => wo.status === "planned").length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for release</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Lines
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                productionLines.filter((line) => line.status === "available")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Production lines available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="work-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="production-lines">Production Lines</TabsTrigger>
          <TabsTrigger value="operators">Operators</TabsTrigger>
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

          {/* Work Orders Table */}
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
                    <TableHead>Progress</TableHead>
                    <TableHead>Production Line</TableHead>
                    <TableHead>Materials</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading work orders..." : "No work orders found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWorkOrders.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-medium">{wo.work_order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{wo.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {wo.product_sku}
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
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${wo.progress}%` }}
                            />
                          </div>
                          <span className="text-sm">{wo.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {wo.production_line_name || "Not assigned"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {wo.material_requirements_count || 0}
                            </span>
                          </div>
                          {wo.has_material_shortages && (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Shortages
                            </Badge>
                          )}
                          {wo.total_material_cost && (
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(wo.total_material_cost)}
                            </span>
                          )}
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
                          {(wo.material_requirements_count || 0) > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewMaterialRequirements(wo)}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          )}
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
                              onClick={() => handleReleaseWorkOrder(wo.id.toString())}
                              disabled={statusChangeMutation.isPending}
                            >
                              {statusChangeMutation.isPending ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {wo.status === "released" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartWorkOrder(wo.id.toString())}
                              disabled={statusChangeMutation.isPending}
                            >
                              {statusChangeMutation.isPending ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {wo.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteWorkOrder(wo.id.toString())}
                              className="text-green-600 hover:text-green-700"
                              disabled={statusChangeMutation.isPending}
                            >
                              {statusChangeMutation.isPending ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production-lines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Lines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productionLines.map((line) => (
                  <Card key={line.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{line.name}</span>
                        <Badge className={getLineStatusColor(line.status)}>
                          {line.status.toUpperCase()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Capacity</span>
                          <span>{line.capacity}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${line.current_load}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Current Load</span>
                          <span>{line.current_load}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Operators:</span>
                          <div className="mt-1">
                            <span className="text-muted-foreground">View operators in Operators tab</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operators</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Skill Level</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Current Work Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.map((operator) => (
                    <TableRow key={operator.id}>
                      <TableCell className="font-medium">
                        {operator.user_name || operator.employee_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {operator.skill_level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            operator.availability_status === "available"
                              ? "bg-green-100 text-green-800"
                              : operator.availability_status === "busy"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {operator.availability_status
                            .replace("_", " ")
                            .toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {operator.current_work_order_id ? `WO-${operator.current_work_order_id}` : "None"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWorkOrder(wo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              View detailed information about the work order
            </DialogDescription>
          </DialogHeader>

          {selectedWorkOrder && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="operators">Operators</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
              {/* Work Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Work Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Product</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.product_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Quantity</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.quantity.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Deadline</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedWorkOrder.deadline)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Badge
                        className={getStatusColor(selectedWorkOrder.status)}
                      >
                        {selectedWorkOrder.status
                          .replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Estimated Hours
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.estimated_hours}h
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Actual Hours
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.actual_hours}h
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Production Line
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.production_line_name || "Not assigned"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Progress</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.progress}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Operators */}
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Operators</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedWorkOrder?.assigned_operators?.length > 0 ? (
                    <div className="flex gap-2">
                      {selectedWorkOrder.assigned_operators.map(
                        (operator, index) => (
                          <Badge key={index} variant="outline">
                            {operator}
                          </Badge>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No operators assigned
                    </p>
                  )}
                </CardContent>
              </Card>

                {/* Notes */}
                {selectedWorkOrder.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkOrder.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="materials" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Material Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedWorkOrder.material_requirements && selectedWorkOrder.material_requirements.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Required</TableHead>
                            <TableHead>Allocated</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Supplier</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedWorkOrder.material_requirements.map((req) => (
                            <TableRow key={req.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{req.material_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {req.material_sku}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{req.required_quantity}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {req.unit_of_measure}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{req.allocated_quantity}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {req.unit_of_measure}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(req.status)}>
                                  {req.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(req.total_cost)}
                              </TableCell>
                              <TableCell>
                                {req.supplier_name || "Not assigned"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No material requirements found for this work order.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="operators" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Operator Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Operator assignment and management features would go here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Planning Dialog */}
      <Dialog open={showPlanningDialog} onOpenChange={setShowPlanningDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan Work Order - {selectedWorkOrder?.id}</DialogTitle>
            <DialogDescription>
              Assign production line and operators for this work order
            </DialogDescription>
          </DialogHeader>

          {selectedWorkOrder && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="production-line">Production Line</Label>
                <Select
                  value={planningData.production_line_id || ''}
                  onValueChange={(value) => setPlanningData(prev => ({ ...prev, production_line_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select production line" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.length > 0 ? (
                      productionLines.map((line) => (
                        <SelectItem key={line.id} value={line.id.toString()}>
                          {line.name} - {line.status} ({line.current_load}% load)
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No production lines available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign Operators</Label>
                <div className="space-y-2">
                  {operators.length > 0 ? (
                    operators
                      .filter((op) => op.availability_status === "available")
                      .map((operator) => (
                        <div
                          key={operator.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={operator.id.toString()}
                            checked={planningData.assigned_operators.includes(parseInt(operator.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPlanningData(prev => ({
                                  ...prev,
                                  assigned_operators: [...prev.assigned_operators, parseInt(operator.id)]
                                }));
                              } else {
                                setPlanningData(prev => ({
                                  ...prev,
                                  assigned_operators: prev.assigned_operators.filter(id => id !== parseInt(operator.id))
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={operator.id.toString()} className="flex-1">
                            {operator.user_name || operator.employee_id} ({operator.skill_level})
                          </Label>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No available operators</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planning-notes">Planning Notes</Label>
                <Textarea
                  id="planning-notes"
                  placeholder="Add any planning notes..."
                  value={planningData.notes || ''}
                  onChange={(e) => setPlanningData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPlanningDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSavePlanning(false)}
                  disabled={planningMutationsPending}
                >
                  {isSavePlanningPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Plan
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleSavePlanning(true)}
                  disabled={planningMutationsPending}
                >
                  {isPlanAndPromotePending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Marking Planned...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save &amp; Mark Planned
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Work Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Work Order</DialogTitle>
            <DialogDescription>
              Create a new production work order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={newWorkOrder.product_id || ''}
                  onValueChange={(value) => setNewWorkOrder(prev => ({ ...prev, product_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsData?.products?.length > 0 ? (
                      productsData.products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          <div className="flex flex-col">
                            <span>{product.name} ({product.sku})</span>
                            <span className={`text-xs ${product.current_stock <= product.reorder_point ? 'text-red-600' : 'text-muted-foreground'}`}>
                              Stock: {product.current_stock} {product.current_stock <= product.reorder_point && '(Low Stock)'}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No products available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <div className="flex gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    value={newWorkOrder.quantity || ''}
                    onChange={(e) => setNewWorkOrder(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    min="1"
                    className="flex-1"
                  />
                  <div className="flex items-center px-3 py-2 bg-muted rounded-md text-sm">
                    {selectedProduct?.unit_of_measure || 'units'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={newWorkOrder.deadline || ''}
                  onChange={(e) => setNewWorkOrder(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newWorkOrder.priority || 'medium'}
                  onValueChange={(value: WorkOrderPriority) => setNewWorkOrder(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated-hours">Estimated Hours</Label>
              <Input
                id="estimated-hours"
                type="number"
                value={newWorkOrder.estimated_hours || ''}
                onChange={(e) => setNewWorkOrder(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 1 }))}
                min="0.1"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-order">Customer Order (Optional)</Label>
              <Select
                value={newWorkOrder.customer_order_id?.toString() || 'none'}
                onValueChange={(value) => setNewWorkOrder(prev => ({
                  ...prev,
                  customer_order_id: value && value !== 'none' ? parseInt(value) : undefined
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer order (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customerOrdersData?.orders?.length > 0 ? (
                    customerOrdersData.orders.map((order) => (
                      <SelectItem key={order.id} value={order.id.toString()}>
                        {order.order_number} - {order.factory_customer_name} (${order.total_value})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No approved orders available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes for this work order..."
                value={newWorkOrder.notes || ''}
                onChange={(e) => setNewWorkOrder(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCreateWorkOrder}
                disabled={createWorkOrderMutation.isPending}
              >
                {createWorkOrderMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Work Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Work Order Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Work Order - {selectedWorkOrder?.work_order_number}</DialogTitle>
            <DialogDescription>
              Modify work order details
            </DialogDescription>
          </DialogHeader>

          {selectedWorkOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={editWorkOrder.quantity || ''}
                    onChange={(e) => setEditWorkOrder(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editWorkOrder.priority || selectedWorkOrder.priority}
                    onValueChange={(value: WorkOrderPriority) => setEditWorkOrder(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="datetime-local"
                    value={editWorkOrder.deadline || selectedWorkOrder.deadline}
                    onChange={(e) => setEditWorkOrder(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-estimated-hours">Estimated Hours</Label>
                  <Input
                    id="edit-estimated-hours"
                    type="number"
                    value={editWorkOrder.estimated_hours || ''}
                    onChange={(e) => setEditWorkOrder(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 1 }))}
                    min="0.1"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Add any notes for this work order..."
                  value={editWorkOrder.notes || selectedWorkOrder.notes || ''}
                  onChange={(e) => setEditWorkOrder(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-specifications">Specifications</Label>
                <Textarea
                  id="edit-specifications"
                  placeholder="Add any specifications for this work order..."
                  value={editWorkOrder.specifications || selectedWorkOrder.specifications || ''}
                  onChange={(e) => setEditWorkOrder(prev => ({ ...prev, specifications: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitEditWorkOrder}
                  disabled={updateWorkOrderMutation.isPending}
                >
                  {updateWorkOrderMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
