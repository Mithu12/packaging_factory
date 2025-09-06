import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Package, 
  User,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Mail
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PurchaseOrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Mock PO data - in real app, fetch by ID
  const purchaseOrder = {
    id: "PO-2024-045",
    supplier: {
      name: "ABC Electronics Ltd",
      code: "SUP-001",
      contact: "John Smith",
      email: "orders@abcelectronics.com",
      phone: "+1 (555) 123-4567",
      address: "123 Tech Street, Silicon Valley, CA 94025"
    },
    orderDate: "2024-03-10",
    expectedDelivery: "2024-03-17",
    actualDelivery: null,
    status: "approved",
    priority: "medium",
    totalAmount: 34500,
    currency: "USD",
    paymentTerms: "Net 30",
    deliveryTerms: "FOB Destination",
    notes: "Urgent order for Q1 inventory replenishment. Please ensure all items are properly packaged.",
    createdBy: "Sarah Wilson",
    approvedBy: "Mike Johnson",
    approvedDate: "2024-03-10",
    department: "IT Equipment",
    project: "Office Expansion 2024"
  }

  const lineItems = [
    {
      id: 1,
      productSku: "LPT-001",
      productName: "Business Laptop Model X",
      description: "High-performance business laptop with Intel i7 processor",
      quantity: 20,
      unitPrice: 850,
      totalPrice: 17000,
      receivedQty: 0,
      pendingQty: 20,
      unit: "pcs"
    },
    {
      id: 2,
      productSku: "MON-205",
      productName: "24-inch LED Monitor",
      description: "Full HD LED monitor with adjustable stand",
      quantity: 25,
      unitPrice: 180,
      totalPrice: 4500,
      receivedQty: 0,
      pendingQty: 25,
      unit: "pcs"
    },
    {
      id: 3,
      productSku: "KBD-301",
      productName: "Wireless Keyboard & Mouse Set",
      description: "Ergonomic wireless keyboard and mouse combo",
      quantity: 30,
      unitPrice: 45,
      totalPrice: 1350,
      receivedQty: 0,
      pendingQty: 30,
      unit: "sets"
    },
    {
      id: 4,
      productSku: "CAB-102",
      productName: "USB-C Hub Premium",
      description: "Multi-port USB-C hub with HDMI and Ethernet",
      quantity: 35,
      unitPrice: 65,
      totalPrice: 2275,
      receivedQty: 0,
      pendingQty: 35,
      unit: "pcs"
    }
  ]

  const timeline = [
    { date: "2024-03-08", event: "PO Created", user: "Sarah Wilson", status: "completed" },
    { date: "2024-03-09", event: "Pending Approval", user: "System", status: "completed" },
    { date: "2024-03-10", event: "Approved", user: "Mike Johnson", status: "completed" },
    { date: "2024-03-10", event: "Sent to Supplier", user: "System", status: "completed" },
    { date: "2024-03-17", event: "Expected Delivery", user: "Supplier", status: "pending" }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-muted text-muted-foreground"
      case "pending": return "bg-warning text-white"
      case "approved": return "bg-primary text-white"
      case "sent": return "bg-info text-white"
      case "partially_received": return "bg-orange-500 text-white"
      case "received": return "bg-success text-white"
      case "cancelled": return "bg-destructive text-white"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-destructive"
      case "medium": return "text-warning"
      case "low": return "text-success"
      default: return "text-muted-foreground"
    }
  }

  const totalReceived = lineItems.reduce((sum, item) => sum + item.receivedQty, 0)
  const totalOrdered = lineItems.reduce((sum, item) => sum + item.quantity, 0)
  const fulfillmentPercentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{purchaseOrder.id}</h1>
          <p className="text-muted-foreground">Purchase Order Details • {purchaseOrder.supplier.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email to Supplier
          </Button>
          <Button onClick={() => navigate(`/purchase-orders/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                <Badge className={getStatusColor(purchaseOrder.status)}>
                  {purchaseOrder.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                </div>
                <div className="text-xl font-bold">${purchaseOrder.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Items</span>
                </div>
                <div className="text-xl font-bold">{lineItems.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Fulfillment</span>
                </div>
                <div className="text-xl font-bold">{fulfillmentPercentage.toFixed(0)}%</div>
                <Progress value={fulfillmentPercentage} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-muted-foreground">SKU: {item.productSku}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.quantity} {item.unit}</div>
                          {item.receivedQty > 0 && (
                            <div className="text-xs text-success">Received: {item.receivedQty}</div>
                          )}
                          {item.pendingQty > 0 && (
                            <div className="text-xs text-warning">Pending: {item.pendingQty}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${item.unitPrice}</TableCell>
                      <TableCell className="font-medium">${item.totalPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        {item.receivedQty === item.quantity ? (
                          <Badge className="bg-success text-white">Received</Badge>
                        ) : item.receivedQty > 0 ? (
                          <Badge className="bg-orange-500 text-white">Partial</Badge>
                        ) : (
                          <Badge className="bg-warning text-white">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Separator className="my-4" />
              
              <div className="flex justify-end">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between gap-8">
                    <span>Subtotal:</span>
                    <span className="font-medium">${(purchaseOrder.totalAmount * 0.9).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span>Tax (10%):</span>
                    <span className="font-medium">${(purchaseOrder.totalAmount * 0.1).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-8 text-lg font-bold">
                    <span>Total:</span>
                    <span>${purchaseOrder.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      event.status === "completed" ? "bg-success" : 
                      event.status === "pending" ? "bg-warning" : "bg-muted"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{event.event}</div>
                        <div className="text-sm text-muted-foreground">{event.date}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">by {event.user}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {purchaseOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{purchaseOrder.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                <p className="font-medium">{purchaseOrder.orderDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Delivery</label>
                <p className="font-medium">{purchaseOrder.expectedDelivery}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <p className={`font-medium capitalize ${getPriorityColor(purchaseOrder.priority)}`}>
                  {purchaseOrder.priority}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
                <p className="font-medium">{purchaseOrder.paymentTerms}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Delivery Terms</label>
                <p className="font-medium">{purchaseOrder.deliveryTerms}</p>
              </div>
              {purchaseOrder.department && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="font-medium">{purchaseOrder.department}</p>
                </div>
              )}
              {purchaseOrder.project && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <p className="font-medium">{purchaseOrder.project}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Supplier Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <p className="font-medium">{purchaseOrder.supplier.name}</p>
                <p className="text-sm text-muted-foreground">Code: {purchaseOrder.supplier.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                <p className="font-medium">{purchaseOrder.supplier.contact}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium text-sm">{purchaseOrder.supplier.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="font-medium">{purchaseOrder.supplier.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-sm leading-relaxed">{purchaseOrder.supplier.address}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3">
                View Supplier Profile
              </Button>
            </CardContent>
          </Card>

          {/* Approval Information */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created By</label>
                <p className="font-medium">{purchaseOrder.createdBy}</p>
              </div>
              {purchaseOrder.approvedBy && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                    <p className="font-medium">{purchaseOrder.approvedBy}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approval Date</label>
                    <p className="font-medium">{purchaseOrder.approvedDate}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Package className="w-4 h-4 mr-2" />
                Record Receipt
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Contact Supplier
              </Button>
              {purchaseOrder.status === "draft" && (
                <Button variant="destructive" size="sm" className="w-full">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cancel Order
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}