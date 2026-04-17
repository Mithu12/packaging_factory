"use client";

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useFormatting } from "@/hooks/useFormatting"
import { Loader2 } from "lucide-react"
import { ApiService, ProductWithDetails, Category, Subcategory, Supplier, ApiError } from "@/services/api"
import {
  displayPrimaryCategoryLabel,
  isRawMaterialsCategory,
} from "@/modules/inventory/constants/inventoryProductCategories"
import { ProductApi } from "@/modules/inventory/services/product-api"
import { getImagePath } from "@/utils/image.utils"
import {
    ArrowLeft,
    Save,
    Package,
    Upload,
    X,
    Image,
} from "lucide-react";
const PLACEHOLDER_IMAGE = "https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=400";

interface EditProductFormData {
  name: string
  sku: string
  description: string
  category_id: string
  subcategory_id: string
  unit_of_measure: string
  cost_price: string
  selling_price: string
  current_stock: string
  min_stock_level: string
  max_stock_level: string
  supplier_id: string
  status: string
  dimensions: string
  vat_rate: string
  notes: string
  currentImage: string
}

export default function EditProduct() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const router = useRouter();
  const { toast } = useToast();
  const { formatCurrency } = useFormatting();

  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllFields, setShowAllFields] = useState(true)
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState<EditProductFormData>({
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
    supplier_id: "",
    status: "active",
    dimensions: "",
    vat_rate: "",
    notes: "",
      currentImage: PLACEHOLDER_IMAGE,
  })
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                // 5MB limit
                toast({
                    title: "Image too large",
                    description: "Please select an image smaller than 5MB.",
                    variant: "destructive",
                });
                return;
            }

            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Invalid file type",
                    description: "Please select a valid image file.",
                    variant: "destructive",
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

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview("");
    };
  // Fetch product data and related data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        const [productData, categoriesData, suppliersData] = await Promise.all([
          ApiService.getProduct(parseInt(id)),
          ApiService.getCategories({
            limit: 100,
            primary_product_types_only: true,
          }),
          ApiService.getSuppliers({ limit: 100 })
        ])

        setProduct(productData)
        let cats = categoriesData.categories
        if (
          productData.category &&
          !cats.some((c) => c.id === productData.category_id)
        ) {
          cats = [...cats, productData.category]
        }
        setCategories(cats)
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
          supplier_id:
            productData.supplier_id != null
              ? productData.supplier_id.toString()
              : "",
          status: productData.status,
          dimensions: productData.dimensions || "",
          vat_rate: productData.tax_rate?.toString() || "",
          notes: productData.notes || "",
          currentImage: productData.image_url ? getImagePath(productData.image_url) : PLACEHOLDER_IMAGE,
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

  const handleInputChange = (field: keyof EditProductFormData, value: string) => {
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
          <Button onClick={() => router.push("/inventory/products")}>
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!id) return

    const selectedCat = categories.find(
      (c) => String(c.id) === String(formData.category_id)
    )
    const raw = selectedCat ? isRawMaterialsCategory(selectedCat.name) : false

    let requiredKeys: (keyof EditProductFormData)[] = [
      "name",
      "sku",
      "category_id",
    ]
    if (showAllFields) {
      requiredKeys.push("current_stock", "min_stock_level")
      if (raw) {
        requiredKeys.push("cost_price", "unit_of_measure")
      } else {
        requiredKeys.push("cost_price", "selling_price")
      }
    } else if (raw) {
      requiredKeys.push("cost_price", "unit_of_measure")
    } else {
      requiredKeys.push("cost_price", "selling_price")
    }

    const missingRequired = requiredKeys.filter((field) => {
      const value = formData[field]
      return typeof value === "string" ? value.trim() === "" : !value
    })
    if (missingRequired.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      const costNum = parseFloat(formData.cost_price)
      const sellingNum = raw ? costNum : parseFloat(formData.selling_price)

      const updateData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || undefined,
        category_id: parseInt(formData.category_id, 10),
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id, 10) : undefined,
        unit_of_measure: formData.unit_of_measure,
        cost_price: costNum,
        selling_price: sellingNum,
        current_stock: parseFloat(formData.current_stock),
        min_stock_level: parseFloat(formData.min_stock_level),
        max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : undefined,
        supplier_id: formData.supplier_id.trim()
          ? parseInt(formData.supplier_id, 10)
          : null,
        status: formData.status as 'active' | 'inactive' | 'discontinued' | 'out_of_stock',
        dimensions: formData.dimensions || undefined,
        tax_rate: formData.vat_rate ? parseFloat(formData.vat_rate) : undefined,
        notes: formData.notes || undefined,
      }

      // Use the new API method that supports image upload
      if (selectedImage) {
        await ProductApi.updateProductWithImage(parseInt(id), updateData, selectedImage)
      } else {
        await ApiService.updateProduct(parseInt(id), updateData)
      }

      toast({
        title: "Product Updated",
        description: "Product has been successfully updated.",
      })

      router.push(`/inventory/products/${id}`)
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

  const costPriceValue = parseFloat(formData.cost_price || "")
  const sellingPriceValue = parseFloat(formData.selling_price || "")
  const hasPricingValues = Number.isFinite(costPriceValue) && Number.isFinite(sellingPriceValue)
  const profitValue = hasPricingValues ? sellingPriceValue - costPriceValue : 0
  const profitPercentage = hasPricingValues && costPriceValue !== 0 ? (profitValue / costPriceValue) * 100 : 0

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

  const selectedCategoryName =
    categories.find((c) => String(c.id) === String(formData.category_id))
      ?.name ?? ""
  const isRawMaterialType = isRawMaterialsCategory(selectedCategoryName)

  return (
    <div className="space-y-6" data-testid="edit-product-page">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/inventory/products/${id}`)} data-testid="edit-product-back-button"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between flex-1 min-w-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Product</h1>
            <p className="text-muted-foreground">Update {product.name} information and settings</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label
              htmlFor="edit-product-show-all-fields"
              className="text-sm font-normal cursor-pointer"
            >
              Show all fields
            </Label>
            <Switch
              id="edit-product-show-all-fields"
              checked={showAllFields}
              onCheckedChange={setShowAllFields}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="edit-product-form">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Image */}
            {showAllFields ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Product Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Image */}
                  <div>
                    <Label>Current Image</Label>
                    <div className="mt-2">
                      <img
                        src={formData.currentImage || PLACEHOLDER_IMAGE}
                        alt={formData.name || "Current product image"}
                        className="w-full h-48 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = PLACEHOLDER_IMAGE
                        }}
                      />
                    </div>
                  </div>

                  {/* New Image Upload */}
                  <div>
                    <Label>Upload New Image</Label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="New product preview"
                            className="w-full h-48 object-cover rounded-lg border"
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
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center h-48 flex flex-col justify-center">
                          <Image className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Upload new image
                          </p>
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
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ) : null}
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
                    <Label htmlFor="name">
                      {isRawMaterialType && !showAllFields
                        ? "Material Name *"
                        : "Product Name *"}
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder={
                        isRawMaterialType && !showAllFields
                          ? "e.g. Raw Cotton, Wood, Steel"
                          : "Enter product name"
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value)}
                      placeholder="Enter SKU"
                      required
                    />
                  </div>
                  {(showAllFields || (isRawMaterialType && !showAllFields)) ? (
                  <div>
                    <Label htmlFor="unit">
                      {showAllFields ? "Unit of Measure" : "Unit of Measure *"}
                    </Label>
                    <Select value={formData.unit_of_measure} onValueChange={(value) => handleInputChange("unit_of_measure", value)}>
                      <SelectTrigger id="unit">
                        <SelectValue placeholder="Select unit..." />
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
                  ) : null}
                </div>

                {showAllFields ? (
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Category & Classification */}
            <Card>
              <CardHeader>
                <CardTitle>Category & Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={
                    showAllFields
                      ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                      : "grid grid-cols-1 gap-4"
                  }
                >
                  <div>
                    <Label htmlFor="category">Product Type *</Label>
                    <Select value={formData.category_id || undefined} onValueChange={handleCategoryChange}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {displayPrimaryCategoryLabel(category.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {showAllFields ? (
                  <div>
                    <Label htmlFor="subCategory">Sub Category</Label>
                    <Select
                      value={formData.subcategory_id || undefined}
                      onValueChange={(value) => handleInputChange("subcategory_id", value)}
                    >
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
                  ) : (
                  <div>
                    <Label htmlFor="subCategoryCompact">Category</Label>
                    <Select
                      value={formData.subcategory_id || undefined}
                      onValueChange={(value) => handleInputChange("subcategory_id", value)}
                      disabled={!formData.category_id}
                    >
                      <SelectTrigger id="subCategoryCompact">
                        <SelectValue placeholder="Select a category..." />
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
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showAllFields && isRawMaterialType ? (
                <div>
                  <Label htmlFor="costPrice">Purchase Price (per unit) *</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      ৳
                    </span>
                    <Input
                      id="costPrice"
                      className="pl-7"
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => handleInputChange("cost_price", e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                ) : null}

                {!showAllFields && !isRawMaterialType ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sellingPrice">Selling Price *</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        ৳
                      </span>
                      <Input
                        id="sellingPrice"
                        className="pl-7"
                        type="number"
                        step="0.01"
                        value={formData.selling_price}
                        onChange={(e) => handleInputChange("selling_price", e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="costPriceRg">Cost Price *</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        ৳
                      </span>
                      <Input
                        id="costPriceRg"
                        className="pl-7"
                        type="number"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(e) => handleInputChange("cost_price", e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>
                </div>
                ) : null}

                {showAllFields ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costPriceAll">Cost Price *</Label>
                    <Input
                      id="costPriceAll"
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => handleInputChange("cost_price", e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPriceAll">Selling Price *</Label>
                    <Input
                      id="sellingPriceAll"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => handleInputChange("selling_price", e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                ) : null}

                {hasPricingValues && (
                  <div className="p-3 bg-accent/20 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Profit Margin
                    </div>
                    <div className="text-lg font-medium text-success">
                      {formatCurrency(profitValue)} ({profitPercentage.toFixed(1)}%)
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Physical Properties */}
            {showAllFields ? (
            <Card>
              <CardHeader>
                <CardTitle>Physical Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) =>
                      handleInputChange("dimensions", e.target.value)
                    }
                    placeholder="e.g., 10x20x30 cm"
                  />
                </div>
              </CardContent>
            </Card>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6" data-testid="edit-product-sidebar">
            {showAllFields ? (
            <Card>
              <CardHeader>
                <CardTitle>Stock Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentStock">Current Stock *</Label>
                  <Input
                    id="currentStock"
                    data-testid="edit-product-current-stock"
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => handleInputChange("current_stock", e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
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
              </CardContent>
            </Card>
            ) : null}

            {/* Supplier & Status */}
            <Card>
              <CardHeader>
                <CardTitle>Supplier & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="supplier">Supplier (Optional)</Label>
                  <Select value={formData.supplier_id || undefined} onValueChange={(value) => handleInputChange("supplier_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier..." />
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
                {showAllFields ? (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      handleInputChange("status", value)
                    }
                  >
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
                ) : null}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button type="submit" className="w-full" disabled={saving} data-testid="save-product-button">
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
                  onClick={() => router.push(`/inventory/products/${id}`)} data-testid="cancel-edit-product-button"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

