"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Plus,
  Eye,
  Edit,
  Download,
  RefreshCw,
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
import { Progress } from "@/components/ui/progress";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  BOMApiService,
  bomQueryKeys,
  type MaterialPlanningStats,
  type MaterialShortage,
  type MaterialRequirementsQueryParams as ApiMaterialRequirementsQueryParams,
  type WorkOrderMaterialRequirement,
} from "@/services/bom-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type RequirementsQueryParams = ApiMaterialRequirementsQueryParams & {
  page?: number;
  limit?: number;
  search?: string;
};

export default function MaterialRequirementsPlanning() {
  const router = useRouter();
  const { formatCurrency, formatDate } = useFormatting();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showShortageDialog, setShowShortageDialog] = useState(false);
  const [selectedShortage, setSelectedShortage] =
    useState<MaterialShortage | null>(null);
  const [showRequirementDialog, setShowRequirementDialog] = useState(false);
  const [selectedRequirement, setSelectedRequirement] =
    useState<WorkOrderMaterialRequirement | null>(null);
  const [generatedPOs, setGeneratedPOs] = useState<string[]>([]);
  const [showPODialog, setShowPODialog] = useState(false);
  const queryClient = useQueryClient();

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, searchTerm]);

  // API query parameters
  const queryParams: RequirementsQueryParams = {
    search: debouncedSearchTerm || undefined,
    status: statusFilter === "all" ? "" : statusFilter,
    sort_by: "required_date",
    sort_order: "asc",
    page: currentPage,
    limit: pageSize,
  };

  // Fetch material requirements
  const { data: requirementsData, isLoading: requirementsLoading } = useQuery({
    queryKey: bomQueryKeys.materialRequirementsList(queryParams),
    queryFn: () => BOMApiService.getMaterialRequirements(queryParams),
  });

  // Fetch material planning statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: bomQueryKeys.materialPlanningStats(),
    queryFn: () => BOMApiService.getMaterialPlanningStats(),
  });

  // Fetch material shortages
  const { data: shortagesData, isLoading: shortagesLoading } = useQuery({
    queryKey: bomQueryKeys.materialShortages(),
    queryFn: () => BOMApiService.getMaterialShortages(),
  });

  // Mutation for running MRP calculation
  const runMRPMutation = useMutation({
    mutationFn: () => BOMApiService.runMRPCalculation(),
    onSuccess: (result) => {
      console.log("MRP calculation completed:", result);
      // Refresh data after MRP calculation
      queryClient.invalidateQueries({
        queryKey: bomQueryKeys.materialRequirements(),
      });
      queryClient.invalidateQueries({
        queryKey: bomQueryKeys.materialPlanningStats(),
      });
      queryClient.invalidateQueries({
        queryKey: bomQueryKeys.materialShortages(),
      });
    },
    onError: (error) => {
      console.error("MRP calculation failed:", error);
    },
  });

  // Mutation for generating purchase orders
  const generatePOsMutation = useMutation({
    mutationFn: (shortageIds: string[]) =>
      BOMApiService.generatePurchaseOrdersForShortages(shortageIds),
    onSuccess: (result) => {
      console.log("Purchase orders generated:", result);
      setGeneratedPOs(result.purchase_orders ?? []);
      setShowPODialog(true);
      // Refresh shortages data to show updated status
      queryClient.invalidateQueries({
        queryKey: bomQueryKeys.materialShortages(),
      });
    },
    onError: (error) => {
      console.error("Failed to generate purchase orders:", error);
    },
  });

  const requirements: WorkOrderMaterialRequirement[] =
    requirementsData?.requirements ?? [];
  const shortages: MaterialShortage[] = shortagesData ?? [];
  const defaultStats: MaterialPlanningStats = {
    total_requirements: 0,
    pending_allocations: 0,
    material_shortages: 0,
    critical_shortages: 0,
    total_material_value: 0,
    average_lead_time: 0,
    on_time_delivery: 0,
    cost_variance: 0,
  };
  const stats = statsData ?? defaultStats;
  const averageCostPerRequirement =
    stats.total_requirements > 0
      ? stats.total_material_value / stats.total_requirements
      : 0;

  // Handle loading states
  if (requirementsLoading || statsLoading || shortagesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Material Requirements Planning
            </h1>
            <p className="text-muted-foreground">
              Plan and manage material requirements for production
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

  // Filter requirements based on search and priority (API handles status filtering)
  const filteredRequirements = requirements
    .filter((req) => {
      if (!debouncedSearchTerm) return true;

      return (
        req.material_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        req.material_sku?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        req.work_order_id?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    })
    .filter((req) => {
      if (priorityFilter === "all") return true;
      if (priorityFilter === "critical") return req.is_critical;
      if (priorityFilter === "high") return req.priority <= 1;
      if (priorityFilter === "medium") return req.priority <= 2;
      return true;
    });

  // Handle pagination edge cases - reset current page if it exceeds total pages
  const maxPage = requirementsData ? Math.max(1, Math.ceil(requirementsData.total / pageSize)) : 1;
  if (currentPage > maxPage && requirementsData) {
    setCurrentPage(maxPage);
  }

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

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Page reset is handled in useEffect when debouncedSearchTerm changes
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePriorityFilter = (priority: string) => {
    setPriorityFilter(priority);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleGeneratePOForShortage = (shortage: MaterialShortage) => {
    if (shortage.status !== "open") {
      return;
    }
    generatePOsMutation.mutate([shortage.id]);
  };

  const handleViewRequirement = (
    requirement: WorkOrderMaterialRequirement
  ) => {
    setSelectedRequirement(requirement);
    setShowRequirementDialog(true);
  };

  const handleGeneratePurchaseOrders = async () => {
    if (shortages.length === 0) return;

    const openShortages = shortages.filter(
      (shortage) => shortage.status === "open"
    );
    if (openShortages.length === 0) return;

    const shortageIds = openShortages.map((shortage) => shortage.id);
    generatePOsMutation.mutate(shortageIds);
  };

  const handleRunMRP = () => {
    runMRPMutation.mutate();
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
          <Button
            variant="outline"
            onClick={handleRunMRP}
            disabled={runMRPMutation.isPending}
          >
            {runMRPMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run MRP
              </>
            )}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
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
            <div className="text-2xl font-bold">{stats.total_requirements}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending_allocations} pending allocation
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
              {stats.material_shortages}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.critical_shortages} critical
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
              {formatCurrency(stats.total_material_value)}
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
            <div className="text-2xl font-bold">{stats.on_time_delivery}%</div>
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
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm !== debouncedSearchTerm && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-3 w-3 border border-gray-300 border-t-gray-600 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={handleStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="allocated">Allocated</TabsTrigger>
                    <TabsTrigger value="short">Short</TabsTrigger>
                    <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs value={priorityFilter} onValueChange={handlePriorityFilter}>
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
                        {req.work_order_id}
                      </TableCell>
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
                          <span className="font-medium">
                            {req.required_quantity}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {req.unit_of_measure}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {req.allocated_quantity}
                          </span>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              req.is_critical
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {req.is_critical ? "CRITICAL" : "NORMAL"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            P{req.priority}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(req.required_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.supplier_name || (
                          <span className="text-muted-foreground">
                            Not assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewRequirement(req)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {requirementsData && requirementsData.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="text-sm text-muted-foreground">
                    {searchTerm !== debouncedSearchTerm ? (
                      <span>Searching... ({filteredRequirements.length} results shown)</span>
                    ) : (
                      <>
                        Showing {((requirementsData.page - 1) * requirementsData.limit) + 1} to{' '}
                        {Math.min(requirementsData.page * requirementsData.limit, requirementsData.total)} of{' '}
                        {requirementsData.total} results
                      </>
                    )}
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, requirementsData.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, requirementsData.page - 2) + i;
                        if (pageNum > requirementsData.totalPages) return null;

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={pageNum === currentPage}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      {requirementsData.totalPages > 5 && requirementsData.page < requirementsData.totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(Math.min(requirementsData.totalPages, currentPage + 1))}
                          className={currentPage >= requirementsData.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="px-2 py-1 text-sm border rounded"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              )}
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
                            {shortage.material_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {shortage.material_sku} -{" "}
                            {shortage.work_order_number}
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
                            {shortage.required_quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Available</div>
                          <div className="text-2xl font-bold text-green-600">
                            {shortage.available_quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Shortfall</div>
                          <div className="text-2xl font-bold text-red-600">
                            {shortage.shortfall_quantity}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Lead Time</div>
                          <div className="text-2xl font-bold">
                            {shortage.lead_time_days} days
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Required Date</span>
                          <span>{formatDate(shortage.required_date)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Supplier</span>
                          <span>
                            {shortage.supplier_name || "Not assigned"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Suggested Action</span>
                          <Badge
                            variant="outline"
                            className={
                              shortage.suggested_action === "po_created"
                                ? "bg-green-100 text-green-800"
                                : ""
                            }
                          >
                            {shortage.suggested_action === "po_created"
                              ? "PO CREATED"
                              : shortage.suggested_action.toUpperCase()}
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
                        <Button
                          size="sm"
                          onClick={() => handleGeneratePOForShortage(shortage)}
                          disabled={
                            generatePOsMutation.isPending ||
                            shortage.status !== "open"
                          }
                        >
                          {generatePOsMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create PO
                            </>
                          )}
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
                      <span>{stats.average_lead_time} days</span>
                    </div>
                    <Progress
                      value={Math.min(100, Math.max(0, 100 - stats.average_lead_time * 2))}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Critical Path Items</span>
                      <span>{stats.critical_shortages}</span>
                    </div>
                    <Progress
                      value={
                        stats.total_requirements > 0
                          ? Math.max(0, 100 - (stats.critical_shortages / stats.total_requirements) * 100)
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>On-Time Delivery</span>
                      <span>{stats.on_time_delivery}%</span>
                    </div>
                    <Progress value={stats.on_time_delivery} className="h-2" />
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
                      {formatCurrency(stats.total_material_value)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Material Value
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.cost_variance}%
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
                        {formatCurrency(averageCostPerRequirement)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Pending Value</div>
                      <div className="font-medium">
                        {formatCurrency(stats.total_material_value * 0.3)}
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

      {/* Requirement Details Dialog */}
      <Dialog
        open={showRequirementDialog}
        onOpenChange={(open) => {
          setShowRequirementDialog(open);
          if (!open) {
            setSelectedRequirement(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Requirement Details - {selectedRequirement?.material_name}
            </DialogTitle>
            <DialogDescription>
              Allocation status and planning data for this material requirement
            </DialogDescription>
          </DialogHeader>

          {selectedRequirement && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Requirement Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Work Order</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedRequirement.work_order_id}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Priority</div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          selectedRequirement.is_critical
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {selectedRequirement.is_critical ? "CRITICAL" : "NORMAL"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        P{selectedRequirement.priority}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <Badge className={getStatusColor(selectedRequirement.status)}>
                      {selectedRequirement.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Required Date</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(selectedRequirement.required_date)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quantities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Required Quantity</span>
                    <span className="font-medium">
                      {selectedRequirement.required_quantity}{" "}
                      {selectedRequirement.unit_of_measure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Allocated Quantity</span>
                    <span className="font-medium text-blue-600">
                      {selectedRequirement.allocated_quantity}{" "}
                      {selectedRequirement.unit_of_measure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Consumed Quantity</span>
                    <span className="font-medium text-green-600">
                      {selectedRequirement.consumed_quantity}{" "}
                      {selectedRequirement.unit_of_measure}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost & Supplier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Unit Cost</span>
                    <span>{formatCurrency(selectedRequirement.unit_cost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Cost</span>
                    <span>{formatCurrency(selectedRequirement.total_cost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Supplier</span>
                    <span>
                      {selectedRequirement.supplier_name || "Not assigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lead Time</span>
                    <span>{selectedRequirement.lead_time_days} days</span>
                  </div>
                  {selectedRequirement.notes && (
                    <div>
                      <div className="text-sm font-medium">Notes</div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRequirement.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shortage Details Dialog */}
      <Dialog
        open={showShortageDialog}
        onOpenChange={(open) => {
          setShowShortageDialog(open);
          if (!open) {
            setSelectedShortage(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Shortage Details - {selectedShortage?.material_name}
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
                        {selectedShortage.material_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Work Order</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedShortage.work_order_number}
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
                        {formatDate(selectedShortage.required_date)}
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
                        {selectedShortage.required_quantity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Available Quantity</span>
                      <span className="font-medium text-green-600">
                        {selectedShortage.available_quantity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Shortfall Quantity</span>
                      <span className="font-medium text-red-600">
                        {selectedShortage.shortfall_quantity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${
                            selectedShortage.required_quantity > 0
                              ? (selectedShortage.shortfall_quantity /
                                  selectedShortage.required_quantity) *
                                100
                              : 0
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
                        {selectedShortage.suggested_action.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Supplier</span>
                      <span>
                        {selectedShortage.supplier_name || "Not assigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Lead Time</span>
                      <span>{selectedShortage.lead_time_days} days</span>
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

      {/* Generated Purchase Orders Dialog */}
      <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Orders Generated</DialogTitle>
            <DialogDescription>
              Successfully generated {generatedPOs.length} purchase orders for
              material shortages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  Purchase Orders Created Successfully
                </span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                {generatedPOs.length} purchase orders have been generated and
                are ready for approval.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Generated Purchase Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {generatedPOs.map((poNumber, index) => (
                    <div
                      key={poNumber}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="font-medium">{poNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-yellow-100 text-yellow-800"
                        >
                          Pending Approval
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push("/purchase-orders")}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPODialog(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowPODialog(false);
                  router.push("/purchase-orders");
                }}
              >
                View All Purchase Orders
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
