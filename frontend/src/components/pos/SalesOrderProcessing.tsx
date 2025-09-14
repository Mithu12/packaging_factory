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
import { ShoppingBag, Plus, Edit, Pause, Play, CheckCircle, XCircle, Search, Calculator } from "lucide-react"
import { SalesOrderApi, CustomerApi, ProductApi } from "@/services/api"
import { SalesOrder, Customer, Product } from "@/services/types"

interface OrderItem {
  id: string
  productName: string
  price: number
  quantity: number
  discount: number
  total: number
}

export function SalesOrderProcessing() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
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

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ordersData, customersData, productsData] = await Promise.all([
        SalesOrderApi.getSalesOrders({ page: 1, limit: 100 }),
        CustomerApi.getCustomers({ page: 1, limit: 100 }),
        ProductApi.getProducts({ page: 1, limit: 100 })
      ])

      setOrders(ordersData.sales_orders || [])
      setCustomers(customersData.customers || [])
      setProducts(productsData.products || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
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
    const total = (product.selling_price * quantity) - ((product.selling_price * quantity) * discount / 100)

    const orderItem: OrderItem = {
      id: Date.now().toString(),
      productName: product.name,
      price: product.selling_price,
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
        cashier_id: 1, // TODO: Get from auth context
        payment_method: "cash" as const,
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
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={newOrder.notes}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Order notes (optional)"
                      />
                    </div>
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
                                {product.name} - ${product.selling_price}
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
                                ${item.price} × {item.quantity} {item.discount > 0 && `(${item.discount}% discount)`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">${Number(item.total).toFixed(2)}</span>
                              <Button variant="destructive" size="sm" onClick={() => removeItemFromOrder(item.id)}>
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">Total: ${Number(calculateOrderTotal(newOrder.items).total).toFixed(2)}</span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calculator className="w-4 h-4" />
                              Subtotal: ${Number(calculateOrderTotal(newOrder.items).subtotal).toFixed(2)} + Tax: ${Number(calculateOrderTotal(newOrder.items).tax).toFixed(2)}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
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
                  <TableCell>{order.customer_id ? `Customer #${order.customer_id}` : "Walk-in Customer"}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">R{Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(order.order_date).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(order); setIsViewDialogOpen(true) }}>
                        <Search className="w-3 h-3" />
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-lg font-bold">R{Number(selectedOrder.total_amount).toFixed(2)}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              <Separator />

              <div>
                <Label className="text-lg font-medium">Order Summary</Label>
                <div className="mt-3 space-y-2">
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>R{Number(selectedOrder.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>R{Number(selectedOrder.tax_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>R{Number(selectedOrder.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}