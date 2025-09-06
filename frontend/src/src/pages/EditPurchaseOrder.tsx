import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Package, 
  Plus,
  Trash2,
  User,
  Calculator
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function EditPurchaseOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Mock PO data - in real app, fetch by ID
  const [formData, setFormData] = useState({
    supplier: "ABC Electronics Ltd",
    orderDate: "2024-03-10",
    expectedDelivery: "2024-03-17",
    priority: "medium",
    paymentTerms: "Net 30",
    deliveryTerms: "FOB Destination",
    department: "IT Equipment",
    project: "Office Expansion 2024",
    notes: "Urgent order for Q1 inventory replenishment. Please ensure all items are properly packaged.",
    currency: "USD"
  })

  const [lineItems, setLineItems] = useState([
    {
      id: 1,
      productSku: "LPT-001",
      productName: "Business Laptop Model X",
      description: "High-performance business laptop with Intel i7 processor",
      quantity: 20,
      unitPrice: 850,
      unit: "pcs"
    },
    {
      id: 2,
      productSku: "MON-205",
      productName: "24-inch LED Monitor",
      description: "Full HD LED monitor with adjustable stand",
      quantity: 25,
      unitPrice: 180,
      unit: "pcs"
    },
    {
      id: 3,
      productSku: "KBD-301",
      productName: "Wireless Keyboard & Mouse Set",
      description: "Ergonomic wireless keyboard and mouse combo",
      quantity: 30,
      unitPrice: 45,
      unit: "sets"
    }
  ])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const addLineItem = () => {
    const newItem = {
      id: Date.now(),
      productSku: "",
      productName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      unit: "pcs"
    }
    setLineItems(prev => [...prev, newItem])
  }

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.1 // 10% tax
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax(subtotal)
    return subtotal + tax
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.supplier || !formData.orderDate || !formData.expectedDelivery) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    if (lineItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item to the purchase order.",
        variant: "destructive"
      })
      return
    }

    // Check if all line items have required fields
    const invalidItems = lineItems.some(item => 
      !item.productSku || !item.productName || item.quantity <= 0 || item.unitPrice <= 0
    )

    if (invalidItems) {
      toast({
        title: "Invalid Items",
        description: "Please ensure all items have valid SKU, name, quantity, and price.",
        variant: "destructive"
      })
      return
    }

    // In a real app, send data to API
    console.log("Updating purchase order:", {
      id,
      ...formData,
      lineItems,
      totals: {
        subtotal: calculateSubtotal(),
        tax: calculateTax(calculateSubtotal()),
        total: calculateTotal()
      }
    })
    
    toast({
      title: "Purchase Order Updated",
      description: "Purchase order has been updated successfully."
    })
    
    navigate(`/purchase-orders/${id}`)
  }

  const suppliers = [
    { value: "ABC Electronics Ltd", label: "ABC Electronics Ltd" },
    { value: "TechSupply Co", label: "TechSupply Co" },
    { value: "Office Furniture Pro", label: "Office Furniture Pro" },
    { value: "Global Raw Materials Inc", label: "Global Raw Materials Inc" }
  ]

  const products = [
    { sku: "LPT-001", name: "Business Laptop Model X", price: 850 },
    { sku: "MON-205", name: "24-inch LED Monitor", price: 180 },
    { sku: "KBD-301", name: "Wireless Keyboard & Mouse Set", price: 45 },
    { sku: "CAB-102", name: "USB-C Hub Premium", price: 65 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/purchase-orders/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Purchase Order</h1>
          <p className="text-muted-foreground">Update purchase order information and line items</p>
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
                  <div>
                    <Label htmlFor="orderDate">Order Date *</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => handleInputChange("orderDate", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expectedDelivery">Expected Delivery *</Label>
                    <Input
                      id="expectedDelivery"
                      type="date"
                      value={formData.expectedDelivery}
                      onChange={(e) => handleInputChange("expectedDelivery", e.target.value)}
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
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select value={formData.paymentTerms} onValueChange={(value) => handleInputChange("paymentTerms", value)}>
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
                    <Select value={formData.deliveryTerms} onValueChange={(value) => handleInputChange("deliveryTerms", value)}>
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
                            value={item.productSku} 
                            onValueChange={(value) => {
                              const product = products.find(p => p.sku === value)
                              handleLineItemChange(index, "productSku", value)
                              if (product) {
                                handleLineItemChange(index, "productName", product.name)
                                handleLineItemChange(index, "unitPrice", product.price)
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
                            value={item.productName}
                            onChange={(e) => handleLineItemChange(index, "productName", e.target.value)}
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
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
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
                        <span className="font-medium">${(item.quantity * item.unitPrice).toLocaleString()}</span>
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
                  <p className="font-medium">{formData.supplier}</p>
                  <p className="text-sm text-muted-foreground">Payment Terms: {formData.paymentTerms}</p>
                  <p className="text-sm text-muted-foreground">Delivery Terms: {formData.deliveryTerms}</p>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    View Supplier Details
                  </Button>
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
                  onClick={() => navigate(`/purchase-orders/${id}`)}
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