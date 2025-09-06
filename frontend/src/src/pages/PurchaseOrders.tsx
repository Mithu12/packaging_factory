import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CreatePurchaseOrderForm } from "@/components/forms/CreatePurchaseOrderForm"
import { toast } from "@/components/ui/sonner"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  FileText,
  Calendar,
  DollarSign
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  const purchaseOrders = [
    {
      id: "PO-2024-001",
      supplier: "ABC Electronics Ltd",
      orderDate: "2024-01-15",
      expectedDate: "2024-01-25",
      status: "approved",
      totalAmount: 12500.00,
      itemsCount: 5,
      approvedBy: "John Manager",
      priority: "normal"
    },
    {
      id: "PO-2024-002",
      supplier: "Global Raw Materials Inc",
      orderDate: "2024-01-14",
      expectedDate: "2024-01-20",
      status: "pending",
      totalAmount: 8750.50,
      itemsCount: 3,
      approvedBy: null,
      priority: "high"
    },
    {
      id: "PO-2024-003",
      supplier: "Office Furniture Pro",
      orderDate: "2024-01-13",
      expectedDate: "2024-01-28",
      status: "received",
      totalAmount: 15200.00,
      itemsCount: 8,
      approvedBy: "Sarah Director",
      priority: "normal"
    },
    {
      id: "PO-2024-004",
      supplier: "Premium Parts Supply",
      orderDate: "2024-01-12",
      expectedDate: "2024-01-22",
      status: "partially-received",
      totalAmount: 6890.25,
      itemsCount: 12,
      approvedBy: "John Manager",
      priority: "normal"
    },
    {
      id: "PO-2024-005",
      supplier: "Tech Components Ltd",
      orderDate: "2024-01-11",
      expectedDate: "2024-01-18",
      status: "draft",
      totalAmount: 4520.00,
      itemsCount: 4,
      approvedBy: null,
      priority: "low"
    }
  ]

  const filteredOrders = purchaseOrders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-status-approved text-white"
      case "pending": return "bg-status-pending text-white"
      case "received": return "bg-success text-white"
      case "partially-received": return "bg-warning text-white"
      case "draft": return "bg-status-draft text-white"
      case "cancelled": return "bg-destructive text-white"
      default: return "bg-muted"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-destructive"
      case "normal": return "text-muted-foreground"
      case "low": return "text-success"
      default: return "text-muted-foreground"
    }
  }

  const handleStatusChange = (orderId: string, newStatus: string) => {
    toast.success(`Purchase order ${orderId} ${newStatus}`, {
      description: `Status updated successfully.`
    })
  }
  const statusCounts = {
    draft: purchaseOrders.filter(po => po.status === "draft").length,
    pending: purchaseOrders.filter(po => po.status === "pending").length,
    approved: purchaseOrders.filter(po => po.status === "approved").length,
    received: purchaseOrders.filter(po => po.status === "received").length
  }

  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">Create and manage purchase orders for your suppliers</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            <p className="text-xs text-success">+{statusCounts.draft} drafts</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{statusCounts.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.approved + statusCounts.received}</div>
            <p className="text-xs text-success">Processed orders</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-success">Active orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Purchase Order Management</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-accent/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{order.id}</div>
                        {order.approvedBy && (
                          <div className="text-xs text-muted-foreground">
                            Approved by {order.approvedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{order.supplier}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3 h-3" />
                      {order.orderDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {order.expectedDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {order.itemsCount} items
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-medium">
                        {order.totalAmount.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${getPriorityColor(order.priority)}`}>
                      {order.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${order.id}/edit`)}>
                          Edit Order
                        </DropdownMenuItem>
                        {(order.status === "approved" || order.status === "partially-received") && (
                          <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${order.id}/receive`)}>
                            Receive Goods
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>Print/Export</DropdownMenuItem>
                        {order.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, "submitted for approval")}>
                            Submit for Approval
                          </DropdownMenuItem>
                        )}
                        {order.status === "pending" && (
                          <>
                            <DropdownMenuItem className="text-success" onClick={() => handleStatusChange(order.id, "approved")}>
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(order.id, "rejected")}>
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {order.status === "approved" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, "marked as received")}>
                            Mark as Received
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(order.id, "cancelled")}>
                          Cancel Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreatePurchaseOrderForm 
        open={showCreateForm} 
        onOpenChange={setShowCreateForm}
        onOrderCreated={() => {
          // In a real app, this would refresh the purchase orders list
          console.log("Purchase order created, refreshing list...")
        }}
      />
    </div>
  )
}