import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  ShoppingCart,
  Calendar,
  Package,
} from "lucide-react";
import { salesRepApi } from "../services/salesrep-api";
import { FactoryApiService } from "@/services/factory-api";
import type {
  SalesRepOrder,
  OrderFormData,
  CreateOrderRequest,
  UpdateOrderRequest,
} from "../types";
import { useToast } from "@/hooks/use-toast";
import { useFormatting } from "@/hooks/useFormatting";
import { format } from "date-fns";
import OrderApprovalWorkflow from "../components/OrderApprovalWorkflow";
import EnhancedOrderApprovalWorkflow from "../components/EnhancedOrderApprovalWorkflow";
import { useAuth } from "@/contexts/AuthContext";
import { ProductSelector } from "../components/ProductSelector";

const SalesRepOrders = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const [customerFilter, setCustomerFilter] = useState("all-customers");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesRepOrder | null>(
    null
  );
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [approvalOrder, setApprovalOrder] = useState<SalesRepOrder | null>(
    null
  );
  const [availableFactories, setAvailableFactories] = useState<
    { id: number; name: string }[]
  >([]);
  const [formData, setFormData] = useState<OrderFormData>({
    customer_id: 0,
    order_date: new Date().toISOString().split("T")[0],
    items: [],
    discount_amount: 0,
    tax_amount: 0,
    status: "draft",
    notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useFormatting();
  const { user } = useAuth();
  const limit = 10;

  // Determine user role for approval workflow
  const getUserRole = (): "admin" | "factory_manager" | "sales_rep" => {
    if (user?.role === "admin") return "admin";
    if (user?.role === "manager") return "factory_manager";
    return "sales_rep";
  };

  const { data: ordersData, isLoading } = useQuery({
    queryKey: [
      "salesrep-orders",
      search,
      statusFilter,
      customerFilter,
      currentPage,
    ],
    queryFn: () =>
      salesRepApi.getOrders(
        {
          search,
          status: statusFilter === "all-status" ? "" : statusFilter,
          customer_id:
            customerFilter === "all-customers"
              ? undefined
              : Number(customerFilter),
        },
        { page: currentPage, limit }
      ),
  });

  // Fetch factories for admin approval
  const { data: factoriesData } = useQuery({
    queryKey: ["factories"],
    queryFn: () => FactoryApiService.getAllFactories(),
    enabled: getUserRole() === "admin",
  });

  // Fetch customers for dropdowns
  const {
    data: customersData,
    isLoading: customersLoading,
    error: customersError,
  } = useQuery({
    queryKey: ["salesrep-customers"],
    queryFn: () => salesRepApi.getCustomers({}, { page: 1, limit: 1000 }),
  });

  // Fetch products for product selection
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: () =>
      salesRepApi.getProducts({ status: "active" }, { page: 1, limit: 1000 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: OrderFormData) => {
      const createData: CreateOrderRequest = {
        customer_id: Number(data.customer_id) || 0,
        order_date: data.order_date,
        items: data.items.map((item) => ({
          product_id: Number(item.product_id) || 0,
          product_name: item.product_name,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          discount: Number(item.discount) || 0,
        })),
        discount_amount: Number(data.discount_amount) || 0,
        tax_amount: Number(data.tax_amount) || 0,
        status: data.status,
        notes: data.notes,
      };
      return salesRepApi.createOrder(createData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-orders"] });
      setIsCreateDialogOpen(false);
      resetForm();
      const isDraft = variables.status === "draft";
      toast({
        title: "Success",
        description: isDraft
          ? "Order saved as draft successfully"
          : "Order submitted for approval successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrderFormData }) => {
      const updateData: UpdateOrderRequest = {
        id,
        customer_id: Number(data.customer_id) || 0,
        order_date: data.order_date,
        items: data.items.map((item) => ({
          product_id: Number(item.product_id) || 0,
          product_name: item.product_name,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          discount: Number(item.discount) || 0,
        })),
        discount_amount: Number(data.discount_amount) || 0,
        tax_amount: Number(data.tax_amount) || 0,
        status: data.status,
        notes: data.notes,
      };
      return salesRepApi.updateOrder(id, updateData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-orders"] });
      setIsEditDialogOpen(false);
      setSelectedOrder(null);
      resetForm();
      const isDraft = variables.data.status === "draft";
      toast({
        title: "Success",
        description: isDraft
          ? "Order saved as draft successfully"
          : "Order submitted for approval successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => salesRepApi.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-orders"] });
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      order_date: new Date().toISOString().split("T")[0],
      items: [],
      discount_amount: 0,
      tax_amount: 0,
      status: "draft",
      notes: "",
    });
  };

  const handleCreate = (status: string = "submitted_for_approval") => {
    const dataWithStatus = { ...formData, status };
    createMutation.mutate(dataWithStatus);
  };

  const handleUpdate = (status: string = "submitted_for_approval") => {
    if (selectedOrder) {
      const dataWithStatus = { ...formData, status };
      updateMutation.mutate({ id: selectedOrder.id, data: dataWithStatus });
    }
  };

  const handleEdit = (order: SalesRepOrder) => {
    // Only allow editing draft orders
    if (order.status !== "draft") {
      toast({
        title: "Cannot Edit Order",
        description:
          "Only draft orders can be edited. Current status: " + order.status,
        variant: "destructive",
      });
      return;
    }

    setSelectedOrder(order);
    setFormData({
      customer_id: order.customer_id,
      order_date: order.order_date.split("T")[0], // Convert to YYYY-MM-DD format
      items: order.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total_price: item.total_price,
      })),
      discount_amount: order.discount_amount,
      tax_amount: order.tax_amount,
      status: order.status,
      notes: "", // Assuming notes aren't stored in the order object
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleOpenApprovalWorkflow = (order: SalesRepOrder) => {
    setApprovalOrder(order);
    setShowApprovalWorkflow(true);
  };

  const handleOrderUpdated = (updatedOrder: SalesRepOrder) => {
    // Update the order in the cache
    queryClient.setQueryData(
      ["salesrep-orders", search, statusFilter, customerFilter, currentPage],
      (
        oldData:
          | {
              data: SalesRepOrder[];
              total: number;
              page: number;
              limit: number;
            }
          | undefined
      ) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((order: SalesRepOrder) =>
            order.id === updatedOrder.id ? updatedOrder : order
          ),
        };
      }
    );
    setApprovalOrder(updatedOrder);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      draft: "outline",
      submitted_for_approval: "secondary",
      approved: "default",
      rejected: "destructive",
      factory_accepted: "default",
      confirmed: "default",
      processing: "secondary",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const orders = ordersData?.data || [];
  const pagination = ordersData
    ? {
        page: ordersData.page,
        limit: ordersData.limit,
        total: ordersData.total,
        total_pages: ordersData.totalPages,
      }
    : undefined;

  // Helper function to get customers from either response structure
  const getCustomers = () => {
    if (!customersData) return [];
    if ("customers" in customersData) {
      return customersData.customers;
    }
    return customersData.data || [];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <Badge variant="outline" className="capitalize">
              {getUserRole() === "admin"
                ? "Admin View"
                : getUserRole() === "factory_manager"
                ? "Factory Manager"
                : "Sales Rep"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {getUserRole() === "admin"
              ? "Manage all customer orders and track their progress"
              : getUserRole() === "factory_manager"
              ? "Manage orders assigned to your factories"
              : "Manage your customer orders and track their progress"}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Create a new customer order with products and pricing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select
                  value={formData.customer_id.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customer_id: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCustomers().map((customer) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                      >
                        {customer.name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-date">Order Date</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) =>
                    setFormData({ ...formData, order_date: e.target.value })
                  }
                />
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <Label>Order Items</Label>
                <div className="border rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2 text-sm font-medium">
                      <span>Product</span>
                      <span>Quantity</span>
                      <span>Unit Price</span>
                      <span>Discount</span>
                      <span>Total</span>
                    </div>
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-5 gap-2 items-center"
                      >
                        <div className="space-y-1">
                          {productsData?.products && (
                            <ProductSelector
                              value={item.product_name}
                              products={productsData.products}
                              onProductSelect={(product) => {
                                const newItems = [...formData.items];
                                newItems[index].product_id = product.id;
                                newItems[index].product_name = product.name;
                                newItems[index].unit_price =
                                  product.selling_price || 0;
                                newItems[index].total_price = Math.max(
                                  0,
                                  (Number(newItems[index].quantity) || 0) *
                                    (Number(product.selling_price) || 0) -
                                    (Number(newItems[index].discount) || 0)
                                );
                                setFormData({
                                  ...formData,
                                  items: newItems,
                                });
                              }}
                              onClear={() => {
                                const newItems = [...formData.items];
                                newItems[index].product_id = 0;
                                newItems[index].product_name = "";
                                newItems[index].unit_price = 0;
                                newItems[index].total_price = 0;
                                setFormData({
                                  ...formData,
                                  items: newItems,
                                });
                              }}
                              placeholder="Search and select product..."
                            />
                          )}
                        </div>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].quantity =
                              Number(e.target.value) || 0;
                            newItems[index].total_price = Math.max(
                              0,
                              (Number(e.target.value) || 0) *
                                (Number(newItems[index].unit_price) || 0) -
                                (Number(newItems[index].discount) || 0)
                            );
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].unit_price =
                              Number(e.target.value) || 0;
                            newItems[index].total_price = Math.max(
                              0,
                              (Number(newItems[index].quantity) || 0) *
                                (Number(e.target.value) || 0) -
                                (Number(newItems[index].discount) || 0)
                            );
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Discount"
                          value={item.discount}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].discount =
                              Number(e.target.value) || 0;
                            newItems[index].total_price = Math.max(
                              0,
                              (Number(newItems[index].quantity) || 0) *
                                (Number(newItems[index].unit_price) || 0) -
                                (Number(e.target.value) || 0)
                            );
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {formatCurrency(item.total_price || 0)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newItems = formData.items.filter(
                                (_, i) => i !== index
                              );
                              setFormData({ ...formData, items: newItems });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          items: [
                            ...formData.items,
                            {
                              product_id: 0,
                              product_name: "",
                              quantity: 1,
                              unit_price: 0,
                              discount: 0,
                              total_price: 0,
                            },
                          ],
                        });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">Order Discount</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_amount: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax">Tax Amount</Label>
                  <Input
                    id="tax"
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tax_amount: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Total</Label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>
                        {formatCurrency(
                          formData.items.reduce(
                            (total, item) =>
                              total + (Number(item.total_price) || 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>
                        {formatCurrency(Number(formData.tax_amount) || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-1">
                      <span>Total:</span>
                      <span>
                        {formatCurrency(
                          formData.items.reduce(
                            (total, item) =>
                              total + (Number(item.total_price) || 0),
                            0
                          ) + (Number(formData.tax_amount) || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Order notes (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleCreate("draft")}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                onClick={() => handleCreate("submitted_for_approval")}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? "Submitting..."
                  : "Submit for Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-customers">All Customers</SelectItem>
                {getCustomers().map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all-status");
                setCustomerFilter("all-customers");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Order List</CardTitle>
          <CardDescription>
            {pagination
              ? `${pagination.total} orders found`
              : "Loading orders..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Details</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {order.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {order.customer?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(order.order_date), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Package className="h-3 w-3 mr-1" />
                        {order.items.length} items
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-medium">
                          {formatCurrency(order.final_amount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(order)}
                          disabled={order.status !== "draft"}
                          title={
                            order.status !== "draft"
                              ? "Only draft orders can be edited"
                              : "Edit order"
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenApprovalWorkflow(order)}
                          title="Open approval workflow"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Order</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete order{" "}
                                {order.order_number}? This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(order.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No orders found</p>
                      <p className="text-sm text-muted-foreground">
                        {getUserRole() === "admin"
                          ? "Try adjusting your search or filters"
                          : getUserRole() === "factory_manager"
                          ? "No orders are currently assigned to your factories"
                          : "You haven't created any orders yet"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              Update order details and items. Only draft orders can be edited.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer</Label>
              <Select
                value={formData.customer_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, customer_id: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {getCustomers().map((customer) => (
                    <SelectItem
                      key={customer.id}
                      value={customer.id.toString()}
                    >
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-order-date">Order Date</Label>
              <Input
                id="edit-order-date"
                type="date"
                value={formData.order_date}
                onChange={(e) =>
                  setFormData({ ...formData, order_date: e.target.value })
                }
              />
            </div>

            {/* Order Items */}
            <div className="space-y-4">
              <Label>Order Items</Label>
              <div className="border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2 text-sm font-medium">
                    <span>Product</span>
                    <span>Quantity</span>
                    <span>Unit Price</span>
                    <span>Discount</span>
                    <span>Total</span>
                  </div>
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-5 gap-2 items-center"
                    >
                      <div className="space-y-1">
                        {productsData?.products && (
                          <ProductSelector
                            value={item.product_name}
                            products={productsData.products}
                            onProductSelect={(product) => {
                              const newItems = [...formData.items];
                              newItems[index].product_id = product.id;
                              newItems[index].product_name = product.name;
                              newItems[index].unit_price =
                                product.selling_price || 0;
                              newItems[index].total_price = Math.max(
                                0,
                                (Number(newItems[index].quantity) || 0) *
                                  (Number(product.selling_price) || 0) -
                                  (Number(newItems[index].discount) || 0)
                              );
                              setFormData({
                                ...formData,
                                items: newItems,
                              });
                            }}
                            onClear={() => {
                              const newItems = [...formData.items];
                              newItems[index].product_id = 0;
                              newItems[index].product_name = "";
                              newItems[index].unit_price = 0;
                              newItems[index].total_price = 0;
                              setFormData({
                                ...formData,
                                items: newItems,
                              });
                            }}
                            placeholder="Search and select product..."
                          />
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].quantity =
                            Number(e.target.value) || 0;
                          newItems[index].total_price = Math.max(
                            0,
                            (Number(e.target.value) || 0) *
                              (Number(newItems[index].unit_price) || 0) -
                              (Number(newItems[index].discount) || 0)
                          );
                          setFormData({ ...formData, items: newItems });
                        }}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].unit_price =
                            Number(e.target.value) || 0;
                          newItems[index].total_price = Math.max(
                            0,
                            (Number(newItems[index].quantity) || 0) *
                              (Number(e.target.value) || 0) -
                              (Number(newItems[index].discount) || 0)
                          );
                          setFormData({ ...formData, items: newItems });
                        }}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Discount"
                        value={item.discount}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].discount =
                            Number(e.target.value) || 0;
                          newItems[index].total_price = Math.max(
                            0,
                            (Number(newItems[index].quantity) || 0) *
                              (Number(newItems[index].unit_price) || 0) -
                              (Number(e.target.value) || 0)
                          );
                          setFormData({ ...formData, items: newItems });
                        }}
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          {formatCurrency(item.total_price || 0)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = formData.items.filter(
                              (_, i) => i !== index
                            );
                            setFormData({ ...formData, items: newItems });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: [
                          ...formData.items,
                          {
                            product_id: 0,
                            product_name: "",
                            quantity: 1,
                            unit_price: 0,
                            discount: 0,
                            total_price: 0,
                          },
                        ],
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-discount">Order Discount</Label>
                <Input
                  id="edit-discount"
                  type="number"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_amount: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tax">Tax Amount</Label>
                <Input
                  id="edit-tax"
                  type="number"
                  step="0.01"
                  value={formData.tax_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_amount: Number(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Order Total</Label>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>
                    {formatCurrency(
                      formData.items.reduce(
                        (total, item) =>
                          total + (Number(item.total_price) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>
                    {formatCurrency(Number(formData.tax_amount) || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span>
                    {formatCurrency(
                      formData.items.reduce(
                        (total, item) =>
                          total + (Number(item.total_price) || 0),
                        0
                      ) + (Number(formData.tax_amount) || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Order notes (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleUpdate("draft")}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              onClick={() => handleUpdate("submitted_for_approval")}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending
                ? "Submitting..."
                : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Approval Workflow Dialog */}
      {approvalOrder && (
        <Dialog
          open={showApprovalWorkflow}
          onOpenChange={setShowApprovalWorkflow}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Approval Workflow</DialogTitle>
              <DialogDescription>
                Manage the approval process for order{" "}
                {approvalOrder.order_number}
              </DialogDescription>
            </DialogHeader>
            <EnhancedOrderApprovalWorkflow
              order={approvalOrder}
              onOrderUpdated={handleOrderUpdated}
              userRole={getUserRole()}
              availableFactories={factoriesData?.factories || []}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SalesRepOrders;
