import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
  BarChart3,
  Loader2,
    Upload,
    X,
    Image,
    Camera,
} from "lucide-react"
import { ApiService, ProductWithDetails, ApiError } from "@/services/api"
import { ProductApi } from "@/services/product-api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getImagePath } from "@/utils/image.utils"
import {useFormatting} from "@/hooks/useFormatting.ts";

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { formatCurrency, formatDate } = useFormatting()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        console.error("Image too large");
        return;
      }

      if (!file.type.startsWith("image/")) {
        console.error("Invalid file type");
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

  const handleImageSave = async () => {
    if (!selectedImage || !product) return;
    
    setIsUploading(true);
    try {
      // Upload the image using the API
      const updatedProduct = await ProductApi.updateProductImage(product.id, selectedImage);
      
      // Update the product state with the new image URL
      await fetchProduct()
      
      // Reset the dialog state
      setSelectedImage(null);
      setImagePreview("");
      setIsImageDialogOpen(false);
      
      toast.success("Image updated successfully!");
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchProduct = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)
      const productData = await ApiService.getProduct(parseInt(id))
      setProduct(productData)
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
  // Fetch product data
  useEffect(() => {
    fetchProduct()
  }, [id])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading product details...</span>
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

  const getStockStatus = () => {
    const maxStock = product.max_stock_level || product.current_stock * 2 // Fallback if no max stock
    const percentage = (product.current_stock / maxStock) * 100
    if (product.current_stock <= product.min_stock_level * 0.5)
      return { status: "Critical", color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertTriangle }
    if (product.current_stock <= product.min_stock_level)
      return { status: "Low Stock", color: "text-warning", bgColor: "bg-warning/10", icon: AlertTriangle }
    return { status: "Good", color: "text-success", bgColor: "bg-success/10", icon: CheckCircle }
  }

  const stockInfo = getStockStatus()
  const maxStock = product.max_stock_level || product.current_stock * 2
  const stockPercentage = (product.current_stock / maxStock) * 100
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
          <p className="text-muted-foreground">SKU: {product.sku} • {product.category.name} → {product.subcategory?.name || 'No subcategory'}</p>
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
          {/* Product Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Product Image
                </span>
                <Dialog
                  open={isImageDialogOpen}
                  onOpenChange={setIsImageDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Update Image
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Product Image</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="New product preview"
                            className="w-full h-64 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreview("");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                          <Image className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                          <p className="text-sm text-muted-foreground mb-4">
                            Upload new product image
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload-dialog"
                          />
                          <Label
                            htmlFor="image-upload-dialog"
                            className="cursor-pointer"
                          >
                            <Button type="button" variant="outline" asChild>
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

                      <div className="flex gap-2">
                        <Button
                          onClick={handleImageSave}
                          disabled={!selectedImage || isUploading}
                          className="flex-1"
                        >
                          {isUploading ? "Uploading..." : "Save Image"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsImageDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <img
                  src={getImagePath(product.image_url)}
                  alt={product.name}
                  className="w-full max-w-md h-64 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.pexels.com/photos/4158/apple-iphone-smartphone-desk.jpg?auto=compress&cs=tinysrgb&w=400";
                  }}
                />
              </div>
            </CardContent>
          </Card>
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
                  <p className="font-medium">{product.category.name} → {product.subcategory?.name || 'No subcategory'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product Code</label>
                  <p className="font-medium">{product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                  <p className="font-medium">{product.unit_of_measure}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                  <p className="font-medium">{product.barcode || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Weight</label>
                  <p className="font-medium">{product.weight ? `${product.weight} kg` : 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                  <p className="font-medium">{product.dimensions || 'Not set'}</p>
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
                      <TableCell>{purchase.quantity} {product.unit_of_measure}</TableCell>
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
                <div className="text-2xl font-bold">{product.current_stock} {product.unit_of_measure}</div>
                <Progress value={stockPercentage} className="mt-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Minimum Stock</span>
                  <span className="font-medium">{product.min_stock_level} {product.unit_of_measure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Maximum Stock</span>
                  <span className="font-medium">{product.max_stock_level || 'Not set'} {product.unit_of_measure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reorder Point</span>
                  <span className="font-medium">{product.reorder_point || 'Not set'} {product.unit_of_measure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax Rate</span>
                  <span className="font-medium text-sm">{product.tax_rate ? `${product.tax_rate}%` : 'Not set'}</span>
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
                <span className="font-medium">{formatCurrency(product.cost_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Selling Price</span>
                <span className="font-medium">{formatCurrency(product.selling_price)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Profit Margin</span>
                <span className="font-medium text-success">
                  {formatCurrency(product.selling_price - product.cost_price)} ({((product.selling_price - product.cost_price) / product.cost_price * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stock Value</span>
                <span className="font-medium">{formatCurrency((product.current_stock * product.cost_price))}</span>
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
                <p className="font-medium">{product.supplier.name}</p>
                <p className="text-sm text-muted-foreground">Supplier Code: {product.supplier.supplier_code}</p>
                <p className="text-sm text-muted-foreground">Average Lead Time: 5-7 days</p>
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate(`/suppliers/${product.supplier.id}`)}>
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
                <p className="font-medium">{formatDate(product.created_at)}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Last Updated</label>
                <p className="font-medium">{formatDate(product.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}