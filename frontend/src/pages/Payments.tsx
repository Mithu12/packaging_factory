import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RecordPaymentForm } from "@/components/forms/RecordPaymentForm"
import { useFormatting } from "@/hooks/useFormatting"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { PaymentApi } from "@/services/payment-api"
import { Invoice, Payment, PaymentStats } from "@/services/types"
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
  const navigate = useNavigate()
  const { formatCurrency, formatDate } = useFormatting()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("invoices")
  const [showRecordPaymentForm, setShowRecordPaymentForm] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [invoicesResponse, paymentsResponse, statsResponse] = await Promise.all([
        PaymentApi.getInvoices({ limit: 100 }),
        PaymentApi.getPayments({ limit: 100 }),
        PaymentApi.getPaymentStats()
      ])
      
      setInvoices(invoicesResponse)
      setPayments(paymentsResponse)
      setStats(statsResponse)
    } catch (err: any) {
      console.error('Error fetching payment data:', err)
      setError(err.message || 'Failed to load payment data')
      toast.error('Failed to load payment data', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentRecorded = () => {
    fetchData() // Refresh data after payment is recorded
  }


  // Filter data based on search term
  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (invoice.supplier_name && invoice.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invoice.po_number && invoice.po_number.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredPayments = payments.filter(payment =>
    payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (payment.supplier_name && payment.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (payment.invoice_number && payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (payment.reference && payment.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  )


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

  const totalOutstanding = stats?.total_outstanding_amount || 0
  const overdueAmount = stats?.overdue_amount || 0
  const totalPaid = stats?.total_paid_amount || 0
  const advanceBalance = 0 // Not implemented yet

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading payment data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Failed to load payment data</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

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
            <div className="text-2xl font-bold text-warning">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Total unpaid</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-success">+12% vs last month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advance Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(advanceBalance)}</div>
            <p className="text-xs text-muted-foreground">Available to utilize</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Supplier Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
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
                  {filteredInvoices.map((invoice) => {
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
                              <div className="font-medium">{invoice.invoice_number}</div>
                              <div className="text-sm text-muted-foreground">PO: {invoice.po_number || 'N/A'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.supplier_name || 'Unknown Supplier'}</div>
                          <div className="text-sm text-muted-foreground">{invoice.terms}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">Invoice: {new Date(invoice.invoice_date).toLocaleDateString()}</div>
                            <div className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              Due: {new Date(invoice.due_date).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(invoice.total_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-success font-medium">{formatCurrency(invoice.paid_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${Number(invoice.outstanding_amount) > 0 ? "text-warning" : "text-muted-foreground"}`}>
                            {formatCurrency(invoice.outstanding_amount)}
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
                              <DropdownMenuItem onClick={() => navigate(`/view-invoice/${invoice.id}`)}>View Invoice</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowRecordPaymentForm(true)}>Record Payment</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/payment-history/${invoice.supplier_id}`)}>Payment History</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/send-reminder/${invoice.id}`)}>Send Reminder</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/generate-statement/${invoice.supplier_id}`)}>Generate Statement</DropdownMenuItem>
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
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>{payment.invoice_id || 'N/A'}</TableCell>
                      <TableCell>{payment.supplier_name || 'Unknown Supplier'}</TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
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

      </Tabs>

      <RecordPaymentForm 
        open={showRecordPaymentForm} 
        onOpenChange={setShowRecordPaymentForm}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  )
}