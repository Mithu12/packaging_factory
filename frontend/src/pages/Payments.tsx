import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RecordPaymentForm } from "@/components/forms/RecordPaymentForm"
import { useFormatting } from "@/hooks/useFormatting"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { PaymentApi } from "@/services/payment-api"
import { ApiService } from "@/services/api"
import { Invoice, Payment, PaymentStats, InvoiceQueryParams, PaymentQueryParams } from "@/services/types"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function Payments() {
  const navigate = useNavigate()
  const { formatCurrency, formatDate } = useFormatting()
  
  // Basic state
  const [activeTab, setActiveTab] = useState("invoices")
  const [showRecordPaymentForm, setShowRecordPaymentForm] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search state (separate from filters for debouncing)
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState("")
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("")
  
  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [suppliers, setSuppliers] = useState<{id: number, name: string}[]>([])
  
  // Pagination state
  const [invoicesPagination, setInvoicesPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [paymentsPagination, setPaymentsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  // Filter state
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceQueryParams>({
    page: 1,
    limit: 10,
    status: undefined,
    start_date: undefined,
    end_date: undefined,
    due_date_from: undefined,
    due_date_to: undefined,
    sortBy: "created_at",
    sortOrder: "desc"
  })
  
  const [paymentFilters, setPaymentFilters] = useState<PaymentQueryParams>({
    page: 1,
    limit: 10,
    status: undefined,
    payment_method: undefined,
    start_date: undefined,
    end_date: undefined,
    sortBy: "payment_date",
    sortOrder: "desc"
  })

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === "invoices") {
        setInvoiceFilters(prev => ({
          ...prev,
          search: invoiceSearchTerm.trim() || undefined,
          page: 1 // Reset to first page when search changes
        }))
      } else {
        setPaymentFilters(prev => ({
          ...prev,
          search: paymentSearchTerm.trim() || undefined,
          page: 1 // Reset to first page when search changes
        }))
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [invoiceSearchTerm, paymentSearchTerm, activeTab])

  // Initial load flag
  const [hasInitialLoad, setHasInitialLoad] = useState(false)

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const suppliersData = await ApiService.getSuppliers({ status: 'active', limit: 100 })
        setSuppliers(suppliersData.suppliers.map((supplier: any) => ({
          id: supplier.id,
          name: supplier.name
        })))
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      }
    }
    
    fetchSuppliers()
  }, [])

  const fetchData = useCallback(async () => {
    try {
      // Don't show loading for filter changes to prevent full page reload appearance
      if (!hasInitialLoad) {
        setLoading(true)
      }
      setError(null)
      
      // Clean up filters to remove empty strings
      const cleanInvoiceFilters = {
        ...invoiceFilters,
        search: invoiceFilters.search?.trim() || undefined
      }
      
      const cleanPaymentFilters = {
        ...paymentFilters,
        search: paymentFilters.search?.trim() || undefined
      }
      
      const [invoicesResponse, paymentsResponse, statsResponse] = await Promise.all([
        PaymentApi.getInvoices(cleanInvoiceFilters),
        PaymentApi.getPayments(cleanPaymentFilters),
        PaymentApi.getPaymentStats()
      ])
      
      setInvoices(invoicesResponse)
      setPayments(paymentsResponse)
      setStats(statsResponse)
      
      // Update pagination info (assuming the API returns pagination metadata)
      // Note: You may need to adjust this based on your actual API response structure
      setInvoicesPagination(prev => ({
        ...prev,
        total: invoicesResponse.length, // This should come from API metadata
        totalPages: Math.ceil(invoicesResponse.length / prev.limit)
      }))
      
      setPaymentsPagination(prev => ({
        ...prev,
        total: paymentsResponse.length, // This should come from API metadata
        totalPages: Math.ceil(paymentsResponse.length / prev.limit)
      }))
    } catch (err: any) {
      console.error('Error fetching payment data:', err)
      setError(err.message || 'Failed to load payment data')
      toast.error('Failed to load payment data', {
        description: 'Please try again later.'
      })
    } finally {
      if (!hasInitialLoad) {
        setLoading(false)
        setHasInitialLoad(true)
      }
    }
  }, [invoiceFilters, paymentFilters, hasInitialLoad])

  // Fetch data when filters change
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePaymentRecorded = () => {
    fetchData() // Refresh data after payment is recorded
  }

  // Filter handlers
  const handleInvoiceFilterChange = (key: keyof InvoiceQueryParams, value: any) => {
    setInvoiceFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const handlePaymentFilterChange = (key: keyof PaymentQueryParams, value: any) => {
    setPaymentFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const clearInvoiceFilters = () => {
    setInvoiceSearchTerm("")
    setInvoiceFilters({
      page: 1,
      limit: 10,
      status: undefined,
      start_date: undefined,
      end_date: undefined,
      due_date_from: undefined,
      due_date_to: undefined,
      sortBy: "created_at",
      sortOrder: "desc"
    })
  }

  const clearPaymentFilters = () => {
    setPaymentSearchTerm("")
    setPaymentFilters({
      page: 1,
      limit: 10,
      status: undefined,
      payment_method: undefined,
      start_date: undefined,
      end_date: undefined,
      sortBy: "payment_date",
      sortOrder: "desc"
    })
  }

  // Pagination handlers
  const handleInvoicePageChange = (page: number) => {
    setInvoiceFilters(prev => ({ ...prev, page }))
  }

  const handlePaymentPageChange = (page: number) => {
    setPaymentFilters(prev => ({ ...prev, page }))
  }

  const handleInvoiceLimitChange = (limit: number) => {
    setInvoiceFilters(prev => ({ ...prev, limit, page: 1 }))
  }

  const handlePaymentLimitChange = (limit: number) => {
    setPaymentFilters(prev => ({ ...prev, limit, page: 1 }))
  }

  // Memoized filter component to prevent unnecessary re-renders
  const FilterComponent = useMemo(() => {
    const isInvoiceTab = activeTab === "invoices"
    const currentSearchTerm = isInvoiceTab ? invoiceSearchTerm : paymentSearchTerm
    const setCurrentSearchTerm = isInvoiceTab ? setInvoiceSearchTerm : setPaymentSearchTerm
    const currentFilters = isInvoiceTab ? invoiceFilters : paymentFilters
    const handleFilterChange = isInvoiceTab ? handleInvoiceFilterChange : handlePaymentFilterChange
    const clearFilters = isInvoiceTab ? clearInvoiceFilters : clearPaymentFilters

    return (
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={isInvoiceTab ? "Search invoices..." : "Search payments..."}
              value={currentSearchTerm}
              onChange={(e) => setCurrentSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-80"
            />
          </div>
        </div>
        
        {/* Always visible filter controls */}
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex gap-2 flex-wrap">
            {/* Status Filter */}
            <Select 
              value={currentFilters.status || "all"} 
              onValueChange={(value) => handleFilterChange("status", value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {isInvoiceTab ? (
                  <>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Payment Method Filter (only for payments) */}
            {!isInvoiceTab && (
              <Select 
                value={(currentFilters as PaymentQueryParams).payment_method || "all"} 
                onValueChange={(value) => handlePaymentFilterChange("payment_method", value === "all" ? undefined : value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Sort By Filter */}
            <Select 
              value={currentFilters.sortBy || (isInvoiceTab ? "created_at" : "payment_date")} 
              onValueChange={(value) => handleFilterChange("sortBy", value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                {isInvoiceTab ? (
                  <>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="invoice_date">Invoice Date</SelectItem>
                    <SelectItem value="due_date">Due Date</SelectItem>
                    <SelectItem value="total_amount">Amount</SelectItem>
                    <SelectItem value="supplier_name">Supplier</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="payment_date">Payment Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="payment_method">Method</SelectItem>
                    <SelectItem value="supplier_name">Supplier</SelectItem>
                    <SelectItem value="created_at">Created Date</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Advanced Filters Button */}
            <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(true)}>
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>

            {/* Clear Filters Button */}
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    )
  }, [activeTab, invoiceSearchTerm, paymentSearchTerm, invoiceFilters, paymentFilters])

  // Advanced filters dialog component
  const AdvancedFiltersDialog = useMemo(() => {
    const isInvoiceTab = activeTab === "invoices"
    const currentInvoiceFilters = invoiceFilters
    const currentPaymentFilters = paymentFilters
    
    const handleInvoiceAdvancedFilterChange = (key: keyof InvoiceQueryParams, value: any) => {
      handleInvoiceFilterChange(key, value)
    }
    
    const handlePaymentAdvancedFilterChange = (key: keyof PaymentQueryParams, value: any) => {
      handlePaymentFilterChange(key, value)
    }
    
    const clearFilters = isInvoiceTab ? clearInvoiceFilters : clearPaymentFilters

    return (
      <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isInvoiceTab ? "Filter Invoices" : "Filter Payments"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range Filters */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                value={(isInvoiceTab ? currentInvoiceFilters : currentPaymentFilters).start_date || ""}
                onChange={(e) => isInvoiceTab 
                  ? handleInvoiceAdvancedFilterChange("start_date", e.target.value || undefined)
                  : handlePaymentAdvancedFilterChange("start_date", e.target.value || undefined)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                value={(isInvoiceTab ? currentInvoiceFilters : currentPaymentFilters).end_date || ""}
                onChange={(e) => isInvoiceTab 
                  ? handleInvoiceAdvancedFilterChange("end_date", e.target.value || undefined)
                  : handlePaymentAdvancedFilterChange("end_date", e.target.value || undefined)
                }
              />
            </div>

            {/* Invoice-specific filters */}
            {isInvoiceTab && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dueDateFrom">Due Date From</Label>
                  <Input
                    type="date"
                    value={currentInvoiceFilters.due_date_from || ""}
                    onChange={(e) => handleInvoiceAdvancedFilterChange("due_date_from", e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDateTo">Due Date To</Label>
                  <Input
                    type="date"
                    value={currentInvoiceFilters.due_date_to || ""}
                    onChange={(e) => handleInvoiceAdvancedFilterChange("due_date_to", e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select
                    value={currentInvoiceFilters.supplier_id?.toString() || "all"}
                    onValueChange={(value) => handleInvoiceAdvancedFilterChange("supplier_id", value === "all" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poId">Purchase Order ID</Label>
                  <Input
                    type="number"
                    value={currentInvoiceFilters.purchase_order_id || ""}
                    onChange={(e) => handleInvoiceAdvancedFilterChange("purchase_order_id", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Enter PO ID"
                  />
                </div>
              </>
            )}

            {/* Payment-specific filters */}
            {!isInvoiceTab && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select 
                    value={currentPaymentFilters.supplier_id?.toString() || "all"} 
                    onValueChange={(value) => handlePaymentAdvancedFilterChange("supplier_id", value === "all" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceId">Invoice ID</Label>
                  <Input
                    type="number"
                    value={currentPaymentFilters.invoice_id || ""}
                    onChange={(e) => handlePaymentAdvancedFilterChange("invoice_id", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Enter invoice ID"
                  />
                </div>
              </>
            )}

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Select 
                value={(isInvoiceTab ? currentInvoiceFilters : currentPaymentFilters).sortOrder || "desc"} 
                onValueChange={(value) => isInvoiceTab 
                  ? handleInvoiceAdvancedFilterChange("sortOrder", value)
                  : handlePaymentAdvancedFilterChange("sortOrder", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
            <Button onClick={() => setShowAdvancedFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }, [activeTab, showAdvancedFilters, invoiceFilters, paymentFilters, suppliers])

  // Pagination component
  const PaginationComponent = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    onLimitChange, 
    currentLimit,
    total 
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    onLimitChange: (limit: number) => void
    currentLimit: number
    total: number
  }) => {
    const startItem = (currentPage - 1) * currentLimit + 1
    const endItem = Math.min(currentPage * currentLimit, total)

    return (
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {startItem} to {endItem} of {total} results
          </p>
          <Select value={currentLimit.toString()} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-white"
      case "partial": return "bg-warning text-white"
      case "pending": return "bg-status-pending text-white"
      case "overdue": return "bg-destructive text-white"
      case "completed": return "bg-success text-white"
      case "active": return "bg-primary text-white"
      case "utilised": return "bg-muted text-muted-foreground"
      default: return "bg-muted"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "completed": return CheckCircle
      case "overdue": return AlertCircle
      case "pending":
      case "partial": return Clock
      default: return Clock
    }
  }

  const totalOutstanding = stats?.total_outstanding_amount || 0
  const overdueAmount = stats?.overdue_amount || 0
  const totalPaid = stats?.total_paid_amount || 0
  const advanceBalance = 0 // Not implemented yet

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading payment data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Failed to load payment data</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
          <p className="text-muted-foreground">Track supplier invoices, payments, and outstanding balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Payment Schedule
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowRecordPaymentForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Total unpaid</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-success">+12% vs last month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advance Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(advanceBalance)}</div>
            <p className="text-xs text-muted-foreground">Available to utilize</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Supplier Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {FilterComponent}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const StatusIcon = getStatusIcon(invoice.status)
                    const isOverdue = invoice.status === "overdue"
                    
                    return (
                      <TableRow key={invoice.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{invoice.invoice_number}</div>
                              <div className="text-sm text-muted-foreground">PO: {invoice.po_number || 'N/A'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.supplier_name || 'Unknown Supplier'}</div>
                          <div className="text-sm text-muted-foreground">{invoice.terms}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">Invoice: {new Date(invoice.invoice_date).toLocaleDateString()}</div>
                            <div className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(invoice.total_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-success font-medium">{formatCurrency(invoice.paid_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${Number(invoice.outstanding_amount) > 0 ? "text-warning" : "text-muted-foreground"}`}>
                            {formatCurrency(invoice.outstanding_amount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4" />
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => navigate(`/view-invoice/${invoice.id}`)}>View Invoice</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowRecordPaymentForm(true)}>Record Payment</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/payment-history/${invoice.supplier_id}`)}>Payment History</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/send-reminder/${invoice.id}`)}>Send Reminder</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/generate-statement/${invoice.supplier_id}`)}>Generate Statement</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              {/* Pagination for Invoices */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <PaginationComponent
                  currentPage={invoicesPagination.page}
                  totalPages={invoicesPagination.totalPages}
                  onPageChange={handleInvoicePageChange}
                  onLimitChange={handleInvoiceLimitChange}
                  currentLimit={invoicesPagination.limit}
                  total={invoicesPagination.total}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {FilterComponent}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>{payment.invoice_id || 'N/A'}</TableCell>
                      <TableCell>{payment.supplier_name || 'Unknown Supplier'}</TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payment.reference}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination for Payments */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <PaginationComponent
                  currentPage={paymentsPagination.page}
                  totalPages={paymentsPagination.totalPages}
                  onPageChange={handlePaymentPageChange}
                  onLimitChange={handlePaymentLimitChange}
                  currentLimit={paymentsPagination.limit}
                  total={paymentsPagination.total}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Advanced Filters Dialog */}
      {AdvancedFiltersDialog}

      <RecordPaymentForm 
        open={showRecordPaymentForm} 
        onOpenChange={setShowRecordPaymentForm}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  )
}