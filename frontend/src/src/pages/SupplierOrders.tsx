import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  Building2
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SupplierOrders() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Mock supplier data
  const supplier = {
    id: "SUP-001",
    name: "ABC Electronics Ltd",
    contactPerson: "John Smith"
  }

  // Mock orders data
  const orders = [
    {
      id: "PO-2024-001",
      date: "2024-01-10",
      status: "delivered",
      items: 12,
      totalAmount: 15750.00,
      deliveryDate: "2024-01-15",
      invoiceStatus: "paid"
    },
    {
      id: "PO-2024-002", 
      date: "2024-01-05",
      status: "in-transit",
      items: 8,
      totalAmount: 9200.00,
      deliveryDate: "2024-01-20",
      invoiceStatus: "pending"
    },
    {
      id: "PO-2023-089",
      date: "2023-12-28",
      status: "delivered",
      items: 15,
      totalAmount: 22100.00,
      deliveryDate: "2024-01-02",
      invoiceStatus: "paid"
    },
    {
      id: "PO-2023-078",
      date: "2023-12-15",
      status: "delivered",
      items: 6,
      totalAmount: 8450.00,
      deliveryDate: "2023-12-20",
      invoiceStatus: "paid"
    },
    {
      id: "PO-2023-065",
      date: "2023-12-01",
      status: "cancelled",
      items: 10,
      totalAmount: 12300.00,
      deliveryDate: "2023-12-10",
      invoiceStatus: "cancelled"
    }
  ]

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-success text-white"
      case "in-transit": return "bg-warning text-white"
      case "pending": return "bg-info text-white"
      case "cancelled": return "bg-destructive text-white"
      default: return "bg-muted"
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-white"
      case "pending": return "bg-warning text-white"
      case "overdue": return "bg-destructive text-white"
      case "cancelled": return "bg-muted text-white"
      default: return "bg-muted"
    }
  }

  const totalOrders = orders.length
  const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const activeOrders = orders.filter(order => order.status !== "delivered" && order.status !== "cancelled").length
  const avgOrderValue = totalValue / totalOrders

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/suppliers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
            <p className="text-muted-foreground">Orders from {supplier.name}</p>
          </div>
        </div>
        <Button onClick={() => navigate("/purchase-orders/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      {/* Supplier Info Card */}
      <Card className="bg-gradient-to-br from-card to-accent/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{supplier.name}</h3>
              <p className="text-muted-foreground">ID: {supplier.id} • Contact: {supplier.contactPerson}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-success">+12% vs last period</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue.toLocaleString()}</div>
            <p className="text-xs text-success">Above average</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Order History</CardTitle>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="in-transit">In Transit</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Invoice Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-accent/50 cursor-pointer">
                  <TableCell>
                    <div className="font-medium">{order.id}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.date}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.items} items</TableCell>
                  <TableCell className="font-medium">
                    ${order.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.deliveryDate}
                  </TableCell>
                  <TableCell>
                    <Badge className={getInvoiceStatusColor(order.invoiceStatus)}>
                      {order.invoiceStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}