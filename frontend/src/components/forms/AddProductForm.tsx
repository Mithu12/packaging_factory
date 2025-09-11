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
import { Upload, X, Image } from "lucide-react";
import {Card, CardContent} from "@/components/ui/card";

interface AddProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded?: () => void;
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
  reorder_point: string
  supplier_id: string
  status: string
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
    reorder_point: "",
    supplier_id: "",
    status: "active",
    description: "",
    barcode: "",
    weight: "",
    dimensions: "",
    tax_rate: "",
    notes: ""
  })
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("Image too large", {
          description: "Please select an image smaller than 5MB.",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type", {
          description: "Please select a valid image file.",
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview("");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log(formData)
      // Validation
      if (!formData.name || !formData.sku || !formData.cost_price || !formData.selling_price || !formData.category_id || !formData.supplier_id) {
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
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
        reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) : undefined,
        supplier_id: parseInt(formData.supplier_id),
        status: formData.status as 'active' | 'inactive' | 'discontinued' | 'out_of_stock',
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
        reorder_point: "",
        supplier_id: "",
        status: "active",
        description: "",
        barcode: "",
        weight: "",
        dimensions: "",
        tax_rate: "",
        notes: ""
      })
        setSelectedImage(null);
        setImagePreview("");

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
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your catalog. Fill in the required information
            below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Product Image */}
            <div className="space-y-4">
              <Label>Product Image</Label>
              <Card>
                <CardContent className="p-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Image className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload product image
                      </p>
                      <div className="flex flex-col items-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />

                        <Label
                          htmlFor="image-upload"
                          className="cursor-pointer"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Choose Image
                            </span>
                          </Button>
                        </Label>
                        <p className="text-xs text-muted-foreground mt-2">
                          JPG, PNG, GIF up to 5MB
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Product Information */}
            <div className="lg:col-span-3 space-y-4">
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
              <Label htmlFor="currentStock">Current Stock *</Label>
              <Input
                id="currentStock"
                type="number"
                value={formData.current_stock}
                onChange={(e) => handleInputChange("current_stock", e.target.value)}
                placeholder="0"
                required
              />
            </div>

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                value={formData.reorder_point}
                onChange={(e) => handleInputChange("reorder_point", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
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
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange("barcode", e.target.value)}
                placeholder="Enter barcode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status || "active"} onValueChange={(value) => handleInputChange("status", value)}>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => handleInputChange("dimensions", e.target.value)}
                placeholder="e.g., 10x20x30 cm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => handleInputChange("tax_rate", e.target.value)}
                placeholder="0.00"
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes"
              rows={2}
            />
          </div>
          </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
