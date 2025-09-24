import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DataTablePagination } from "@/components/DataTablePagination"
import { useClientPagination } from "@/hooks/usePagination"
import { useFormatting } from "@/hooks/useFormatting"
import { useRBAC } from "@/contexts/RBACContext"
import { PermissionButton } from "@/components/rbac/PermissionButton"
import { PERMISSIONS } from "@/types/rbac"
import { 
  Search, 
  Filter, 
  MoreHorizontal,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown
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
import { useToast } from "@/hooks/use-toast"
import { 
  DistributionApi,
  ProductLocation,
  ProductLocationQueryParams,
  DistributionCenter,
  CreateStockTransferRequest
} from "@/services/distribution-api"

interface ProductLocationsListProps {
  distributionCenterId?: number
}

export function ProductLocationsList({ distributionCenterId }: ProductLocationsListProps) {
  const { formatNumber } = useFormatting()
  const { hasPermission } = useRBAC()
  const { toast } = useToast()
  
  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<ProductLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | null>(null)
  const [showAdjustDialog, setShowAdjustDialog] = useState(false)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [adjusting, setAdjusting] = useState(false)
  
  // Transfer state
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferQuantity, setTransferQuantity] = useState("")
  const [transferToCenter, setTransferToCenter] = useState("")
  const [transferPriority, setTransferPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [transferNotes, setTransferNotes] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [availableCenters, setAvailableCenters] = useState<DistributionCenter[]>([])

  // Filter locations based on search term
  const filteredLocations = locations.filter(location =>
    location.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.center_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.location_in_warehouse?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Use client-side pagination for filtered locations
  const pagination = useClientPagination(filteredLocations, {
    initialPageSize: 20
  })

  // Fetch locations function (moved outside useEffect for reusability)
  const fetchLocations = async () => {
    try {
      setLoading(true)
      
      const params: ProductLocationQueryParams = {
        limit: 1000, // Get all locations for now
      }
      
      if (distributionCenterId) {
        params.distribution_center_id = distributionCenterId
      }
      
      const result = await DistributionApi.getProductLocations(params)
      setLocations(result.locations)
    } catch (error) {
      console.error("Error loading product locations:", error)
      toast({
        title: "Error",
        description: "Failed to load product locations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on component mount or when distributionCenterId changes
  useEffect(() => {
    fetchLocations()
  }, [distributionCenterId, toast])

  const getStockStatus = (location: ProductLocation) => {
    if (location.available_stock <= 0) {
      return { status: "out_of_stock", color: "text-destructive", icon: AlertTriangle, label: "Out of Stock" }
    }
    if (location.current_stock <= location.min_stock_level) {
      return { status: "low_stock", color: "text-warning", icon: AlertTriangle, label: "Low Stock" }
    }
    return { status: "in_stock", color: "text-success", icon: CheckCircle, label: "In Stock" }
  }

  const getStockTrend = (location: ProductLocation) => {
    // This would ideally compare with historical data
    // For now, we'll use a simple heuristic based on available vs current stock
    const utilizationRate = location.reserved_stock / location.current_stock
    
    if (utilizationRate > 0.7) {
      return { icon: TrendingUp, color: "text-success", tooltip: "High demand" }
    } else if (utilizationRate > 0.3) {
      return { icon: TrendingUp, color: "text-warning", tooltip: "Moderate demand" }
    } else {
      return { icon: TrendingDown, color: "text-muted-foreground", tooltip: "Low demand" }
    }
  }

  const handleAdjustStock = (location: ProductLocation) => {
    setSelectedLocation(location)
    setAdjustmentAmount("")
    setAdjustmentReason("")
    setShowAdjustDialog(true)
  }

  const submitStockAdjustment = async () => {
    if (!selectedLocation || !adjustmentAmount || !adjustmentReason) {
      toast({
        title: "Missing Information",
        description: "Please provide adjustment amount and reason",
        variant: "destructive",
      })
      return
    }

    try {
      setAdjusting(true)
      
      const adjustment = parseFloat(adjustmentAmount)
      if (isNaN(adjustment) || adjustment === 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid adjustment amount",
          variant: "destructive",
        })
        return
      }

      const updatedLocation = await DistributionApi.adjustStock(
        selectedLocation.id,
        adjustment,
        adjustmentReason
      )

      // Update local state
      setLocations(prev => prev.map(loc => 
        loc.id === updatedLocation.id ? updatedLocation : loc
      ))

      toast({
        title: "Stock Adjusted",
        description: `Stock for ${selectedLocation.product_name} has been adjusted by ${adjustment}`,
      })

      setShowAdjustDialog(false)
      setSelectedLocation(null)
    } catch (error) {
      console.error("Error adjusting stock:", error)
      toast({
        title: "Error",
        description: "Failed to adjust stock",
        variant: "destructive",
      })
    } finally {
      setAdjusting(false)
    }
  }

  const handleTransferProduct = async (location: ProductLocation) => {
    setSelectedLocation(location)
    setTransferQuantity("")
    setTransferToCenter("")
    setTransferPriority('normal')
    setTransferNotes("")
    
    try {
      // Fetch available distribution centers (excluding current center)
      const centersResult = await DistributionApi.getDistributionCenters({ limit: 100 })
      const filtered = centersResult.centers.filter(center => 
        center.id !== location.distribution_center_id && center.status === 'active'
      )
      setAvailableCenters(filtered)
      setShowTransferDialog(true)
    } catch (error) {
      console.error("Error fetching centers:", error)
      toast({
        title: "Error",
        description: "Failed to load distribution centers",
        variant: "destructive",
      })
    }
  }

  const submitTransfer = async () => {
    if (!selectedLocation || !transferQuantity || !transferToCenter) {
      toast({
        title: "Missing Information",
        description: "Please provide quantity and destination center",
        variant: "destructive",
      })
      return
    }

    try {
      setTransferring(true)
      
      const quantity = parseFloat(transferQuantity)
      if (isNaN(quantity) || quantity <= 0) {
        toast({
          title: "Invalid Quantity",
          description: "Please enter a valid quantity",
          variant: "destructive",
        })
        return
      }

      if (quantity > selectedLocation.available_stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${selectedLocation.available_stock} units available`,
          variant: "destructive",
        })
        return
      }

      const transferRequest: CreateStockTransferRequest = {
        product_id: selectedLocation.product_id,
        from_center_id: selectedLocation.distribution_center_id,
        to_center_id: parseInt(transferToCenter),
        quantity,
        priority: transferPriority,
        notes: transferNotes || undefined
      }

      const transfer = await DistributionApi.createStockTransfer(transferRequest)

      toast({
        title: "Transfer Created",
        description: `Transfer ${transfer.transfer_number} created successfully`,
      })

      // Refresh locations
      fetchLocations()
      setShowTransferDialog(false)
      setSelectedLocation(null)
    } catch (error: any) {
      console.error("Error creating transfer:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create transfer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setTransferring(false)
    }
  }

  // Calculate summary stats
  const summaryStats = {
    totalLocations: locations.length,
    totalStock: locations.reduce((sum, loc) => sum + loc.current_stock, 0),
    totalReserved: locations.reduce((sum, loc) => sum + loc.reserved_stock, 0),
    lowStockLocations: locations.filter(loc => loc.current_stock <= loc.min_stock_level).length,
    outOfStockLocations: locations.filter(loc => loc.available_stock <= 0).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading product locations...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {!distributionCenterId && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalLocations}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summaryStats.totalStock)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reserved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summaryStats.totalReserved)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{summaryStats.lowStockLocations}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summaryStats.outOfStockLocations}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Locations Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>
              Product Locations {distributionCenterId && `(${locations[0]?.center_name || 'Distribution Center'})`}
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
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
                <TableHead>Product</TableHead>
                {!distributionCenterId && <TableHead>Distribution Center</TableHead>}
                <TableHead>Location</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Min Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.data.map((location) => {
                const stockInfo = getStockStatus(location)
                const trendInfo = getStockTrend(location)
                const StockIcon = stockInfo.icon
                const TrendIcon = trendInfo.icon
                
                return (
                  <TableRow key={location.id} className="hover:bg-accent/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{location.product_name}</div>
                          <div className="text-sm text-muted-foreground">SKU: {location.product_sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {!distributionCenterId && (
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{location.center_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {location.center_type?.replace('_', ' ')}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <div className="text-sm">
                        {location.location_in_warehouse || 
                          <span className="text-muted-foreground">Not assigned</span>
                        }
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">{formatNumber(location.current_stock)}</div>
                    </TableCell>
                    
                    <TableCell>
                      <div className={`font-medium ${stockInfo.color}`}>
                        {formatNumber(location.available_stock)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {formatNumber(location.reserved_stock)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatNumber(location.min_stock_level)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StockIcon className={`w-4 h-4 ${stockInfo.color}`} />
                        <Badge variant="outline" className={stockInfo.color}>
                          {stockInfo.label}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1" title={trendInfo.tooltip}>
                        <TrendIcon className={`w-4 h-4 ${trendInfo.color}`} />
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
                          <DropdownMenuItem onClick={() => console.log('View details', location)}>
                            View Details
                          </DropdownMenuItem>
                          {hasPermission(PERMISSIONS.INVENTORY_ADJUST) && (
                            <DropdownMenuItem onClick={() => handleAdjustStock(location)}>
                              Adjust Stock
                            </DropdownMenuItem>
                          )}
                          {hasPermission(PERMISSIONS.STOCK_TRANSFERS_CREATE) && location.available_stock > 0 && (
                            <DropdownMenuItem onClick={() => handleTransferProduct(location)}>
                              Transfer Product
                            </DropdownMenuItem>
                          )}
                          {hasPermission(PERMISSIONS.INVENTORY_ADJUST) && (
                            <DropdownMenuItem onClick={() => console.log('Edit location', location)}>
                              Edit Location
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

      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Adjust stock level for {selectedLocation?.product_name} at {selectedLocation?.center_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Stock</label>
              <div className="text-2xl font-bold">{formatNumber(selectedLocation?.current_stock || 0)}</div>
            </div>
            
            <div>
              <label htmlFor="adjustment" className="text-sm font-medium">
                Adjustment Amount
              </label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustmentAmount(prev => {
                    const current = parseFloat(prev) || 0
                    return (current - 1).toString()
                  })}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  id="adjustment"
                  type="number"
                  placeholder="0"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustmentAmount(prev => {
                    const current = parseFloat(prev) || 0
                    return (current + 1).toString()
                  })}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use positive numbers to increase stock, negative to decrease
              </p>
            </div>
            
            <div>
              <label htmlFor="reason" className="text-sm font-medium">
                Reason *
              </label>
              <Input
                id="reason"
                placeholder="e.g., Physical count correction, damaged goods, etc."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {adjustmentAmount && (
              <div className="p-3 bg-accent rounded-lg">
                <p className="text-sm">
                  <strong>New Stock Level:</strong> {' '}
                  {formatNumber((selectedLocation?.current_stock || 0) + (parseFloat(adjustmentAmount) || 0))}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAdjustDialog(false)}
              disabled={adjusting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitStockAdjustment}
              disabled={adjusting || !adjustmentAmount || !adjustmentReason}
            >
              {adjusting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Product Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Product</DialogTitle>
            <DialogDescription>
              Transfer {selectedLocation?.product_name} from {selectedLocation?.center_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity *
              </label>
              <Input
                id="quantity"
                type="number"
                placeholder="0"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                className="mt-1"
                max={selectedLocation?.available_stock}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {selectedLocation?.available_stock || 0} units
              </p>
            </div>
            
            <div>
              <label htmlFor="toCenter" className="text-sm font-medium">
                Destination Center *
              </label>
              <select
                id="toCenter"
                value={transferToCenter}
                onChange={(e) => setTransferToCenter(e.target.value)}
                className="mt-1 w-full p-2 border border-input bg-background rounded-md"
              >
                <option value="">Select destination center</option>
                {availableCenters.map(center => (
                  <option key={center.id} value={center.id}>
                    {center.name} ({center.type.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <select
                id="priority"
                value={transferPriority}
                onChange={(e) => setTransferPriority(e.target.value as any)}
                className="mt-1 w-full p-2 border border-input bg-background rounded-md"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="notes"
                placeholder="Optional notes about this transfer"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowTransferDialog(false)}
              disabled={transferring}
            >
              Cancel
            </Button>
            <Button
              onClick={submitTransfer}
              disabled={transferring || !transferQuantity || !transferToCenter}
            >
              {transferring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
