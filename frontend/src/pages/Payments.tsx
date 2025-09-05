import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RecordPaymentForm } from "@/components/forms/RecordPaymentForm"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("invoices")
  const [showRecordPaymentForm, setShowRecordPaymentForm] = useState(false)
  
  const invoices = [
    {
      id: "INV-2024-001",
      supplier: "ABC Electronics Ltd",
      poNumber: "PO-2024-001",
      invoiceDate: "2024-01-16",
      dueDate: "2024-02-15",
      amount: 12500.00,
      paidAmount: 7500.00,
      outstandingAmount: 5000.00,
      status: "partial",
      terms: "Net 30"
    },
    {
      id: "INV-2024-002",
      supplier: "Global Raw Materials Inc",
      poNumber: "PO-2024-002",
      invoiceDate: "2024-01-15",
      dueDate: "2024-02-14",
      amount: 8750.50,
      paidAmount: 0,
      outstandingAmount: 8750.50,
      status: "pending",
      terms: "Net 30"
    },
    {
      id: "INV-2024-003",
      supplier: "Office Furniture Pro",
      poNumber: "PO-2024-003",
      invoiceDate: "2024-01-10",
      dueDate: "2024-01-25",
      amount: 15200.00,
      paidAmount: 15200.00,
      outstandingAmount: 0,
      status: "paid",
      terms: "Net 15"
    },
    {
      id: "INV-2024-004",
      supplier: "Premium Parts Supply",
      poNumber: "PO-2024-004",
      invoiceDate: "2024-01-05",
      dueDate: "2024-01-20",
      amount: 6890.25,
      paidAmount: 0,
      outstandingAmount: 6890.25,
      status: "overdue",
      terms: "Net 15"
    }
  ]

  const payments = [
    {
      id: "PAY-2024-001",
      invoiceId: "INV-2024-001",
      supplier: "ABC Electronics Ltd",
      paymentDate: "2024-01-20",
      amount: 7500.00,
      method: "Bank Transfer",
      reference: "TXN-789456123",
      status: "completed"
    },
    {
      id: "PAY-2024-002",
      invoiceId: "INV-2024-003",
      supplier: "Office Furniture Pro",
      paymentDate: "2024-01-18",
      amount: 15200.00,
      method: "Check",
      reference: "CHK-001234",
      status: "completed"
    },
    {
      id: "PAY-2024-003",
      invoiceId: "INV-2024-002",
      supplier: "Global Raw Materials Inc",
      paymentDate: "2024-01-22",
      amount: 4000.00,
      method: "Bank Transfer",
      reference: "TXN-789456124",
      status: "pending"
    }
  ]

  const advances = [
    {
      id: "ADV-2024-001",
      supplier: "ABC Electronics Ltd",
      amount: 5000.00,
      date: "2024-01-10",
      purpose: "Advance for large order",
      status: "active",
      utilisedAmount: 2000.00,
      remainingAmount: 3000.00
    },
    {
      id: "ADV-2024-002",
      supplier: "Premium Parts Supply",
      amount: 2500.00,
      date: "2024-01-08",
      purpose: "Pre-payment for bulk purchase",
      status: "utilised",
      utilisedAmount: 2500.00,
      remainingAmount: 0
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-white"
      case "partial": return "bg-warning text-white"
      case "pending": return "bg-status-pending text-white"
      case "overdue": return "bg-destructive text-white"
      case "completed": return "bg-success text-white"
      case "active": return "bg-primary text-white"
      case "utilised": return "bg-muted text-muted-foreground"
      default: return "bg-muted"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "completed": return CheckCircle
      case "overdue": return AlertCircle
      case "pending":
      case "partial": return Clock
      default: return Clock
    }
  }

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0)
  const overdueAmount = invoices.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + inv.outstandingAmount, 0)
  const totalPaid = payments.filter(pay => pay.status === "completed").reduce((sum, pay) => sum + pay.amount, 0)
  const advanceBalance = advances.reduce((sum, adv) => sum + adv.remainingAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
          <p className="text-muted-foreground">Track supplier invoices, payments, and outstanding balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Payment Schedule
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowRecordPaymentForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total unpaid</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${overdueAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</div>
            <p className="text-xs text-success">+12% vs last month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advance Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${advanceBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Available to utilize</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Supplier Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="advances">Advance Payments</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Supplier Invoices</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-80"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const StatusIcon = getStatusIcon(invoice.status)
                    const isOverdue = invoice.status === "overdue"
                    
                    return (
                      <TableRow key={invoice.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{invoice.id}</div>
                              <div className="text-sm text-muted-foreground">PO: {invoice.poNumber}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.supplier}</div>
                          <div className="text-sm text-muted-foreground">{invoice.terms}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">Invoice: {invoice.invoiceDate}</div>
                            <div className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              Due: {invoice.dueDate}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">${invoice.amount.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-success font-medium">${invoice.paidAmount.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${invoice.outstandingAmount > 0 ? "text-warning" : "text-muted-foreground"}`}>
                            ${invoice.outstandingAmount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4" />
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem>View Invoice</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowRecordPaymentForm(true)}>Record Payment</DropdownMenuItem>
                              <DropdownMenuItem>Payment History</DropdownMenuItem>
                              <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                              <DropdownMenuItem>Generate Statement</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>{payment.invoiceId}</TableCell>
                      <TableCell>{payment.supplier}</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell className="font-medium">${payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payment.reference}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advances Tab */}
        <TabsContent value="advances">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Advance Payments</CardTitle>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Advance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advance ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Utilised</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((advance) => (
                    <TableRow key={advance.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">{advance.id}</TableCell>
                      <TableCell>{advance.supplier}</TableCell>
                      <TableCell>{advance.date}</TableCell>
                      <TableCell className="font-medium">${advance.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-warning">${advance.utilisedAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-success font-medium">${advance.remainingAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{advance.purpose}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(advance.status)}>
                          {advance.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordPaymentForm 
        open={showRecordPaymentForm} 
        onOpenChange={setShowRecordPaymentForm}
        onPaymentRecorded={() => {
          // In a real app, this would refresh the payments list
          console.log("Payment recorded, refreshing list...")
        }}
      />
    </div>
  )
}