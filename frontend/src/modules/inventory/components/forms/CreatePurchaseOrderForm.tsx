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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/sonner"
import { Plus, Trash2 } from "lucide-react"
import { PurchaseOrderApi } from "@/modules/inventory/services/purchase-order-api"
import { SupplierApi } from "@/modules/inventory/services/supplier-api"
import { ProductApi } from "@/modules/inventory/services/product-api"
import { CreatePurchaseOrderRequest, Supplier, Product } from "@/services/types"
import { useFormatting } from "@/hooks/useFormatting"

interface PurchaseOrderItem {
  id: string
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

interface CreatePurchaseOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderCreated?: () => void
  defaultValues?: {
    work_order_id?: number;
    customer_order_id?: number;
    items?: { product_id: number; product_name: string; quantity: number }[];
  }
}

export function CreatePurchaseOrderForm({ open, onOpenChange, onOrderCreated, defaultValues }: CreatePurchaseOrderFormProps) {
  const [formData, setFormData] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    priority: "normal",
    notes: "",
    payment_terms: "Net 30",
    delivery_terms: "FOB Destination",
    department: "",
    project: "",
    work_order_id: defaultValues?.work_order_id?.toString() || "",
    customer_order_id: defaultValues?.customer_order_id?.toString() || ""
  })

  // Initialize items from defaults if provided
  const initialItems = defaultValues?.items && defaultValues.items.length > 0 
    ? defaultValues.items.map((item, index) => ({
        id: (index + 1).toString(),
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: 0,
        total: 0
      }))
    : [{ id: "1", product_id: 0, product_name: "", quantity: 1, unit_price: 0, total: 0 }];

  const [items, setItems] = useState<PurchaseOrderItem[]>(initialItems)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  const { formatCurrency } = useFormatting()

  // Fetch suppliers and products when component mounts
  useEffect(() => {
    if (open) {
      const initForm = async () => {
        let currentProducts = products;
        
        // If products are not loaded yet, fetch them first
        if (currentProducts.length === 0) {
          const result = await fetchData();
          currentProducts = result.products;
        } else {
          // If they are loaded, still fetch fresh data in background
          fetchData();
        }

        if (defaultValues) {
          setFormData(prev => ({
            ...prev,
            work_order_id: defaultValues.work_order_id?.toString() || prev.work_order_id,
            customer_order_id: defaultValues.customer_order_id?.toString() || prev.customer_order_id,
          }));

          if (defaultValues.items && defaultValues.items.length > 0) {
            let firstSupplierId = "";
            const populatedItems = defaultValues.items.map((item, index) => {
              const product = currentProducts.find(p => p.id === item.product_id);
              const unit_price = product?.cost_price || 0;
              
              if (index === 0 && product?.supplier_id) {
                firstSupplierId = product.supplier_id.toString();
              }

              return {
                id: (index + 1).toString(),
                product_id: item.product_id,
                product_name: item.product_name || product?.name || "",
                quantity: item.quantity,
                unit_price: unit_price,
                total: item.quantity * unit_price
              };
            });
            
            setItems(populatedItems);
            
            if (firstSupplierId) {
              setFormData(prev => ({
                ...prev,
                supplier_id: firstSupplierId
              }));
              // Also update the local state if needed for some reason, 
              // but formData is what the Select uses.
            }
          }
        } else {
          setItems([{ id: "1", product_id: 0, product_name: "", quantity: 1, unit_price: 0, total: 0 }]);
        }
      };

      initForm();
    } else {
      // Reset when closed
      setFormData({
        supplier_id: "",
        expected_delivery_date: "",
        priority: "normal",
        notes: "",
        payment_terms: "Net 30",
        delivery_terms: "FOB Destination",
        department: "",
        project: "",
        work_order_id: "",
        customer_order_id: ""
      });
      setItems([{ id: "1", product_id: 0, product_name: "", quantity: 1, unit_price: 0, total: 0 }]);
    }
  }, [open, defaultValues])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [suppliersResponse, productsResponse] = await Promise.all([
        SupplierApi.getSuppliers({ limit: 100 }),
        ProductApi.getProducts({ limit: 100 })
      ])
      
      setSuppliers(suppliersResponse.suppliers)
      setProducts(productsResponse.products)
      return { suppliers: suppliersResponse.suppliers, products: productsResponse.products };
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load suppliers and products', {
        description: 'Please try again later.'
      })
      return { suppliers: [], products: [] };
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form
      if (!formData.supplier_id) {
        toast.error("Please select a supplier")
        setIsSubmitting(false)
        return
      }

      // Validate items
      const validItems = items.filter(item => item.product_id > 0 && item.quantity > 0)
      if (validItems.length === 0) {
        toast.error("Please add at least one item to the purchase order")
        setIsSubmitting(false)
        return
      }

      // Prepare API request
      const createRequest: CreatePurchaseOrderRequest = {
        supplier_id: parseInt(formData.supplier_id),
        expected_delivery_date: formData.expected_delivery_date || new Date().toISOString().split('T')[0],
        priority: formData.priority as any,
        payment_terms: formData.payment_terms,
        delivery_terms: formData.delivery_terms,
        department: formData.department || undefined,
        project: formData.project || undefined,
        notes: formData.notes || undefined,
        work_order_id: formData.work_order_id ? parseInt(formData.work_order_id) : undefined,
        customer_order_id: formData.customer_order_id ? parseInt(formData.customer_order_id) : undefined,
        line_items: validItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      }

      // Create purchase order
      const newPurchaseOrder = await PurchaseOrderApi.createPurchaseOrder(createRequest)
      
      const totalAmount = validItems.reduce((sum, item) => sum + item.total, 0)
      
      toast.success("Purchase order created successfully!", {
        description: `PO ${newPurchaseOrder.po_number} for $${totalAmount.toLocaleString()} has been created.`
      })
      
      // Reset form
      setFormData({
        supplier_id: "",
        expected_delivery_date: "",
        priority: "normal",
        notes: "",
        payment_terms: "Net 30",
        delivery_terms: "FOB Destination",
        department: "",
        project: "",
        work_order_id: defaultValues?.work_order_id?.toString() || "",
        customer_order_id: defaultValues?.customer_order_id?.toString() || ""
      })
      setItems(initialItems)
      
      onOrderCreated?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creating purchase order:', error)
      toast.error("Failed to create purchase order", {
        description: error.message || "Please try again later."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addItem = () => {
    const newId = (items.length + 1).toString()
    setItems(prev => [...prev, { id: newId, product_id: 0, product_name: "", quantity: 1, unit_price: 0, total: 0 }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof PurchaseOrderItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // If product is selected, update product_id and product_name
        if (field === 'product_id' && typeof value === 'number') {
          const product = products.find(p => p.id === value)
          if (product) {
            updated.product_name = product.name
            updated.product_id = value
          }
        }
        
        // Calculate total when quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = updated.quantity * updated.unit_price
        } else if (field === 'product_id' && typeof value === 'number') {
          // If changing product manually, pull unit price from product cost_price
          const product = products.find(p => p.id === value)
          if (product && updated.unit_price === 0) {
            updated.unit_price = product.cost_price || 0;
            updated.total = updated.quantity * updated.unit_price;
          }
        }
        
        return updated
      }
      return item
    }))
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            Create a new purchase order for your supplier. Add items and specify delivery requirements.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select 
                key={`supplier-select-${suppliers.length}`}
                value={formData.supplier_id} 
                onValueChange={(value) => handleInputChange("supplier_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading suppliers..." : "Select supplier"} />
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
              <Label htmlFor="expectedDate">Expected Delivery Date</Label>
              <Input
                id="expectedDate"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => handleInputChange("expected_delivery_date", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={formData.payment_terms}
                onChange={(e) => handleInputChange("payment_terms", e.target.value)}
                placeholder="e.g., Net 30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deliveryTerms">Delivery Terms</Label>
              <Input
                id="deliveryTerms"
                value={formData.delivery_terms}
                onChange={(e) => handleInputChange("delivery_terms", e.target.value)}
                placeholder="e.g., FOB Destination"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
                placeholder="e.g., IT, Operations"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Input
                id="project"
                value={formData.project}
                onChange={(e) => handleInputChange("project", e.target.value)}
                placeholder="e.g., Office Expansion"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Order Items</h3>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select 
                          key={`product-select-${item.id}-${products.length}`}
                          value={item.product_id.toString()} 
                          onValueChange={(value) => updateItem(item.id, "product_id", parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loading ? "Loading products..." : "Select product"} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(item.total)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end">
              <div className="text-lg font-semibold">
                Total: {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes or special instructions"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.supplier_id || loading}>
              {isSubmitting ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}