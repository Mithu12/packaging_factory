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
import type {
  SalesRepOrder,
  OrderFormData,
  CreateOrderRequest,
  UpdateOrderRequest,
} from "../types";
import { useToast } from "@/hooks/use-toast";
import { useFormatting } from "@/hooks/useFormatting";
import { format } from "date-fns";

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
  const [formData, setFormData] = useState<OrderFormData>({
    customer_id: 0,
    items: [],
    discount_amount: 0,
    notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency } = useFormatting();
  const limit = 10;

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
        customer_id: data.customer_id,
        items: data.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
        })),
        discount_amount: data.discount_amount,
        notes: data.notes,
      };
      return salesRepApi.createOrder(createData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-orders"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Order created successfully",
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
        customer_id: data.customer_id,
        items: data.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
        })),
        discount_amount: data.discount_amount,
        notes: data.notes,
      };
      return salesRepApi.updateOrder(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-orders"] });
      setIsEditDialogOpen(false);
      setSelectedOrder(null);
      resetForm();
      toast({
        title: "Success",
        description: "Order updated successfully",
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
      items: [],
      discount_amount: 0,
      notes: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, data: formData });
    }
  };

  const handleEdit = (order: SalesRepOrder) => {
    setSelectedOrder(order);
    setFormData({
      customer_id: order.customer_id,
      items: order.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total_price: item.total_price,
      })),
      discount_amount: order.discount_amount,
      notes: "", // Assuming notes aren't stored in the order object
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      draft: "outline",
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
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage customer orders and track their progress
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
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
                          <Input
                            placeholder="Search products..."
                            value={item.product_name}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].product_name = e.target.value;
                              setFormData({ ...formData, items: newItems });
                            }}
                            onFocus={() => {
                              // You could add product search dropdown here
                            }}
                          />
                          {productsData?.products && (
                            <div className="relative">
                              <Select
                                value={item.product_id.toString()}
                                onValueChange={(value) => {
                                  const product = productsData.products.find(
                                    (p) => p.id.toString() === value
                                  );
                                  if (product) {
                                    const newItems = [...formData.items];
                                    newItems[index].product_id = product.id;
                                    newItems[index].product_name = product.name;
                                    newItems[index].unit_price =
                                      product.selling_price || 0;
                                    newItems[index].total_price =
                                      newItems[index].quantity *
                                        (product.selling_price || 0) -
                                      newItems[index].discount;
                                    setFormData({
                                      ...formData,
                                      items: newItems,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {productsData.products
                                    .filter(
                                      (product) =>
                                        product.name
                                          .toLowerCase()
                                          .includes(
                                            item.product_name.toLowerCase()
                                          ) ||
                                        product.sku
                                          .toLowerCase()
                                          .includes(
                                            item.product_name.toLowerCase()
                                          )
                                    )
                                    .slice(0, 10)
                                    .map((product) => (
                                      <SelectItem
                                        key={product.id}
                                        value={product.id.toString()}
                                      >
                                        {product.name} ({product.sku}) -
                                        {product.selling_price}
                                      </SelectItem>
                                    ))}
                                  {productsData.products.filter(
                                    (product) =>
                                      product.name
                                        .toLowerCase()
                                        .includes(
                                          item.product_name.toLowerCase()
                                        ) ||
                                      product.sku
                                        .toLowerCase()
                                        .includes(
                                          item.product_name.toLowerCase()
                                        )
                                  ).length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground">
                                      No products found
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].quantity = Number(e.target.value);
                            newItems[index].total_price =
                              Number(e.target.value) *
                                newItems[index].unit_price -
                              newItems[index].discount;
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
                            newItems[index].unit_price = Number(e.target.value);
                            newItems[index].total_price =
                              newItems[index].quantity *
                                Number(e.target.value) -
                              newItems[index].discount;
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
                            newItems[index].discount = Number(e.target.value);
                            newItems[index].total_price =
                              newItems[index].quantity *
                                newItems[index].unit_price -
                              Number(e.target.value);
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
                  <Label htmlFor="discount">Order Discount</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_amount: Number(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Total</Label>
                  <div className="text-lg font-semibold">
                    {formatCurrency(
                      formData.items.reduce(
                        (total, item) => total + (item.total_price || 0),
                        0
                      )
                    )}
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
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Order"}
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
                        >
                          <Edit className="h-4 w-4" />
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
                        Try adjusting your search or filters
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              Update order details and items.
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
              <Label htmlFor="edit-discount">Order Discount</Label>
              <Input
                id="edit-discount"
                type="number"
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount_amount: Number(e.target.value),
                  })
                }
                placeholder="0.00"
              />
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
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesRepOrders;
