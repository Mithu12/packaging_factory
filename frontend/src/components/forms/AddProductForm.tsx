import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/sonner"
import { ApiService, Category, Subcategory, Supplier, CreateProductRequest, ApiError } from "@/services/api"

interface AddProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductAdded?: () => void
}

interface ProductFormData {
  name: string
  sku: string
  category_id: string
  subcategory_id: string
  unit_of_measure: string
  cost_price: string
  selling_price: string
  current_stock: string
  min_stock_level: string
  max_stock_level: string
  supplier_id: string
  description: string
  barcode: string
  weight: string
  dimensions: string
  tax_rate: string
  notes: string
}

export function AddProductForm({ open, onOpenChange, onProductAdded }: AddProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    category_id: "",
    subcategory_id: "",
    unit_of_measure: "pcs",
    cost_price: "",
    selling_price: "",
    current_stock: "0",
    min_stock_level: "",
    max_stock_level: "",
    supplier_id: "",
    description: "",
    barcode: "",
    weight: "",
    dimensions: "",
    tax_rate: "",
    notes: ""
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch categories and suppliers when dialog opens
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          setLoading(true)
          const [categoriesData, suppliersData] = await Promise.all([
            ApiService.getCategories({ limit: 100 }),
            ApiService.getSuppliers({ limit: 100 })
          ])
          
          setCategories(categoriesData.categories)
          setSuppliers(suppliersData.suppliers)
        } catch (err) {
          console.error("Failed to fetch data:", err)
          toast.error("Failed to load form data")
        } finally {
          setLoading(false)
        }
      }

      fetchData()
    }
  }, [open])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log(formData)
      // Validation
      if (!formData.name || !formData.sku || !formData.cost_price || !formData.selling_price || !formData.category_id || !formData.supplier_id) {
        toast.error("Please fill in all required fields")
        return
      }

      const productData: CreateProductRequest = {
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
        supplier_id: parseInt(formData.supplier_id),
        barcode: formData.barcode || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions || undefined,
        tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) : undefined,
        notes: formData.notes || undefined
      }
      
      await ApiService.createProduct(productData)
      
      toast.success("Product added successfully!", {
        description: `${formData.name} has been added to your catalog.`
      })
      
      // Reset form
      setFormData({
        name: "",
        sku: "",
        category_id: "",
        subcategory_id: "",
        unit_of_measure: "pcs",
        cost_price: "",
        selling_price: "",
        current_stock: "0",
        min_stock_level: "",
        max_stock_level: "",
        supplier_id: "",
        description: "",
        barcode: "",
        weight: "",
        dimensions: "",
        tax_rate: "",
        notes: ""
      })
      
      onProductAdded?.()
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error("Failed to add product", {
          description: error.message
        })
      } else {
        toast.error("Failed to add product", {
          description: "Please try again later."
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your catalog. Fill in the required information below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="e.g., PRD-001"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
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
            
            <div className="space-y-2">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select value={formData.unit_of_measure} onValueChange={(value) => handleInputChange("unit_of_measure", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="lbs">Pounds</SelectItem>
                  <SelectItem value="m">Meters</SelectItem>
                  <SelectItem value="ft">Feet</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
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
            
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => handleInputChange("selling_price", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minStock">Minimum Stock *</Label>
              <Input
                id="minStock"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => handleInputChange("min_stock_level", e.target.value)}
                placeholder="0"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxStock">Maximum Stock</Label>
              <Input
                id="maxStock"
                type="number"
                value={formData.max_stock_level}
                onChange={(e) => handleInputChange("max_stock_level", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}