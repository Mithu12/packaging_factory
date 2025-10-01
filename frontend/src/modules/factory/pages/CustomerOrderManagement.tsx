import { useState, useEffect } from "react";
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
import type {
  CustomerOrder,
  OrderStats,
  OrderSearch,
} from "../types/customer-orders";
import { OrderEntryForm } from "../components/OrderEntryForm";
import { OrderDetailsDialog } from "../components/OrderDetailsDialog";

export default function CustomerOrderManagement() {
  const { formatCurrency, formatDate } = useFormatting();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    quotedOrders: 0,
    approvedOrders: 0,
    inProductionOrders: 0,
    completedOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    onTimeDelivery: 0,
  });
  const [search, setSearch] = useState<OrderSearch>({
    searchTerm: "",
    filters: {},
    sortBy: "orderDate",
    sortOrder: "desc",
    page: 1,
    limit: 20,
  });
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(
    null
  );
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setOrders([
      {
        id: "ORD-001",
        orderNumber: "ORD-2024-001",
        customerId: "CUST-001",
        customerName: "ABC Manufacturing Ltd",
        customerEmail: "orders@abcmanufacturing.com",
        customerPhone: "+1-555-0123",
        orderDate: "2024-03-10T10:00:00Z",
        requiredDate: "2024-03-25T17:00:00Z",
        status: "pending",
        priority: "high",
        totalValue: 45000,
        currency: "USD",
        salesPerson: "John Smith",
        notes: "Rush order for new product launch",
        terms: "Standard terms and conditions apply",
        paymentTerms: "net_30",
        shippingAddress: {
          street: "123 Industrial Blvd",
          city: "Detroit",
          state: "MI",
          postalCode: "48201",
          country: "USA",
          contactName: "Mike Johnson",
          contactPhone: "+1-555-0124",
        },
        billingAddress: {
          street: "123 Industrial Blvd",
          city: "Detroit",
          state: "MI",
          postalCode: "48201",
          country: "USA",
        },
        lineItems: [
          {
            id: "1",
            productId: "PROD-001",
            productName: "Premium Widget A",
            productSku: "PWA-001",
            quantity: 500,
            unitPrice: 30,
            lineTotal: 15000,
            unitOfMeasure: "pcs",
            specifications: "Custom color: Blue, Size: Large",
            deliveryDate: "2024-03-25",
            isOptional: false,
          },
          {
            id: "2",
            productId: "PROD-002",
            productName: "Standard Widget B",
            productSku: "SWB-002",
            quantity: 1000,
            unitPrice: 20,
            lineTotal: 20000,
            unitOfMeasure: "pcs",
            deliveryDate: "2024-03-25",
            isOptional: false,
          },
        ],
        attachments: [],
        createdBy: "John Smith",
        createdDate: "2024-03-10T10:00:00Z",
      },
      {
        id: "ORD-002",
        orderNumber: "ORD-2024-002",
        customerId: "CUST-002",
        customerName: "XYZ Industries",
        customerEmail: "procurement@xyzindustries.com",
        customerPhone: "+1-555-0125",
        orderDate: "2024-03-09T14:30:00Z",
        requiredDate: "2024-03-20T17:00:00Z",
        status: "quoted",
        priority: "medium",
        totalValue: 24000,
        currency: "USD",
        salesPerson: "Jane Doe",
        terms: "Standard terms and conditions apply",
        paymentTerms: "net_15",
        shippingAddress: {
          street: "456 Commerce St",
          city: "Chicago",
          state: "IL",
          postalCode: "60601",
          country: "USA",
          contactName: "Sarah Wilson",
          contactPhone: "+1-555-0126",
        },
        billingAddress: {
          street: "456 Commerce St",
          city: "Chicago",
          state: "IL",
          postalCode: "60601",
          country: "USA",
        },
        lineItems: [
          {
            id: "3",
            productId: "PROD-003",
            productName: "Custom Widget C",
            productSku: "CWC-003",
            quantity: 200,
            unitPrice: 40,
            lineTotal: 8000,
            unitOfMeasure: "pcs",
            specifications: "Special coating required",
            deliveryDate: "2024-03-20",
            isOptional: false,
          },
        ],
        attachments: [],
        createdBy: "Jane Doe",
        createdDate: "2024-03-09T14:30:00Z",
        updatedBy: "Jane Doe",
        updatedDate: "2024-03-09T16:00:00Z",
      },
    ]);

    setStats({
      totalOrders: 24,
      pendingOrders: 8,
      quotedOrders: 6,
      approvedOrders: 4,
      inProductionOrders: 3,
      completedOrders: 3,
      totalValue: 450000,
      averageOrderValue: 18750,
      onTimeDelivery: 92,
    });
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber
        .toLowerCase()
        .includes(search.searchTerm.toLowerCase()) ||
      order.customerName
        .toLowerCase()
        .includes(search.searchTerm.toLowerCase()) ||
      order.salesPerson.toLowerCase().includes(search.searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleViewOrder = (order: CustomerOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleEditOrder = (order: CustomerOrder) => {
    setSelectedOrder(order);
    setShowOrderEntry(true);
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setShowOrderEntry(true);
  };

  const handleOrderSubmit = (orderData: any) => {
    if (selectedOrder) {
      // Update existing order
      setOrders((prev) =>
        prev.map((order) =>
          order.id === selectedOrder.id ? { ...order, ...orderData } : order
        )
      );
    } else {
      // Create new order
      const newOrder: CustomerOrder = {
        id: `ORD-${Date.now()}`,
        orderNumber: `ORD-2024-${String(orders.length + 1).padStart(3, "0")}`,
        ...orderData,
        createdBy: "Current User",
        createdDate: new Date().toISOString(),
      };
      setOrders((prev) => [newOrder, ...prev]);
    }
    setShowOrderEntry(false);
    setSelectedOrder(null);
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
          <Button variant="outline">
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
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
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
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
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
              {formatCurrency(stats.totalValue)}
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
            <div className="text-2xl font-bold">{stats.onTimeDelivery}%</div>
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
                      value={search.searchTerm}
                      onChange={(e) =>
                        setSearch((prev) => ({
                          ...prev,
                          searchTerm: e.target.value,
                        }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
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

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
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
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.customerEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(order.orderDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(order.requiredDate)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(order.totalValue)}</TableCell>
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
                      <TableCell>{order.salesPerson}</TableCell>
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
      />
    </div>
  );
}
