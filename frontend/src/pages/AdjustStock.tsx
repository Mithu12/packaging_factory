import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Save, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Info
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function AdjustStock() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Mock product data
  const product = {
    id: "PRD-001",
    sku: "LPT-001",
    name: "Business Laptop Model X",
    category: "Electronics",
    subCategory: "Laptops",
    unit: "pcs",
    currentStock: 45,
    minStock: 10,
    maxStock: 100,
    location: "Warehouse A - Shelf 12"
  }

  const [adjustmentData, setAdjustmentData] = useState({
    adjustmentType: "",
    quantity: "",
    reason: "",
    reference: "",
    notes: ""
  })

  const [calculatedStock, setCalculatedStock] = useState(product.currentStock)

  const recentAdjustments = [
    { date: "2024-03-01", type: "Increase", quantity: +2, reason: "Found extra stock", reference: "ADJ-2024-008", user: "John Doe" },
    { date: "2024-02-15", type: "Decrease", quantity: -3, reason: "Damaged goods", reference: "ADJ-2024-005", user: "Jane Smith" },
    { date: "2024-02-10", type: "Increase", quantity: +5, reason: "Stock count correction", reference: "ADJ-2024-003", user: "Mike Johnson" }
  ]

  const adjustmentReasons = {
    increase: [
      "Stock count correction",
      "Found extra stock",
      "Return from customer",
      "Supplier bonus",
      "Manufacturing bonus",
      "Other"
    ],
    decrease: [
      "Damaged goods",
      "Expired products",
      "Theft/Loss",
      "Quality control rejection",
      "Stock count correction", 
      "Internal use",
      "Other"
    ]
  }

  const handleInputChange = (field: string, value: string) => {
    setAdjustmentData(prev => ({ ...prev, [field]: value }))
    
    if (field === "quantity" || field === "adjustmentType") {
      const qty = parseFloat(value) || 0
      if (adjustmentData.adjustmentType === "increase" || field === "adjustmentType" && value === "increase") {
        setCalculatedStock(product.currentStock + qty)
      } else if (adjustmentData.adjustmentType === "decrease" || field === "adjustmentType" && value === "decrease") {
        setCalculatedStock(product.currentStock - qty)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!adjustmentData.adjustmentType || !adjustmentData.quantity || !adjustmentData.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    const qty = parseFloat(adjustmentData.quantity)
    if (qty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be greater than zero.",
        variant: "destructive"
      })
      return
    }

    if (adjustmentData.adjustmentType === "decrease" && qty > product.currentStock) {
      toast({
        title: "Insufficient Stock",
        description: "Cannot decrease stock below zero.",
        variant: "destructive"
      })
      return
    }

    // In a real app, send data to API
    console.log("Stock adjustment:", {
      productId: id,
      currentStock: product.currentStock,
      adjustmentType: adjustmentData.adjustmentType,
      quantity: adjustmentData.adjustmentType === "increase" ? qty : -qty,
      newStock: calculatedStock,
      reason: adjustmentData.reason,
      reference: adjustmentData.reference,
      notes: adjustmentData.notes,
      timestamp: new Date().toISOString()
    })
    
    toast({
      title: "Stock Adjusted",
      description: `Stock has been ${adjustmentData.adjustmentType === "increase" ? "increased" : "decreased"} by ${qty} ${product.unit}.`
    })
    
    navigate(`/products/${id}`)
  }

  const getStockStatus = (stock: number) => {
    if (stock <= product.minStock * 0.5) return { status: "Critical", color: "text-destructive" }
    if (stock <= product.minStock) return { status: "Low", color: "text-warning" }
    return { status: "Good", color: "text-success" }
  }

  const currentStatus = getStockStatus(product.currentStock)
  const newStatus = getStockStatus(calculatedStock)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/products/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Adjust Stock</h1>
          <p className="text-muted-foreground">Make manual stock adjustments for {product.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Adjustment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Stock Adjustment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Info */}
                <div className="p-4 bg-accent/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku} • {product.category}</p>
                      <p className="text-sm text-muted-foreground">Location: {product.location}</p>
                    </div>
                  </div>
                </div>

                {/* Current Stock Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-card border rounded-lg">
                    <div className="text-2xl font-bold">{product.currentStock}</div>
                    <div className="text-sm text-muted-foreground">Current Stock</div>
                    <Badge className={`mt-1 ${currentStatus.color}`} variant="outline">
                      {currentStatus.status}
                    </Badge>
                  </div>
                  <div className="text-center p-4 bg-accent/10 border rounded-lg">
                    <div className="text-2xl font-bold">{adjustmentData.quantity || "0"}</div>
                    <div className="text-sm text-muted-foreground">
                      {adjustmentData.adjustmentType === "increase" ? "Increase" : 
                       adjustmentData.adjustmentType === "decrease" ? "Decrease" : "Adjustment"}
                    </div>
                    {adjustmentData.adjustmentType && (
                      <div className="mt-1">
                        {adjustmentData.adjustmentType === "increase" ? 
                          <TrendingUp className="w-4 h-4 mx-auto text-success" /> :
                          <TrendingDown className="w-4 h-4 mx-auto text-destructive" />
                        }
                      </div>
                    )}
                  </div>
                  <div className="text-center p-4 bg-primary/5 border rounded-lg">
                    <div className="text-2xl font-bold">{calculatedStock}</div>
                    <div className="text-sm text-muted-foreground">New Stock</div>
                    <Badge className={`mt-1 ${newStatus.color}`} variant="outline">
                      {newStatus.status}
                    </Badge>
                  </div>
                </div>

                {adjustmentData.adjustmentType === "decrease" && calculatedStock < product.minStock && (
                  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <div className="font-medium text-warning">Low Stock Warning</div>
                      <div className="text-sm text-muted-foreground">
                        This adjustment will bring stock below the minimum level ({product.minStock} {product.unit}). 
                        Consider reordering soon.
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Adjustment Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="adjustmentType">Adjustment Type *</Label>
                      <Select value={adjustmentData.adjustmentType} onValueChange={(value) => handleInputChange("adjustmentType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select adjustment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="increase">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-success" />
                              Increase Stock
                            </div>
                          </SelectItem>
                          <SelectItem value="decrease">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-destructive" />
                              Decrease Stock
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="1"
                        min="1"
                        value={adjustmentData.quantity}
                        onChange={(e) => handleInputChange("quantity", e.target.value)}
                        placeholder={`Enter quantity in ${product.unit}`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason *</Label>
                    <Select value={adjustmentData.reason} onValueChange={(value) => handleInputChange("reason", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason for adjustment" />
                      </SelectTrigger>
                      <SelectContent>
                        {adjustmentData.adjustmentType && adjustmentReasons[adjustmentData.adjustmentType as keyof typeof adjustmentReasons]?.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reference">Reference Number</Label>
                    <Input
                      id="reference"
                      value={adjustmentData.reference}
                      onChange={(e) => handleInputChange("reference", e.target.value)}
                      placeholder="e.g., ADJ-2024-001, INV-123"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={adjustmentData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Enter any additional details about this adjustment"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Apply Adjustment
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(`/products/${id}`)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Adjustments */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAdjustments.map((adjustment, index) => (
                  <div key={index} className="p-3 bg-accent/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {adjustment.type === "Increase" ? 
                          <TrendingUp className="w-4 h-4 text-success" /> :
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        }
                        <span className="font-medium text-sm">{adjustment.type}</span>
                      </div>
                      <span className={`font-medium ${adjustment.type === "Increase" ? "text-success" : "text-destructive"}`}>
                        {adjustment.quantity > 0 ? "+" : ""}{adjustment.quantity}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{adjustment.reason}</div>
                      <div>{adjustment.date} • {adjustment.user}</div>
                      {adjustment.reference && <div>Ref: {adjustment.reference}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stock Guidelines */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Stock Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Stock:</span>
                  <span className="font-medium">{product.minStock} {product.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Stock:</span>
                  <span className="font-medium">{product.maxStock} {product.unit}</span>
                </div>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Important Notes:</div>
                <ul className="space-y-1">
                  <li>• All adjustments require approval</li>
                  <li>• Provide detailed reasons for audit trail</li>
                  <li>• Physical verification may be required</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}