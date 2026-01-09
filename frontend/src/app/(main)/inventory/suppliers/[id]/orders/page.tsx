"use client";

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
import { ApiService, Supplier, PurchaseOrder, ApiError } from "@/services/api"
import { toast } from "@/components/ui/sonner"

export default function SupplierOrders() {
  const params = useParams()
  const rawId = typeof params.id === 'string' ? params.id : params.id?.[0]
  const id = rawId ? parseInt(rawId) : null
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id, currentPage, pageSize, searchTerm, statusFilter])

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true)
      setError(null)

      const [supplierData, ordersData] = await Promise.all([
        ApiService.getSupplier(id),
        ApiService.getPurchaseOrders({
          supplier_id: id,
          page: currentPage,
          limit: pageSize,
          search: searchTerm || undefined,
          status: statusFilter !== "all" ? statusFilter as any : undefined,
          sortBy: 'order_date',
          sortOrder: 'desc'
        })
      ])

      setSupplier(supplierData)
      setOrders(ordersData.purchase_orders || [])
      setTotalOrders(ordersData.total)
      setTotalPages(Math.ceil(ordersData.total / pageSize))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load supplier data"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
      case "delivered": return "bg-success text-white"
      case "in-transit":
      case "sent": return "bg-warning text-white"
      case "pending": return "bg-info text-white"
      case "cancelled": return "bg-destructive text-white"
      case "draft": return "bg-muted text-foreground"
      default: return "bg-muted"
    }
  }

  const getPriceColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-white"
      case "pending": return "bg-warning text-white"
      case "overdue": return "bg-destructive text-white"
      case "cancelled": return "bg-muted text-white"
      default: return "bg-muted"
    }
  }

  // Calculate statistics (Note: these are for the current page/filter)
  const statsTotalValue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
  const activeOrdersCount = orders.filter(order => !["received", "cancelled", "delivered"].includes(order.status)).length
  const avgOrderValue = totalOrders > 0 ? (statsTotalValue / orders.length) : 0

  if (loading && !supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading supplier orders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push(`/inventory/suppliers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
            <p className="text-muted-foreground">Orders from {supplier?.name || 'Supplier'}</p>
          </div>
        </div>
        <Button onClick={() => router.push("/inventory/purchase-orders/new")}>
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
              <h3 className="text-xl font-semibold">{supplier?.name}</h3>
              <p className="text-muted-foreground">ID: {supplier?.supplier_code} • Contact: {supplier?.contact_person}</p>
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
              Total Value (Page)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${statsTotalValue.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{activeOrdersCount}</div>
            <p className="text-xs text-muted-foreground">In progress on this page</p>
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
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading orders...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No purchase orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="hover:bg-accent/50 cursor-pointer"
                      onClick={() => router.push(`/inventory/purchase-orders/${order.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium text-primary hover:underline">{order.po_number}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(order.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.currency} {(Number(order.total_amount) || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}