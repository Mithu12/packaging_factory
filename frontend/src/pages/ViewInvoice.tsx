import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Printer,
  Building,
  Calendar,
  CreditCard,
  FileText
} from "lucide-react"

export default function ViewInvoice() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  
  // Mock invoice data - in real app, fetch based on invoiceId
  const invoice = {
    id: "INV-2024-001",
    supplier: {
      name: "ABC Electronics Ltd",
      address: "123 Business Park, Tech City, TC 12345",
      email: "billing@abcelectronics.com",
      phone: "+1 (555) 123-4567"
    },
    poNumber: "PO-2024-001",
    invoiceDate: "2024-01-16",
    dueDate: "2024-02-15",
    amount: 12500.00,
    paidAmount: 7500.00,
    outstandingAmount: 5000.00,
    status: "partial",
    terms: "Net 30",
    items: [
      { description: "Electronic Components - Set A", quantity: 50, unitPrice: 150.00, total: 7500.00 },
      { description: "Circuit Boards - Type B", quantity: 25, unitPrice: 200.00, total: 5000.00 }
    ],
    subtotal: 12500.00,
    tax: 0,
    total: 12500.00
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-white"
      case "partial": return "bg-warning text-white"
      case "pending": return "bg-status-pending text-white"
      case "overdue": return "bg-destructive text-white"
      default: return "bg-muted"
    }
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
            <h1 className="text-3xl font-bold text-foreground">Invoice {invoice.id}</h1>
            <p className="text-muted-foreground">Purchase Order: {invoice.poNumber}</p>
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
                      <h2 className="text-2xl font-bold">{invoice.id}</h2>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm text-muted-foreground">Invoice Date</div>
                  <div className="font-medium">{invoice.invoiceDate}</div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className="font-medium">{invoice.dueDate}</div>
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
                  <div className="text-sm text-muted-foreground">{invoice.supplier.address}</div>
                  <div className="text-sm text-muted-foreground">{invoice.supplier.email}</div>
                  <div className="text-sm text-muted-foreground">{invoice.supplier.phone}</div>
                </div>
              </div>

              <Separator />

              {/* Invoice Items */}
              <div>
                <h3 className="font-semibold mb-3">Invoice Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-accent/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium">Qty</th>
                        <th className="text-right p-3 font-medium">Unit Price</th>
                        <th className="text-right p-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right font-medium">${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${invoice.tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>${invoice.total.toFixed(2)}</span>
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
                  <span className="font-medium">${invoice.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span className="font-medium text-success">${invoice.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-medium text-warning">${invoice.outstandingAmount.toFixed(2)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Payment Terms:</div>
                <div className="font-medium">{invoice.terms}</div>
              </div>

              {invoice.outstandingAmount > 0 && (
                <Button className="w-full bg-primary hover:bg-primary/90">
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
                <span className="font-medium">{invoice.invoiceDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Until Due:</span>
                <span className="font-medium">
                  {Math.ceil((new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}