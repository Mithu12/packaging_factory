import { useState, useEffect } from "react";
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
import { MaterialAllocation, MaterialConsumption } from "../types/bom";

interface AllocationStats {
  totalAllocations: number;
  activeAllocations: number;
  consumedAllocations: number;
  returnedAllocations: number;
  totalValue: number;
  averageAllocationTime: number;
  onTimeAllocation: number;
  allocationEfficiency: number;
}

export default function MaterialAllocation() {
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const [allocations, setAllocations] = useState<MaterialAllocation[]>([]);
  const [consumptions, setConsumptions] = useState<MaterialConsumption[]>([]);
  const [stats, setStats] = useState<AllocationStats>({
    totalAllocations: 0,
    activeAllocations: 0,
    consumedAllocations: 0,
    returnedAllocations: 0,
    totalValue: 0,
    averageAllocationTime: 0,
    onTimeAllocation: 0,
    allocationEfficiency: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);
  const [selectedAllocation, setSelectedAllocation] =
    useState<MaterialAllocation | null>(null);
  const [newAllocation, setNewAllocation] = useState({
    workOrderId: "",
    materialId: "",
    materialName: "",
    allocatedQuantity: 0,
    allocatedFromLocation: "",
    notes: "",
  });

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setAllocations([
      {
        id: "ALLOC-001",
        workOrderId: "WO-001",
        materialId: "MAT-001",
        materialName: "Steel Frame",
        allocatedQuantity: 100,
        allocatedFromLocation: "Main Warehouse - A12-3B",
        allocatedDate: "2024-03-10T10:30:00Z",
        allocatedBy: "John Smith",
        status: "allocated",
        expiryDate: "2024-03-25T00:00:00Z",
        notes: "Critical component for production",
      },
      {
        id: "ALLOC-002",
        workOrderId: "WO-001",
        materialId: "MAT-002",
        materialName: "Electronic Module",
        allocatedQuantity: 50,
        allocatedFromLocation: "Electronics Storage - B5-2A",
        allocatedDate: "2024-03-12T14:20:00Z",
        allocatedBy: "Jane Doe",
        status: "consumed",
        expiryDate: "2024-03-30T00:00:00Z",
        notes: "High-value component",
      },
      {
        id: "ALLOC-003",
        workOrderId: "WO-002",
        materialId: "MAT-003",
        materialName: "Aluminum Frame",
        allocatedQuantity: 75,
        allocatedFromLocation: "Metal Storage - C8-1D",
        allocatedDate: "2024-03-08T09:15:00Z",
        allocatedBy: "Mike Johnson",
        status: "returned",
        expiryDate: "2024-03-22T00:00:00Z",
        notes: "Returned due to quality issues",
      },
    ]);

    setConsumptions([
      {
        id: "CONS-001",
        workOrderId: "WO-001",
        materialId: "MAT-002",
        materialName: "Electronic Module",
        consumedQuantity: 50,
        consumptionDate: "2024-03-15T11:45:00Z",
        productionLineId: "LINE-001",
        productionLineName: "Line 1",
        consumedBy: "Sarah Wilson",
        wastageQuantity: 2,
        wastageReason: "Quality control rejection",
        notes: "Standard consumption for production",
      },
      {
        id: "CONS-002",
        workOrderId: "WO-002",
        materialId: "MAT-003",
        materialName: "Aluminum Frame",
        consumedQuantity: 70,
        consumptionDate: "2024-03-14T16:30:00Z",
        productionLineId: "LINE-002",
        productionLineName: "Line 2",
        consumedBy: "Tom Brown",
        wastageQuantity: 5,
        wastageReason: "Setup waste",
        notes: "Normal production consumption",
      },
    ]);

    setStats({
      totalAllocations: 25,
      activeAllocations: 15,
      consumedAllocations: 8,
      returnedAllocations: 2,
      totalValue: 125000,
      averageAllocationTime: 2.5,
      onTimeAllocation: 92,
      allocationEfficiency: 88,
    });
  }, []);

  const filteredAllocations = allocations.filter((alloc) => {
    const matchesSearch =
      alloc.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alloc.workOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alloc.allocatedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || alloc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "consumed":
        return "bg-green-100 text-green-800";
      case "allocated":
        return "bg-blue-100 text-blue-800";
      case "returned":
        return "bg-orange-100 text-orange-800";
      case "short":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewAllocation = (allocation: MaterialAllocation) => {
    setSelectedAllocation(allocation);
    setShowAllocationDialog(true);
  };

  const handleCreateAllocation = () => {
    setShowAllocationDialog(true);
  };

  const handleRecordConsumption = () => {
    setShowConsumptionDialog(true);
  };

  const handleSaveAllocation = () => {
    const newAllocationData: MaterialAllocation = {
      id: `ALLOC-${Date.now()}`,
      workOrderId: newAllocation.workOrderId,
      materialId: newAllocation.materialId,
      materialName: newAllocation.materialName,
      allocatedQuantity: newAllocation.allocatedQuantity,
      allocatedFromLocation: newAllocation.allocatedFromLocation,
      allocatedDate: new Date().toISOString(),
      allocatedBy: "Current User",
      status: "allocated",
      notes: newAllocation.notes,
    };

    setAllocations((prev) => [newAllocationData, ...prev]);
    setShowAllocationDialog(false);
    setNewAllocation({
      workOrderId: "",
      materialId: "",
      materialName: "",
      allocatedQuantity: 0,
      allocatedFromLocation: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Material Allocation</h1>
          <p className="text-muted-foreground">
            Manage material allocations and consumption tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecordConsumption}>
            <Package className="h-4 w-4 mr-2" />
            Record Consumption
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleCreateAllocation}>
            <Plus className="h-4 w-4 mr-2" />
            Allocate Material
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Allocations
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAllocations}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAllocations} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.consumedAllocations}
            </div>
            <p className="text-xs text-muted-foreground">materials used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">allocated materials</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.allocationEfficiency}%
            </div>
            <p className="text-xs text-muted-foreground">
              allocation efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="allocations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allocations">Material Allocations</TabsTrigger>
          <TabsTrigger value="consumption">Material Consumption</TabsTrigger>
          <TabsTrigger value="returns">Material Returns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
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
                    <TabsTrigger value="short">Short</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Allocations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Material Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Allocated By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllocations.map((alloc) => (
                    <TableRow key={alloc.id}>
                      <TableCell className="font-medium">
                        {alloc.workOrderId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {alloc.materialName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {alloc.materialId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {alloc.allocatedQuantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {alloc.allocatedFromLocation}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(alloc.status)}>
                          {alloc.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{alloc.allocatedBy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(alloc.allocatedDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAllocation(alloc)}
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
        </TabsContent>

        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Consumed</TableHead>
                    <TableHead>Wastage</TableHead>
                    <TableHead>Production Line</TableHead>
                    <TableHead>Consumed By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptions.map((cons) => (
                    <TableRow key={cons.id}>
                      <TableCell className="font-medium">
                        {cons.workOrderId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cons.materialName}</div>
                          <div className="text-sm text-muted-foreground">
                            {cons.materialId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {cons.consumedQuantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {cons.wastageQuantity}
                          </span>
                          {cons.wastageQuantity > 0 && (
                            <Badge
                              variant="outline"
                              className="text-orange-600"
                            >
                              {cons.wastageReason}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {cons.productionLineName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{cons.consumedBy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(cons.consumptionDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allocations
                  .filter((alloc) => alloc.status === "returned")
                  .map((alloc) => (
                    <Card key={alloc.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">
                              {alloc.materialName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {alloc.workOrderId} •{" "}
                              {alloc.allocatedFromLocation}
                            </p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">
                            RETURNED
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-sm font-medium">
                              Returned Quantity
                            </div>
                            <div className="text-2xl font-bold">
                              {alloc.allocatedQuantity}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Returned By
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {alloc.allocatedBy}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Return Date
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(alloc.allocatedDate)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Reason</div>
                            <div className="text-sm text-muted-foreground">
                              Quality issues
                            </div>
                          </div>
                        </div>

                        {alloc.notes && (
                          <div className="mb-4">
                            <div className="text-sm font-medium">Notes</div>
                            <p className="text-sm text-muted-foreground">
                              {alloc.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Process Return
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Allocation Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>On-Time Allocation</span>
                      <span>{stats.onTimeAllocation}%</span>
                    </div>
                    <Progress value={stats.onTimeAllocation} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Allocation Efficiency</span>
                      <span>{stats.allocationEfficiency}%</span>
                    </div>
                    <Progress
                      value={stats.allocationEfficiency}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Average Allocation Time</span>
                      <span>{stats.averageAllocationTime} days</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consumption Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {stats.consumedAllocations}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Materials Consumed
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {allocations.reduce(
                        (sum, alloc) =>
                          sum +
                          (alloc.status === "returned"
                            ? alloc.allocatedQuantity
                            : 0),
                        0
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Materials Returned
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">
                        Total Value Consumed
                      </div>
                      <div className="font-medium">
                        {formatCurrency(stats.totalValue * 0.8)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Wastage Rate</div>
                      <div className="font-medium">3.2%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Allocation Details Dialog */}
      <Dialog
        open={showAllocationDialog}
        onOpenChange={setShowAllocationDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAllocation ? "Allocation Details" : "Allocate Material"}
            </DialogTitle>
            <DialogDescription>
              {selectedAllocation
                ? "View detailed information about the material allocation"
                : "Allocate material for a work order"}
            </DialogDescription>
          </DialogHeader>

          {selectedAllocation ? (
            <div className="space-y-6">
              {/* Allocation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Allocation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">Work Order</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAllocation.workOrderId}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Material</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAllocation.materialName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Quantity</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedAllocation.allocatedQuantity}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Status</div>
                      <Badge
                        className={getStatusColor(selectedAllocation.status)}
                      >
                        {selectedAllocation.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location and Timing */}
              <Card>
                <CardHeader>
                  <CardTitle>Location & Timing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Allocated From</span>
                      <span className="font-medium">
                        {selectedAllocation.allocatedFromLocation}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Allocated By</span>
                      <span className="font-medium">
                        {selectedAllocation.allocatedBy}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Allocation Date</span>
                      <span className="font-medium">
                        {formatDate(selectedAllocation.allocatedDate)}
                      </span>
                    </div>
                    {selectedAllocation.expiryDate && (
                      <div className="flex justify-between items-center">
                        <span>Expiry Date</span>
                        <span className="font-medium">
                          {formatDate(selectedAllocation.expiryDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedAllocation.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {selectedAllocation.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workOrder">Work Order ID</Label>
                <Input
                  id="workOrder"
                  value={newAllocation.workOrderId}
                  onChange={(e) =>
                    setNewAllocation((prev) => ({
                      ...prev,
                      workOrderId: e.target.value,
                    }))
                  }
                  placeholder="WO-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Select
                  value={newAllocation.materialId}
                  onValueChange={(value) => {
                    const material = {
                      id: value,
                      name: "Steel Frame", // In real app, get from API
                    };
                    setNewAllocation((prev) => ({
                      ...prev,
                      materialId: material.id,
                      materialName: material.name,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAT-001">Steel Frame</SelectItem>
                    <SelectItem value="MAT-002">Electronic Module</SelectItem>
                    <SelectItem value="MAT-003">Aluminum Frame</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={newAllocation.allocatedQuantity}
                    onChange={(e) =>
                      setNewAllocation((prev) => ({
                        ...prev,
                        allocatedQuantity: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">From Location</Label>
                  <Input
                    id="location"
                    value={newAllocation.allocatedFromLocation}
                    onChange={(e) =>
                      setNewAllocation((prev) => ({
                        ...prev,
                        allocatedFromLocation: e.target.value,
                      }))
                    }
                    placeholder="Main Warehouse - A12-3B"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newAllocation.notes}
                  onChange={(e) =>
                    setNewAllocation((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Additional notes about the allocation..."
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
                <Button onClick={handleSaveAllocation}>
                  Allocate Material
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
