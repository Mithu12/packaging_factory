import { useState } from "react"
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

interface OrderItem {
  id: string
  productName: string
  price: number
  quantity: number
  discount: number
  total: number
}

interface SalesOrder {
  id: string
  customerName: string
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "On Hold"
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  createdDate: string
  notes: string
}

const mockOrders: SalesOrder[] = [
  {
    id: "ORD-001",
    customerName: "John Doe",
    status: "Confirmed",
    items: [
      { id: "1", productName: "Laptop Computer", price: 999.99, quantity: 1, discount: 10, total: 899.99 },
      { id: "2", productName: "Wireless Mouse", price: 29.99, quantity: 2, discount: 0, total: 59.98 }
    ],
    subtotal: 959.97,
    tax: 96.00,
    total: 1055.97,
    createdDate: "2024-01-09 10:30",
    notes: "Priority delivery requested"
  },
  {
    id: "ORD-002",
    customerName: "Jane Smith",
    status: "On Hold",
    items: [
      { id: "3", productName: "Office Chair", price: 199.99, quantity: 1, discount: 5, total: 189.99 }
    ],
    subtotal: 189.99,
    tax: 19.00,
    total: 208.99,
    createdDate: "2024-01-09 14:15",
    notes: "Waiting for stock confirmation"
  }
]

const mockProducts = [
  { id: "1", name: "Laptop Computer", price: 999.99 },
  { id: "2", name: "Wireless Mouse", price: 29.99 },
  { id: "3", name: "Office Chair", price: 199.99 },
  { id: "4", name: "Notebook", price: 4.99 },
  { id: "5", name: "Water Bottle", price: 12.99 }
]

export function SalesOrderProcessing() {
  const [orders, setOrders] = useState<SalesOrder[]>(mockOrders)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    notes: "",
    items: [] as OrderItem[]
  })
  const [newItem, setNewItem] = useState({
    productId: "",
    quantity: "1",
    discount: "0"
  })

  const addItemToOrder = () => {
    if (!newItem.productId) {
      toast({
        title: "Product Required",
        description: "Please select a product",
        variant: "destructive"
      })
      return
    }

    const product = mockProducts.find(p => p.id === newItem.productId)
    if (!product) return

    const quantity = parseInt(newItem.quantity) || 1
    const discount = parseFloat(newItem.discount) || 0
    const total = (product.price * quantity) - ((product.price * quantity) * discount / 100)

    const orderItem: OrderItem = {
      id: Date.now().toString(),
      productName: product.name,
      price: product.price,
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

  const createOrder = () => {
    if (!newOrder.customerName || newOrder.items.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add customer name and at least one item",
        variant: "destructive"
      })
      return
    }

    const { subtotal, tax, total } = calculateOrderTotal(newOrder.items)
    
    const order: SalesOrder = {
      id: `ORD-${String(orders.length + 1).padStart(3, '0')}`,
      customerName: newOrder.customerName,
      status: "Pending",
      items: newOrder.items,
      subtotal,
      tax,
      total,
      createdDate: new Date().toLocaleString(),
      notes: newOrder.notes
    }

    setOrders(prev => [order, ...prev])
    setNewOrder({ customerName: "", notes: "", items: [] })
    setIsCreateDialogOpen(false)
    toast({ title: "Sales order created successfully" })
  }

  const updateOrderStatus = (orderId: string, newStatus: SalesOrder["status"]) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
    toast({ title: `Order ${orderId} status updated to ${newStatus}` })
  }

  const getStatusIcon = (status: SalesOrder["status"]) => {
    switch (status) {
      case "Pending": return <ShoppingBag className="w-4 h-4" />
      case "Confirmed": return <CheckCircle className="w-4 h-4" />
      case "Completed": return <CheckCircle className="w-4 h-4" />
      case "Cancelled": return <XCircle className="w-4 h-4" />
      case "On Hold": return <Pause className="w-4 h-4" />
      default: return <ShoppingBag className="w-4 h-4" />
    }
  }

  const getStatusVariant = (status: SalesOrder["status"]) => {
    switch (status) {
      case "Pending": return "secondary"
      case "Confirmed": return "default"
      case "Completed": return "default"
      case "Cancelled": return "destructive"
      case "On Hold": return "secondary"
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
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={newOrder.customerName}
                        onChange={(e) => setNewOrder(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="Enter customer name"
                      />
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
                            {mockProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - ${product.price}
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
                              <span className="font-bold">${item.total.toFixed(2)}</span>
                              <Button variant="destructive" size="sm" onClick={() => removeItemFromOrder(item.id)}>
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">Total: ${calculateOrderTotal(newOrder.items).total.toFixed(2)}</span>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calculator className="w-4 h-4" />
                              Subtotal: ${calculateOrderTotal(newOrder.items).subtotal.toFixed(2)} + Tax: ${calculateOrderTotal(newOrder.items).tax.toFixed(2)}
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
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.items.length} items</TableCell>
                  <TableCell className="font-bold">${order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.createdDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(order); setIsViewDialogOpen(true) }}>
                        <Search className="w-3 h-3" />
                      </Button>
                      {order.status === "On Hold" && (
                        <Button variant="outline" size="sm" onClick={() => updateOrderStatus(order.id, "Pending")}>
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                      {order.status === "Pending" && (
                        <Button variant="outline" size="sm" onClick={() => updateOrderStatus(order.id, "On Hold")}>
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}
                      {(order.status === "Pending" || order.status === "On Hold") && (
                        <Button variant="default" size="sm" onClick={() => updateOrderStatus(order.id, "Confirmed")}>
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
            <DialogTitle>Order Details - {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-lg">{selectedOrder.customerName}</p>
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
                  <p>{selectedOrder.createdDate}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-lg font-bold">${selectedOrder.total.toFixed(2)}</p>
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
                <Label className="text-lg font-medium">Order Items</Label>
                <div className="mt-3 space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.price} × {item.quantity} {item.discount > 0 && `(${item.discount}% discount)`}
                        </p>
                      </div>
                      <span className="font-bold">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (10%):</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
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