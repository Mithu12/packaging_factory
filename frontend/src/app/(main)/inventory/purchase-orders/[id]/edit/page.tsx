"use client";

﻿import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/sonner"
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Package, 
  Plus,
  Trash2,
  User,
  Calculator,
  Loader2
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PurchaseOrderApi } from "@/modules/inventory/services/purchase-order-api"
import { SupplierApi } from "@/modules/inventory/services/supplier-api"
import { ProductApi } from "@/modules/inventory/services/product-api"
import { PurchaseOrderWithDetails, Supplier, Product, UpdatePurchaseOrderRequest } from "@/services/types"

interface LineItem {
  id: number | string
  product_id: number
  product_sku: string
  product_name: string
  description?: string
  quantity: number
  unit_price: number
  unit_of_measure?: string
}

export default function EditPurchaseOrder() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0]
  const router = useRouter()

  // State management
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderWithDetails | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [formData, setFormData] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    priority: "normal",
    payment_terms: "Net 30",
    delivery_terms: "FOB Destination",
    department: "",
    project: "",
    notes: "",
    currency: "USD"
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Fetch data on component mount
  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch purchase order, suppliers, and products in parallel
      const [poResponse, suppliersResponse, productsResponse] = await Promise.all([
        PurchaseOrderApi.getPurchaseOrder(parseInt(id!)),
        SupplierApi.getSuppliers({ limit: 100 }),
        ProductApi.getProducts({ limit: 100 })
      ])

      setPurchaseOrder(poResponse)
      setSuppliers(suppliersResponse.suppliers)
      setProducts(productsResponse.products)

      // Populate form data
      setFormData({
        supplier_id: poResponse.supplier_id.toString(),
        expected_delivery_date: poResponse.expected_delivery_date.split('T')[0],
        priority: poResponse.priority,
        payment_terms: poResponse.payment_terms,
        delivery_terms: poResponse.delivery_terms,
        department: poResponse.department || "",
        project: poResponse.project || "",
        notes: poResponse.notes || "",
        currency: poResponse.currency || "USD"
      })

      // Populate line items
      setLineItems(poResponse.line_items?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_sku: item.product_sku || "",
        product_name: item.product_name,
        description: item.description || "",
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_of_measure: item.unit_of_measure || "pcs"
      })) || [])

    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load purchase order')
      toast.error('Failed to load purchase order', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now(),
      product_id: 0,
      product_sku: "",
      product_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      unit_of_measure: "pcs"
    }
    setLineItems(prev => [...prev, newItem])
  }

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.1 // 10% tax
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax(subtotal)
    return subtotal + tax
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.supplier_id || !formData.expected_delivery_date) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields."
      })
      return
    }

    if (lineItems.length === 0) {
      toast.error("No Items", {
        description: "Please add at least one item to the purchase order."
      })
      return
    }

    // Check if all line items have required fields
    const invalidItems = lineItems.some(item => 
      !item.product_sku || !item.product_name || item.quantity <= 0 || item.unit_price <= 0
    )

    if (invalidItems) {
      toast.error("Invalid Items", {
        description: "Please ensure all items have valid SKU, name, quantity, and price."
      })
      return
    }

    try {
      setSaving(true)

      // Prepare update data
      const updateData: UpdatePurchaseOrderRequest = {
        supplier_id: parseInt(formData.supplier_id),
        expected_delivery_date: formData.expected_delivery_date,
        priority: formData.priority as 'low' | 'normal' | 'high' | 'urgent',
        payment_terms: formData.payment_terms,
        delivery_terms: formData.delivery_terms,
        department: formData.department || undefined,
        project: formData.project || undefined,
        notes: formData.notes || undefined,
        line_items: lineItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          description: item.description || undefined,
          unit_of_measure: item.unit_of_measure || undefined
        }))
      }

      // Update purchase order
      await PurchaseOrderApi.updatePurchaseOrder(parseInt(id!), updateData)
      
      toast.success("Purchase Order Updated", {
        description: "Purchase order has been updated successfully."
      })
      
      router.push(`/inventory/purchase-orders/${id}`)
    } catch (err: any) {
      console.error('Error updating purchase order:', err)
      toast.error("Failed to Update Purchase Order", {
        description: err.message || 'Please try again later.'
      })
    } finally {
      setSaving(false)
    }
  }

  // Loading and error states
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/purchase-orders/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="h-8 bg-muted animate-pulse rounded w-48"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-64 mt-2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-4 bg-muted animate-pulse rounded w-20 mb-2"></div>
                  <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !purchaseOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/purchase-orders/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Purchase Order Not Found</h1>
            <p className="text-muted-foreground">The requested purchase order could not be loaded.</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Error Loading Purchase Order</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchData}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/inventory/purchase-orders/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Purchase Order</h1>
          <p className="text-muted-foreground">Update purchase order information and line items • {purchaseOrder.po_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Purchase Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
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
                  <div>
                    <Label htmlFor="expectedDelivery">Expected Delivery *</Label>
                    <Input
                      id="expectedDelivery"
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => handleInputChange("expected_delivery_date", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
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
                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select value={formData.payment_terms} onValueChange={(value) => handleInputChange("payment_terms", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 45">Net 45</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                    <Select value={formData.delivery_terms} onValueChange={(value) => handleInputChange("delivery_terms", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOB Origin">FOB Origin</SelectItem>
                        <SelectItem value="FOB Destination">FOB Destination</SelectItem>
                        <SelectItem value="CIF">CIF</SelectItem>
                        <SelectItem value="DDP">DDP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      placeholder="Enter department"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project">Project</Label>
                    <Input
                      id="project"
                      value={formData.project}
                      onChange={(e) => handleInputChange("project", e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Enter any additional notes or special instructions"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Items
                  </CardTitle>
                  <Button type="button" onClick={addLineItem} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        {lineItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label>Product SKU</Label>
                          <Select 
                            value={item.product_sku} 
                            onValueChange={(value) => {
                              const product = products.find(p => p.sku === value)
                              handleLineItemChange(index, "product_sku", value)
                              if (product) {
                                handleLineItemChange(index, "product_id", product.id)
                                handleLineItemChange(index, "product_name", product.name)
                                handleLineItemChange(index, "unit_price", product.cost_price)
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.sku} value={product.sku}>
                                  {product.sku} - {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Product Name</Label>
                          <Input
                            value={item.product_name}
                            onChange={(e) => handleLineItemChange(index, "product_name", e.target.value)}
                            placeholder="Enter product name"
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, "quantity", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                          placeholder="Enter item description"
                        />
                      </div>
                      
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">Line Total: </span>
                        <span className="font-medium">${(item.quantity * item.unit_price).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="space-y-2 text-right min-w-64">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">${calculateSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (10%):</span>
                      <span className="font-medium">${calculateTax(calculateSubtotal()).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-medium">{lineItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Quantity:</span>
                  <span className="font-medium">
                    {lineItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">${calculateTax(calculateSubtotal()).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${calculateTotal().toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Supplier Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Selected Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {suppliers.find(s => s.id.toString() === formData.supplier_id)?.name || 'No supplier selected'}
                  </p>
                  <p className="text-sm text-muted-foreground">Payment Terms: {formData.payment_terms}</p>
                  <p className="text-sm text-muted-foreground">Delivery Terms: {formData.delivery_terms}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => {
                      const supplier = suppliers.find(s => s.id.toString() === formData.supplier_id)
                      if (supplier) {
                        router.push(`/inventory/suppliers/${supplier.id}`)
                      }
                    }}
                  >
                    View Supplier Details
                  </Button>
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
                  onClick={() => router.push(`/inventory/purchase-orders/${id}`)}
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