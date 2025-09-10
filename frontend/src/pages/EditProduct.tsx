import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Package, Loader2 } from "lucide-react"
import { ApiService, ProductWithDetails, Category, Subcategory, Supplier, ApiError } from "@/services/api"

export default function EditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    unit_of_measure: "",
    cost_price: "",
    selling_price: "",
    current_stock: "",
    min_stock_level: "",
    max_stock_level: "",
    reorder_point: "",
    supplier_id: "",
    status: "active",
    barcode: "",
    weight: "",
    dimensions: "",
    tax_rate: "",
    notes: ""
  })

  // Fetch product data and related data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        
        const [productData, categoriesData, suppliersData] = await Promise.all([
          ApiService.getProduct(parseInt(id)),
          ApiService.getCategories({ limit: 100 }),
          ApiService.getSuppliers({ limit: 100 })
        ])
        
        setProduct(productData)
        setCategories(categoriesData.categories)
        setSuppliers(suppliersData.suppliers)
        
        // Populate form with product data
        setFormData({
          name: productData.name,
          sku: productData.sku,
          description: productData.description || "",
          category_id: productData.category_id.toString(),
          subcategory_id: productData.subcategory_id?.toString() || "",
          unit_of_measure: productData.unit_of_measure,
          cost_price: productData.cost_price.toString(),
          selling_price: productData.selling_price.toString(),
          current_stock: productData.current_stock.toString(),
          min_stock_level: productData.min_stock_level.toString(),
          max_stock_level: productData.max_stock_level?.toString() || "",
          reorder_point: productData.reorder_point?.toString() || "",
          supplier_id: productData.supplier_id.toString(),
          status: productData.status,
          barcode: productData.barcode || "",
          weight: productData.weight?.toString() || "",
          dimensions: productData.dimensions || "",
          tax_rate: productData.tax_rate?.toString() || "",
          notes: productData.notes || ""
        })
        
        // Fetch subcategories for the selected category
        if (productData.category_id) {
          const subcategoriesData = await ApiService.getSubcategories({ 
            category_id: productData.category_id, 
            limit: 100 
          })
          setSubcategories(subcategoriesData.subcategories)
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to load product data")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCategoryChange = async (categoryId: string) => {
    setFormData(prev => ({ ...prev, category_id: categoryId, subcategory_id: "" }))
    
    if (categoryId) {
      try {
        const subcategoriesData = await ApiService.getSubcategories({ 
          category_id: parseInt(categoryId), 
          limit: 100 
        })
        setSubcategories(subcategoriesData.subcategories)
      } catch (err) {
        console.error("Failed to fetch subcategories:", err)
        setSubcategories([])
      }
    } else {
      setSubcategories([])
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!id) return
    
    // Validation
    if (!formData.name || !formData.sku || !formData.cost_price || !formData.selling_price) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      const updateData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        category_id: parseInt(formData.category_id),
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : undefined,
        unit_of_measure: formData.unit_of_measure,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        current_stock: parseFloat(formData.current_stock),
        min_stock_level: parseFloat(formData.min_stock_level),
        max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : undefined,
        reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) : undefined,
        supplier_id: parseInt(formData.supplier_id),
        status: formData.status as 'active' | 'inactive' | 'discontinued' | 'out_of_stock',
        barcode: formData.barcode || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions || undefined,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : undefined,
        notes: formData.notes || undefined
      }
      
      await ApiService.updateProduct(parseInt(id), updateData)
      
      toast({
        title: "Product Updated",
        description: "Product has been successfully updated.",
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
          description: "Failed to update product",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const units = [
    { value: "pcs", label: "Pieces" },
    { value: "kg", label: "Kilograms" },
    { value: "ltr", label: "Liters" },
    { value: "box", label: "Box" },
    { value: "pack", label: "Pack" },
    { value: "roll", label: "Roll" },
    { value: "m", label: "Meters" },
    { value: "cm", label: "Centimeters" },
    { value: "g", label: "Grams" },
    { value: "ml", label: "Milliliters" }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/products/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Product</h1>
          <p className="text-muted-foreground">Update {product.name} information and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value)}
                      placeholder="Enter SKU"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => handleInputChange("brand", e.target.value)}
                      placeholder="Enter brand"
                    />
                  </div>
                  <div>
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => handleInputChange("barcode", e.target.value)}
                      placeholder="Enter barcode"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Category & Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Category & Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subCategory">Sub Category</Label>
                    <Select value={formData.subcategory_id} onValueChange={(value) => handleInputChange("subcategory_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub category" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit of Measure</Label>
                    <Select value={formData.unit_of_measure} onValueChange={(value) => handleInputChange("unit_of_measure", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costPrice">Cost Price *</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => handleInputChange("cost_price", e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPrice">Selling Price *</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => handleInputChange("selling_price", e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                {formData.cost_price && formData.selling_price && (
                  <div className="p-3 bg-accent/20 rounded-lg">
                    <div className="text-sm text-muted-foreground">Profit Margin</div>
                    <div className="text-lg font-medium text-success">
                      ${(parseFloat(formData.selling_price) - parseFloat(formData.cost_price)).toFixed(2)} 
                      ({(((parseFloat(formData.selling_price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price)) * 100).toFixed(1)}%)
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Physical Properties */}
            <Card>
              <CardHeader>
                <CardTitle>Physical Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => handleInputChange("weight", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length">Length (cm)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.1"
                      value={formData.length}
                      onChange={(e) => handleInputChange("length", e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="width">Width (cm)</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.1"
                      value={formData.width}
                      onChange={(e) => handleInputChange("width", e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) => handleInputChange("height", e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stock Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="minStock">Minimum Stock</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => handleInputChange("min_stock_level", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="maxStock">Maximum Stock</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => handleInputChange("max_stock_level", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    value={formData.reorder_point}
                    onChange={(e) => handleInputChange("reorder_point", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Warehouse - Shelf"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Supplier & Status */}
            <Card>
              <CardHeader>
                <CardTitle>Supplier & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="supplier">Primary Supplier</Label>
                  <Select value={formData.supplier_id} onValueChange={(value) => handleInputChange("supplier_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/products/${id}`)}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}