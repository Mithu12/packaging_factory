import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Save, 
  Package, 
  CheckCircle,
  AlertTriangle,
  Truck,
  FileText,
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

export default function ReceiveGoods() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Mock PO data
  const purchaseOrder = {
    id: "PO-2024-045",
    supplier: "ABC Electronics Ltd",
    orderDate: "2024-03-10",
    expectedDelivery: "2024-03-17"
  }

  const [receiptData, setReceiptData] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    deliveryNote: "",
    receivedBy: "Current User",
    notes: "",
    transportCompany: "",
    trackingNumber: ""
  })

  const [lineItems, setLineItems] = useState([
    {
      id: 1,
      productSku: "LPT-001",
      productName: "Business Laptop Model X",
      orderedQty: 20,
      receivedQty: 20,
      unitPrice: 850,
      unit: "pcs",
      condition: "good",
      notes: ""
    },
    {
      id: 2,
      productSku: "MON-205",
      productName: "24-inch LED Monitor",
      orderedQty: 25,
      receivedQty: 23,
      unitPrice: 180,
      unit: "pcs",
      condition: "good",
      notes: "2 units damaged during transit"
    },
    {
      id: 3,
      productSku: "KBD-301",
      productName: "Wireless Keyboard & Mouse Set",
      orderedQty: 30,
      receivedQty: 30,
      unitPrice: 45,
      unit: "sets",
      condition: "good",
      notes: ""
    },
    {
      id: 4,
      productSku: "CAB-102",
      productName: "USB-C Hub Premium",
      orderedQty: 35,
      receivedQty: 0,
      unitPrice: 65,
      unit: "pcs",
      condition: "not_received",
      notes: "Item not delivered - backorder"
    }
  ])

  const handleInputChange = (field: string, value: string) => {
    setReceiptData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!receiptData.receivedDate || !receiptData.receivedBy) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    // Check if total received quantity is valid
    const hasInvalidQuantities = lineItems.some(item => 
      item.receivedQty < 0 || item.receivedQty > item.orderedQty
    )

    if (hasInvalidQuantities) {
      toast({
        title: "Invalid Quantities",
        description: "Received quantities cannot be negative or exceed ordered quantities.",
        variant: "destructive"
      })
      return
    }

    // In a real app, send data to API
    console.log("Recording goods receipt:", {
      purchaseOrderId: id,
      receiptData,
      lineItems,
      totals: {
        totalOrdered: lineItems.reduce((sum, item) => sum + item.orderedQty, 0),
        totalReceived: lineItems.reduce((sum, item) => sum + item.receivedQty, 0),
        receivedValue: lineItems.reduce((sum, item) => sum + (item.receivedQty * item.unitPrice), 0)
      }
    })
    
    toast({
      title: "Goods Receipt Recorded",
      description: "Goods receipt has been recorded and inventory updated."
    })
    
    navigate(`/purchase-orders/${id}`)
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "good": return "bg-success text-white"
      case "damaged": return "bg-destructive text-white"
      case "partial": return "bg-warning text-white"
      case "not_received": return "bg-muted text-muted-foreground"
      default: return "bg-muted"
    }
  }

  const totalOrdered = lineItems.reduce((sum, item) => sum + item.orderedQty, 0)
  const totalReceived = lineItems.reduce((sum, item) => sum + item.receivedQty, 0)
  const receivedValue = lineItems.reduce((sum, item) => sum + (item.receivedQty * item.unitPrice), 0)
  const fulfillmentPercentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0

  const hasDiscrepancies = lineItems.some(item => item.receivedQty !== item.orderedQty)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/purchase-orders/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Receive Goods</h1>
          <p className="text-muted-foreground">Record goods receipt for {purchaseOrder.id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Receipt Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Receipt Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-accent/20 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">PO Number:</span>
                      <div className="font-medium">{purchaseOrder.id}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supplier:</span>
                      <div className="font-medium">{purchaseOrder.supplier}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected Date:</span>
                      <div className="font-medium">{purchaseOrder.expectedDelivery}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="receivedDate">Received Date *</Label>
                    <Input
                      id="receivedDate"
                      type="date"
                      value={receiptData.receivedDate}
                      onChange={(e) => handleInputChange("receivedDate", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="receivedBy">Received By *</Label>
                    <Input
                      id="receivedBy"
                      value={receiptData.receivedBy}
                      onChange={(e) => handleInputChange("receivedBy", e.target.value)}
                      placeholder="Enter receiver name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryNote">Delivery Note #</Label>
                    <Input
                      id="deliveryNote"
                      value={receiptData.deliveryNote}
                      onChange={(e) => handleInputChange("deliveryNote", e.target.value)}
                      placeholder="Enter delivery note number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transportCompany">Transport Company</Label>
                    <Input
                      id="transportCompany"
                      value={receiptData.transportCompany}
                      onChange={(e) => handleInputChange("transportCompany", e.target.value)}
                      placeholder="Enter transport company"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    value={receiptData.trackingNumber}
                    onChange={(e) => handleInputChange("trackingNumber", e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Receipt Notes</Label>
                  <Textarea
                    id="notes"
                    value={receiptData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Enter any notes about the delivery condition, discrepancies, etc."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Discrepancy Warning */}
            {hasDiscrepancies && (
              <Card className="border-warning">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <div className="font-medium text-warning">Quantity Discrepancies Detected</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Some items have different received quantities than ordered. Please review and add notes for any discrepancies.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Items to Receive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-muted-foreground">SKU: {item.productSku}</div>
                            <div className="text-xs text-muted-foreground">${item.unitPrice} per {item.unit}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.orderedQty} {item.unit}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.orderedQty}
                            value={item.receivedQty}
                            onChange={(e) => handleLineItemChange(index, "receivedQty", parseInt(e.target.value) || 0)}
                            className="w-24"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            Value: ${(item.receivedQty * item.unitPrice).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            value={item.condition}
                            onChange={(e) => handleLineItemChange(index, "condition", e.target.value)}
                            className="w-full p-2 border rounded-md bg-background"
                          >
                            <option value="good">Good Condition</option>
                            <option value="damaged">Damaged</option>
                            <option value="partial">Partially Received</option>
                            <option value="not_received">Not Received</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.notes}
                            onChange={(e) => handleLineItemChange(index, "notes", e.target.value)}
                            placeholder="Add notes..."
                            className="w-full"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Receipt Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Receipt Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-2xl font-bold">{fulfillmentPercentage.toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Fulfillment Rate</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Ordered:</span>
                    <span className="font-medium">{totalOrdered} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Received:</span>
                    <span className="font-medium">{totalReceived} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending:</span>
                    <span className="font-medium">{totalOrdered - totalReceived} items</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Received Value:</span>
                    <span>${receivedValue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Item Status */}
            <Card>
              <CardHeader>
                <CardTitle>Item Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lineItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-accent/20 rounded">
                      <div className="text-sm">
                        <div className="font-medium">{item.productSku}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.receivedQty}/{item.orderedQty} {item.unit}
                        </div>
                      </div>
                      <Badge className={getConditionColor(item.condition)}>
                        {item.condition === "good" ? "Good" :
                         item.condition === "damaged" ? "Damaged" :
                         item.condition === "partial" ? "Partial" : "Not Received"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Record Receipt
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

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setLineItems(prev => prev.map(item => ({ ...item, receivedQty: item.orderedQty })))
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Receive All
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setLineItems(prev => prev.map(item => ({ ...item, receivedQty: 0 })))
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}