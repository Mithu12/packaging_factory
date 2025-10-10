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
import { ApiService, ProductWithDetails, ApiError, StockAdjustment, PurchaseOrderWithDetails } from "@/services/api"
import { ProductApi } from "@/modules/inventory/services/product-api"
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
import { BarcodeDisplay } from "@/components/BarcodeDisplay";

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
  const [stockMovements, setStockMovements] = useState<StockAdjustment[]>([])
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseOrderWithDetails[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false)
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

  const fetchStockMovements = async () => {
    if (!id) return

    try {
      setLoadingMovements(true)
      const movements = await ApiService.getStockAdjustments({
        product_id: parseInt(id),
        limit: 10
      })
      setStockMovements(movements)
    } catch (err) {
      console.error("Failed to load stock movements:", err)
      setStockMovements([])
    } finally {
      setLoadingMovements(false)
    }
  }

  const fetchPurchaseHistory = async () => {
    if (!id) return

    try {
      setLoadingPurchaseHistory(true)
      // Get all purchase orders and filter by product
      const response = await ApiService.getPurchaseOrders({
        limit: 100 // Get more to filter by product
      })
      
      // For now, we'll get basic purchase orders and fetch details for those that might contain our product
      // This is a simplified approach - in a real app, you'd want a more efficient endpoint
      const productPurchaseOrders: PurchaseOrderWithDetails[] = []
      
      // Get details for each purchase order to check if it contains our product
      for (const po of response.purchase_orders.slice(0, 20)) { // Limit to first 20 for performance
        try {
          const detailedPO = await ApiService.getPurchaseOrder(po.id)
          if (detailedPO.line_items?.some(item => item.product_id === parseInt(id))) {
            productPurchaseOrders.push(detailedPO)
          }
        } catch (err) {
          console.error(`Failed to get details for PO ${po.id}:`, err)
        }
      }
      
      setPurchaseHistory(productPurchaseOrders.slice(0, 10)) // Limit to 10 most recent
    } catch (err) {
      console.error("Failed to load purchase history:", err)
      setPurchaseHistory([])
    } finally {
      setLoadingPurchaseHistory(false)
    }
  }
  // Fetch product data
  useEffect(() => {
    fetchProduct()
  }, [id])

  // Fetch dynamic data when product is loaded
  useEffect(() => {
    if (product) {
      fetchStockMovements()
      fetchPurchaseHistory()
    }
  }, [product])


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
          <Button onClick={() => navigate("/products")} data-testid="back-to-products-button">
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
    <div className="space-y-6" data-testid="product-details-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")} data-testid="back-to-products-button">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground" data-testid="product-title">{product.name}</h1>
          <p className="text-muted-foreground" data-testid="product-sku">
            SKU: {product.sku} • {product.category.name}
            {product.subcategory?.name && ` • ${product.subcategory.name}`}
            {product.brand && ` • ${product.brand.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/products/${id}/edit`)} data-testid="product-edit-button">
            <Edit className="w-4 h-4 mr-2" />
            Edit Product
          </Button>
          <Button variant="outline" onClick={() => navigate(`/products/${id}/adjust-stock`)} data-testid="product-adjust-stock-button">
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
                  <p className="font-medium">
                    {product.category.name}
                    {product.subcategory?.name && ` • ${product.subcategory.name}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <p className="font-medium">{product.brand?.name || 'No brand'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Origin</label>
                  <p className="font-medium">{product.origin_name || 'No origin'}</p>
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
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warranty Period</label>
                  <p className="font-medium">{product.warranty_period ? `${product.warranty_period} months` : 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Service Reminder Interval</label>
                  <p className="font-medium">{product.service_time ? `${product.service_time} months` : 'Not set'}</p>
                </div>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-sm leading-relaxed">{product.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Barcode Display */}
          <BarcodeDisplay 
            barcode={product.barcode || ''} 
            productName={product.name}
            sku={product.sku}
          />

          {/* Stock Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Recent Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMovements ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading stock movements...</span>
                  </div>
                </div>
              ) : stockMovements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>New Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium">{formatDate(movement.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            movement.adjustment_type === 'increase' ? 'default' : 
                            movement.adjustment_type === 'decrease' ? 'destructive' : 
                            'outline'
                          }>
                            {movement.adjustment_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${movement.adjustment_type === 'increase' ? 'text-success' : 'text-destructive'}`}>
                            {movement.adjustment_type === 'increase' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {Math.abs(movement.quantity)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{movement.reference || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{movement.new_stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No stock movements found for this product.
                </div>
              )}
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
              {loadingPurchaseHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading purchase history...</span>
                  </div>
                </div>
              ) : purchaseHistory.length > 0 ? (
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
                    {purchaseHistory.map((purchase) => {
                      // Find the line item for this product
                      const lineItem = purchase.line_items?.find(item => item.product_id === parseInt(id!))
                      if (!lineItem) return null
                      
                      return (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{formatDate(purchase.order_date)}</TableCell>
                          <TableCell>{purchase.supplier_name}</TableCell>
                          <TableCell>{lineItem.quantity} {product?.unit_of_measure}</TableCell>
                          <TableCell>{formatCurrency(lineItem.unit_price)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(lineItem.total_price)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{purchase.po_number}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No purchase history found for this product.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6" data-testid="product-details-page">
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
                  <span className="font-medium">{product.max_stock_level ? `${product.max_stock_level} ${product.unit_of_measure}` : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reorder Point</span>
                  <span className="font-medium">{product.reorder_point ? `${product.reorder_point} ${product.unit_of_measure}` : 'Not set'}</span>
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
                <span className="font-medium text-green-600">
                  {formatCurrency(product.selling_price - product.cost_price)}
                  {product.cost_price > 0 ? ` (${Number(((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%)` : ' (N/A)'}
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
                <p className="text-sm text-muted-foreground">
                  Average Lead Time: Not specified
                </p>
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate(`/suppliers/${product.supplier.id}`)} data-testid="view-supplier-details-button">
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
                  <Badge className={product.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}>
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
