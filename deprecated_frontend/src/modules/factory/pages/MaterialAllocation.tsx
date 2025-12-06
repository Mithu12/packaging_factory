import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Download,
  RefreshCw,
  Target,
  Zap,
  MapPin,
  User,
  Undo2,
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
import { Progress } from "@/components/ui/progress";
import {
  MaterialAllocationsApiService,
  materialAllocationsQueryKeys,
  type MaterialAllocation,
  type MaterialAllocationQueryParams,
  type CreateMaterialAllocationRequest,
} from "@/services/material-allocations-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BOMApiService } from "@/services/bom-api";
import { InventoryApi } from "@/modules/inventory/services/inventory-api";
import { WorkOrdersApiService } from "@/services/work-orders-api";
import { DistributionApi } from "@/modules/inventory/services/distribution-api";

export default function MaterialAllocationPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [selectedAllocation, setSelectedAllocation] =
    useState<MaterialAllocation | null>(null);
  const [newAllocation, setNewAllocation] = useState<Partial<CreateMaterialAllocationRequest>>({
    work_order_requirement_id: "",
    inventory_item_id: 0,
    allocated_quantity: 0,
    allocated_from_location: "",
    notes: "",
  });
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API query parameters
  const queryParams: MaterialAllocationQueryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : '',
    sort_by: "allocated_date",
    sort_order: "desc",
    page: 1,
    limit: 100,
  };

  // Fetch allocations
  const { data: allocationsData, isLoading: allocationsLoading } = useQuery({
    queryKey: materialAllocationsQueryKeys.list(queryParams),
    queryFn: () => MaterialAllocationsApiService.getAllocations(queryParams),
  });

  // Fetch allocation statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: materialAllocationsQueryKeys.stats(),
    queryFn: () => MaterialAllocationsApiService.getAllocationStats(),
  });

  // Fetch work order requirements for dropdown
  const { data: workOrderRequirements, isLoading: requirementsLoading } = useQuery({
    queryKey: ['work-order-requirements'],
    queryFn: () => BOMApiService.getMaterialRequirements(),
  });

  // Fetch inventory items for dropdown
  const { data: inventoryItems, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => InventoryApi.getInventoryItems({ limit: 1000 }),
  });

  // Fetch work orders for dropdown
  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => WorkOrdersApiService.getWorkOrders({ limit: 1000 }),
  });

  // Fetch locations for dropdown
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => DistributionApi.getProductLocations({ limit: 1000 }),
  });

  // Mutation for creating allocations
  const createAllocationMutation = useMutation({
    mutationFn: (data: CreateMaterialAllocationRequest) =>
      MaterialAllocationsApiService.createAllocation(data),
    onSuccess: () => {
      setShowAllocationDialog(false);
      setNewAllocation({
        work_order_requirement_id: "",
        inventory_item_id: 0,
        allocated_quantity: 0, // Will be auto-populated when requirement is selected
        allocated_from_location: "",
        notes: "",
      });
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: materialAllocationsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: materialAllocationsQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to create allocation:", error);
      setError(error instanceof Error ? error.message : "Failed to create allocation");
    },
  });

  // Mutation for returning allocations
  const returnAllocationMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      MaterialAllocationsApiService.returnAllocation(id, notes),
    onSuccess: () => {
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: materialAllocationsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: materialAllocationsQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to return allocation:", error);
      setError(error instanceof Error ? error.message : "Failed to return allocation");
    },
  });

  const allocations = allocationsData?.allocations || [];
  const stats = statsData || {
    total_allocations: 0,
    active_allocations: 0,
    consumed_allocations: 0,
    returned_allocations: 0,
    total_value: 0,
    average_allocation_time: 0,
    on_time_allocation: 0,
    allocation_efficiency: 0,
  };

  // Handle loading state
  if (allocationsLoading || statsLoading || requirementsLoading || inventoryLoading || workOrdersLoading || locationsLoading) {
    return (
      <div className="space-y-6" data-testid="material-allocation-loading">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="material-allocation-loading-title">Material Allocation</h1>
            <p className="text-muted-foreground" data-testid="material-allocation-loading-subtitle">
              Allocate materials to work orders and track consumption
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

  const handleViewWorkOrder = (workOrderId: string) => {
    navigate(`/factory/work-orders`);
  };

  const handleViewMaterial = (materialId: string) => {
    navigate(`/factory/materials`);
  };

  const handleCreateAllocation = () => {
    setNewAllocation({
      work_order_requirement_id: "",
      inventory_item_id: 0,
      allocated_quantity: 0, // Will be auto-populated when requirement is selected
      allocated_from_location: "",
      notes: "",
    });
    setShowAllocationDialog(true);
  };

  // Auto-select inventory item when work order requirement changes
  const handleRequirementChange = (requirementId: string) => {
    setNewAllocation((prev) => ({
      ...prev,
      work_order_requirement_id: requirementId,
      // Clear inventory item when requirement changes
      inventory_item_id: 0,
    }));

    // Find the selected requirement
    const selectedRequirement = workOrderRequirements?.requirements?.find(
      (req) => req.id === requirementId
    );

    if (selectedRequirement && inventoryItems && requirementId) {
      // Try to find matching inventory item by name and SKU first
      let matchingInventoryItem = inventoryItems.find(
        (item) =>
          item.product_name === selectedRequirement.material_name &&
          item.product_sku === selectedRequirement.material_sku
      );

      // If no match by name and SKU, try by ID (convert string to number)
      if (!matchingInventoryItem) {
        matchingInventoryItem = inventoryItems.find(
          (item) => item.id === parseInt(selectedRequirement.material_id)
        );
      }

      // Auto-select the inventory item if found
      if (matchingInventoryItem) {
        setNewAllocation((prev) => ({
          ...prev,
          inventory_item_id: matchingInventoryItem.id,
          // Auto-set allocated quantity based on requirement's required quantity
          allocated_quantity: selectedRequirement.required_quantity,
        }));
        // Optional: Show a toast or some feedback that auto-selection happened
        // toast.info(`Auto-selected inventory item: ${matchingInventoryItem.product_name}`);
      }
    }
  };

  const handleSubmitAllocation = () => {
    if (
      !newAllocation.work_order_requirement_id ||
      !newAllocation.inventory_item_id ||
      !newAllocation.allocated_quantity ||
      !newAllocation.allocated_from_location
    ) {
      setError("Please fill in all required fields");
      return;
    }

    createAllocationMutation.mutate(newAllocation as CreateMaterialAllocationRequest);
  };

  const handleReturnAllocation = (allocationId: string) => {
    if (confirm("Are you sure you want to return this allocation?")) {
      returnAllocationMutation.mutate({ id: allocationId });
    }
  };

  const handleViewAllocation = async (allocation: MaterialAllocation) => {
    setSelectedAllocation(allocation);
    setShowDetailsDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "allocated":
        return "bg-blue-100 text-blue-800";
      case "consumed":
        return "bg-green-100 text-green-800";
      case "returned":
        return "bg-gray-100 text-gray-800";
      case "short":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAllocations = allocations.filter((alloc) => {
    const matchesSearch =
      alloc.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alloc.work_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alloc.allocated_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || alloc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" data-testid="material-allocation-container">
      {/* Header */}
      <div className="flex items-center justify-between" data-testid="material-allocation-header">
        <div>
          <h1 className="text-3xl font-bold" data-testid="material-allocation-title">Material Allocation</h1>
          <p className="text-muted-foreground" data-testid="material-allocation-subtitle">
            Allocate materials to work orders and track consumption
          </p>
        </div>
        <div className="flex gap-2" data-testid="material-allocation-actions">
          <Button variant="outline" onClick={() => {
            queryClient.invalidateQueries({ queryKey: materialAllocationsQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: materialAllocationsQueryKeys.stats() });
          }} data-testid="refresh-allocations-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" data-testid="bulk-allocate-button">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateAllocation} disabled={createAllocationMutation.isPending}>
            {createAllocationMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Allocate Material
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
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="allocation-stats-grid">
        <Card data-testid="total-allocations-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="total-allocations-title">
              Total Allocations
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" data-testid="total-allocations-icon" />
          </CardHeader>
          <CardContent data-testid="total-allocations-content">
            <div className="text-2xl font-bold" data-testid="total-allocations-count">{stats.total_allocations}</div>
            <p className="text-xs text-muted-foreground" data-testid="total-allocations-label">All time allocations</p>
          </CardContent>
        </Card>

        <Card data-testid="active-allocations-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="active-allocations-title">
              Active Allocations
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" data-testid="active-allocations-icon" />
          </CardHeader>
          <CardContent data-testid="active-allocations-content">
            <div className="text-2xl font-bold" data-testid="active-allocations-count">{stats.active_allocations}</div>
            <p className="text-xs text-muted-foreground" data-testid="active-allocations-label">Currently allocated</p>
          </CardContent>
        </Card>

        <Card data-testid="total-value-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="total-value-title">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" data-testid="total-value-icon" />
          </CardHeader>
          <CardContent data-testid="total-value-content">
            <div className="text-2xl font-bold" data-testid="total-value-amount">
              {formatCurrency(stats.total_value)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="total-value-label">Allocated value</p>
          </CardContent>
        </Card>

        <Card data-testid="allocation-efficiency-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="allocation-efficiency-title">
              Allocation Efficiency
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" data-testid="allocation-efficiency-icon" />
          </CardHeader>
          <CardContent data-testid="allocation-efficiency-content">
            <div className="text-2xl font-bold" data-testid="allocation-efficiency-percentage">
              {stats.allocation_efficiency}%
            </div>
            <p className="text-xs text-muted-foreground" data-testid="allocation-efficiency-target">Target: 90%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Material Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search allocations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="allocated">Allocated</TabsTrigger>
                <TabsTrigger value="consumed">Consumed</TabsTrigger>
                <TabsTrigger value="returned">Returned</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Allocations Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Work Order</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Allocated By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAllocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No allocations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAllocations.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{alloc.material_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {alloc.material_sku}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => handleViewWorkOrder(alloc.work_order_id)}
                      >
                        {alloc.work_order_number}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alloc.allocated_quantity}</span>
                        <span className="text-sm text-muted-foreground">
                          {alloc.unit_of_measure}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{alloc.allocated_from_location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{alloc.allocated_by_name || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(alloc.allocated_date)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(alloc.status)}>
                        {alloc.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAllocation(alloc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {alloc.status === "allocated" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturnAllocation(alloc.id.toString())}
                            disabled={returnAllocationMutation.isPending}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            {returnAllocationMutation.isPending ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <Undo2 className="h-4 w-4" />
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

      {/* Create Allocation Dialog */}
      <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Allocate Material</DialogTitle>
            <DialogDescription>
              Allocate materials from inventory to a work order requirement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requirement">Work Order Requirement *</Label>
              <Select
                value={newAllocation.work_order_requirement_id}
                onValueChange={handleRequirementChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work order requirement" />
                </SelectTrigger>
                <SelectContent>
                  {workOrderRequirements?.requirements?.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{req.material_name}</span>
                        <span className="text-sm text-muted-foreground">
                          WO: {req.work_order_id} | Required: {req.required_quantity} {req.unit_of_measure}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory">Inventory Item *</Label>
              <Select
                value={newAllocation.inventory_item_id?.toString() || ""}
                onValueChange={(value) =>
                  setNewAllocation((prev) => ({
                    ...prev,
                    inventory_item_id: parseInt(value) || 0,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems?.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-sm text-muted-foreground">
                          SKU: {item.product_sku} | Stock: {item.current_stock} {item.unit_of_measure}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Allocated Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={newAllocation.allocated_quantity || ""}
                onChange={(e) =>
                  setNewAllocation((prev) => ({
                    ...prev,
                    allocated_quantity: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={newAllocation.allocated_from_location}
                onValueChange={(value) =>
                  setNewAllocation((prev) => ({
                    ...prev,
                    allocated_from_location: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.locations?.map((location) => (
                    <SelectItem key={location.id} value={location.location_in_warehouse || `Location ${location.id}`}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {location.location_in_warehouse || `Location ${location.id}`}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {location.center_name} | Stock: {location.current_stock} {location.product_name}
                        </span>
                      </div>
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="Warehouse A - Shelf 1">Warehouse A - Shelf 1</SelectItem>
                      <SelectItem value="Warehouse A - Shelf 2">Warehouse A - Shelf 2</SelectItem>
                      <SelectItem value="Warehouse B - Shelf 1">Warehouse B - Shelf 1</SelectItem>
                      <SelectItem value="Cold Storage - Zone A">Cold Storage - Zone A</SelectItem>
                      <SelectItem value="Production Floor - Raw Materials">Production Floor - Raw Materials</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch Number</Label>
              <Input
                id="batch"
                value={newAllocation.batch_number || ""}
                onChange={(e) =>
                  setNewAllocation((prev) => ({
                    ...prev,
                    batch_number: e.target.value,
                  }))
                }
                placeholder="Enter batch number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newAllocation.notes || ""}
                onChange={(e) =>
                  setNewAllocation((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Add any notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAllocationDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAllocation}
                disabled={createAllocationMutation.isPending}
              >
                {createAllocationMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Allocating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Allocate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allocation Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Allocation Details</DialogTitle>
          </DialogHeader>

          {selectedAllocation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Material</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAllocation.material_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">SKU</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAllocation.material_sku}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAllocation.allocated_quantity} {selectedAllocation.unit_of_measure}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedAllocation.status)}>
                    {selectedAllocation.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAllocation.allocated_from_location}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Allocated By</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAllocation.allocated_by_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Allocated Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedAllocation.allocated_date)}
                  </p>
                </div>
                {selectedAllocation.batch_number && (
                  <div>
                    <Label className="text-sm font-medium">Batch Number</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedAllocation.batch_number}
                    </p>
                  </div>
                )}
              </div>
              {selectedAllocation.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedAllocation.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
