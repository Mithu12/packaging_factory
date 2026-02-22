"use client";

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { ShoppingBag, Plus, Edit, Pause, Play, CheckCircle, XCircle, Search, Calculator, Printer, FileText, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { SalesOrderApi, CustomerApi, ProductApi } from "@/services/api"
import { SalesOrder, Customer, Product, SalesOrderWithDetails } from "@/services/types"
import { DistributionApi, DistributionCenter } from "@/modules/inventory/services/distribution-api"
import { Receipt } from "./Receipt"
import { Chalan } from "./Chalan"
import { useFormatting } from "@/hooks/useFormatting"
import { useAuth } from "@/contexts/AuthContext"

interface OrderItem {
  id: string
  productName: string
  price: number
  quantity: number
  discount: number
  total: number
}

const NoteViewer = ({ notes }: { notes: string }) => {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes);
    
    // Check if it's the Livana Ecom format
    if (parsed.source === 'livana-ecom' && parsed.shipping) {
      const s = parsed.shipping;
      return (
        <div className="bg-muted/50 p-3 rounded-md space-y-2 text-sm border">
          <Badge variant="secondary" className="mb-1">From: Livana Ecom</Badge>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-semibold block">Shipping To:</span>
              <p>{s.name}</p>
              <p>{s.phone}</p>
            </div>
            <div>
              <span className="font-semibold block">Address:</span>
              <p>{s.address}</p>
              <p>{s.city} - {s.postalCode}</p>
            </div>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span>Shipping Cost:</span>
            <span className="font-medium">৳ {s.shippingCost}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span className="font-medium uppercase">{s.paymentMethodOriginal}</span>
          </div>
        </div>
      );
    }

    // Generic JSON viewer
    return (
      <div className="bg-muted/50 p-2 rounded-md text-xs font-mono border overflow-auto max-h-40">
        <pre>{JSON.stringify(parsed, null, 2)}</pre>
      </div>
    );
  } catch (e) {
    // Not JSON, return as plain text
    return <p className="text-muted-foreground whitespace-pre-wrap">{notes}</p>;
  }
};

export function SalesOrderProcessing() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<DistributionCenter[]>([])
  const [selectedBranch, setSelectedBranch] = useState<number | undefined>()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SalesOrderWithDetails | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [showChalan, setShowChalan] = useState(false)
  const [chalanData, setChalanData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [newOrder, setNewOrder] = useState({
    customerId: "",
    notes: "",
    items: [] as OrderItem[]
  })
  const [newItem, setNewItem] = useState({
    productId: "",
    quantity: "1",
    discount: "0"
  })

  // Pagination and Filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalOrders, setTotalOrders] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dcFilter, setDcFilter] = useState<string>("all")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const { formatCurrency } = useFormatting();
  const { user, isLoading: authLoading } = useAuth();

  // Set initial DC filter if user has one
  useEffect(() => {
    if (user?.distribution_center_id) {
      setDcFilter(user.distribution_center_id.toString())
    }
  }, [user])

  // Helper function to get product price based on customer type
  const getProductPrice = (product: Product, customerId?: string): number => {
    if (!customerId) return product.selling_price;
    
    const customer = customers.find(c => c.id.toString() === customerId);
    if (customer?.customer_type === 'wholesale' && product.wholesale_price !== undefined && product.wholesale_price !== null) {
      return product.wholesale_price;
    }
    return product.selling_price;
  };

  // Load data on component mount
  useEffect(() => {
    if (!authLoading) {
      loadInitialData()
    }
  }, [authLoading])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reload orders when filters or pagination change
  useEffect(() => {
    if (!authLoading) {
      loadOrders()
    }
  }, [authLoading, currentPage, pageSize, debouncedSearch, statusFilter, dcFilter])

  // Recalculate order item prices when customer changes
  useEffect(() => {
    if (newOrder.items.length > 0 && newOrder.customerId) {
      setNewOrder(prev => ({
        ...prev,
        items: prev.items.map(item => {
          const product = products.find(p => p.id.toString() === item.id)
          if (!product) return item
          
          const newPrice = getProductPrice(product, prev.customerId)
          if (newPrice !== item.price) {
            const discount = item.discount || 0
            const newTotal = (newPrice * item.quantity) - ((newPrice * item.quantity) * discount / 100)
            return {
              ...item,
              price: newPrice,
              total: newTotal
            }
          }
          return item
        })
      }))
    }
  }, [newOrder.customerId, products, customers])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const dcId = user?.distribution_center_id;
      const isRestricted = dcId !== undefined && dcId !== null;
      
      const requests: Promise<any>[] = [
        CustomerApi.getCustomers({ page: 1, limit: 1000 }),
        ProductApi.getProducts({ page: 1, limit: 1000, distribution_center_id: dcId || undefined }),
      ]

      if (isRestricted) {
        requests.push(DistributionApi.getDistributionCenter(dcId))
      } else {
        requests.push(DistributionApi.getDistributionCenters({ status: 'active', limit: 100 }))
      }

      const results = await Promise.all(requests)
      console.log(results);
      
      setCustomers(results[0].customers || [])
      setProducts(results[1].products?.filter((product: any) => product.current_stock > 0) || [])

      if (isRestricted) {
        // Single DC response
        setBranches(results[2] ? [results[2]] : [])
      } else {
        // DC list response
        setBranches(results[2]?.centers || [])
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const dcId = user?.distribution_center_id ?? (dcFilter !== "all" ? parseInt(dcFilter) : undefined);
      
      const params: any = {
        page: currentPage,
        limit: pageSize,
      }

      if (debouncedSearch) params.search = debouncedSearch
      if (statusFilter !== "all") params.status = statusFilter
      if (dcId) params.distribution_center_id = dcId

      const ordersData = await SalesOrderApi.getSalesOrders(params)
      setOrders(ordersData.sales_orders || [])
      setTotalOrders(ordersData.total || 0)
    } catch (error) {
      console.error("Error loading orders:", error)
      toast({
        title: "Error",
        description: "Failed to load sales orders",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    // Legacy function preserved but redirecting to loadInitialData and loadOrders
    await loadInitialData();
    await loadOrders();
  }

  const addItemToOrder = () => {
    if (!newItem.productId) {
      toast({
        title: "Product Required",
        description: "Please select a product",
        variant: "destructive"
      })
      return
    }

    const product = products.find(p => p.id.toString() === newItem.productId)
    if (!product) return

    const quantity = parseInt(newItem.quantity) || 1
    const discount = parseFloat(newItem.discount) || 0
    const productPrice = getProductPrice(product, newOrder.customerId)
    const total = (productPrice * quantity) - ((productPrice * quantity) * discount / 100)

    const orderItem: OrderItem = {
      id: product.id.toString(),
      productName: product.name,
      price: productPrice,
      quantity,
      discount,
      total
    }

    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, orderItem]
    }))

    setNewItem({ productId: "", quantity: "1", discount: "0" })
  }

  const removeItemFromOrder = (itemId: string) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const calculateOrderTotal = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.1
    return { subtotal, tax, total: subtotal + tax }
  }

  const createOrder = async () => {
    if (!newOrder.customerId || newOrder.items.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a customer and add at least one item",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      const { subtotal, tax, total } = calculateOrderTotal(newOrder.items)
      
      const orderData = {
        customer_id: parseInt(newOrder.customerId),
        distribution_center_id: selectedBranch,
        cashier_id: user?.id || 1,
        payment_method: "credit" as const,
        notes: newOrder.notes,
        discount_amount: 0,
        discount_percentage: 0,
        line_items: newOrder.items.map(item => ({
          product_id: parseInt(item.id),
          quantity: item.quantity,
          unit_price: item.price,
          discount_percentage: item.discount,
          total_price: item.total
        }))
      }

      const createdOrder = await SalesOrderApi.createSalesOrder(orderData)
      setOrders(prev => [createdOrder, ...prev])
      setNewOrder({ customerId: "", notes: "", items: [] })
      setIsCreateDialogOpen(false)
      toast({ title: "Sales order created successfully" })
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Error",
        description: "Failed to create sales order",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = async (order: SalesOrder) => {
    try {
      setLoading(true)
      const orderDetails = await SalesOrderApi.getSalesOrder(order.id)
      setSelectedOrder(order)
      setSelectedOrderDetails(orderDetails)
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrintReceipt = async (order: SalesOrder) => {
    try {
      setLoading(true)
      const orderDetails = await SalesOrderApi.getSalesOrder(order.id)
      
      // Convert line items to cart format for receipt
      const cartItems = orderDetails.line_items.map(item => ({
        id: item.product_id.toString(),
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount_percentage > 0 ? item.discount_percentage : item.discount_amount,
        discountType: item.discount_percentage > 0 ? 'percentage' as const : 'fixed' as const
      }))

      // Calculate totals
      const subtotal = orderDetails.line_items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
      const totalDiscount = orderDetails.line_items.reduce((sum, item) => {
        const itemSubtotal = item.unit_price * item.quantity
        const itemDiscount = item.discount_percentage > 0 
          ? (itemSubtotal * item.discount_percentage) / 100 
          : item.discount_amount
        return sum + itemDiscount
      }, 0)
      
      // Find customer's due amount from customers list
      const customer = orderDetails.customer_id 
        ? customers.find(c => c.id === orderDetails.customer_id) 
        : null;
      
      // Calculate current order's unpaid amount (due from this order)
      const orderPaid = orderDetails.cash_received || 0;
      const currentOrderDue = orderDetails.total_amount - orderPaid;
      
      // Customer's due_amount already includes this order's due, so subtract it to get the previous due
      const customerTotalDue = customer?.due_amount || 0;
      const previousDue = Math.max(0, customerTotalDue - currentOrderDue);

      const receiptData = {
        orderNumber: orderDetails.order_number,
        customer: orderDetails.customer_id ? {
          id: orderDetails.customer_id,
          name: orderDetails.customer_name || 'Unknown',
          email: orderDetails.customer_email,
          phone: orderDetails.customer_phone
        } : null,
        cart: cartItems,
        subtotal: subtotal,
        overallDiscount: orderDetails.discount_amount || 0,
        overallDiscountType: orderDetails.discount_amount > 0 ? 'flat' as const : 'percentage' as const,
        tax: orderDetails.tax_amount,
        total: orderDetails.total_amount,
        paymentMethod: orderDetails.payment_method || 'cash',
        cashReceived: orderDetails.cash_received,
        changeGiven: orderDetails.change_given,
        orderDate: orderDetails.order_date,
        notes: orderDetails.notes || '',
        previousDue: previousDue
      }

      setReceiptData(receiptData)
      setShowReceipt(true)
    } catch (error) {
      console.error("Error preparing receipt:", error)
      toast({
        title: "Error",
        description: "Failed to prepare receipt",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadChalan = async (order: SalesOrder) => {
    try {
      setLoading(true)
      const orderDetails = await SalesOrderApi.getSalesOrder(order.id)
      
      // Prepare chalan data
      const chalanItems = orderDetails.line_items.map(item => ({
        id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity
      }))

      // Find customer details from customers list for address
      const customerDetails = customers.find(c => c.id === orderDetails.customer_id)
      
      const chalanData = {
        chalanNumber: orderDetails.order_number,
        chalanDate: orderDetails.order_date,
        customer: orderDetails.customer_id ? {
          name: orderDetails.customer_name || 'Unknown',
          address: customerDetails?.address || '',
          email: orderDetails.customer_email || '',
          phone: orderDetails.customer_phone || ''
        } : null,
        items: chalanItems
      }

      setChalanData(chalanData)
      setShowChalan(true)
    } catch (error) {
      console.error("Error preparing chalan:", error)
      toast({
        title: "Error",
        description: "Failed to prepare chalan",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: SalesOrder["status"]) => {
    try {
      setLoading(true)
      await SalesOrderApi.updateSalesOrder(parseInt(orderId), { status: newStatus })
      setOrders(prev => prev.map(order => 
        order.id.toString() === orderId ? { ...order, status: newStatus } : order
      ))
      toast({ title: `Order ${orderId} status updated to ${newStatus}` })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: SalesOrder["status"]) => {
    switch (status) {
      case "pending": return <ShoppingBag className="w-4 h-4" />
      case "processing": return <CheckCircle className="w-4 h-4" />
      case "completed": return <CheckCircle className="w-4 h-4" />
      case "cancelled": return <XCircle className="w-4 h-4" />
      case "refunded": return <Pause className="w-4 h-4" />
      default: return <ShoppingBag className="w-4 h-4" />
    }
  }

  const getStatusVariant = (status: SalesOrder["status"]) => {
    switch (status) {
      case "pending": return "secondary"
      case "processing": return "default"
      case "completed": return "default"
      case "cancelled": return "destructive"
      case "refunded": return "secondary"
      default: return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Sales Order Processing
            </span>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Sales Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerId">Customer *</Label>
                      <Select value={newOrder.customerId} onValueChange={(value) => setNewOrder(prev => ({ ...prev, customerId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!user?.distribution_center_id && (
                      <div>
                        <Label htmlFor="branch">Branch/Store</Label>
                        <Select 
                          value={selectedBranch?.toString() || "none"} 
                          onValueChange={(value) => setSelectedBranch(value === "none" ? undefined : parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Branch Selected</SelectItem>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name} {branch.is_primary && "(Primary)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={newOrder.notes}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Order notes (optional)"
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-lg font-medium">Add Items</Label>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <Label htmlFor="product">Product</Label>
                        <Select value={newItem.productId} onValueChange={(value) => setNewItem(prev => ({ ...prev, productId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - {formatCurrency(product.selling_price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="discount">Discount (%)</Label>
                        <Input
                          id="discount"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={newItem.discount}
                          onChange={(e) => setNewItem(prev => ({ ...prev, discount: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={addItemToOrder} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </div>

                  {newOrder.items.length > 0 && (
                    <div>
                      <Label className="text-lg font-medium">Order Items</Label>
                      <div className="mt-3 space-y-2">
                        {newOrder.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.price)} x {item.quantity} {item.discount > 0 && `(${item.discount}% discount)`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">{formatCurrency(item.total)}</span>
                              <Button variant="destructive" size="sm" onClick={() => removeItemFromOrder(item.id)}>
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">Total: {formatCurrency(calculateOrderTotal(newOrder.items).total)}</span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calculator className="w-4 h-4" />
                              Subtotal: {formatCurrency(calculateOrderTotal(newOrder.items).subtotal)} + Tax: {formatCurrency(calculateOrderTotal(newOrder.items).tax)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={createOrder} className="flex-1">Create Order</Button>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by order # or customer..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(user?.distribution_center_id || branches.length > 0) && (
              <div className="w-full md:w-48">
                <Select 
                  value={dcFilter} 
                  onValueChange={setDcFilter}
                  disabled={!!user?.distribution_center_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                    {user?.distribution_center_id && branches.length === 0 && (
                      <SelectItem value={user.distribution_center_id.toString()}>
                        {/* Fallback if dc info is not yet loaded */}
                        Loading branch info...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{`${order.customer_name}`}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {order.center_name || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{order.product_count || 0}</span>
                      <span className="text-sm text-muted-foreground">items</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(order.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(order.order_date).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                        <Search className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(order)} title="Print Receipt">
                        <Printer className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadChalan(order)} title="Download Chalan">
                        <FileText className="w-3 h-3" />
                      </Button>
                      {order.status === "refunded" && (
                        <Button variant="outline" size="sm" onClick={() => updateOrderStatus(order.id.toString(), "pending")}>
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                      {order.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={() => updateOrderStatus(order.id.toString(), "refunded")}>
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}
                      {(order.status === "pending" || order.status === "refunded") && (
                        <Button variant="default" size="sm" onClick={() => updateOrderStatus(order.id.toString(), "processing")}>
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                      {order.status === "processing" && (
                        <Button variant="default" size="sm" onClick={() => updateOrderStatus(order.id.toString(), "completed")}>
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalOrders)} to {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => {
                  setPageSize(parseInt(v))
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium">Page {currentPage}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * pageSize >= totalOrders || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-lg">{selectedOrder.customer_name || "Walk-in Customer"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={getStatusVariant(selectedOrder.status)} className="flex items-center gap-1 w-fit">
                    {getStatusIcon(selectedOrder.status)}
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created Date</Label>
                  <p>{new Date(selectedOrder.order_date).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Distribution Center</Label>
                  <p className="text-lg">{selectedOrder.center_name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-lg font-bold">{formatCurrency(selectedOrder.total_amount)}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Order Notes & Shipping Info</Label>
                  <NoteViewer notes={selectedOrder.notes} />
                </div>
              )}

              <Separator />

              {/* Line Items */}
              {selectedOrderDetails?.line_items && selectedOrderDetails.line_items.length > 0 && (
                <div>
                  <Label className="text-lg font-medium">Order Items</Label>
                  <div className="mt-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderDetails.line_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-sm text-muted-foreground">SKU: {item.product_sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell>
                              {item.discount_percentage > 0 ? (
                                <span className="text-sm">{item.discount_percentage}%</span>
                              ) : item.discount_amount > 0 ? (
                                <span className="text-sm">{formatCurrency(item.discount_amount)}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.line_total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-lg font-medium">Order Summary</Label>
                <div className="mt-3 space-y-2">
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Print Receipt</h2>
            <p className="text-gray-600 mb-4">
              Order #{receiptData.orderNumber} - {receiptData.customer?.name || 'Walk-in Customer'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Choose how you'd like to handle the receipt:
            </p>
            
            <Receipt {...receiptData} />
            
            <div className="mt-4">
              <Button 
                onClick={() => setShowReceipt(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chalan Dialog */}
      {showChalan && chalanData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Download Chalan</h2>
            <p className="text-gray-600 mb-4">
              Chalan #{chalanData.chalanNumber} - {chalanData.customer?.name || 'Walk-in Customer'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              A delivery chalan will be generated with product details and quantities.
            </p>
            
            <Chalan {...chalanData} />
            
            <div className="mt-4">
              <Button 
                onClick={() => setShowChalan(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}