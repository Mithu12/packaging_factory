import { useState, useEffect, useCallback } from "react";
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
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
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
  CustomerOrdersApiService,
  FactoryCustomerOrder,
  FactoryCustomerOrderStatus,
  OrderStats as ApiOrderStats,
  OrderQueryParams,
  CreateCustomerOrderRequest
} from "../services/customer-orders-api";
import OrderEntryForm from "../components/OrderEntryForm";
import OrderDetailsDialog from "../components/OrderDetailsDialog";

export default function CustomerOrderManagement() {
  const { formatCurrency, formatDate } = useFormatting();
  const [orders, setOrders] = useState<FactoryCustomerOrder[]>([]);
  const [stats, setStats] = useState<ApiOrderStats>({
    total_orders: 0,
    pending_orders: 0,
    quoted_orders: 0,
    approved_orders: 0,
    in_production_orders: 0,
    completed_orders: 0,
    total_value: 0,
    average_order_value: 0,
    on_time_delivery: 0,
  });
  const [search, setSearch] = useState<OrderQueryParams>({
    search: "",
    sort_by: "order_date",
    sort_order: "desc",
    page: 1,
    limit: 20,
  });
  const [selectedOrder, setSelectedOrder] = useState<FactoryCustomerOrder | null>(
    null
  );
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams: OrderQueryParams = {
        ...search,
        status: statusFilter !== "all" ? statusFilter as FactoryCustomerOrderStatus : undefined,
      };
      
      const response = await CustomerOrdersApiService.getCustomerOrders(queryParams);
      setOrders(response.orders);
      setTotalPages(response.totalPages);
      setTotalOrders(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Load stats from API
  const loadStats = async () => {
    try {
      const statsData = await CustomerOrdersApiService.getOrderStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStats();
  }, []);

  // Note: Using real API data instead of mock data

  // Handle search
  const handleSearch = (searchTerm: string) => {
    setSearch(prev => ({
      ...prev,
      search: searchTerm || '',
      page: 1, // Reset to first page
    }));
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setSearch(prev => ({
      ...prev,
      page: 1, // Reset to first page
    }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setSearch(prev => ({
      ...prev,
      page,
    }));
  };

  // Handle order approval
  const handleApproveOrder = async (orderId: string, approved: boolean, notes?: string) => {
    try {
      await CustomerOrdersApiService.approveCustomerOrder(orderId, approved, notes);
      await loadOrders(); // Reload orders
      await loadStats(); // Reload stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve order');
    }
  };

  // Handle order status update
  const handleStatusUpdate = async (orderId: string, status: string, notes?: string) => {
    try {
      await CustomerOrdersApiService.updateOrderStatus(orderId, status as FactoryCustomerOrderStatus, notes);
      await loadOrders(); // Reload orders
      await loadStats(); // Reload stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  // Since we're using API filtering, we don't need client-side filtering
  // The orders are already filtered by the API based on search and status
  const filteredOrders = orders;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "quoted":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in_production":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
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

  const handleViewOrder = (order: FactoryCustomerOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleEditOrder = (order: FactoryCustomerOrder) => {
    setSelectedOrder(order);
    setShowOrderEntry(true);
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setShowOrderEntry(true);
  };

  const handleOrderSubmit = async (orderData: CreateCustomerOrderRequest) => {
    try {
      if (selectedOrder) {
        // Update existing order
        await CustomerOrdersApiService.updateCustomerOrder(selectedOrder.id.toString(), orderData);
      } else {
        // Create new order
        await CustomerOrdersApiService.createCustomerOrder(orderData);
      }
      
      // Reload orders and stats
      await loadOrders();
      await loadStats();
      
      // Close dialog and reset selected order
      setShowOrderEntry(false);
      setSelectedOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Order Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and track customer orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => { loadOrders(); loadStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateOrder}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_orders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_orders}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.total_value)}
            </div>
            <p className="text-xs text-muted-foreground">All orders value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              On-Time Delivery
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.on_time_delivery}%</div>
            <p className="text-xs text-muted-foreground">
              Delivery performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-orders">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="all-orders" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={search.search || ""}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={handleStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="quoted">Quoted</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="in_production">
                      In Production
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </CardContent>
          </Card>

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
                    onClick={() => { setError(null); loadOrders(); }}
                    className="ml-auto"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders {loading && "(Loading...)"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Factory</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Required Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Sales Person</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {order.factory_customer_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.factory_customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.factory_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(order.order_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(order.required_date)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(order.total_value)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.sales_person}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Entry Dialog */}
      <OrderEntryForm
        open={showOrderEntry}
        onOpenChange={setShowOrderEntry}
        order={selectedOrder}
        onSubmit={handleOrderSubmit}
      />

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        order={selectedOrder}
        onEdit={handleEditOrder}
      />
    </div>
  );
}
