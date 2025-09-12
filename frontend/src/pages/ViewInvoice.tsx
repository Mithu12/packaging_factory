import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Printer,
  Building,
  Calendar,
  CreditCard,
  FileText,
  Package
} from "lucide-react"
import { PaymentApi } from "@/services/payment-api"
import { PurchaseOrderApi } from "@/services/purchase-order-api"
import { InvoiceWithDetails, PurchaseOrderWithDetails } from "@/services/types"

export default function ViewInvoice() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  
  // State management
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null)
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setError("Invoice ID is required")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await PaymentApi.getInvoice(parseInt(invoiceId))
        setInvoice(response)
        
        // If invoice has a purchase order, fetch the purchase order details
        if (response.purchase_order_id) {
          try {
            const poResponse = await PurchaseOrderApi.getPurchaseOrder(response.purchase_order_id)
            setPurchaseOrder(poResponse)
          } catch (poErr: any) {
            console.error('Error fetching purchase order:', poErr)
            // Don't fail the entire page if PO fetch fails
          }
        }
      } catch (err: any) {
        console.error('Error fetching invoice:', err)
        setError(err.message || 'Failed to fetch invoice')
        toast.error('Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [invoiceId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-white"
      case "partial": return "bg-warning text-white"
      case "pending": return "bg-status-pending text-white"
      case "overdue": return "bg-destructive text-white"
      default: return "bg-muted"
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading invoice...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-destructive text-lg font-medium">
            {error || "Invoice not found"}
          </div>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoice {invoice.invoice_number}</h1>
            <p className="text-muted-foreground">
              {invoice.purchase_order ? `Purchase Order: ${invoice.purchase_order.po_number}` : 'No Purchase Order'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{invoice.invoice_number}</h2>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm text-muted-foreground">Invoice Date</div>
                  <div className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Supplier Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Supplier Information
                </h3>
                <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                  <div className="font-medium">{invoice.supplier.name}</div>
                  <div className="text-sm text-muted-foreground">Code: {invoice.supplier.supplier_code}</div>
                  <div className="text-sm text-muted-foreground">ID: {invoice.supplier.id}</div>
                </div>
              </div>

              <Separator />

              {/* Invoice Items */}
              <div>
                <h3 className="font-semibold mb-3">Invoice Items</h3>
                {purchaseOrder && purchaseOrder.line_items && purchaseOrder.line_items.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrder.line_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  SKU: {item.product_sku}
                                </div>
                                {item.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(item.quantity)} {item.unit_of_measure}
                            </TableCell>
                            <TableCell className="text-right">
                              ${Number(item.unit_price).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${Number(item.total_price).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="bg-accent/50 p-4 rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No product details available</p>
                      {!invoice.purchase_order_id && (
                        <p className="text-sm">This invoice was created without a purchase order</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span>${Number(invoice.total_amount).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Invoice Total:</span>
                      <span>${Number(invoice.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">${Number(invoice.total_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span className="font-medium text-success">${Number(invoice.paid_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-medium text-warning">${Number(invoice.outstanding_amount).toLocaleString()}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Payment Terms:</div>
                <div className="font-medium">{invoice.terms || 'Not specified'}</div>
              </div>

              {Number(invoice.outstanding_amount) > 0 && (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => navigate(`/payments/record?invoice_id=${invoice.id}`)}
                >
                  Record Payment
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Until Due:</span>
                <span className="font-medium">
                  {Math.ceil((new Date(invoice.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}