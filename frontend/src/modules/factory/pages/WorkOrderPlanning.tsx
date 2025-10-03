import { useState, useEffect, useCallback } from "react";
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

// Using types from API service

export default function WorkOrderPlanning() {
  const { formatCurrency, formatDate } = useFormatting();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [stats, setStats] = useState<WorkOrderStats | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPlanningDialog, setShowPlanningDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load work orders from API
  const loadWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams: WorkOrderQueryParams = {
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter as WorkOrderStatus : undefined,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 50,
      };

      const response = await WorkOrdersApiService.getWorkOrders(queryParams);
      setWorkOrders(response.work_orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work orders');
      console.error('Error loading work orders:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  // Load production lines from API
  const loadProductionLines = useCallback(async () => {
    try {
      const data = await WorkOrdersApiService.getProductionLines();
      setProductionLines(data);
    } catch (err) {
      console.error('Error loading production lines:', err);
    }
  }, []);

  // Load operators from API
  const loadOperators = useCallback(async () => {
    try {
      const data = await WorkOrdersApiService.getOperators();
      setOperators(data);
    } catch (err) {
      console.error('Error loading operators:', err);
    }
  }, []);

  // Load work order statistics
  const loadStats = useCallback(async () => {
    try {
      const data = await WorkOrdersApiService.getWorkOrderStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading work order stats:', err);
    }
  }, []);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  useEffect(() => {
    loadProductionLines();
    loadOperators();
    loadStats();
  }, [loadProductionLines, loadOperators, loadStats]);

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

  const handleViewWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailsDialog(true);
  };

  const handlePlanWorkOrder = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowPlanningDialog(true);
  };

  const handleReleaseWorkOrder = async (workOrderId: string) => {
    try {
      await WorkOrdersApiService.updateWorkOrderStatus(workOrderId, 'released');
      await loadWorkOrders(); // Reload to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release work order');
      console.error('Error releasing work order:', err);
    }
  };

  const handleStartWorkOrder = async (workOrderId: string) => {
    try {
      await WorkOrdersApiService.startWorkOrder(workOrderId);
      await loadWorkOrders(); // Reload to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start work order');
      console.error('Error starting work order:', err);
    }
  };

  const handleCompleteWorkOrder = async (workOrderId: string) => {
    try {
      await WorkOrdersApiService.completeWorkOrder(workOrderId, undefined, "Completed via planning interface");
      await loadWorkOrders(); // Reload to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete work order');
      console.error('Error completing work order:', err);
    }
  };

  const handleCreateWorkOrder = () => {
    setSelectedWorkOrder(null);
    setShowCreateDialog(true);
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
          <Button variant="outline" onClick={loadWorkOrders}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateWorkOrder}>
            <Plus className="h-4 w-4 mr-2" />
            Create Work Order
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
                onClick={() => { setError(null); loadWorkOrders(); }}
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewWorkOrder(wo)}
                          >
                            <Eye className="h-4 w-4" />
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
                              onClick={() => handleReleaseWorkOrder(wo.id.toString())}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {wo.status === "released" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartWorkOrder(wo.id.toString())}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {wo.status === "in_progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteWorkOrder(wo.id.toString())}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
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
                        {operator.name}
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
                        <Button variant="outline" size="sm">
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
            <div className="space-y-6">
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
                  {selectedWorkOrder.assigned_operators.length > 0 ? (
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
            </div>
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select production line" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name} - {line.status} ({line.current_load}% load)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign Operators</Label>
                <div className="space-y-2">
                  {operators
                    .filter((op) => op.availability_status === "available")
                    .map((operator) => (
                      <div
                        key={operator.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox id={operator.id.toString()} />
                        <Label htmlFor={operator.id.toString()} className="flex-1">
                          {operator.name} ({operator.skill_level})
                        </Label>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planning-notes">Planning Notes</Label>
                <Textarea
                  id="planning-notes"
                  placeholder="Add any planning notes..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPlanningDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setShowPlanningDialog(false)}>
                  Save Plan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
