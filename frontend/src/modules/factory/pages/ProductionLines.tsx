import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Zap,
  Target,
  Activity,
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
  ProductionLinesApiService,
  productionLinesQueryKeys,
  type ProductionLine,
  type ProductionLineQueryParams,
  type CreateProductionLineRequest,
  type UpdateProductionLineRequest,
} from "@/services/production-lines-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProductionLinesPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showProductionLineDialog, setShowProductionLineDialog] = useState(false);
  const [selectedProductionLine, setSelectedProductionLine] =
    useState<ProductionLine | null>(null);
  const [newProductionLine, setNewProductionLine] = useState<Partial<CreateProductionLineRequest>>({
    name: "",
    code: "",
    capacity: 1,
    description: "",
    location: "",
  });
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API query parameters
  const queryParams: ProductionLineQueryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    is_active: statusFilter !== "all" ? undefined : true,
    sort_by: "name",
    sort_order: "asc",
    page: 1,
    limit: 100,
  };

  // Fetch production lines
  const { data: productionLinesData, isLoading: productionLinesLoading } = useQuery({
    queryKey: productionLinesQueryKeys.list(queryParams),
    queryFn: () => ProductionLinesApiService.getProductionLines(queryParams),
  });

  // Fetch production line statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: productionLinesQueryKeys.stats(),
    queryFn: () => ProductionLinesApiService.getProductionLineStats(),
  });

  // Mutation for creating production lines
  const createProductionLineMutation = useMutation({
    mutationFn: (data: CreateProductionLineRequest) =>
      ProductionLinesApiService.createProductionLine(data),
    onSuccess: () => {
      setShowProductionLineDialog(false);
      setNewProductionLine({
        name: "",
        code: "",
        capacity: 1,
        description: "",
        location: "",
      });
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: productionLinesQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: productionLinesQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to create production line:", error);
      setError(error instanceof Error ? error.message : "Failed to create production line");
    },
  });

  // Mutation for updating production lines
  const updateProductionLineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductionLineRequest }) =>
      ProductionLinesApiService.updateProductionLine(id, data),
    onSuccess: () => {
      setShowProductionLineDialog(false);
      setSelectedProductionLine(null);
      setNewProductionLine({
        name: "",
        code: "",
        capacity: 1,
        description: "",
        location: "",
      });
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: productionLinesQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: productionLinesQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to update production line:", error);
      setError(error instanceof Error ? error.message : "Failed to update production line");
    },
  });

  // Mutation for deleting production lines
  const deleteProductionLineMutation = useMutation({
    mutationFn: (id: string) => ProductionLinesApiService.deleteProductionLine(id),
    onSuccess: () => {
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: productionLinesQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: productionLinesQueryKeys.stats(),
      });
    },
    onError: (error) => {
      console.error("Failed to delete production line:", error);
      setError(error instanceof Error ? error.message : "Failed to delete production line");
    },
  });

  const production_lines = productionLinesData?.production_lines || [];
  const stats = statsData || {
    total_lines: 0,
    available_lines: 0,
    busy_lines: 0,
    maintenance_lines: 0,
    offline_lines: 0,
    total_capacity: 0,
    current_load: 0,
    utilization_rate: 0,
  };

  // Handle loading state
  if (productionLinesLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Production Lines</h1>
            <p className="text-muted-foreground">
              Manage factory production lines and monitor capacity
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

  const handleViewProductionLine = (productionLine: ProductionLine) => {
    setSelectedProductionLine(productionLine);
    setShowDetailsDialog(true);
  };

  const handleCreateProductionLine = () => {
    setNewProductionLine({
      name: "",
      code: "",
      capacity: 1,
      description: "",
      location: "",
    });
    setShowProductionLineDialog(true);
  };

  const handleEditProductionLine = (productionLine: ProductionLine) => {
    setSelectedProductionLine(productionLine);
    setNewProductionLine({
      name: productionLine.name,
      code: productionLine.code,
      capacity: productionLine.capacity,
      description: productionLine.description || "",
      location: productionLine.location || "",
    });
    setShowProductionLineDialog(true);
  };

  const handleSubmitProductionLine = () => {
    if (!newProductionLine.name || !newProductionLine.code || !newProductionLine.capacity) {
      setError("Please fill in all required fields");
      return;
    }

    if (selectedProductionLine) {
      // Update existing production line
      updateProductionLineMutation.mutate({
        id: selectedProductionLine.id,
        data: newProductionLine as UpdateProductionLineRequest,
      });
    } else {
      // Create new production line
      createProductionLineMutation.mutate(newProductionLine as CreateProductionLineRequest);
    }
  };

  const handleDeleteProductionLine = (productionLineId: string) => {
    if (confirm("Are you sure you want to delete this production line?")) {
      deleteProductionLineMutation.mutate(productionLineId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "busy":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "offline":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "bg-red-500";
    if (utilization >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const filteredProductionLines = production_lines.filter((line) => {
    const matchesSearch =
      line.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || line.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Lines</h1>
          <p className="text-muted-foreground">
            Manage factory production lines and monitor capacity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            queryClient.invalidateQueries({ queryKey: productionLinesQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: productionLinesQueryKeys.stats() });
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateProductionLine} disabled={createProductionLineMutation.isPending}>
            {createProductionLineMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Production Line
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Lines
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_lines}</div>
            <p className="text-xs text-muted-foreground">Active production lines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Lines
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.available_lines}</div>
            <p className="text-xs text-muted-foreground">Ready for production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.total_capacity)}
            </div>
            <p className="text-xs text-muted-foreground">Total capacity units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilization Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.utilization_rate}%
            </div>
            <Progress value={stats.utilization_rate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Current utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Production Lines</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search production lines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="available">Available</TabsTrigger>
                <TabsTrigger value="busy">Busy</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="offline">Offline</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Production Lines Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Current Load</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProductionLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No production lines found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductionLines.map((line) => {
                  const utilization = line.capacity > 0 ? (line.current_load / line.capacity) * 100 : 0;
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{line.name}</div>
                          {line.description && (
                            <div className="text-sm text-muted-foreground">
                              {line.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{line.code}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{line.capacity}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{line.current_load}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16">
                            <Progress value={utilization} className="h-2" />
                          </div>
                          <span className="text-sm">{Math.round(utilization)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{line.location || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(line.status)}>
                          {line.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProductionLine(line)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProductionLine(line)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProductionLine(line.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Production Line Dialog */}
      <Dialog open={showProductionLineDialog} onOpenChange={setShowProductionLineDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProductionLine ? 'Edit Production Line' : 'Add Production Line'}
            </DialogTitle>
            <DialogDescription>
              {selectedProductionLine
                ? 'Update the production line information'
                : 'Create a new production line for your factory'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newProductionLine.name}
                  onChange={(e) =>
                    setNewProductionLine((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter production line name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={newProductionLine.code}
                  onChange={(e) =>
                    setNewProductionLine((prev) => ({
                      ...prev,
                      code: e.target.value,
                    }))
                  }
                  placeholder="Enter unique code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                value={newProductionLine.capacity || ""}
                onChange={(e) =>
                  setNewProductionLine((prev) => ({
                    ...prev,
                    capacity: parseInt(e.target.value) || 1,
                  }))
                }
                placeholder="Enter capacity"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newProductionLine.location}
                onChange={(e) =>
                  setNewProductionLine((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                placeholder="e.g., Building A - Floor 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProductionLine.description}
                onChange={(e) =>
                  setNewProductionLine((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add description..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowProductionLineDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitProductionLine}
                disabled={
                  createProductionLineMutation.isPending ||
                  updateProductionLineMutation.isPending
                }
              >
                {(createProductionLineMutation.isPending || updateProductionLineMutation.isPending) ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    {selectedProductionLine ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedProductionLine ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Production Line Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Production Line Details</DialogTitle>
          </DialogHeader>

          {selectedProductionLine && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProductionLine.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Code</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProductionLine.code}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Capacity</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProductionLine.capacity} units
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Current Load</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProductionLine.current_load} units
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Utilization</Label>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(selectedProductionLine.current_load / selectedProductionLine.capacity) * 100}
                      className="flex-1 h-2"
                    />
                    <span className="text-sm">
                      {Math.round((selectedProductionLine.current_load / selectedProductionLine.capacity) * 100)}%
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedProductionLine.status)}>
                    {selectedProductionLine.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProductionLine.location || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProductionLine.is_active ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              {selectedProductionLine.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProductionLine.description}
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
