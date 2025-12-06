"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  CustomerOrdersApiService,
  FactoryCustomerOrder,
  FactoryCustomerOrderStatus,
  OrderQueryParams,
  UpdateOrderStatusRequest,
} from "../services/customer-orders-api";

// Use the API types directly
type Order = FactoryCustomerOrder;

interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deadline: string;
  specifications: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams: OrderQueryParams = {
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter as FactoryCustomerOrderStatus : undefined,
        sort_by: "order_date",
        sort_order: "desc",
        page: 1,
        limit: 50, // Get more orders for acceptance review
      };

      const response = await CustomerOrdersApiService.getCustomerOrders(queryParams);
      setOrders(response.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Orders are already filtered by the API, so we use them directly
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

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);

    // Convert API line items to component format
    const convertedOrderLines: OrderLine[] = order.line_items.map(item => ({
      id: item.id.toString(),
      productId: item.product_id.toString(),
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      deadline: order.required_date, // Use order deadline as line deadline
      specifications: (item.specifications as string) || "Standard",
    }));

    setOrderLines(convertedOrderLines);
    setShowOrderDetails(true);
  };

  const handleSubmitForApproval = async (orderId: string) => {
    try {
      const statusRequest: UpdateOrderStatusRequest = {
        status: "pending",
        notes: "Submitted for approval",
      };

      await CustomerOrdersApiService.updateOrderStatus(orderId, "pending", "Submitted for approval");

      // Reload orders to get updated status
      await loadOrders();

      // Show success message or handle accordingly
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order for approval');
      console.error('Error submitting for approval:', err);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await CustomerOrdersApiService.approveCustomerOrder(orderId, true, acceptanceNotes || undefined);

      // Reload orders to get updated status
      await loadOrders();

      setShowOrderDetails(false);
      setAcceptanceNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept order');
      console.error('Error accepting order:', err);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      await CustomerOrdersApiService.approveCustomerOrder(orderId, false, acceptanceNotes || undefined);

      // Reload orders to get updated status
      await loadOrders();

      setShowOrderDetails(false);
      setAcceptanceNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject order');
      console.error('Error rejecting order:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Acceptance</h1>
          <p className="text-muted-foreground">
            Manage order workflow: submit for approval, review and accept orders for production
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadOrders}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
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
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="quoted">Quoted</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>
            </Tabs>
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
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {loading ? "Loading orders..." : "No orders found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.factory_customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.factory_customer_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{order.factory_name || 'Not assigned'}</TableCell>
                  <TableCell>{order.line_items.length}</TableCell>
                  <TableCell>
                    {order.line_items.reduce((total, item) => total + item.quantity, 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{formatCurrency(order.total_value)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(order.required_date)}
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
                      {order.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitForApproval(order.id.toString())}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Submit for Approval
                        </Button>
                      )}
                      {(order.status === "pending" || order.status === "quoted") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcceptOrder(order.id.toString())}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectOrder(order.id.toString())}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
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

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Order Details - {selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.status === "draft"
                ? "Review order details and submit for approval"
                : "Review order details and accept or reject for production"
              }
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
                        {selectedOrder.factory_customer_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Lines</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.line_items.length}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Total Quantity
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.line_items.reduce((total, item) => total + item.quantity, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Value</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(selectedOrder.total_value)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Deadline</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedOrder.required_date)}
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

              {/* Action Notes */}
              <div className="space-y-2">
                <Label htmlFor="acceptance-notes">
                  {selectedOrder?.status === "draft"
                    ? "Submission Notes (Optional)"
                    : "Approval/Rejection Notes (Optional)"
                  }
                </Label>
                <Textarea
                  id="acceptance-notes"
                  placeholder={
                    selectedOrder?.status === "draft"
                      ? "Add any notes when submitting for approval..."
                      : "Add any notes about this approval decision..."
                  }
                  value={acceptanceNotes}
                  onChange={(e) => setAcceptanceNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOrderDetails(false);
                    setAcceptanceNotes("");
                  }}
                >
                  Cancel
                </Button>
                {selectedOrder?.status === "draft" && (
                  <Button onClick={() => handleSubmitForApproval(selectedOrder.id.toString())}>
                    Submit for Approval
                  </Button>
                )}
                {(selectedOrder?.status === "pending" || selectedOrder?.status === "quoted") && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleRejectOrder(selectedOrder.id.toString())}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Order
                    </Button>
                    <Button onClick={() => handleAcceptOrder(selectedOrder.id.toString())}>
                      <Check className="h-4 w-4 mr-2" />
                      Accept Order
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
