import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DataTablePagination } from "@/components/DataTablePagination"
import { useClientPagination } from "@/hooks/usePagination"
import { useFormatting } from "@/hooks/useFormatting"
import { useRBAC } from "@/contexts/RBACContext"
import { useToast } from "@/hooks/use-toast"
import { PERMISSIONS } from "@/types/rbac"
import { 
  Search, 
  MoreHorizontal,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  X,
  UserCheck,
  Truck,
  Loader2,
  Package,
  Building
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  DistributionApi,
  StockTransfer,
  StockTransferQueryParams
} from "@/services/distribution-api"

export function StockTransfersList() {
  const { formatNumber, formatDate } = useFormatting()
  const { hasPermission } = useRBAC()
  const { toast } = useToast()
  
  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  
  // Approval dialog state
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [approving, setApproving] = useState(false)

  // Filter transfers based on search term
  const filteredTransfers = transfers.filter(transfer =>
    transfer.transfer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.from_center_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.to_center_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Use client-side pagination for filtered transfers
  const pagination = useClientPagination(filteredTransfers, {
    initialPageSize: 20
  })

  // Fetch transfers on component mount
  const fetchTransfers = async () => {
    try {
      setLoading(true)
      
      const params: StockTransferQueryParams = {
        limit: 100, // Get all transfers for now
      }
      
      const result = await DistributionApi.getStockTransfers(params)
      setTransfers(result.transfers)
    } catch (error) {
      console.error("Error fetching transfers:", error)
      toast({
        title: "Error",
        description: "Failed to load stock transfers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransfers()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "approved": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "shipped": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "in_transit": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "received": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "normal": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "low": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return Clock
      case "approved": return CheckCircle
      case "shipped": return Truck
      case "in_transit": return ArrowRightLeft
      case "received": return Package
      case "cancelled": return X
      default: return Clock
    }
  }

  const handleApprovalAction = (transfer: StockTransfer, action: 'approve' | 'reject') => {
    setSelectedTransfer(transfer)
    setApprovalAction(action)
    setApprovalNotes("")
    setShowApprovalDialog(true)
  }

  const submitApproval = async () => {
    if (!selectedTransfer || !approvalAction) return

    try {
      setApproving(true)
      
      const status = approvalAction === 'approve' ? 'approved' : 'cancelled'
      await DistributionApi.updateStockTransferStatus(
        selectedTransfer.id,
        status,
        approvalNotes || undefined
      )

      toast({
        title: `Transfer ${approvalAction === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `Transfer ${selectedTransfer.transfer_number} has been ${approvalAction === 'approve' ? 'approved' : 'rejected'}`,
      })

      // Refresh transfers
      fetchTransfers()
      setShowApprovalDialog(false)
      setSelectedTransfer(null)
      setApprovalAction(null)
    } catch (error: any) {
      console.error("Error updating transfer:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update transfer status",
        variant: "destructive",
      })
    } finally {
      setApproving(false)
    }
  }

  const handleUpdateStatus = async (transfer: StockTransfer, newStatus: string) => {
    try {
      await DistributionApi.updateStockTransferStatus(transfer.id, newStatus)
      
      toast({
        title: "Status Updated",
        description: `Transfer ${transfer.transfer_number} marked as ${newStatus}`,
      })

      // Refresh transfers
      fetchTransfers()
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      })
    }
  }

  // Calculate summary stats
  const summaryStats = {
    totalTransfers: transfers.length,
    pendingTransfers: transfers.filter(t => t.status === 'pending').length,
    approvedTransfers: transfers.filter(t => t.status === 'approved').length,
    inTransitTransfers: transfers.filter(t => t.status === 'in_transit' || t.status === 'shipped').length,
    completedTransfers: transfers.filter(t => t.status === 'received').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading stock transfers...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalTransfers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-yellow-50 dark:to-yellow-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.pendingTransfers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-blue-50 dark:to-blue-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.approvedTransfers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-purple-50 dark:to-purple-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summaryStats.inTransitTransfers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-50 dark:to-green-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.completedTransfers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stock Transfers</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.data.map((transfer) => {
                const StatusIcon = getStatusIcon(transfer.status)
                
                return (
                  <TableRow key={transfer.id} className="hover:bg-accent/50">
                    <TableCell className="font-medium">
                      {transfer.transfer_number}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{transfer.product_name}</div>
                          <div className="text-xs text-muted-foreground">SKU: {transfer.product_sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{transfer.from_center_name || 'External'}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{transfer.to_center_name}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-medium">{formatNumber(transfer.quantity)}</span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4" />
                        <Badge className={`${getStatusColor(transfer.status)} capitalize`}>
                          {transfer.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`${getPriorityColor(transfer.priority)} capitalize`}>
                        {transfer.priority}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm">{transfer.requested_by_name}</span>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm">{formatDate(transfer.request_date)}</span>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => console.log('View details', transfer)}>
                            View Details
                          </DropdownMenuItem>
                          
                          {/* Approval actions - only for pending transfers */}
                          {transfer.status === 'pending' && hasPermission(PERMISSIONS.STOCK_TRANSFERS_APPROVE) && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleApprovalAction(transfer, 'approve')}
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve Transfer
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleApprovalAction(transfer, 'reject')}
                                className="text-red-600"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject Transfer
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {/* Status update actions */}
                          {transfer.status === 'approved' && hasPermission(PERMISSIONS.STOCK_TRANSFERS_APPROVE) && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(transfer, 'shipped')}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              Mark as Shipped
                            </DropdownMenuItem>
                          )}
                          
                          {(transfer.status === 'shipped' || transfer.status === 'in_transit') && hasPermission(PERMISSIONS.STOCK_TRANSFERS_APPROVE) && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(transfer, 'received')}
                            >
                              <Package className="w-4 h-4 mr-2" />
                              Mark as Received
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div className="mt-4">
            <DataTablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Transfer
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' 
                ? `Approve transfer ${selectedTransfer?.transfer_number}?`
                : `Reject transfer ${selectedTransfer?.transfer_number}?`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedTransfer && (
              <div className="bg-accent/50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{selectedTransfer.product_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{formatNumber(selectedTransfer.quantity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">{selectedTransfer.from_center_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{selectedTransfer.to_center_name}</span>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="approvalNotes" className="text-sm font-medium">
                Notes {approvalAction === 'reject' ? '(Required)' : '(Optional)'}
              </label>
              <Textarea
                id="approvalNotes"
                placeholder={approvalAction === 'approve' ? "Optional approval notes..." : "Please provide reason for rejection..."}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              onClick={submitApproval}
              disabled={approving || (approvalAction === 'reject' && !approvalNotes.trim())}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {approving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
