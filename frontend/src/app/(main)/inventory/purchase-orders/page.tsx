"use client";

﻿import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTablePagination } from "@/components/DataTablePagination"
import { CreatePurchaseOrderForm } from "@/modules/inventory/components/forms/CreatePurchaseOrderForm"
import { toast } from "@/components/ui/sonner"
import { PurchaseOrderApi } from "@/modules/inventory/services/purchase-order-api"
import { PurchaseOrder, PurchaseOrderStats, PurchaseOrderQueryParams } from "@/services/types"
import { useFormatting } from "@/hooks/useFormatting"
import { useAuth } from "@/contexts/AuthContext"
import { printHtml, escapeHtml } from "@/utils/export-print"
import {
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  Calendar,
  CheckCircle2,
  Send,
  Clock,
  Printer
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
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [printing, setPrinting] = useState(false)

  // Server-side pagination state.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Build the backend filter params from the active search + status. Search is
  // matched server-side across ALL purchase orders, not just the current page.
  const buildFilterParams = (): PurchaseOrderQueryParams => ({
    search: debouncedSearch || undefined,
    status:
      statusFilter !== "all"
        ? (statusFilter as PurchaseOrderQueryParams["status"])
        : undefined,
  })

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Any filter change returns to the first page.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, pageSize])

  // Stats are filter-independent — load once.
  useEffect(() => {
    PurchaseOrderApi.getPurchaseOrderStats()
      .then(setStats)
      .catch(err => console.error('Error fetching purchase order stats:', err))
  }, [])

  // Refetch the current page whenever filters or paging change.
  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, page, pageSize])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await PurchaseOrderApi.getPurchaseOrders({
        ...buildFilterParams(),
        page,
        limit: pageSize,
      })
      setPurchaseOrders(res.purchase_orders)
      setTotalItems(res.total)
      setTotalPages(res.total_pages)
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

  // Kept for action handlers (status change, approve, etc.) that refresh data.
  const fetchData = fetchOrders

  // Print every purchase order matching the active filters (across all pages),
  // not just the current page. Pages through the API in 100-row batches.
  const handlePrintPurchaseOrders = async () => {
    try {
      setPrinting(true)
      const all: PurchaseOrder[] = []
      const batch = 100
      let p = 1
      for (;;) {
        const res = await PurchaseOrderApi.getPurchaseOrders({
          ...buildFilterParams(),
          page: p,
          limit: batch,
        })
        all.push(...res.purchase_orders)
        if (p >= res.total_pages || res.purchase_orders.length === 0) break
        p++
      }

      if (all.length === 0) {
        toast.info("Nothing to print", { description: "No purchase orders match the current filters." })
        return
      }

      const rows = all
        .map((o, i) => `<tr>
          <td class="num">${i + 1}</td>
          <td>${escapeHtml(o.po_number)}</td>
          <td>${escapeHtml(o.supplier_name || 'Unknown Supplier')}</td>
          <td>${escapeHtml(new Date(o.order_date).toLocaleDateString())}</td>
          <td>${escapeHtml(o.expected_delivery_date ? new Date(o.expected_delivery_date).toLocaleDateString() : '—')}</td>
          <td>${escapeHtml(o.status.replace(/_/g, ' '))}</td>
          <td class="num">${escapeHtml(o.line_items_count ?? 0)}</td>
          <td class="num">${escapeHtml(formatCurrency(o.total_amount, 'bdt'))}</td>
          <td>${escapeHtml(o.priority)}</td>
        </tr>`)
        .join("")

      const filterLabel = [
        debouncedSearch ? `search: "${debouncedSearch}"` : null,
        statusFilter !== "all" ? `status: ${statusFilter.replace(/_/g, ' ')}` : null,
      ].filter(Boolean).join(" • ") || "all orders"

      const body = `
        <h1>Purchase Orders</h1>
        <div class="meta">Generated ${new Date().toLocaleString()} • ${all.length} order(s) • ${escapeHtml(filterLabel)}</div>
        <table>
          <thead>
            <tr>
              <th class="num">#</th>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Order Date</th>
              <th>Expected</th>
              <th>Status</th>
              <th class="num">Items</th>
              <th class="num">Amount</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`

      if (!printHtml("Purchase Orders", body)) {
        toast.error("Could not open print window", {
          description: "Allow pop-ups for this site and try again.",
        })
      }
    } catch (err: any) {
      console.error('Error printing purchase orders:', err)
      toast.error("Failed to prepare print", { description: err?.message })
    } finally {
      setPrinting(false)
    }
  }

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

  const submitForApproval = async (poId: number) => {
    setActionLoading(poId)
    try {
      await PurchaseOrderApi.submitForApproval(poId)
      toast.success("Purchase order submitted for approval")
      await fetchData()
    } catch (error: any) {
      console.error('Error submitting for approval:', error)
      toast.error("Failed to submit for approval", { description: error?.message })
    } finally {
      setActionLoading(null)
    }
  }

  const approvePurchaseOrder = async (poId: number) => {
    setActionLoading(poId)
    try {
      await PurchaseOrderApi.approvePurchaseOrder(poId)
      toast.success("Purchase order approved")
      await fetchData()
    } catch (error: any) {
      console.error('Error approving:', error)
      toast.error("Failed to approve purchase order", { description: error?.message })
    } finally {
      setActionLoading(null)
    }
  }

  const rejectPurchaseOrder = async (poId: number) => {
    setActionLoading(poId)
    try {
      await PurchaseOrderApi.rejectPurchaseOrder(poId)
      toast.success("Purchase order rejected")
      await fetchData()
    } catch (error: any) {
      console.error('Error rejecting:', error)
      toast.error("Failed to reject purchase order", { description: error?.message })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadPDF = async (po: PurchaseOrder) => {
    try {
      await PurchaseOrderApi.downloadPurchaseOrderPDF(po.id, po.po_number)
      toast.success("PDF downloaded", { description: po.po_number })
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      toast.error("Failed to download PDF", { description: error?.message })
    }
  }

  const handleCancelOrder = async (poId: number) => {
    try {
      await PurchaseOrderApi.cancelPurchaseOrder(poId)
      toast.success("Purchase order cancelled")
      await fetchData()
    } catch (error: any) {
      console.error('Error cancelling purchase order:', error)
      toast.error("Failed to cancel purchase order", { description: error?.message })
    }
  }

  // Helper functions for approval
  const canSubmit = (po: PurchaseOrder) => {
    const eligible = !po.approval_status || ['draft', 'rejected'].includes(po.approval_status)
    return eligible &&
           po.status === 'draft' &&
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
          <Button type="button" variant="add" onClick={() => setShowCreateForm(true)}>
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="partially_received">Partially Received</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button
                variant="outline"
                onClick={handlePrintPurchaseOrders}
                disabled={printing || loading}
              >
                <Printer className="h-4 w-4 mr-2" />
                {printing ? "Preparing…" : "Print"}
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
              ) : purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No purchase orders found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((order) => (
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
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        {order.approval_status && order.approval_status !== 'draft' && (
                          getApprovalStatusBadge(order.approval_status)
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {order.line_items_count ?? 0} items
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(order.total_amount, 'bdt')}
                      </span>
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
                        <DropdownMenuItem onClick={() => handleDownloadPDF(order)}>
                          Download PDF
                        </DropdownMenuItem>
                        {canSubmit(order) && (
                          <DropdownMenuItem
                            disabled={actionLoading === order.id}
                            onClick={() => submitForApproval(order.id)}
                          >
                            Submit for Approval
                          </DropdownMenuItem>
                        )}
                        <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS_APPROVE}>
                          {canApprove(order) && (
                          <>
                            <DropdownMenuItem
                              className="text-success"
                              disabled={actionLoading === order.id}
                              onClick={() => approvePurchaseOrder(order.id)}
                            >
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={actionLoading === order.id}
                              onClick={() => rejectPurchaseOrder(order.id)}
                            >
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        </PermissionGuard>
                         <PermissionGuard permission={PERMISSIONS.PURCHASE_ORDERS_CANCEL}>
                           {order.status !== "cancelled" && order.status !== "received" && (
                             <DropdownMenuItem className="text-destructive" onClick={() => handleCancelOrder(order.id)}>
                                Cancel Order
                              </DropdownMenuItem>
                           )}
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
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
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