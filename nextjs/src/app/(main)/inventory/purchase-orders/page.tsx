"use client";

﻿import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTablePagination } from "@/components/DataTablePagination"
import { useClientPagination } from "@/hooks/usePagination"
import { CreatePurchaseOrderForm } from "@/modules/inventory/components/forms/CreatePurchaseOrderForm"
import { toast } from "@/components/ui/sonner"
import { PurchaseOrderApi } from "@/modules/inventory/services/purchase-order-api"
import { PurchaseOrder, PurchaseOrderStats } from "@/services/types"
import { useFormatting } from "@/hooks/useFormatting"
import { useAuth } from "@/contexts/AuthContext"
import {
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  Send,
  Clock
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
import { PERMISSIONS, type PermissionCheck } from "@/types/rbac";
import { PermissionGuard } from "@/components/rbac/PermissionGuard"

export default function PurchaseOrders() {
  const router = useRouter()
  const { formatCurrency, formatDate } = useFormatting()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // Fetch purchase orders and stats
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [ordersResponse, statsResponse] = await Promise.all([
        PurchaseOrderApi.getPurchaseOrders({ limit: 100 }),
        PurchaseOrderApi.getPurchaseOrderStats()
      ])
      
      setPurchaseOrders(ordersResponse.purchase_orders)
      setStats(statsResponse)
    } catch (err) {
      console.error('Error fetching purchase orders:', err)
      setError('Failed to load purchase orders')
      toast.error('Failed to load purchase orders', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = purchaseOrders.filter(order =>
    order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.supplier_name && order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Use client-side pagination for filtered purchase orders
  const ordersPagination = useClientPagination(filteredOrders, {
    initialPageSize: 10
  })

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

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await PurchaseOrderApi.updatePurchaseOrderStatus(orderId, { 
        status: newStatus as any,
        notes: `Status changed to ${newStatus}`
      })
      
      toast.success(`Purchase order ${orderId} ${newStatus}`, {
        description: `Status updated successfully.`
      })
      
      // Refresh the data
      await fetchData()
    } catch (err) {
      console.error('Error updating purchase order status:', err)
      toast.error('Failed to update status', {
        description: 'Please try again later.'
      })
    }
  }

  // Approval functions
  const submitForApproval = async (poId: number) => {
    setActionLoading(poId)
    try {
      // Mock API call - replace with actual implementation
      console.log(`Submitting PO ${poId} for approval`)
      
      // Update local state
      setPurchaseOrders(prev => prev.map(po => 
        po.id === poId 
          ? { ...po, approval_status: 'submitted' as any }
          : po
      ))
      
      toast.success("Purchase order submitted for approval successfully")
    } catch (error) {
      console.error('Error submitting for approval:', error)
      toast.error("Failed to submit for approval")
    } finally {
      setActionLoading(null)
    }
  }

  const approvePurchaseOrder = async (poId: number) => {
    setActionLoading(poId)
    try {
      // Mock API call - replace with actual implementation
      console.log(`Approving PO ${poId}`)
      
      // Update local state
      setPurchaseOrders(prev => prev.map(po => 
        po.id === poId 
          ? { ...po, approval_status: 'approved' as any }
          : po
      ))
      
      toast.success("Purchase order approved successfully")
    } catch (error) {
      console.error('Error approving:', error)
      toast.error("Failed to approve purchase order")
    } finally {
      setActionLoading(null)
    }
  }

  // Helper functions for approval
  const canSubmit = (po: PurchaseOrder) => {
    return (po.approval_status === 'draft' || !po.approval_status) && 
           ['admin', 'manager', 'employee'].includes(user?.role || '')
  }

  const canApprove = (po: PurchaseOrder) => {
    return po.approval_status === 'submitted' && 
           ['admin', 'accounts'].includes(user?.role || '')
  }

  const getApprovalStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      case 'submitted':
        return <Badge variant="outline"><Send className="w-3 h-3 mr-1" />Submitted</Badge>
      case 'approved':
        return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  const statusCounts = {
    draft: stats?.draft_orders || 0,
    pending: stats?.pending_orders || 0,
    approved: stats?.approved_orders || 0,
    received: stats?.received_orders || 0
  }

  const totalValue = stats?.total_value || 0

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground">Create and manage purchase orders for your suppliers</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS_CREATE}>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Purchase Order
          </Button>
        </PermissionGuard>
        
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
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
            <div className="text-2xl font-bold">{stats?.orders_this_month || 0}</div>
            <p className="text-xs text-success">Processed orders</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading purchase orders...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-destructive">
                      {error}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2"
                        onClick={fetchData}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : ordersPagination.totalItems === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No purchase orders found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                ordersPagination.data.map((order) => (
                  <TableRow key={order.id} className="hover:bg-accent/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{order.po_number}</div>
                          {order.approved_by && (
                            <div className="text-xs text-muted-foreground">
                              Approved by {order.approved_by}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{order.supplier_name || 'Unknown Supplier'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.order_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(order.expected_delivery_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {/* We'll need to get this from line items count */}
                        N/A items
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-medium">
                          {formatCurrency(order.total_amount, order.currency)}
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
                        <DropdownMenuItem onClick={() => router.push(`/inventory/purchase-orders/${order.id}`)}>
                          View Details
                        </DropdownMenuItem>
                       
                          <DropdownMenuItem onClick={() => router.push(`/inventory/purchase-orders/${order.id}/edit`)}>
                          Edit Order
                        </DropdownMenuItem>
                     
                       
                        {(order.status === "approved" || order.status === "partially_received") && (
                          <DropdownMenuItem onClick={() => router.push(`/inventory/purchase-orders/${order.id}/receive`)}>
                            Receive Goods
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>Print/Export</DropdownMenuItem>
                        {order.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, "pending")}>
                            Submit for Approval
                          </DropdownMenuItem>
                        )}
                        <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS_APPROVE}>
                          {order.status === "pending"  && (
                          <>
                            <DropdownMenuItem className="text-success" onClick={() => handleStatusChange(order.id, "approved")}>
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(order.id, "cancelled")}>
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        </PermissionGuard>
                       
                        {/* {order.status === "approved" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(order.id, "received")}>
                            Mark as Received
                          </DropdownMenuItem>
                        )} */}
                         <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS_CANCEL}>
                           <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(order.id, "cancelled")}>
                              Cancel Order
                            </DropdownMenuItem>
                         </PermissionGuard>
                        
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="mt-4">
            <DataTablePagination
              currentPage={ordersPagination.currentPage}
              totalPages={ordersPagination.totalPages}
              pageSize={ordersPagination.pageSize}
              totalItems={ordersPagination.totalItems}
              onPageChange={ordersPagination.setPage}
              onPageSizeChange={ordersPagination.setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <CreatePurchaseOrderForm 
        open={showCreateForm} 
        onOpenChange={setShowCreateForm}
        onOrderCreated={() => {
          fetchData()
          toast.success("Purchase order created successfully!")
        }}
      />
    </div>
  )
}