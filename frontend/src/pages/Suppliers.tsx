import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddSupplierForm } from "@/components/forms/AddSupplierForm"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Building2,
  Phone,
  Mail,
  MapPin,
  Loader2
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

  // Load suppliers and stats
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [suppliersData, statsData] = await Promise.all([
        ApiService.getSuppliers({ limit: 50 }),
        ApiService.getSupplierStats()
      ])

      setSuppliers(suppliersData.suppliers)
      setStats(statsData)
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
  }, [])

  const filteredSuppliers = suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.category && supplier.category.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-success"
    if (rating >= 4.0) return "text-warning"
    return "text-destructive"
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
                {stats ? `${((stats.active_suppliers / stats.total_suppliers) * 100).toFixed(1)}% active rate` : '0% active rate'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.categories_count || 0}
              </div>
              <p className="text-xs text-muted-foreground">Different categories</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.average_rating.toFixed(1) || '0.0'}
              </div>
              <p className="text-xs text-success">Above target</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading suppliers...
                        </div>
                      </TableCell>
                    </TableRow>
                ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
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
                ) : filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers found.'}
                        </div>
                      </TableCell>
                    </TableRow>
                ) : (
                    filteredSuppliers.map((supplier) => (
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
                          <TableCell>
                      <span className={`font-medium ${getRatingColor(supplier.rating)}`}>
                        {supplier.rating}
                      </span>
                          </TableCell>
                          <TableCell>{supplier.total_orders}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {supplier.last_order_date ? new Date(supplier.last_order_date).toLocaleDateString() : 'Never'}
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