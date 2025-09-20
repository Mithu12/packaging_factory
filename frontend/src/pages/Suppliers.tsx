import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddSupplierForm } from "@/components/forms/AddSupplierForm"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Building2,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"
import { ApiService, Supplier, SupplierStats, ApiError } from "@/services/api"
import { toast } from "@/components/ui/sonner"
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

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSuppliers, setTotalSuppliers] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedCategory, setSelectedCategory] = useState<string>("all-categories")
  const [selectedStatus, setSelectedStatus] = useState<string>("all-status")
  const [sortBy, setSortBy] = useState<string>("created_at")
  const [sortOrder, setSortOrder] = useState<string>("desc")
  const [supplierCategories, setSupplierCategories] = useState<string[]>([])

  // Load suppliers and stats
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        category: selectedCategory && selectedCategory !== "all-categories" ? selectedCategory : undefined,
        status: selectedStatus && selectedStatus !== "all-status" ? selectedStatus : undefined,
        sortBy,
        sortOrder
      }

      const [suppliersData, statsData, categoriesData] = await Promise.all([
        ApiService.getSuppliers(params),
        ApiService.getSupplierStats(),
        ApiService.getSupplierCategories()
      ])

      setSuppliers(suppliersData.suppliers || [])
      setTotalSuppliers(suppliersData.total)
      setTotalPages(Math.ceil(suppliersData.total / pageSize))
      setStats(statsData)
      setSupplierCategories(categoriesData.categories || [])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        toast.error("Failed to load suppliers", {
          description: err.message
        })
      } else {
        setError("An unexpected error occurred")
        toast.error("Failed to load suppliers", {
          description: "Please try again later."
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentPage, pageSize, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder])

  // Clear filters function
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all-categories")
    setSelectedStatus("all-status")
    setSortBy("created_at")
    setSortOrder("desc")
  }

  const handleSupplierAdded = () => {
    loadData() // Refresh the data
  }

  const handleToggleStatus = async (id: number) => {
    try {
      await ApiService.toggleSupplierStatus(id)
      toast.success("Supplier status updated successfully")
      loadData() // Refresh the data
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Failed to update supplier status", {
          description: err.message
        })
      } else {
        toast.error("Failed to update supplier status", {
          description: "Please try again later."
        })
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-white"
      case "inactive": return "bg-status-draft text-white"
      default: return "bg-muted"
    }
  }


  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suppliers</h1>
            <p className="text-muted-foreground">Manage your supplier relationships and vendor information</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.total_suppliers || 0}
              </div>
              <p className="text-xs text-success">+3 this month</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.active_suppliers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats ? `${Number((stats.active_suppliers / stats.total_suppliers) * 100).toFixed(1)}% active rate` : '0% active rate'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactive Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.inactive_suppliers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Inactive suppliers</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.recent_suppliers?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Added this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Supplier Directory</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search suppliers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-80"
                    />
                  </div>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
              
              {/* Filter Controls */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Category:</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-categories">All Categories</SelectItem>
                      {supplierCategories?.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Status:</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-status">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Sort by:</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="created_at">Date Created</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="total_orders">Total Orders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Order:</label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Per page:</label>
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading suppliers...
                        </div>
                      </TableCell>
                    </TableRow>
                ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-destructive">
                          {error}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadData}
                            className="mt-2"
                        >
                          Try Again
                        </Button>
                      </TableCell>
                    </TableRow>
                ) : suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchTerm || (selectedCategory && selectedCategory !== "all-categories") || (selectedStatus && selectedStatus !== "all-status") ? 'No suppliers found matching your filters.' : 'No suppliers found.'}
                        </div>
                      </TableCell>
                    </TableRow>
                ) : (
                    suppliers?.map((supplier) => (
                        <TableRow key={supplier.id} className="hover:bg-accent/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{supplier.name}</div>
                                <div className="text-sm text-muted-foreground">{supplier.supplier_code}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {supplier.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-3 h-3" />
                                    {supplier.phone}
                                  </div>
                              )}
                              {supplier.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-3 h-3" />
                                    {supplier.email}
                                  </div>
                              )}
                              {supplier.whatsapp_number && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MessageCircle className="w-3 h-3" />
                                    {supplier.whatsapp_number}
                                  </div>
                              )}
                              {supplier.address && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    {supplier.address.split(',')[0]}
                                  </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {supplier.category && (
                                <Badge variant="outline">{supplier.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(supplier.status)}>
                              {supplier.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={() => window.location.href = `/suppliers/${supplier.id}`}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.location.href = `/suppliers/${supplier.id}/edit`}>
                                  Edit Supplier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.location.href = `/suppliers/${supplier.id}/orders`}>
                                  View Orders
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className={supplier.status === 'active' ? 'text-destructive' : 'text-success'}
                                    onClick={() => handleToggleStatus(supplier.id)}
                                >
                                  {supplier.status === 'active' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalSuppliers)} of {totalSuppliers} suppliers
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

        <AddSupplierForm
            open={showAddForm}
            onOpenChange={setShowAddForm}
            onSupplierAdded={handleSupplierAdded}
        />
      </div>
  )
}