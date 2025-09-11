import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Receipt, Search, Printer, Mail, RotateCcw, Filter, FileText, Calendar, DollarSign } from "lucide-react"

interface ReceiptItem {
  name: string
  quantity: number
  price: number
  discount: number
  total: number
}

interface SalesReceipt {
  id: string
  invoiceNo: string
  customer: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: string
  date: string
  status: "Active" | "Returned" | "Refunded"
  returnInfo?: {
    returnDate: string
    reason: string
    refundAmount: number
  }
}

const mockReceipts: SalesReceipt[] = [
  {
    id: "RCP-001",
    invoiceNo: "INV-2024-001",
    customer: "John Doe",
    items: [
      { name: "Laptop Computer", quantity: 1, price: 999.99, discount: 100, total: 899.99 },
      { name: "Wireless Mouse", quantity: 2, price: 29.99, discount: 0, total: 59.98 }
    ],
    subtotal: 959.97,
    tax: 96.00,
    discount: 100,
    total: 955.97,
    paymentMethod: "Credit Card",
    date: "2024-01-09 14:30",
    status: "Active"
  },
  {
    id: "RCP-002",
    invoiceNo: "INV-2024-002",
    customer: "Jane Smith",
    items: [
      { name: "Office Chair", quantity: 1, price: 199.99, discount: 10, total: 189.99 }
    ],
    subtotal: 189.99,
    tax: 19.00,
    discount: 10,
    total: 198.99,
    paymentMethod: "Cash",
    date: "2024-01-09 13:15",
    status: "Returned",
    returnInfo: {
      returnDate: "2024-01-10 10:00",
      reason: "Defective item",
      refundAmount: 198.99
    }
  }
]

export function SalesReceiptRecording() {
  const [receipts, setReceipts] = useState<SalesReceipt[]>(mockReceipts)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedReceipt, setSelectedReceipt] = useState<SalesReceipt | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [returnReason, setReturnReason] = useState("")

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         receipt.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         receipt.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || receipt.status.toLowerCase() === statusFilter.toLowerCase()
    
    return matchesSearch && matchesStatus
  })

  const handleViewReceipt = (receipt: SalesReceipt) => {
    setSelectedReceipt(receipt)
    setIsViewDialogOpen(true)
  }

  const handlePrintReceipt = (receipt: SalesReceipt) => {
    // In a real app, this would trigger a print dialog
    toast({
      title: "Print Receipt",
      description: `Receipt ${receipt.invoiceNo} sent to printer`
    })
  }

  const handleEmailReceipt = (receipt: SalesReceipt) => {
    // In a real app, this would open email dialog or send email
    toast({
      title: "Email Receipt",
      description: `Receipt ${receipt.invoiceNo} sent to ${receipt.customer}`
    })
  }

  const handleReturnProcess = () => {
    if (!selectedReceipt || !returnReason) {
      toast({
        title: "Missing Information",
        description: "Please provide a return reason",
        variant: "destructive"
      })
      return
    }

    const updatedReceipt: SalesReceipt = {
      ...selectedReceipt,
      status: "Returned",
      returnInfo: {
        returnDate: new Date().toLocaleString(),
        reason: returnReason,
        refundAmount: selectedReceipt.total
      }
    }

    setReceipts(prev => prev.map(receipt => 
      receipt.id === selectedReceipt.id ? updatedReceipt : receipt
    ))

    setReturnReason("")
    setIsReturnDialogOpen(false)
    setIsViewDialogOpen(false)
    
    toast({
      title: "Return Processed",
      description: `Refund of $${selectedReceipt.total.toFixed(2)} processed for ${selectedReceipt.customer}`
    })
  }

  const getStatusVariant = (status: SalesReceipt["status"]) => {
    switch (status) {
      case "Active": return "default"
      case "Returned": return "secondary"
      case "Refunded": return "destructive"
      default: return "secondary"
    }
  }

  const totalSales = receipts.filter(r => r.status === "Active").reduce((sum, r) => sum + r.total, 0)
  const totalReturns = receipts.filter(r => r.status === "Returned").reduce((sum, r) => sum + (r.returnInfo?.refundAmount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Receipts</p>
                <p className="text-2xl font-bold">{receipts.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Returns/Refunds</p>
                <p className="text-2xl font-bold">${totalReturns.toFixed(2)}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Sales Receipt History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by invoice no, customer, or receipt ID..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.invoiceNo}</TableCell>
                  <TableCell>{receipt.customer}</TableCell>
                  <TableCell>{receipt.items.length} items</TableCell>
                  <TableCell className="font-bold">${receipt.total.toFixed(2)}</TableCell>
                  <TableCell>{receipt.paymentMethod}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{receipt.date}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(receipt.status)}>
                      {receipt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleViewReceipt(receipt)}>
                        <FileText className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrintReceipt(receipt)}>
                        <Printer className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEmailReceipt(receipt)}>
                        <Mail className="w-3 h-3" />
                      </Button>
                      {receipt.status === "Active" && (
                        <Button variant="outline" size="sm" onClick={() => { setSelectedReceipt(receipt); setIsReturnDialogOpen(true) }}>
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Receipt Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-6">
              {/* Receipt Header */}
              <div className="text-center border-b pb-4">
                <h3 className="font-bold text-xl">Store Receipt</h3>
                <p className="text-sm text-muted-foreground">{selectedReceipt.date}</p>
                <p className="text-sm font-medium">Invoice: {selectedReceipt.invoiceNo}</p>
              </div>

              {/* Customer & Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedReceipt.customer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{selectedReceipt.paymentMethod}</p>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <h4 className="font-medium mb-3">Items Purchased</h4>
                <div className="space-y-2">
                  {selectedReceipt.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} × {item.quantity}
                          {item.discount > 0 && ` (${item.discount}% discount)`}
                        </p>
                      </div>
                      <span className="font-medium">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${selectedReceipt.subtotal.toFixed(2)}</span>
                </div>
                {selectedReceipt.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Total Discount:</span>
                    <span>-${selectedReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (10%):</span>
                  <span>${selectedReceipt.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${selectedReceipt.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Return Information */}
              {selectedReceipt.returnInfo && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium text-destructive mb-2">Return Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Return Date:</strong> {selectedReceipt.returnInfo.returnDate}</p>
                    <p><strong>Reason:</strong> {selectedReceipt.returnInfo.reason}</p>
                    <p><strong>Refund Amount:</strong> ${selectedReceipt.returnInfo.refundAmount.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => handlePrintReceipt(selectedReceipt)} className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
                <Button variant="outline" onClick={() => handleEmailReceipt(selectedReceipt)} className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return/Refund Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Return/Refund</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="font-medium">Receipt: {selectedReceipt.invoiceNo}</p>
                <p className="text-sm text-muted-foreground">Customer: {selectedReceipt.customer}</p>
                <p className="text-sm text-muted-foreground">Total: ${selectedReceipt.total.toFixed(2)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Return Reason *</label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select return reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">Defective item</SelectItem>
                    <SelectItem value="wrong-item">Wrong item received</SelectItem>
                    <SelectItem value="customer-request">Customer request</SelectItem>
                    <SelectItem value="damaged">Damaged during shipping</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  Refund Amount: ${selectedReceipt.total.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">
                  Full refund will be processed to original payment method
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleReturnProcess} className="flex-1" variant="destructive">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Process Return
                </Button>
                <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}