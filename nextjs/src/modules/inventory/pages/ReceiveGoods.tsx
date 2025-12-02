"use client";

﻿import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { PurchaseOrderApi } from "@/modules/inventory/services/purchase-order-api"
import { PurchaseOrderWithDetails } from "@/services/types"
import { Loader2 } from "lucide-react"
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
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0]
  const router = useRouter()
  const { toast } = useToast()

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [receiptData, setReceiptData] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    deliveryNote: "",
    receivedBy: "Current User",
    notes: "",
    transportCompany: "",
    trackingNumber: ""
  })

  const [lineItems, setLineItems] = useState<Array<{
    id: number
    productSku: string
    productName: string
    orderedQty: number
    receivedQty: number
    alreadyReceivedQty: number
    additionalQty: number
    unitPrice: number
    unit: string
    condition: string
    notes: string
  }>>([])

  // Fetch purchase order data
  useEffect(() => {
    if (id) {
      fetchPurchaseOrder()
    }
  }, [id])

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await PurchaseOrderApi.getPurchaseOrder(parseInt(id!))
      setPurchaseOrder(data)
      
      // Initialize line items from purchase order data
      if (data.line_items) {
        const items = data.line_items.map(item => ({
          id: item.id,
          productSku: item.product_sku,
          productName: item.product_name,
          orderedQty: parseFloat(item.quantity.toString()),
          receivedQty: parseFloat(item.received_quantity.toString()),
          alreadyReceivedQty: parseFloat(item.received_quantity.toString()),
          additionalQty: 0, // Start with 0 additional quantity to receive
          unitPrice: parseFloat(item.unit_price.toString()),
          unit: item.unit_of_measure,
          condition: "good",
          notes: ""
        }))
        setLineItems(items)
      }
    } catch (err: any) {
      console.error('Error fetching purchase order:', err)
      setError(err.message || 'Failed to load purchase order')
      toast({
        title: "Error",
        description: "Failed to load purchase order details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setReceiptData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Check if additional received quantity is valid
    const hasInvalidQuantities = lineItems.some(item => {
      const totalAfterReceipt = item.alreadyReceivedQty + item.additionalQty
      return item.additionalQty < 0 || totalAfterReceipt > item.orderedQty
    })

    if (hasInvalidQuantities) {
      toast({
        title: "Invalid Quantities",
        description: "Received quantities cannot be negative or exceed ordered quantities.",
        variant: "destructive"
      })
      return
    }

    try {
      setSubmitting(true)
      
      // Prepare data for API - only send items with additional quantity > 0
      const receiveData = {
        line_items: lineItems
          .filter(item => item.additionalQty > 0)
          .map(item => ({
            line_item_id: item.id,
            received_quantity: item.additionalQty
          })),
        received_date: receiptData.receivedDate,
        notes: receiptData.notes || `Received by ${receiptData.receivedBy}. ${receiptData.deliveryNote ? `Delivery Note: ${receiptData.deliveryNote}` : ''}`
      }

      // Call the API to receive goods
      await PurchaseOrderApi.receiveGoods(parseInt(id!), receiveData)
      
      toast({
        title: "Goods Receipt Recorded",
        description: "Goods receipt has been recorded and inventory updated."
      })
      
      router.push(`/purchase-orders/${id}`)
    } catch (err: any) {
      console.error('Error recording goods receipt:', err)
      toast({
        title: "Error",
        description: err.message || "Failed to record goods receipt",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
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
  const totalAlreadyReceived = lineItems.reduce((sum, item) => sum + item.alreadyReceivedQty, 0)
  const totalAdditionalToReceive = lineItems.reduce((sum, item) => sum + item.additionalQty, 0)
  const totalAfterReceipt = totalAlreadyReceived + totalAdditionalToReceive
  const additionalValue = lineItems.reduce((sum, item) => sum + (item.additionalQty * item.unitPrice), 0)
  const fulfillmentPercentage = totalOrdered > 0 ? (totalAfterReceipt / totalOrdered) * 100 : 0

  const hasDiscrepancies = lineItems.some(item => (item.alreadyReceivedQty + item.additionalQty) !== item.orderedQty)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading purchase order details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !purchaseOrder) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Purchase Order</h1>
          <p className="text-muted-foreground">{error || "Purchase order not found"}</p>
          <Button 
            onClick={() => router.push('/purchase-orders')} 
            className="mt-4"
          >
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/purchase-orders/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Receive Goods</h1>
          <p className="text-muted-foreground">Record goods receipt for {purchaseOrder.po_number}</p>
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
                      <div className="font-medium">{purchaseOrder.po_number}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supplier:</span>
                      <div className="font-medium">{purchaseOrder.supplier_name}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected Date:</span>
                      <div className="font-medium">{new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}</div>
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
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              Already received: {item.alreadyReceivedQty} {item.unit}
                            </div>
                            <Input
                              type="number"
                              min="0"
                              max={item.orderedQty - item.alreadyReceivedQty}
                              value={item.additionalQty}
                              onChange={(e) => handleLineItemChange(index, "additionalQty", parseInt(e.target.value) || 0)}
                              className="w-24"
                              placeholder="Additional"
                            />
                            <div className="text-xs text-muted-foreground">
                              Total after: {item.alreadyReceivedQty + item.additionalQty} {item.unit}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Value: ${(item.additionalQty * item.unitPrice).toLocaleString()}
                            </div>
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
                    <span className="text-muted-foreground">Already Received:</span>
                    <span className="font-medium">{totalAlreadyReceived} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional to Receive:</span>
                    <span className="font-medium">{totalAdditionalToReceive} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total After Receipt:</span>
                    <span className="font-medium">{totalAfterReceipt} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-medium">{totalOrdered - totalAfterReceipt} items</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Additional Value:</span>
                    <span>${additionalValue.toLocaleString()}</span>
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
                          {item.alreadyReceivedQty + item.additionalQty}/{item.orderedQty} {item.unit}
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
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Record Receipt
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/purchase-orders/${id}`)}
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