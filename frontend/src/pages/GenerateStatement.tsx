import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/sonner"
import { 
  ArrowLeft, 
  Download, 
  FileText,
  Calendar,
  Building,
  Mail,
  Printer
} from "lucide-react"

export default function GenerateStatement() {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [formData, setFormData] = useState({
    statementType: "account",
    dateRange: "custom",
    startDate: "2024-01-01",
    endDate: new Date().toISOString().split('T')[0],
    includeInvoices: true,
    includePayments: true,
    includeCredits: false,
    includeAging: true,
    format: "pdf"
  })

  // Mock supplier data
  const supplier = {
    id: "SUP-001",
    name: "ABC Electronics Ltd",
    email: "billing@abcelectronics.com",
    address: "123 Business Park, Tech City, TC 12345"
  }

  // Mock statement data preview
  const statementData = {
    openingBalance: 5000.00,
    totalInvoices: 25750.50,
    totalPayments: 22700.00,
    totalCredits: 50.50,
    closingBalance: 8000.00,
    invoiceCount: 8,
    paymentCount: 6,
    creditCount: 1,
    aging: {
      current: 3000.00,
      days30: 2000.00,
      days60: 2000.00,
      days90: 1000.00,
      over90: 0.00
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      toast.success("Statement generated successfully!", {
        description: `${formData.format.toUpperCase()} statement has been generated and downloaded.`
      })
      
      // In real app, this would trigger file download
      
    } catch (error) {
      toast.error("Failed to generate statement", {
        description: "Please try again later."
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const presetDateRanges = {
    thisMonth: {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    lastMonth: {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
      endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
    },
    thisQuarter: {
      startDate: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    thisYear: {
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    }
  }

  const handleDateRangeChange = (range: string) => {
    if (range !== "custom" && presetDateRanges[range as keyof typeof presetDateRanges]) {
      const dates = presetDateRanges[range as keyof typeof presetDateRanges]
      setFormData(prev => ({
        ...prev,
        dateRange: range,
        startDate: dates.startDate,
        endDate: dates.endDate
      }))
    } else {
      setFormData(prev => ({ ...prev, dateRange: range }))
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
            <h1 className="text-3xl font-bold text-foreground">Generate Account Statement</h1>
            <p className="text-muted-foreground">{supplier.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statement Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Statement Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="statementType">Statement Type</Label>
                    <Select value={formData.statementType} onValueChange={(value) => handleInputChange("statementType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select statement type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account Statement</SelectItem>
                        <SelectItem value="aging">Aging Report</SelectItem>
                        <SelectItem value="payment">Payment Summary</SelectItem>
                        <SelectItem value="transaction">Transaction History</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="format">Export Format</Label>
                    <Select value={formData.format} onValueChange={(value) => handleInputChange("format", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Date Range</Label>
                  <Select value={formData.dateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="thisQuarter">This Quarter</SelectItem>
                      <SelectItem value="thisYear">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange("endDate", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Include in Statement</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="includeInvoices"
                        checked={formData.includeInvoices}
                        onCheckedChange={(checked) => handleInputChange("includeInvoices", checked as boolean)}
                      />
                      <Label htmlFor="includeInvoices">Invoices</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="includePayments"
                        checked={formData.includePayments}
                        onCheckedChange={(checked) => handleInputChange("includePayments", checked as boolean)}
                      />
                      <Label htmlFor="includePayments">Payments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="includeCredits"
                        checked={formData.includeCredits}
                        onCheckedChange={(checked) => handleInputChange("includeCredits", checked as boolean)}
                      />
                      <Label htmlFor="includeCredits">Credit Notes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="includeAging"
                        checked={formData.includeAging}
                        onCheckedChange={(checked) => handleInputChange("includeAging", checked as boolean)}
                      />
                      <Label htmlFor="includeAging">Aging Analysis</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isGenerating}>
                    <Download className="w-4 h-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate Statement"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Statement Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Supplier Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier ID:</span>
                <span className="font-medium">{supplier.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{supplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium text-sm">{supplier.email}</span>
              </div>
              <div className="text-sm text-muted-foreground">{supplier.address}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statement Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening Balance:</span>
                <span className="font-medium">${statementData.openingBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Invoices:</span>
                <span className="font-medium">${statementData.totalInvoices.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Payments:</span>
                <span className="font-medium text-success">-${statementData.totalPayments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Credits:</span>
                <span className="font-medium text-success">-${statementData.totalCredits.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold">
                  <span>Closing Balance:</span>
                  <span>${statementData.closingBalance.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {formData.includeAging && (
            <Card>
              <CardHeader>
                <CardTitle>Aging Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-medium">${statementData.aging.current.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1-30 Days:</span>
                  <span className="font-medium">${statementData.aging.days30.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">31-60 Days:</span>
                  <span className="font-medium text-warning">${statementData.aging.days60.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">61-90 Days:</span>
                  <span className="font-medium text-warning">${statementData.aging.days90.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Over 90 Days:</span>
                  <span className="font-medium text-destructive">${statementData.aging.over90.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="w-4 h-4 mr-2" />
                Email Statement
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Printer className="w-4 h-4 mr-2" />
                Print Statement
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}