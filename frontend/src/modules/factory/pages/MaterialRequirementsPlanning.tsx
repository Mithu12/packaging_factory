import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
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
import { Progress } from "@/components/ui/progress";
import {
  MaterialRequirement,
  MaterialShortage,
  MaterialPlanningStats,
} from "../types/bom";

export default function MaterialRequirementsPlanning() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
  const [shortages, setShortages] = useState<MaterialShortage[]>([]);
  const [stats, setStats] = useState<MaterialPlanningStats>({
    totalRequirements: 0,
    pendingAllocations: 0,
    materialShortages: 0,
    criticalShortages: 0,
    totalMaterialValue: 0,
    averageLeadTime: 0,
    onTimeDelivery: 0,
    costVariance: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showShortageDialog, setShowShortageDialog] = useState(false);
  const [selectedShortage, setSelectedShortage] =
    useState<MaterialShortage | null>(null);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setRequirements([
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
        notes: "Critical component for production",
      },
      {
        id: "REQ-002",
        workOrderId: "WO-001",
        materialId: "MAT-002",
        materialName: "Electronic Module",
        materialSku: "EM-001",
        requiredQuantity: 50,
        allocatedQuantity: 0,
        consumedQuantity: 0,
        unitOfMeasure: "pcs",
        status: "pending",
        priority: 2,
        requiredDate: "2024-03-25",
        bomComponentId: "COMP-002",
        supplierId: "SUP-002",
        supplierName: "ElectroTech Inc",
        unitCost: 45.0,
        totalCost: 2250.0,
        leadTimeDays: 14,
        isCritical: false,
      },
      {
        id: "REQ-003",
        workOrderId: "WO-002",
        materialId: "MAT-003",
        materialName: "Aluminum Frame",
        materialSku: "AF-001",
        requiredQuantity: 75,
        allocatedQuantity: 75,
        consumedQuantity: 0,
        unitOfMeasure: "pcs",
        status: "allocated",
        priority: 1,
        requiredDate: "2024-03-18",
        bomComponentId: "COMP-003",
        supplierId: "SUP-003",
        supplierName: "Aluminum Co",
        unitCost: 15.0,
        totalCost: 1125.0,
        leadTimeDays: 5,
        isCritical: true,
      },
    ]);

    setShortages([
      {
        id: "SHORT-001",
        materialId: "MAT-002",
        materialName: "Electronic Module",
        materialSku: "EM-001",
        requiredQuantity: 50,
        availableQuantity: 20,
        shortfallQuantity: 30,
        workOrderId: "WO-001",
        workOrderNumber: "ORD-2024-001",
        requiredDate: "2024-03-25",
        priority: "high",
        supplierId: "SUP-002",
        supplierName: "ElectroTech Inc",
        leadTimeDays: 14,
        suggestedAction: "purchase",
        notes: "Need to place urgent order",
      },
      {
        id: "SHORT-002",
        materialId: "MAT-004",
        materialName: "Plastic Housing",
        materialSku: "PH-001",
        requiredQuantity: 200,
        availableQuantity: 0,
        shortfallQuantity: 200,
        workOrderId: "WO-003",
        workOrderNumber: "ORD-2024-003",
        requiredDate: "2024-03-30",
        priority: "critical",
        supplierId: "SUP-004",
        supplierName: "Plastic Molds Inc",
        leadTimeDays: 10,
        suggestedAction: "purchase",
        notes: "Critical shortage - production will stop",
      },
    ]);

    setStats({
      totalRequirements: 25,
      pendingAllocations: 8,
      materialShortages: 5,
      criticalShortages: 2,
      totalMaterialValue: 125000,
      averageLeadTime: 8.5,
      onTimeDelivery: 85,
      costVariance: -5.2,
    });
  }, []);

  const handleViewBOM = (bomId: string) => {
    navigate(`/factory/bom/${bomId}/edit`);
  };

  const handleViewMaterial = (materialId: string) => {
    navigate(`/factory/materials`);
  };

  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch =
      req.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.materialSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.workOrderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" ||
      (priorityFilter === "critical" && req.isCritical) ||
      (priorityFilter === "high" && req.priority === 1) ||
      (priorityFilter === "medium" && req.priority === 2);
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fulfilled":
        return "bg-green-100 text-green-800";
      case "allocated":
        return "bg-blue-100 text-blue-800";
      case "short":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
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

  const handleViewShortage = (shortage: MaterialShortage) => {
    setSelectedShortage(shortage);
    setShowShortageDialog(true);
  };

  const handleGeneratePurchaseOrders = () => {
    console.log("Generating purchase orders for shortages");
  };

  const handleRunMRP = () => {
    console.log("Running Material Requirements Planning");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Material Requirements Planning</h1>
          <p className="text-muted-foreground">
            Plan and manage material requirements for production
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunMRP}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Run MRP
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleGeneratePurchaseOrders}>
            <Plus className="h-4 w-4 mr-2" />
            Generate POs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requirements
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequirements}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingAllocations} pending allocation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Material Shortages
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.materialShortages}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.criticalShortages} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalMaterialValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              material requirements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              On-Time Delivery
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground">
              delivery performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="requirements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requirements">Material Requirements</TabsTrigger>
          <TabsTrigger value="shortages">Material Shortages</TabsTrigger>
          <TabsTrigger value="planning">Planning Analysis</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search requirements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="allocated">Allocated</TabsTrigger>
                    <TabsTrigger value="short">Short</TabsTrigger>
                    <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs value={priorityFilter} onValueChange={setPriorityFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All Priority</TabsTrigger>
                    <TabsTrigger value="critical">Critical</TabsTrigger>
                    <TabsTrigger value="high">High</TabsTrigger>
                    <TabsTrigger value="medium">Medium</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Requirements Table */}
          <Card>
            <CardHeader>
              <CardTitle>Material Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Required Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        {req.workOrderId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{req.materialName}</div>
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
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              req.isCritical
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {req.isCritical ? "CRITICAL" : "NORMAL"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            P{req.priority}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(req.requiredDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.supplierName || (
                          <span className="text-muted-foreground">
                            Not assigned
                          </span>
                        )}
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

        <TabsContent value="shortages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Shortages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shortages.map((shortage) => (
                  <Card key={shortage.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium">
                            {shortage.materialName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {shortage.materialSku} • {shortage.workOrderNumber}
                          </p>
                        </div>
                        <Badge className={getPriorityColor(shortage.priority)}>
                          {shortage.priority.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">Required</div>
                          <div className="text-2xl font-bold">
                            {shortage.requiredQuantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Available</div>
                          <div className="text-2xl font-bold text-green-600">
                            {shortage.availableQuantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Shortfall</div>
                          <div className="text-2xl font-bold text-red-600">
                            {shortage.shortfallQuantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Lead Time</div>
                          <div className="text-2xl font-bold">
                            {shortage.leadTimeDays} days
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Required Date</span>
                          <span>{formatDate(shortage.requiredDate)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Supplier</span>
                          <span>{shortage.supplierName || "Not assigned"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Suggested Action</span>
                          <Badge variant="outline">
                            {shortage.suggestedAction.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {shortage.notes && (
                        <div className="mb-4">
                          <div className="text-sm font-medium">Notes</div>
                          <p className="text-sm text-muted-foreground">
                            {shortage.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewShortage(shortage)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create PO
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Find Substitute
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Lead Time Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Average Lead Time</span>
                      <span>{stats.averageLeadTime} days</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Critical Path Items</span>
                      <span>{stats.criticalShortages}</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>On-Time Delivery</span>
                      <span>{stats.onTimeDelivery}%</span>
                    </div>
                    <Progress value={stats.onTimeDelivery} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(stats.totalMaterialValue)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Material Value
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.costVariance}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cost Variance
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">
                        Avg Cost per Requirement
                      </div>
                      <div className="font-medium">
                        {formatCurrency(
                          stats.totalMaterialValue / stats.totalRequirements
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Pending Value</div>
                      <div className="font-medium">
                        {formatCurrency(stats.totalMaterialValue * 0.3)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MRP Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span>Material Requirements Report</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <AlertTriangle className="h-6 w-6 mb-2" />
                  <span>Shortage Analysis</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>Cost Analysis</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Clock className="h-6 w-6 mb-2" />
                  <span>Lead Time Report</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Target className="h-6 w-6 mb-2" />
                  <span>Supplier Performance</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Package className="h-6 w-6 mb-2" />
                  <span>Inventory Projection</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shortage Details Dialog */}
      <Dialog open={showShortageDialog} onOpenChange={setShowShortageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Shortage Details - {selectedShortage?.materialName}
            </DialogTitle>
            <DialogDescription>
              Detailed analysis of material shortage and recommended actions
            </DialogDescription>
          </DialogHeader>

          {selectedShortage && (
            <div className="space-y-6">
              {/* Shortage Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Shortage Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">Material</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedShortage.materialName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Work Order</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedShortage.workOrderNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Priority</div>
                      <Badge
                        className={getPriorityColor(selectedShortage.priority)}
                      >
                        {selectedShortage.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Required Date</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(selectedShortage.requiredDate)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quantity Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Quantity Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Required Quantity</span>
                      <span className="font-medium">
                        {selectedShortage.requiredQuantity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Available Quantity</span>
                      <span className="font-medium text-green-600">
                        {selectedShortage.availableQuantity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Shortfall Quantity</span>
                      <span className="font-medium text-red-600">
                        {selectedShortage.shortfallQuantity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${
                            (selectedShortage.shortfallQuantity /
                              selectedShortage.requiredQuantity) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Suggested Action</span>
                      <Badge variant="outline">
                        {selectedShortage.suggestedAction.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Supplier</span>
                      <span>
                        {selectedShortage.supplierName || "Not assigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Lead Time</span>
                      <span>{selectedShortage.leadTimeDays} days</span>
                    </div>
                    {selectedShortage.notes && (
                      <div>
                        <div className="text-sm font-medium">Notes</div>
                        <p className="text-sm text-muted-foreground">
                          {selectedShortage.notes}
                        </p>
                      </div>
                    )}
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
