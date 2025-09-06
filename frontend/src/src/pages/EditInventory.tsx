import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Package, Warehouse, MapPin, DollarSign } from "lucide-react"

export default function EditInventory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Mock inventory data - in real app, fetch by ID
  const [formData, setFormData] = useState({
    // Stock Settings
    minStock: "10",
    maxStock: "100",
    reorderPoint: "15",
    
    // Location
    warehouse: "Main Warehouse",
    zone: "A",
    aisle: "12",
    shelf: "3",
    bin: "B",
    
    // Valuation
    avgCostPrice: "850",
    lastCostPrice: "860",
    sellingPrice: "1200",
    
    // General
    status: "active",
    supplier: "ABC Electronics Ltd"
  })

  const productInfo = {
    sku: "LPT-001",
    name: "Business Laptop Model X",
    category: "Electronics",
    subCategory: "Laptops",
    currentStock: 45,
    unit: "pcs"
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.minStock || !formData.maxStock || !formData.reorderPoint) {
      toast({
        title: "Validation Error",
        description: "Please fill in all stock level fields.",
        variant: "destructive"
      })
      return
    }

    const minStock = parseInt(formData.minStock)
    const maxStock = parseInt(formData.maxStock)
    const reorderPoint = parseInt(formData.reorderPoint)

    if (minStock >= maxStock) {
      toast({
        title: "Invalid Stock Levels",
        description: "Maximum stock must be greater than minimum stock.",
        variant: "destructive"
      })
      return
    }

    if (reorderPoint > maxStock || reorderPoint < minStock) {
      toast({
        title: "Invalid Reorder Point",
        description: "Reorder point must be between minimum and maximum stock levels.",
        variant: "destructive"
      })
      return
    }

    // In a real app, send data to API
    console.log("Updating inventory:", formData)
    
    toast({
      title: "Inventory Updated",
      description: "Inventory settings have been updated successfully."
    })
    
    navigate(`/inventory/${id}`)
  }

  const warehouses = [
    { value: "Main Warehouse", label: "Main Warehouse" },
    { value: "Branch A", label: "Branch A Warehouse" },
    { value: "Branch B", label: "Branch B Warehouse" },
    { value: "Temporary Storage", label: "Temporary Storage" }
  ]

  const suppliers = [
    { value: "ABC Electronics Ltd", label: "ABC Electronics Ltd" },
    { value: "TechSupply Co", label: "TechSupply Co" },
    { value: "Global Raw Materials Inc", label: "Global Raw Materials Inc" }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/inventory/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Inventory</h1>
          <p className="text-muted-foreground">Update inventory settings and location information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information (Read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-accent/20 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                      <p className="font-medium">{productInfo.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">SKU</label>
                      <p className="font-medium">{productInfo.sku}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p className="font-medium">{productInfo.category} → {productInfo.subCategory}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                      <p className="font-medium">{productInfo.currentStock} {productInfo.unit}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Level Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5" />
                  Stock Level Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="minStock">Minimum Stock *</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => handleInputChange("minStock", e.target.value)}
                      placeholder="0"
                      required
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Alert threshold for low stock
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="maxStock">Maximum Stock *</Label>
                    <Input
                      id="maxStock"
                      type="number"
                      min="1"
                      value={formData.maxStock}
                      onChange={(e) => handleInputChange("maxStock", e.target.value)}
                      placeholder="0"
                      required
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Maximum storage capacity
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reorderPoint">Reorder Point *</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      min="0"
                      value={formData.reorderPoint}
                      onChange={(e) => handleInputChange("reorderPoint", e.target.value)}
                      placeholder="0"
                      required
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Trigger automatic reorder
                    </div>
                  </div>
                </div>

                {/* Stock Level Visualization */}
                {formData.minStock && formData.maxStock && formData.reorderPoint && (
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="text-sm font-medium mb-2">Stock Level Preview</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>0</span>
                        <span>Min: {formData.minStock}</span>
                        <span>Reorder: {formData.reorderPoint}</span>
                        <span>Current: {productInfo.currentStock}</span>
                        <span>Max: {formData.maxStock}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full relative">
                        <div 
                          className="absolute h-full bg-destructive rounded-full" 
                          style={{ width: `${(parseInt(formData.minStock) / parseInt(formData.maxStock)) * 100}%` }}
                        />
                        <div 
                          className="absolute h-full bg-warning rounded-full" 
                          style={{ 
                            left: `${(parseInt(formData.minStock) / parseInt(formData.maxStock)) * 100}%`,
                            width: `${((parseInt(formData.reorderPoint) - parseInt(formData.minStock)) / parseInt(formData.maxStock)) * 100}%`
                          }}
                        />
                        <div 
                          className="absolute h-full bg-success rounded-full" 
                          style={{ 
                            left: `${(parseInt(formData.reorderPoint) / parseInt(formData.maxStock)) * 100}%`,
                            width: `${((parseInt(formData.maxStock) - parseInt(formData.reorderPoint)) / parseInt(formData.maxStock)) * 100}%`
                          }}
                        />
                        {/* Current stock indicator */}
                        <div 
                          className="absolute w-1 h-4 bg-foreground -top-1 rounded"
                          style={{ left: `${(productInfo.currentStock / parseInt(formData.maxStock)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="text-destructive">Critical</span>
                        <span className="text-warning">Low</span>
                        <span className="text-success">Good</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Storage Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="warehouse">Warehouse</Label>
                    <Select value={formData.warehouse} onValueChange={(value) => handleInputChange("warehouse", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.value} value={warehouse.value}>
                            {warehouse.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="zone">Zone</Label>
                    <Input
                      id="zone"
                      value={formData.zone}
                      onChange={(e) => handleInputChange("zone", e.target.value)}
                      placeholder="e.g., A, B, C"
                    />
                  </div>
                  <div>
                    <Label htmlFor="aisle">Aisle</Label>
                    <Input
                      id="aisle"
                      value={formData.aisle}
                      onChange={(e) => handleInputChange("aisle", e.target.value)}
                      placeholder="e.g., 01, 02, 12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shelf">Shelf</Label>
                    <Input
                      id="shelf"
                      value={formData.shelf}
                      onChange={(e) => handleInputChange("shelf", e.target.value)}
                      placeholder="e.g., 1, 2, 3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bin">Bin</Label>
                    <Input
                      id="bin"
                      value={formData.bin}
                      onChange={(e) => handleInputChange("bin", e.target.value)}
                      placeholder="e.g., A, B, C"
                    />
                  </div>
                </div>

                {/* Location Preview */}
                <div className="p-3 bg-primary/5 rounded-lg border">
                  <div className="text-sm font-medium text-muted-foreground">Full Location</div>
                  <div className="font-medium">
                    {formData.warehouse}
                    {formData.zone && ` - ${formData.zone}`}
                    {formData.aisle && `${formData.aisle}`}
                    {formData.shelf && `-${formData.shelf}`}
                    {formData.bin && `${formData.bin}`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Valuation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="avgCostPrice">Average Cost Price</Label>
                    <Input
                      id="avgCostPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.avgCostPrice}
                      onChange={(e) => handleInputChange("avgCostPrice", e.target.value)}
                      placeholder="0.00"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Used for inventory valuation
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastCostPrice">Last Cost Price</Label>
                    <Input
                      id="lastCostPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.lastCostPrice}
                      onChange={(e) => handleInputChange("lastCostPrice", e.target.value)}
                      placeholder="0.00"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Most recent purchase price
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sellingPrice">Selling Price</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sellingPrice}
                      onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
                      placeholder="0.00"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Current market price
                    </div>
                  </div>
                </div>

                {/* Valuation Summary */}
                {formData.avgCostPrice && (
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <div className="text-sm font-medium mb-2">Inventory Valuation</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Value:</span>
                        <div className="font-medium text-lg">
                          ${(productInfo.currentStock * parseFloat(formData.avgCostPrice)).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Profit Margin:</span>
                        <div className="font-medium text-lg text-success">
                          ${(parseFloat(formData.sellingPrice) - parseFloat(formData.avgCostPrice)).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Margin %:</span>
                        <div className="font-medium text-lg text-success">
                          {(((parseFloat(formData.sellingPrice) - parseFloat(formData.avgCostPrice)) / parseFloat(formData.avgCostPrice)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplier">Primary Supplier</Label>
                  <Select value={formData.supplier} onValueChange={(value) => handleInputChange("supplier", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.value} value={supplier.value}>
                          {supplier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/inventory/${id}`)}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold">{productInfo.currentStock}</div>
                  <div className="text-sm text-muted-foreground">Current Stock</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Changes will take effect immediately</div>
                  <div>• Stock movements will be tracked</div>
                  <div>• Location changes will be logged</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}