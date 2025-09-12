import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "@/components/ui/sonner"
import { PurchaseOrderApi } from "@/services/purchase-order-api"
import { PaymentApi } from "@/services/payment-api"
import { PurchaseOrderWithDetails, Invoice } from "@/services/types"
import { CreateInvoiceForm } from "@/components/forms/CreateInvoiceForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Package, 
  User,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Mail
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PurchaseOrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showCreateInvoiceForm, setShowCreateInvoiceForm] = useState(false)

  // Fetch purchase order data
  useEffect(() => {
    if (id) {
      fetchPurchaseOrder()
      fetchInvoices()
    }
  }, [id])

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await PurchaseOrderApi.getPurchaseOrder(parseInt(id!))
      setPurchaseOrder(data)
    } catch (err: any) {
      console.error('Error fetching purchase order:', err)
      setError(err.message || 'Failed to load purchase order')
      toast.error('Failed to load purchase order', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async () => {
    try {
      const data = await PaymentApi.getInvoices({ 
        purchase_order_id: parseInt(id!),
        limit: 100 
      })
      setInvoices(data)
    } catch (err: any) {
      console.error('Error fetching invoices:', err)
      // Don't show error toast for invoices as it's not critical
    }
  }

  const handleInvoiceCreated = (invoice: Invoice) => {
    setInvoices(prev => [...prev, invoice])
    toast.success("Invoice created successfully!", {
      description: `Invoice ${invoice.invoice_number} has been created.`
    })
  }

  const handleDownloadPDF = async () => {
    if (!purchaseOrder) return
    
    try {
      setDownloadingPDF(true)
      await PurchaseOrderApi.downloadPurchaseOrderPDF(purchaseOrder.id, purchaseOrder.po_number)
      toast.success('PDF downloaded successfully', {
        description: `Purchase Order ${purchaseOrder.po_number} has been downloaded.`
      })
    } catch (err: any) {
      console.error('Error downloading PDF:', err)
      toast.error('Failed to download PDF', {
        description: err.message || 'Please try again later.'
      })
    } finally {
      setDownloadingPDF(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-muted text-muted-foreground"
      case "pending": return "bg-warning text-white"
      case "approved": return "bg-primary text-white"
      case "sent": return "bg-info text-white"
      case "partially_received": return "bg-orange-500 text-white"
      case "received": return "bg-success text-white"
      case "cancelled": return "bg-destructive text-white"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-destructive"
      case "medium": return "text-warning"
      case "low": return "text-success"
      default: return "text-muted-foreground"
    }
  }

  // Calculate fulfillment percentage
  const totalReceived = purchaseOrder?.line_items?.reduce((sum, item) => sum + (item.received_quantity || 0), 0) || 0
  const totalOrdered = purchaseOrder?.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  const fulfillmentPercentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="h-8 bg-muted animate-pulse rounded w-48"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-64 mt-2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-4 bg-muted animate-pulse rounded w-20 mb-2"></div>
                <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !purchaseOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
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
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Purchase Order</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchPurchaseOrder}>
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{purchaseOrder.po_number}</h1>
          <p className="text-muted-foreground">Purchase Order Details • {purchaseOrder.supplier_name}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadPDF}
            disabled={downloadingPDF || !purchaseOrder}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email to Supplier
          </Button>
          <Button onClick={() => navigate(`/purchase-orders/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                <Badge className={getStatusColor(purchaseOrder.status)}>
                  {purchaseOrder.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                </div>
                <div className="text-xl font-bold">
                  {purchaseOrder.total_amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: purchaseOrder.currency || 'USD'
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Items</span>
                </div>
                <div className="text-xl font-bold">{purchaseOrder.line_items?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Fulfillment</span>
                </div>
                <div className="text-xl font-bold">{fulfillmentPercentage.toFixed(0)}%</div>
                <Progress value={fulfillmentPercentage} className="mt-2 h-1" />
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.line_items?.map((item) => {
                    const receivedQty = item.received_quantity || 0
                    const pendingQty = item.quantity - receivedQty
                    const totalPrice = item.quantity * item.unit_price
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {item.product_sku || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{item.description || 'No description'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.quantity} {item.unit_of_measure || 'pcs'}</div>
                            {receivedQty > 0 && (
                              <div className="text-xs text-success">Received: {receivedQty}</div>
                            )}
                            {pendingQty > 0 && (
                              <div className="text-xs text-warning">Pending: {pendingQty}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.unit_price.toLocaleString('en-US', {
                            style: 'currency',
                            currency: purchaseOrder.currency || 'USD'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {totalPrice.toLocaleString('en-US', {
                            style: 'currency',
                            currency: purchaseOrder.currency || 'USD'
                          })}
                        </TableCell>
                        <TableCell>
                          {receivedQty === item.quantity ? (
                            <Badge className="bg-success text-white">Received</Badge>
                          ) : receivedQty > 0 ? (
                            <Badge className="bg-orange-500 text-white">Partial</Badge>
                          ) : (
                            <Badge className="bg-warning text-white">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              <Separator className="my-4" />
              
              <div className="flex justify-end">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between gap-8">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      {(purchaseOrder.total_amount * 0.9).toLocaleString('en-US', {
                        style: 'currency',
                        currency: purchaseOrder.currency || 'USD'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span>Tax (10%):</span>
                    <span className="font-medium">
                      {(purchaseOrder.total_amount * 0.1).toLocaleString('en-US', {
                        style: 'currency',
                        currency: purchaseOrder.currency || 'USD'
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-8 text-lg font-bold">
                    <span>Total:</span>
                    <span>
                      {purchaseOrder.total_amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: purchaseOrder.currency || 'USD'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoices
                </div>
                {purchaseOrder.status === 'received' && (
                  <Button 
                    onClick={() => setShowCreateInvoiceForm(true)}
                    size="sm"
                  >
                    Create Invoice
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices created for this purchase order yet.</p>
                  {purchaseOrder.status === 'received' && (
                    <p className="text-sm mt-2">Click "Create Invoice" to generate an invoice.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invoice.invoice_number}</span>
                          <Badge variant={
                            invoice.status === 'paid' ? 'default' :
                            invoice.status === 'partial' ? 'secondary' :
                            invoice.status === 'overdue' ? 'destructive' :
                            'outline'
                          }>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            ${Number(invoice.total_amount).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Outstanding: ${Number(invoice.outstanding_amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Invoice Date:</span> {new Date(invoice.invoice_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                        {invoice.terms && (
                          <div>
                            <span className="font-medium">Terms:</span> {invoice.terms}
                          </div>
                        )}
                        {invoice.notes && (
                          <div className="col-span-2">
                            <span className="font-medium">Notes:</span> {invoice.notes}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/payments?invoice=${invoice.id}`)}
                        >
                          View Details
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/payments?record_payment=${invoice.id}`)}
                          >
                            Record Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchaseOrder.timeline?.map((event, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      event.status === "completed" ? "bg-success" : 
                      event.status === "pending" ? "bg-warning" : "bg-muted"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{event.event}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">by {event.user}</div>
                      {event.description && (
                        <div className="text-xs text-muted-foreground mt-1">{event.description}</div>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4 text-muted-foreground">
                    No timeline events available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {purchaseOrder.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{purchaseOrder.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                <p className="font-medium">{new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected Delivery</label>
                <p className="font-medium">{new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}</p>
              </div>
              {purchaseOrder.actual_delivery_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Actual Delivery</label>
                  <p className="font-medium">{new Date(purchaseOrder.actual_delivery_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <p className={`font-medium capitalize ${getPriorityColor(purchaseOrder.priority)}`}>
                  {purchaseOrder.priority}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
                <p className="font-medium">{purchaseOrder.payment_terms}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Delivery Terms</label>
                <p className="font-medium">{purchaseOrder.delivery_terms}</p>
              </div>
              {purchaseOrder.department && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="font-medium">{purchaseOrder.department}</p>
                </div>
              )}
              {purchaseOrder.project && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <p className="font-medium">{purchaseOrder.project}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Supplier Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company</label>
                <p className="font-medium">{purchaseOrder.supplier_name}</p>
                <p className="text-sm text-muted-foreground">Code: {purchaseOrder.supplier_code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                <p className="font-medium">{purchaseOrder.supplier_contact}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium text-sm">{purchaseOrder.supplier_email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="font-medium">{purchaseOrder.supplier_phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-sm leading-relaxed">{purchaseOrder.supplier_address}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-3"
                onClick={() => navigate(`/suppliers/${purchaseOrder.supplier_id}`)}
              >
                View Supplier Profile
              </Button>
            </CardContent>
          </Card>

          {/* Approval Information */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created By</label>
                <p className="font-medium">{purchaseOrder.created_by}</p>
              </div>
              {purchaseOrder.approved_by && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                    <p className="font-medium">{purchaseOrder.approved_by}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approval Date</label>
                    <p className="font-medium">{new Date(purchaseOrder.approved_date!).toLocaleDateString()}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Package className="w-4 h-4 mr-2" />
                Record Receipt
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Contact Supplier
              </Button>
              {purchaseOrder.status === "draft" && (
                <Button variant="destructive" size="sm" className="w-full">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cancel Order
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Invoice Form */}
      <CreateInvoiceForm
        open={showCreateInvoiceForm}
        onOpenChange={setShowCreateInvoiceForm}
        onInvoiceCreated={handleInvoiceCreated}
        purchaseOrderId={purchaseOrder?.id}
        supplierId={purchaseOrder?.supplier_id}
        totalAmount={purchaseOrder?.total_amount}
        paymentTerms={purchaseOrder?.payment_terms}
      />
    </div>
  )
}