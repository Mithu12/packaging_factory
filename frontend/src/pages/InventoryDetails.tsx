import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  Warehouse,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  MapPin,
  User
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function InventoryDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Mock inventory data - in real app, fetch by ID
  const inventoryItem = {
    id: "INV-001",
    product: {
      sku: "LPT-001",
      name: "Business Laptop Model X",
      description: "High-performance business laptop with Intel i7 processor, 16GB RAM, and 512GB SSD",
      category: "Electronics",
      subCategory: "Laptops",
      brand: "TechCorp"
    },
    stock: {
      currentStock: 45,
      minStock: 10,
      maxStock: 100,
      reorderPoint: 15,
      unit: "pcs",
      reservedStock: 5,
      availableStock: 40
    },
    valuation: {
      avgCostPrice: 850,
      totalValue: 38250,
      lastCostPrice: 860,
      sellingPrice: 1200
    },
    location: {
      warehouse: "Main Warehouse",
      zone: "A",
      aisle: "12",
      shelf: "3",
      bin: "B",
      fullLocation: "Main Warehouse - A12-3B"
    },
    lastUpdated: "2024-03-10",
    supplier: "ABC Electronics Ltd",
    status: "active"
  }

  const stockMovements = [
    { 
      date: "2024-03-10", 
      type: "Purchase Receipt", 
      quantity: +20, 
      reference: "PO-2024-045", 
      balance: 45,
      costPrice: 860,
      notes: "New stock arrival"
    },
    { 
      date: "2024-03-08", 
      type: "Sale", 
      quantity: -5, 
      reference: "SO-2024-123", 
      balance: 25,
      costPrice: 850,
      notes: "Customer order"
    },
    { 
      date: "2024-03-05", 
      type: "Transfer Out", 
      quantity: -3, 
      reference: "TF-2024-008", 
      balance: 30,
      costPrice: 850,
      notes: "Transfer to Branch B"
    },
    { 
      date: "2024-03-01", 
      type: "Stock Adjustment", 
      quantity: +2, 
      reference: "ADJ-2024-008", 
      balance: 33,
      costPrice: 850,
      notes: "Stock count correction"
    },
    { 
      date: "2024-02-28", 
      type: "Sale", 
      quantity: -7, 
      reference: "SO-2024-105", 
      balance: 31,
      costPrice: 850,
      notes: "Bulk order"
    }
  ]

  const locationHistory = [
    { date: "2024-03-10", location: "Main Warehouse - A12-3B", quantity: 20, type: "Added", reference: "PO-2024-045" },
    { date: "2024-03-05", location: "Branch B - B05-2A", quantity: 3, type: "Transferred", reference: "TF-2024-008" },
    { date: "2024-02-15", location: "Main Warehouse - A12-3B", quantity: 25, type: "Added", reference: "PO-2024-032" }
  ]

  const getStockStatus = () => {
    const { currentStock, minStock, maxStock } = inventoryItem.stock
    const percentage = (currentStock / maxStock) * 100
    
    if (currentStock <= minStock * 0.5) 
      return { status: "Critical", color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertTriangle }
    if (currentStock <= minStock) 
      return { status: "Low Stock", color: "text-warning", bgColor: "bg-warning/10", icon: AlertTriangle }
    return { status: "Good", color: "text-success", bgColor: "bg-success/10", icon: CheckCircle }
  }

  const stockInfo = getStockStatus()
  const stockPercentage = (inventoryItem.stock.currentStock / inventoryItem.stock.maxStock) * 100
  const StockIcon = stockInfo.icon

  const getMovementColor = (type: string) => {
    switch (type) {
      case "Purchase Receipt": return "text-success"
      case "Sale": return "text-destructive"
      case "Transfer Out": return "text-warning"
      case "Transfer In": return "text-info"
      case "Stock Adjustment": return "text-purple-500"
      default: return "text-muted-foreground"
    }
  }

  const getMovementIcon = (quantity: number) => {
    return quantity > 0 ? TrendingUp : TrendingDown
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{inventoryItem.product.name}</h1>
          <p className="text-muted-foreground">
            SKU: {inventoryItem.product.sku} • {inventoryItem.product.category} → {inventoryItem.product.subCategory}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/inventory/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Item
          </Button>
          <Button variant="outline" onClick={() => navigate(`/inventory/${id}/adjust`)}>
            <Warehouse className="w-4 h-4 mr-2" />
            Adjust Stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inventory Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Current Stock</span>
                </div>
                <div className="text-2xl font-bold">{inventoryItem.stock.currentStock}</div>
                <div className="text-xs text-muted-foreground">{inventoryItem.stock.unit}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Value</span>
                </div>
                <div className="text-2xl font-bold">${inventoryItem.valuation.totalValue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">@ ${inventoryItem.valuation.avgCostPrice} avg</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Warehouse className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Available</span>
                </div>
                <div className="text-2xl font-bold">{inventoryItem.stock.availableStock}</div>
                <div className="text-xs text-muted-foreground">{inventoryItem.stock.reservedStock} reserved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Fill Rate</span>
                </div>
                <div className="text-2xl font-bold">{stockPercentage.toFixed(0)}%</div>
                <Progress value={stockPercentage} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </div>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                  <p className="font-medium">{inventoryItem.product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="font-medium">{inventoryItem.product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="font-medium">{inventoryItem.product.category} → {inventoryItem.product.subCategory}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <p className="font-medium">{inventoryItem.product.brand}</p>
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-sm leading-relaxed">{inventoryItem.product.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stock Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Stock Movement History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements.map((movement, index) => {
                    const MovementIcon = getMovementIcon(movement.quantity)
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{movement.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getMovementColor(movement.type)}>
                            {movement.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${movement.quantity > 0 ? 'text-success' : 'text-destructive'}`}>
                            <MovementIcon className="w-4 h-4" />
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{movement.reference}</TableCell>
                        <TableCell className="font-medium">{movement.balance}</TableCell>
                        <TableCell className="font-medium">
                          ${(Math.abs(movement.quantity) * movement.costPrice).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Location History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{entry.location}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.date} • {entry.type} {entry.quantity} units
                      </div>
                      {entry.reference && (
                        <div className="text-xs text-muted-foreground">Ref: {entry.reference}</div>
                      )}
                    </div>
                    <Badge variant={entry.type === "Added" ? "default" : "outline"}>
                      {entry.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5" />
                Stock Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`p-4 rounded-lg ${stockInfo.bgColor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <StockIcon className={`w-5 h-5 ${stockInfo.color}`} />
                  <span className={`font-medium ${stockInfo.color}`}>{stockInfo.status}</span>
                </div>
                <div className="text-2xl font-bold">{inventoryItem.stock.currentStock} {inventoryItem.stock.unit}</div>
                <Progress value={stockPercentage} className="mt-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Available Stock</span>
                  <span className="font-medium">{inventoryItem.stock.availableStock} {inventoryItem.stock.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reserved Stock</span>
                  <span className="font-medium">{inventoryItem.stock.reservedStock} {inventoryItem.stock.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Minimum Stock</span>
                  <span className="font-medium">{inventoryItem.stock.minStock} {inventoryItem.stock.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maximum Stock</span>
                  <span className="font-medium">{inventoryItem.stock.maxStock} {inventoryItem.stock.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reorder Point</span>
                  <span className="font-medium">{inventoryItem.stock.reorderPoint} {inventoryItem.stock.unit}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valuation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Valuation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Cost</span>
                <span className="font-medium">${inventoryItem.valuation.avgCostPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Cost</span>
                <span className="font-medium">${inventoryItem.valuation.lastCostPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Selling Price</span>
                <span className="font-medium">${inventoryItem.valuation.sellingPrice}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Value</span>
                <span className="font-medium text-lg">${inventoryItem.valuation.totalValue.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {inventoryItem.stock.currentStock} units × ${inventoryItem.valuation.avgCostPrice} avg
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Current Location</label>
                <p className="font-medium">{inventoryItem.location.fullLocation}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Warehouse:</span>
                  <div className="font-medium">{inventoryItem.location.warehouse}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Zone:</span>
                  <div className="font-medium">{inventoryItem.location.zone}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Aisle:</span>
                  <div className="font-medium">{inventoryItem.location.aisle}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Shelf:</span>
                  <div className="font-medium">{inventoryItem.location.shelf}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Primary Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{inventoryItem.supplier}</p>
                <p className="text-sm text-muted-foreground">Last Purchase: March 10, 2024</p>
                <p className="text-sm text-muted-foreground">Average Lead Time: 5-7 days</p>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Supplier Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Item Status */}
          <Card>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={inventoryItem.status === 'active' ? 'bg-success text-white' : 'bg-status-draft text-white'}>
                    {inventoryItem.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Last Updated</label>
                <p className="font-medium">{inventoryItem.lastUpdated}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}