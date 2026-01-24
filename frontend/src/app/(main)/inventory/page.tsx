"use client";

﻿import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useClientPagination } from "@/hooks/usePagination";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  Package,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { InventoryApi } from "@/modules/inventory/services/inventory-api";
import { 
  DistributionApi, 
  ProductLocation, 
  DistributionCenter,
  ProductLocationQueryParams 
} from "@/modules/inventory/services/distribution-api";
import { InventoryStats, StockMovement } from "@/services/types";

export default function Inventory() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDC, setSelectedDC] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // State for real data
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [centers, setCenters] = useState<DistributionCenter[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      const result = await DistributionApi.getDistributionCenters({ limit: 100 });
      setCenters(result.centers);
    } catch (err) {
      console.error("Error fetching centers:", err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: ProductLocationQueryParams = {
        limit: 1000,
      };

      if (selectedDC !== "all") {
        params.distribution_center_id = parseInt(selectedDC);
      }

      if (selectedStatus !== "all") {
        params.stock_status = selectedStatus as any;
      }

      const [locationsResponse, movementsResponse, statsResponse] =
        await Promise.all([
          DistributionApi.getProductLocations(params),
          InventoryApi.getStockMovements({ limit: 50 }),
          InventoryApi.getInventoryStats(),
        ]);

      setLocations(locationsResponse.locations);
      setMovements(movementsResponse);
      setStats(statsResponse);
    } catch (err: any) {
      console.error("Error fetching inventory data:", err);
      setError(err.message || "Failed to load inventory data");
      toast.error("Failed to load inventory data", {
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [selectedDC, selectedStatus]);

  const filteredItems = locations.filter(
    (item) =>
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.center_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Use client-side pagination for filtered inventory items
  const inventoryPagination = useClientPagination(filteredItems, {
    initialPageSize: 15,
  });

  const getStockStatus = (current: number, min: number, max?: number) => {
    if (current <= min * 0.5)
      return {
        status: "critical",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      };
    if (current <= min)
      return { status: "low", color: "text-warning", bgColor: "bg-warning/10" };
    if (max && current >= max * 0.9)
      return {
        status: "overstock",
        color: "text-warning",
        bgColor: "bg-warning/10",
      };
    return {
      status: "optimal",
      color: "text-success",
      bgColor: "bg-success/10",
    };
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "increase":
        return "text-success";
      case "decrease":
        return "text-destructive";
      case "set":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  // Use stats from API or calculate from items
  const totalInventoryValue =
    stats?.total_inventory_value ||
    locations.reduce((sum, item) => sum + (Number(item.current_stock) * (Number(item.cost_price) || 0)), 0);
  const lowStockItems =
    stats?.low_stock_items ||
    locations.filter((item) => (Number(item.available_stock) ?? Number(item.current_stock)) <= Number(item.min_stock_level))
      .length;
  const criticalStockItems =
    stats?.critical_stock_items ||
    locations.filter(
      (item) => (Number(item.available_stock) ?? Number(item.current_stock)) <= Number(item.min_stock_level) * 0.5
    ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Inventory Management
            </h1>
            <p className="text-muted-foreground">
              Track stock levels, movements, and perform adjustments
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading inventory data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Inventory Management
            </h1>
            <p className="text-muted-foreground">
              Track stock levels, movements, and perform adjustments
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchData}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track stock levels, movements, and perform adjustments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalInventoryValue.toLocaleString()}
            </div>
            <p className="text-xs text-success">+5.2% this month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {criticalStockItems}
            </div>
            <p className="text-xs text-muted-foreground">Immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        {/* Stock Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Current Stock Levels</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search inventory..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-80"
                    />
                  </div>
                  <select
                    value={selectedDC}
                    onChange={(e) => setSelectedDC(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="all">All DCs</option>
                    {centers.map(center => (
                      <option key={center.id} value={center.id}>{center.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="all">All Status</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Stock Levels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Last Movement</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryPagination.data.map((item) => {
                    const stockInfo = getStockStatus(
                      Number(item.available_stock) ?? Number(item.current_stock),
                      Number(item.min_stock_level),
                      Number(item.max_stock_level)
                    );

                    return (
                      <TableRow key={item.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {item.product_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                SKU: {item.product_sku}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {item.center_name || "Main Warehouse"}
                              </span>
                              {item.location_in_warehouse && (
                                <span className="text-xs text-muted-foreground">
                                  {item.location_in_warehouse}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {item.current_stock}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                unit
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {item.available_stock || item.current_stock}{" "}
                                available
                              </span>
                              {item.reserved_stock &&
                                item.reserved_stock > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{item.reserved_stock} reserved</span>
                                  </>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min: {item.min_stock_level}{" "}
                              {item.max_stock_level &&
                                `• Max: ${item.max_stock_level}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${stockInfo.bgColor} ${stockInfo.color}`}
                          >
                            {stockInfo.status === "critical" && (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {stockInfo.status}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              ${((item.current_stock || 0) * (item.cost_price || 0)).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${item.cost_price || 0} per unit
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {item.selling_price && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1 rounded">Retail</span>
                                <span className="text-sm font-semibold text-emerald-700">
                                  ${item.selling_price}
                                </span>
                              </div>
                            )}
                            {item.wholesale_price && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1 rounded">Wholesale</span>
                                <span className="text-sm font-semibold text-blue-700">
                                  ${item.wholesale_price}
                                </span>
                              </div>
                            )}
                            {!item.selling_price && !item.wholesale_price && (
                              <span className="text-muted-foreground text-xs italic">Not set</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {item.last_movement_date
                              ? new Date(
                                  item.last_movement_date
                                ).toLocaleDateString()
                              : "No movements"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => router.push(`/inventory/${item.product_id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/inventory/products/${item.product_id}/edit`)}>
                                Edit Product
                              </DropdownMenuItem>
                            </DropdownMenuContent> 
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4">
                <DataTablePagination
                  currentPage={inventoryPagination.currentPage}
                  totalPages={inventoryPagination.totalPages}
                  pageSize={inventoryPagination.pageSize}
                  totalItems={inventoryPagination.totalItems}
                  onPageChange={inventoryPagination.setPage}
                  onPageSizeChange={inventoryPagination.setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} className="hover:bg-accent/50">
                      <TableCell className="text-sm">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.product_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getMovementTypeColor(
                            movement.movement_type
                          )}
                        >
                          {movement.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            movement.quantity > 0
                              ? "text-success"
                              : "text-destructive"
                          }
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.reason}
                      </TableCell>
                      <TableCell className="text-sm">
                        {movement.user_name || "System"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.reference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
