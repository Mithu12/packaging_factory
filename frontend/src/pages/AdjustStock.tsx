import { useState, useEffect } from "react"
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
  Info,
  Loader2
} from "lucide-react"
import { ApiService, ProductWithDetails, StockAdjustmentRequest, ApiError } from "@/services/api"

interface StockAdjustmentFormData {
  adjustment_type: string
  quantity: string
  reason: string
  reference: string
  notes: string
}
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

  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calculatedStock, setCalculatedStock] = useState(0)
  const [adjustmentData, setAdjustmentData] = useState<StockAdjustmentFormData>({
    adjustment_type: "",
    quantity: "",
    reason: "",
    reference: "",
    notes: ""
  })

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        const productData = await ApiService.getProduct(parseInt(id))
        setProduct(productData)
        setCalculatedStock(productData.current_stock)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to load product details")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading product data...</span>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Product not found"}</p>
          <Button onClick={() => navigate("/products")}>
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

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

  const handleInputChange = (field: keyof StockAdjustmentFormData, value: string) => {
    setAdjustmentData(prev => ({ ...prev, [field]: value }))
    
    // Calculate new stock when quantity or adjustment type changes
    if ((field === "quantity" || field === "adjustment_type") && product) {
      const newData = { ...adjustmentData, [field]: value }
      const qty = parseFloat(newData.quantity) || 0
      
      if (newData.adjustment_type === "increase") {
        setCalculatedStock(Number(product.current_stock) + Number(qty))
      } else if (newData.adjustment_type === "decrease") {
        setCalculatedStock(Number(product.current_stock) - Number(qty)) 
      } else {
        setCalculatedStock(product.current_stock)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!adjustmentData.adjustment_type || !adjustmentData.quantity || !adjustmentData.reason) {
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

    if (adjustmentData.adjustment_type === "decrease" && product && qty > product.current_stock) {
      toast({
        title: "Insufficient Stock",
        description: "Cannot decrease stock below zero.",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      const stockAdjustmentData: StockAdjustmentRequest = {
        product_id: parseInt(id),
        adjustment_type: adjustmentData.adjustment_type as 'increase' | 'decrease' | 'set',
        quantity: calculatedStock,
        reason: adjustmentData.reason,
        reference: adjustmentData.reference || undefined,
        notes: adjustmentData.notes || undefined
      }
      
      await ApiService.updateProductStock(parseInt(id), stockAdjustmentData)
      
      toast({
        title: "Stock Adjusted",
        description: `Stock has been ${adjustmentData.adjustment_type === "increase" ? "increased" : "decreased"} by ${qty} ${product.unit_of_measure}.`
      })
      
      navigate(`/products/${id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to adjust stock",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const getStockStatus = (stock: number) => {
    if (!product) return { status: "Unknown", color: "text-muted-foreground" }
    if (stock <= product.min_stock_level * 0.5) return { status: "Critical", color: "text-destructive" }
    if (stock <= product.min_stock_level) return { status: "Low", color: "text-warning" }
    return { status: "Good", color: "text-success" }
  }

  const currentStatus = product ? getStockStatus(product.current_stock) : { status: "Unknown", color: "text-muted-foreground" }
  const newStatus = product ? getStockStatus(calculatedStock) : { status: "Unknown", color: "text-muted-foreground" }

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
                      <p className="text-sm text-muted-foreground">SKU: {product.sku} • {product.category.name}</p>
                      <p className="text-sm text-muted-foreground">Unit: {product.unit_of_measure}</p>
                    </div>
                  </div>
                </div>

                {/* Current Stock Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-card border rounded-lg">
                    <div className="text-2xl font-bold">{product.current_stock}</div>
                    <div className="text-sm text-muted-foreground">Current Stock</div>
                    <Badge className={`mt-1 ${currentStatus.color}`} variant="outline">
                      {currentStatus.status}
                    </Badge>
                  </div>
                  <div className="text-center p-4 bg-accent/10 border rounded-lg">
                    <div className="text-2xl font-bold">{adjustmentData.quantity || "0"}</div>
                    <div className="text-sm text-muted-foreground">
                      {adjustmentData.adjustment_type === "increase" ? "Increase" : 
                       adjustmentData.adjustment_type === "decrease" ? "Decrease" : "Adjustment"}
                    </div>
                    {adjustmentData.adjustment_type && (
                      <div className="mt-1">
                        {adjustmentData.adjustment_type === "increase" ? 
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

                {adjustmentData.adjustment_type === "decrease" && product && calculatedStock < product.min_stock_level && (
                  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <div className="font-medium text-warning">Low Stock Warning</div>
                      <div className="text-sm text-muted-foreground">
                        This adjustment will bring stock below the minimum level ({product.min_stock_level} {product.unit_of_measure}). 
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
                      <Select value={adjustmentData.adjustment_type} onValueChange={(value) => handleInputChange("adjustment_type", value)}>
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
                        placeholder={`Enter quantity in ${product.unit_of_measure}`}
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
                        {adjustmentData.adjustment_type && adjustmentReasons[adjustmentData.adjustment_type as keyof typeof adjustmentReasons]?.map((reason) => (
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
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Apply Adjustment
                      </>
                    )}
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
                  <span className="font-medium">{product.min_stock_level} {product.unit_of_measure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Stock:</span>
                  <span className="font-medium">{product.max_stock_level || 'N/A'} {product.unit_of_measure}</span>
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