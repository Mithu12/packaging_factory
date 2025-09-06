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
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Warehouse,
  User,
  BarChart3
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Mock product data - in real app, fetch by ID
  const product = {
    id: "PRD-001",
    sku: "LPT-001",
    name: "Business Laptop Model X",
    description: "High-performance business laptop with Intel i7 processor, 16GB RAM, and 512GB SSD. Perfect for professional use with excellent build quality and long battery life.",
    category: "Electronics",
    subCategory: "Laptops",
    brand: "TechCorp",
    unit: "pcs",
    costPrice: 850,
    sellingPrice: 1200,
    currentStock: 45,
    minStock: 10,
    maxStock: 100,
    reorderPoint: 15,
    supplier: "ABC Electronics Ltd",
    status: "active",
    createdDate: "2024-01-15",
    lastUpdated: "2024-03-10",
    barcode: "1234567890123",
    location: "Warehouse A - Shelf 12",
    weight: "2.5 kg",
    dimensions: "35.6 x 25.1 x 1.8 cm"
  }

  const stockMovements = [
    { date: "2024-03-10", type: "Purchase", quantity: +20, reference: "PO-2024-045", balance: 45 },
    { date: "2024-03-08", type: "Sale", quantity: -5, reference: "SO-2024-123", balance: 25 },
    { date: "2024-03-05", type: "Sale", quantity: -3, reference: "SO-2024-118", balance: 30 },
    { date: "2024-03-01", type: "Adjustment", quantity: +2, reference: "ADJ-2024-008", balance: 33 },
    { date: "2024-02-28", type: "Sale", quantity: -7, reference: "SO-2024-105", balance: 31 }
  ]

  const purchaseHistory = [
    { date: "2024-03-10", supplier: "ABC Electronics Ltd", quantity: 20, unitCost: 850, total: 17000, poNumber: "PO-2024-045" },
    { date: "2024-02-15", supplier: "ABC Electronics Ltd", quantity: 25, unitCost: 840, total: 21000, poNumber: "PO-2024-032" },
    { date: "2024-01-20", supplier: "TechSupply Co", quantity: 15, unitCost: 860, total: 12900, poNumber: "PO-2024-018" }
  ]

  const getStockStatus = () => {
    const percentage = (product.currentStock / product.maxStock) * 100
    if (product.currentStock <= product.minStock * 0.5) 
      return { status: "Critical", color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertTriangle }
    if (product.currentStock <= product.minStock) 
      return { status: "Low Stock", color: "text-warning", bgColor: "bg-warning/10", icon: AlertTriangle }
    return { status: "Good", color: "text-success", bgColor: "bg-success/10", icon: CheckCircle }
  }

  const stockInfo = getStockStatus()
  const stockPercentage = (product.currentStock / product.maxStock) * 100
  const StockIcon = stockInfo.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
          <p className="text-muted-foreground">SKU: {product.sku} • {product.category} → {product.subCategory}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/products/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Product
          </Button>
          <Button variant="outline" onClick={() => navigate(`/products/${id}/adjust-stock`)}>
            <Warehouse className="w-4 h-4 mr-2" />
            Adjust Stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
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
                  <p className="font-medium">{product.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="font-medium">{product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="font-medium">{product.category} → {product.subCategory}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <p className="font-medium">{product.brand}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                  <p className="font-medium">{product.unit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                  <p className="font-medium">{product.barcode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Weight</label>
                  <p className="font-medium">{product.weight}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                  <p className="font-medium">{product.dimensions}</p>
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-sm leading-relaxed">{product.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Stock Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Recent Stock Movements
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements.map((movement, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{movement.date}</TableCell>
                      <TableCell>
                        <Badge variant={movement.type === 'Purchase' ? 'default' : movement.type === 'Sale' ? 'secondary' : 'outline'}>
                          {movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${movement.quantity > 0 ? 'text-success' : 'text-destructive'}`}>
                          {movement.quantity > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {Math.abs(movement.quantity)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{movement.reference}</TableCell>
                      <TableCell className="font-medium">{movement.balance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Purchase History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Purchase History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>PO Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseHistory.map((purchase, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{purchase.date}</TableCell>
                      <TableCell>{purchase.supplier}</TableCell>
                      <TableCell>{purchase.quantity} {product.unit}</TableCell>
                      <TableCell>${purchase.unitCost}</TableCell>
                      <TableCell className="font-medium">${purchase.total.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{purchase.poNumber}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                <div className="text-2xl font-bold">{product.currentStock} {product.unit}</div>
                <Progress value={stockPercentage} className="mt-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Minimum Stock</span>
                  <span className="font-medium">{product.minStock} {product.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maximum Stock</span>
                  <span className="font-medium">{product.maxStock} {product.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reorder Point</span>
                  <span className="font-medium">{product.reorderPoint} {product.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <span className="font-medium text-sm">{product.location}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cost Price</span>
                <span className="font-medium">${product.costPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Selling Price</span>
                <span className="font-medium">${product.sellingPrice}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Profit Margin</span>
                <span className="font-medium text-success">
                  ${product.sellingPrice - product.costPrice} ({((product.sellingPrice - product.costPrice) / product.costPrice * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stock Value</span>
                <span className="font-medium">${(product.currentStock * product.costPrice).toLocaleString()}</span>
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
                <p className="font-medium">{product.supplier}</p>
                <p className="text-sm text-muted-foreground">Last Purchase: March 10, 2024</p>
                <p className="text-sm text-muted-foreground">Average Lead Time: 5-7 days</p>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Supplier Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge className={product.status === 'active' ? 'bg-success text-white' : 'bg-status-draft text-white'}>
                    {product.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Created Date</label>
                <p className="font-medium">{product.createdDate}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Last Updated</label>
                <p className="font-medium">{product.lastUpdated}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}