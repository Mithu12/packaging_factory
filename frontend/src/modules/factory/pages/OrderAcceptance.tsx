import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Package,
  Calendar,
  User,
  Building,
  Search,
  Filter,
  Eye,
  Check,
  X,
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

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerId: string;
  totalLines: number;
  totalQuantity: number;
  totalValue: number;
  deadline: string;
  status: "pending" | "accepted" | "rejected" | "in_production";
  priority: "low" | "medium" | "high" | "urgent";
  createdDate: string;
  factoryManager?: string;
  notes?: string;
}

interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deadline: string;
  specifications?: string;
}

export default function OrderAcceptance() {
  const { formatCurrency, formatDate } = useFormatting();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [acceptanceNotes, setAcceptanceNotes] = useState("");

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setOrders([
      {
        id: "1",
        orderNumber: "ORD-2024-001",
        customer: "ABC Manufacturing Ltd",
        customerId: "CUST-001",
        totalLines: 3,
        totalQuantity: 1500,
        totalValue: 45000,
        deadline: "2024-03-20",
        status: "pending",
        priority: "high",
        createdDate: "2024-03-10",
        notes: "Rush order for new product launch",
      },
      {
        id: "2",
        orderNumber: "ORD-2024-002",
        customer: "XYZ Industries",
        customerId: "CUST-002",
        totalLines: 2,
        totalQuantity: 800,
        totalValue: 24000,
        deadline: "2024-03-25",
        status: "accepted",
        priority: "medium",
        createdDate: "2024-03-09",
        factoryManager: "John Smith",
      },
      {
        id: "3",
        orderNumber: "ORD-2024-003",
        customer: "DEF Corp",
        customerId: "CUST-003",
        totalLines: 1,
        totalQuantity: 200,
        totalValue: 8000,
        deadline: "2024-03-15",
        status: "rejected",
        priority: "low",
        createdDate: "2024-03-08",
        notes: "Insufficient capacity for deadline",
      },
    ]);
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in_production":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
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

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    // Mock order lines data
    setOrderLines([
      {
        id: "1",
        productId: "PROD-001",
        productName: "Premium Widget A",
        quantity: 500,
        unitPrice: 30,
        totalPrice: 15000,
        deadline: "2024-03-20",
        specifications: "Custom color: Blue, Size: Large",
      },
      {
        id: "2",
        productId: "PROD-002",
        productName: "Standard Widget B",
        quantity: 1000,
        unitPrice: 20,
        totalPrice: 20000,
        deadline: "2024-03-20",
        specifications: "Standard specifications",
      },
    ]);
    setShowOrderDetails(true);
  };

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "accepted" as const,
              factoryManager: "Current User",
            }
          : order
      )
    );
    setShowOrderDetails(false);
    setAcceptanceNotes("");
  };

  const handleRejectOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: "rejected" as const } : order
      )
    );
    setShowOrderDetails(false);
    setAcceptanceNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Acceptance</h1>
          <p className="text-muted-foreground">
            Review and accept customer orders for production
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
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
                <TabsTrigger value="accepted">Accepted</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
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
                <TableHead>Lines</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
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
                      <div className="font-medium">{order.customer}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.customerId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{order.totalLines}</TableCell>
                  <TableCell>{order.totalQuantity.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrency(order.totalValue)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(order.deadline)}
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcceptOrder(order.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectOrder(order.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Order Details - {selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Review order details and accept or reject for production
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Customer</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.customer}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Lines</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.totalLines}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Total Quantity
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.totalQuantity.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Value</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(selectedOrder.totalValue)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Deadline</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedOrder.deadline)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Priority</Label>
                      <Badge
                        className={getPriorityColor(selectedOrder.priority)}
                      >
                        {selectedOrder.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  {selectedOrder.notes && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Notes</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Lines */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Lines</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Specifications</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {line.productName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {line.productId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {line.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(line.unitPrice)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(line.totalPrice)}
                          </TableCell>
                          <TableCell>{formatDate(line.deadline)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {line.specifications || "Standard"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Acceptance Notes */}
              <div className="space-y-2">
                <Label htmlFor="acceptance-notes">Acceptance Notes</Label>
                <Textarea
                  id="acceptance-notes"
                  placeholder="Add any notes about this order acceptance..."
                  value={acceptanceNotes}
                  onChange={(e) => setAcceptanceNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRejectOrder(selectedOrder.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Order
                </Button>
                <Button onClick={() => handleAcceptOrder(selectedOrder.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Accept Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
