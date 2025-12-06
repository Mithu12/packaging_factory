import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function PaymentHistory() {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")

  // Mock payment history data
  const payments = [
    {
      id: "PAY-2024-001",
      invoiceId: "INV-2024-001",
      date: "2024-01-20",
      amount: 7500.00,
      method: "Bank Transfer",
      reference: "TXN-789456123",
      status: "completed",
      description: "Partial payment for electronic components"
    },
    {
      id: "PAY-2024-002",
      invoiceId: "INV-2024-003",
      date: "2024-01-18",
      amount: 15200.00,
      method: "Check",
      reference: "CHK-001234",
      status: "completed",
      description: "Full payment for office furniture"
    },
    {
      id: "PAY-2024-003",
      invoiceId: "INV-2024-002",
      date: "2024-01-22",
      amount: 4000.00,
      method: "Bank Transfer",
      reference: "TXN-789456124",
      status: "pending",
      description: "Advance payment for raw materials"
    },
    {
      id: "PAY-2024-004",
      invoiceId: "INV-2024-001",
      date: "2024-01-15",
      amount: 2500.00,
      method: "Credit Card",
      reference: "CC-456789",
      status: "completed",
      description: "Initial payment for components"
    },
    {
      id: "PAY-2024-005",
      invoiceId: "INV-2024-004",
      date: "2024-01-10",
      amount: 1200.00,
      method: "Wire Transfer",
      reference: "WIRE-123456",
      status: "failed",
      description: "Payment attempt for premium parts"
    }
  ]

  const supplierName = supplierId ? "ABC Electronics Ltd" : "All Suppliers"

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success text-white"
      case "pending": return "bg-warning text-white"
      case "failed": return "bg-destructive text-white"
      default: return "bg-muted"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle
      case "pending": return Clock
      case "failed": return AlertCircle
      default: return Clock
    }
  }

  const filteredPayments = payments.filter(payment =>
    payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)
  const pendingAmount = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0)
  const failedAmount = payments.filter(p => p.status === "failed").reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payment History</h1>
            <p className="text-muted-foreground">{supplierName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalAmount.toLocaleString()}</div>
            <p className="text-xs text-success">Successfully processed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">${pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-warning">Awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${failedAmount.toLocaleString()}</div>
            <p className="text-xs text-destructive">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Payment Transactions</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search payments..."
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
                <TableHead>Payment ID</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const StatusIcon = getStatusIcon(payment.status)
                
                return (
                  <TableRow key={payment.id} className="hover:bg-accent/50">
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto"
                        onClick={() => navigate(`/view-invoice/${payment.invoiceId}`)}
                      >
                        {payment.invoiceId}
                      </Button>
                    </TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell className="font-medium">${payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{payment.reference}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{payment.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4" />
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}