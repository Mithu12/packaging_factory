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
  Package,
  History,
  Clock,
  User,
  DollarSign
} from "lucide-react"
import { PaymentApi } from "@/modules/sales/services/payment-api"
import { PurchaseOrderApi } from "@/modules/inventory/services/purchase-order-api"
import { InvoiceWithDetails, PurchaseOrderWithDetails } from "@/services/types"
import jsPDF from 'jspdf'

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

  // PDF Generation Functions
  const generateInvoicePDF = () => {
    if (!invoice) return null

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = margin

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      const maxWidth = pageWidth - x - margin
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y, options)
      return y + (lines.length * (options.lineHeight || 7))
    }

    // Helper function to add line
    const addLine = (y: number) => {
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      return y + 5
    }

    // Header
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('INVOICE', pageWidth - 60, yPosition, { align: 'right' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    yPosition = addText(invoice.invoice_number, pageWidth - 60, yPosition, { align: 'right' })
    yPosition += 10

    // Company Info (Left side)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Your Company Name', margin, yPosition)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    yPosition = addText('123 Business Street', margin, yPosition)
    yPosition = addText('Business City, BC 12345', margin, yPosition)
    yPosition = addText('Phone: (555) 123-4567', margin, yPosition)
    yPosition = addText('Email: billing@company.com', margin, yPosition)

    // Invoice Details (Right side)
    const rightX = pageWidth - 80
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    let rightY = margin + 20
    rightY = addText('Invoice Date:', rightX, rightY)
    rightY = addText(new Date(invoice.invoice_date).toLocaleDateString(), rightX + 30, rightY - 7)
    
    rightY = addText('Due Date:', rightX, rightY)
    rightY = addText(new Date(invoice.due_date).toLocaleDateString(), rightX + 30, rightY - 7)
    
    rightY = addText('Invoice #:', rightX, rightY)
    rightY = addText(invoice.invoice_number, rightX + 30, rightY - 7)
    
    if (invoice.purchase_order) {
      rightY = addText('PO #:', rightX, rightY)
      rightY = addText(invoice.purchase_order.po_number, rightX + 30, rightY - 7)
    }

    yPosition = Math.max(yPosition, rightY) + 20

    // Bill To Section
    yPosition = addLine(yPosition)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Bill To:', margin, yPosition)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    yPosition = addText(invoice.supplier.name, margin, yPosition)
    yPosition = addText(`Code: ${invoice.supplier.supplier_code}`, margin, yPosition)
    yPosition += 10

    // Items Table
    yPosition = addLine(yPosition)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    
    // Table Headers
    const col1 = margin
    const col2 = pageWidth - 120
    const col3 = pageWidth - 80
    const col4 = pageWidth - 40
    
    yPosition = addText('Description', col1, yPosition)
    doc.text('Qty', col2, yPosition - 7)
    doc.text('Price', col3, yPosition - 7)
    doc.text('Total', col4, yPosition - 7)
    
    yPosition = addLine(yPosition)
    doc.setFont('helvetica', 'normal')

    // Table Rows
    if (purchaseOrder && purchaseOrder.line_items && purchaseOrder.line_items.length > 0) {
      purchaseOrder.line_items.forEach((item) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage()
          yPosition = margin
        }

        // Product name and description
        let productText = `${item.product_name}\nSKU: ${item.product_sku}`
        if (item.description) {
          productText += `\n${item.description}`
        }
        
        yPosition = addText(productText, col1, yPosition, { lineHeight: 5 })
        
        // Quantity, price, and total
        const itemY = yPosition - (productText.split('\n').length * 5)
        doc.text(`${Number(item.quantity)} ${item.unit_of_measure}`, col2, itemY)
        doc.text(`$${Number(item.unit_price).toLocaleString()}`, col3, itemY)
        doc.text(`$${Number(item.total_price).toLocaleString()}`, col4, itemY)
        
        yPosition += 5
      })
    } else {
      yPosition = addText('No items available', col1, yPosition)
    }

    yPosition += 10

    // Totals
    yPosition = addLine(yPosition)
    const totalsX = pageWidth - 80
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', totalsX, yPosition)
    doc.text(`$${Number(invoice.total_amount).toLocaleString()}`, totalsX + 30, yPosition)
    
    yPosition += 7
    doc.text('Tax:', totalsX, yPosition)
    doc.text('$0.00', totalsX + 30, yPosition)
    
    yPosition += 7
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', totalsX, yPosition)
    doc.text(`$${Number(invoice.total_amount).toLocaleString()}`, totalsX + 30, yPosition)

    yPosition += 20

    // Payment Information
    yPosition = addLine(yPosition)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    yPosition = addText('Payment Information:', margin, yPosition)
    yPosition = addText(`Status: ${invoice.status.toUpperCase()}`, margin, yPosition)
    yPosition = addText(`Paid Amount: $${Number(invoice.paid_amount).toLocaleString()}`, margin, yPosition)
    yPosition = addText(`Outstanding: $${Number(invoice.outstanding_amount).toLocaleString()}`, margin, yPosition)
    
    if (invoice.terms) {
      yPosition = addText(`Payment Terms: ${invoice.terms}`, margin, yPosition)
    }

    if (invoice.notes) {
      yPosition += 10
      yPosition = addText('Notes:', margin, yPosition)
      yPosition = addText(invoice.notes, margin, yPosition)
    }

    return doc
  }

  const handleDownloadPDF = () => {
    const doc = generateInvoicePDF()
    if (doc && invoice) {
      doc.save(`invoice-${invoice.invoice_number}.pdf`)
      toast.success('Invoice PDF downloaded successfully')
    }
  }

  const handlePrintPDF = () => {
    const doc = generateInvoicePDF()
    if (doc && invoice) {
      // Open PDF in new window for printing
      const pdfDataUri = doc.output('datauristring')
      const printWindow = window.open()
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice ${invoice.invoice_number}</title>
            </head>
            <body style="margin: 0; padding: 0;">
              <iframe src="${pdfDataUri}" style="width: 100%; height: 100vh; border: none;"></iframe>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
        toast.success('Invoice sent to printer')
      }
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
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrintPDF}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" disabled>
            <Mail className="w-4 h-4 mr-2" />
            Email
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

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payment_history && invoice.payment_history.length > 0 ? (
                <div className="space-y-4">
                  {invoice.payment_history.map((history, index) => (
                    <div key={history.id} className="flex items-start gap-3 p-3 bg-accent/30 rounded-lg">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{history.event}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(history.created_at).toLocaleDateString()} {new Date(history.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {history.description && (
                          <p className="text-sm text-muted-foreground mt-1">{history.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {history.payment_number && (
                            <div className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              <span>Payment: {history.payment_number}</span>
                            </div>
                          )}
                          {history.user_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>By: {history.user_name}</span>
                            </div>
                          )}
                          {history.new_value && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>Amount: ${Number(history.new_value).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        {history.old_value && history.new_value && (
                          <div className="mt-2 text-xs">
                            <span className="text-muted-foreground">Changed from </span>
                            <span className="font-medium">${Number(history.old_value).toLocaleString()}</span>
                            <span className="text-muted-foreground"> to </span>
                            <span className="font-medium">${Number(history.new_value).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-sm">No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments List */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payments Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{payment.payment_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                          {payment.reference && (
                            <div className="text-xs text-muted-foreground">
                              Ref: {payment.reference}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-success">
                          ${Number(payment.amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}