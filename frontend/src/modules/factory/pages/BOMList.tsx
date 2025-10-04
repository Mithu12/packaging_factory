import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  History,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Download,
  Upload,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { BillOfMaterials, BOMStats, BOMQueryParams } from "../types/bom";
import { BOMApiService, bomQueryKeys } from "@/services/bom-api";
import { useQuery } from "@tanstack/react-query";

export default function BOMList() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showBOMDialog, setShowBOMDialog] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BillOfMaterials | null>(null);

  // API query parameters
  const queryParams: BOMQueryParams = {
    search: searchTerm || undefined,
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
    page: 1,
    limit: 50,
  };

  // Fetch BOMs data
  const { data: bomsData, isLoading: bomsLoading } = useQuery({
    queryKey: bomQueryKeys.list(queryParams),
    queryFn: () => BOMApiService.getBOMs(queryParams),
  });

  // Fetch BOM statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: bomQueryKeys.stats(),
    queryFn: () => BOMApiService.getBOMStats(),
  });

  const boms = bomsData?.boms || [];
  const stats = statsData || {
    total_boms: 0,
    active_boms: 0,
    average_components: 0,
    average_cost: 0,
    most_expensive_bom: "",
    least_expensive_bom: "",
    components_without_supplier: 0,
    outdated_boms: 0,
  };

  const handleCreateBOM = () => {
    navigate("/factory/bom/new");
  };

  const handleEditBOM = (bomId: string) => {
    navigate(`/factory/bom/${bomId}/edit`);
  };

  const handleViewBOM = async (bom: BillOfMaterials) => {
    try {
      const detailedBOM = await BOMApiService.getBOMById(bom.id);
      setSelectedBOM(detailedBOM);
      setShowBOMDialog(true);
    } catch (error) {
      console.error("Failed to fetch BOM details:", error);
    }
  };

  // Local filtering for search (API handles status filtering)
  const filteredBOMs = boms.filter((bom) => {
    if (!searchTerm) return true;

    return (
      bom.parent_product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.parent_product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.version?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const handleCopyBOM = (bom: BillOfMaterials) => {
    // Copy BOM functionality
    console.log("Copy BOM:", bom.id);
  };

  const handleViewHistory = (bom: BillOfMaterials) => {
    // View BOM version history
    console.log("View history for BOM:", bom.id);
  };

  // Handle loading states
  if (bomsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bill of Materials</h1>
            <p className="text-muted-foreground">
              Manage product component structures and material requirements
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bill of Materials</h1>
          <p className="text-muted-foreground">
            Manage product component structures and material requirements
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import BOM
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export BOM
          </Button>
          <Button onClick={handleCreateBOM}>
            <Plus className="h-4 w-4 mr-2" />
            Create BOM
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total BOMs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_boms}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_boms} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Components
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.average_components}</div>
            <p className="text-xs text-muted-foreground">per BOM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.average_cost)}
            </div>
            <p className="text-xs text-muted-foreground">per BOM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.components_without_supplier + stats.outdated_boms}
            </div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all-boms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-boms">All BOMs</TabsTrigger>
          <TabsTrigger value="active-boms">Active BOMs</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all-boms" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search BOMs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="inactive">Inactive</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* BOMs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BOM ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBOMs.map((bom) => (
                    <TableRow key={bom.id}>
                      <TableCell className="font-medium">{bom.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {bom.parent_product_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {bom.parent_product_sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{bom.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {bom.components?.length || 0}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            components
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(bom.total_cost)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(bom.is_active)}>
                          {bom.is_active ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {formatDate(bom.created_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by User {bom.created_by}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewBOM(bom)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditBOM(bom.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit BOM
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyBOM(bom)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy BOM
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewHistory(bom)}
                            >
                              <History className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active-boms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active BOMs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {boms
                  .filter((bom) => bom.is_active)
                  .map((bom) => (
                    <Card key={bom.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">
                              {bom.parent_product_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {bom.id} • Version {bom.version}
                            </p>
                          </div>
                          <Badge className={getStatusColor(bom.is_active)}>
                            ACTIVE
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-sm font-medium">
                              Components
                            </div>
                            <div className="text-2xl font-bold">
                              {bom.components?.length || 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Total Cost
                            </div>
                            <div className="text-2xl font-bold">
                              {formatCurrency(bom.total_cost)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">Created</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(bom.created_at)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Created By
                            </div>
                            <div className="text-sm text-muted-foreground">
                              User {bom.created_by}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewBOM(bom)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBOM(bom.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BOM Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border border-orange-200 rounded-lg bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">
                      Components Without Supplier
                    </p>
                    <p className="text-sm text-orange-700">
                      {stats.componentsWithoutSupplier} components need supplier
                      assignment
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Outdated BOMs</p>
                    <p className="text-sm text-yellow-700">
                      {stats.outdatedBOMs} BOMs need version updates
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Most Expensive</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {stats.most_expensive_bom}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(stats.average_cost * 1.5)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Least Expensive</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {stats.least_expensive_bom}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(stats.average_cost * 0.3)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>BOM Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Active BOMs</span>
                      <span>
                        {Math.round((stats.active_boms / stats.total_boms) * 100)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={(stats.active_boms / stats.total_boms) * 100}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Components with Suppliers</span>
                      <span>
                        {Math.round(
                          ((stats.total_boms * stats.average_components -
                            stats.components_without_supplier) /
                            (stats.total_boms * stats.average_components)) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* BOM Details Dialog */}
      <Dialog open={showBOMDialog} onOpenChange={setShowBOMDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>BOM Details - {selectedBOM?.id}</DialogTitle>
            <DialogDescription>
              View detailed information about the bill of materials
            </DialogDescription>
          </DialogHeader>

          {selectedBOM && (
            <div className="space-y-6">
              {/* BOM Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>BOM Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium">Product</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedBOM.parent_product_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Version</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedBOM.version}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Components</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedBOM.components?.length || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Total Cost</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(selectedBOM.total_cost)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Components Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Lead Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBOM.components?.map((component) => (
                        <TableRow key={component.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {component.component_product_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {component.component_product_sku}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{component.quantity_required}</span>
                              <span className="text-sm text-muted-foreground">
                                {component.unit_of_measure}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(component.unit_cost)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(component.total_cost)}
                          </TableCell>
                          <TableCell>
                            {component.supplier_name || "Not assigned"}
                          </TableCell>
                          <TableCell>{component.lead_time_days} days</TableCell>
                        </TableRow>
                      )) || []}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
