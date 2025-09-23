import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTablePagination } from "@/components/DataTablePagination"
import { useClientPagination } from "@/hooks/usePagination"
import { useFormatting } from "@/hooks/useFormatting"
import { useAuth } from "@/contexts/AuthContext"
import { useRBAC } from "@/contexts/RBACContext"
import { useToast } from "@/hooks/use-toast"
import { PermissionGuard } from "@/components/rbac/PermissionGuard"
import { PermissionButton } from "@/components/rbac/PermissionButton"
import { PERMISSIONS } from "@/types/rbac"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Warehouse,
  MapPin,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Building,
  Users,
  TrendingUp,
  Activity
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
} from "@/components/ui/dialog"
import { 
  DistributionApi,
  DistributionCenter,
  DistributionCenterStats,
  ProductLocation,
  CreateDistributionCenterRequest
} from "@/services/distribution-api"
import { CreateDistributionCenterForm } from "@/components/distribution/CreateDistributionCenterForm"
import { ProductLocationsList } from "@/components/distribution/ProductLocationsList"

export default function Distribution() {
  const navigate = useNavigate()
  const { formatCurrency, formatNumber, formatDate } = useFormatting()
  const { user } = useAuth()
  const { hasPermission } = useRBAC()
  const { toast } = useToast()
  
  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("centers")
  
  // Distribution Centers state
  const [centers, setCenters] = useState<DistributionCenter[]>([])
  const [centerStats, setCenterStats] = useState<DistributionCenterStats[]>([])
  const [showCreateCenterForm, setShowCreateCenterForm] = useState(false)
  
  // Product Locations state
  const [locations, setLocations] = useState<ProductLocation[]>([])
  const [selectedCenter, setSelectedCenter] = useState<DistributionCenter | null>(null)
  const [showLocationDetails, setShowLocationDetails] = useState(false)

  // Filter centers based on search term
  const filteredCenters = centers.filter(center =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Use client-side pagination for filtered centers
  const centersPagination = useClientPagination(filteredCenters, {
    initialPageSize: 10
  })

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [centersResult, statsResult] = await Promise.all([
          DistributionApi.getDistributionCenters({ limit: 100 }),
          DistributionApi.getDistributionCenterStats()
        ])
        
        setCenters(centersResult.centers)
        setCenterStats(statsResult)
      } catch (err) {
        setError("Failed to load distribution data")
        console.error("Error loading distribution data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-white"
      case "inactive": return "bg-muted text-muted-foreground"
      case "maintenance": return "bg-warning text-white"
      default: return "bg-muted"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warehouse": return Warehouse
      case "distribution_center": return Building
      case "retail_store": return Building
      case "cross_dock": return Truck
      default: return Building
    }
  }

  const handleViewCenter = (center: DistributionCenter) => {
    setSelectedCenter(center)
    setShowLocationDetails(true)
  }

  const handleCreateCenter = async (data: CreateDistributionCenterRequest) => {
    try {
      const newCenter = await DistributionApi.createDistributionCenter(data)
      setCenters(prev => [newCenter, ...prev])
      setShowCreateCenterForm(false)
      
      // Refresh stats
      const updatedStats = await DistributionApi.getDistributionCenterStats()
      setCenterStats(updatedStats)
    } catch (error) {
      console.error("Error creating distribution center:", error)
      throw error
    }
  }

  const handleSetPrimary = async (centerId: number) => {
    try {
      await DistributionApi.setPrimaryDistributionCenter(centerId)
      
      // Update local state
      setCenters(prev => prev.map(center => ({
        ...center,
        is_primary: center.id === centerId
      })))
    } catch (error) {
      console.error("Error setting primary center:", error)
    }
  }

  const handleDeactivateCenter = async (center: DistributionCenter) => {
    if (center.is_primary) {
      toast({
        title: "Cannot Deactivate",
        description: "Cannot deactivate a primary distribution center. Set another center as primary first.",
        variant: "destructive",
      })
      return
    }

    try {
      await DistributionApi.updateDistributionCenter(center.id, { status: 'inactive' })
      
      // Update local state
      setCenters(prev => prev.map(c => 
        c.id === center.id ? { ...c, status: 'inactive' } : c
      ))
      
      toast({
        title: "Center Deactivated",
        description: `${center.name} has been deactivated.`,
      })
    } catch (error) {
      console.error("Error deactivating center:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate center. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Calculate summary stats
  const summaryStats = {
    totalCenters: centers.length,
    activeCenters: centers.filter(c => c.status === 'active').length,
    totalInventoryValue: centerStats.reduce((sum, stat) => sum + stat.total_inventory_value, 0),
    totalProducts: centerStats.reduce((sum, stat) => sum + stat.total_products, 0),
    lowStockLocations: centerStats.reduce((sum, stat) => sum + stat.low_stock_products, 0),
    pendingTransfers: centerStats.reduce((sum, stat) => sum + stat.outbound_transfers, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading distribution system...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permission={PERMISSIONS.WAREHOUSES_READ} fallback={
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view distribution management.</p>
        </div>
      </div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Distribution Management</h1>
            <p className="text-muted-foreground">Manage distribution centers, product locations, and stock transfers</p>
          </div>
          <PermissionButton
            permission={PERMISSIONS.WAREHOUSES_CREATE}
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowCreateCenterForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Distribution Center
          </PermissionButton>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building className="w-4 h-4" />
                Total Centers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalCenters}</div>
              <p className="text-xs text-success">{summaryStats.activeCenters} active</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summaryStats.totalProducts)}</div>
              <p className="text-xs text-muted-foreground">Across all centers</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Inventory Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalInventoryValue)}</div>
              <p className="text-xs text-success">Total distributed value</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{summaryStats.lowStockLocations}</div>
              <p className="text-xs text-muted-foreground">Locations need restock</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Active Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.pendingTransfers}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {summaryStats.totalCenters > 0 ? 
                  Math.round((summaryStats.activeCenters / summaryStats.totalCenters) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Centers active</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="centers">Distribution Centers</TabsTrigger>
            <TabsTrigger value="locations">Product Locations</TabsTrigger>
            <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
          </TabsList>

          {/* Distribution Centers Tab */}
          <TabsContent value="centers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Distribution Centers</CardTitle>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search centers..."
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
                      <TableHead>Center</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Inventory Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centersPagination.data.map((center) => {
                      const TypeIcon = getTypeIcon(center.type)
                      const stats = centerStats.find(s => s.id === center.id)
                      
                      return (
                        <TableRow key={center.id} className="hover:bg-accent/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <TypeIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {center.name}
                                  {center.is_primary && (
                                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">{center.code}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {center.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-sm">{center.city}</div>
                                <div className="text-xs text-muted-foreground">{center.state}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{stats?.total_products || 0}</div>
                              {stats && stats.low_stock_products > 0 && (
                                <div className="text-xs text-warning flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {stats.low_stock_products} low stock
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">
                              {formatCurrency(stats?.total_inventory_value || 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(center.status)}>
                              {center.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={() => navigate(`/distribution/centers/${center.id}`)}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewCenter(center)}>
                                  View Products
                                </DropdownMenuItem>
                                {hasPermission(PERMISSIONS.WAREHOUSES_UPDATE) && (
                                  <>
                                    <DropdownMenuItem onClick={() => navigate(`/distribution/centers/${center.id}/edit`)}>
                                      Edit Center
                                    </DropdownMenuItem>
                                    {!center.is_primary && (
                                      <DropdownMenuItem onClick={() => handleSetPrimary(center.id)}>
                                        Set as Primary
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => handleDeactivateCenter(center)}
                                      className="text-destructive"
                                    >
                                      Deactivate Center
                                    </DropdownMenuItem>
                                  </>
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
                    currentPage={centersPagination.currentPage}
                    totalPages={centersPagination.totalPages}
                    pageSize={centersPagination.pageSize}
                    totalItems={centersPagination.totalItems}
                    onPageChange={centersPagination.setPage}
                    onPageSizeChange={centersPagination.setPageSize}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Locations Tab */}
          <TabsContent value="locations">
            <ProductLocationsList />
          </TabsContent>

          {/* Stock Transfers Tab */}
          <TabsContent value="transfers">
            <Card>
              <CardHeader>
                <CardTitle>Stock Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Stock transfers functionality coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Distribution Center Dialog */}
        <CreateDistributionCenterForm
          open={showCreateCenterForm}
          onOpenChange={setShowCreateCenterForm}
          onCenterCreated={handleCreateCenter}
        />

        {/* Product Locations Dialog */}
        <Dialog open={showLocationDetails} onOpenChange={setShowLocationDetails}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Product Locations - {selectedCenter?.name}
              </DialogTitle>
              <DialogDescription>
                Manage product inventory at {selectedCenter?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedCenter && (
              <ProductLocationsList distributionCenterId={selectedCenter.id} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}
