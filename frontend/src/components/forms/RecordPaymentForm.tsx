import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/sonner"
import { PaymentApi } from "@/services/payment-api"
import { Invoice, Supplier } from "@/services/types"

interface RecordPaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentRecorded?: () => void
}

export function RecordPaymentForm({ open, onOpenChange, onPaymentRecorded }: RecordPaymentFormProps) {
  const [formData, setFormData] = useState({
    invoice: "",
    supplier: "",
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "",
    reference: "",
    notes: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [invoicesResponse, suppliersResponse] = await Promise.all([
        PaymentApi.getInvoices({ limit: 100 }),
        // Note: We need to import SupplierApi or use existing supplier API
        // For now, we'll use a placeholder
        Promise.resolve([]) // TODO: Replace with actual supplier API call
      ])
      setInvoices(invoicesResponse)
      setSuppliers(suppliersResponse)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.supplier || !formData.amount || !formData.paymentMethod) {
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      const paymentData = {
        invoice_id: formData.invoice ? parseInt(formData.invoice) : undefined,
        supplier_id: parseInt(formData.supplier),
        amount: parseFloat(formData.amount),
        payment_date: formData.paymentDate,
        payment_method: formData.paymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        created_by: "Current User" // TODO: Get from auth context
      }

      await PaymentApi.createPayment(paymentData)
      
      toast.success("Payment recorded successfully!", {
        description: `Payment of $${parseFloat(formData.amount).toLocaleString()} has been recorded.`
      })
      
      // Reset form
      setFormData({
        invoice: "",
        supplier: "",
        amount: "",
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "",
        reference: "",
        notes: ""
      })
      
      onPaymentRecorded?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error recording payment:', error)
      toast.error("Failed to record payment", {
        description: error.message || "Please try again later."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment made to a supplier for an invoice.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice">Invoice *</Label>
              <Select value={formData.invoice} onValueChange={(value) => handleInputChange("invoice", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id.toString()}>
                      {invoice.invoice_number} - {invoice.supplier_name || 'Unknown Supplier'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={formData.supplier} onValueChange={(value) => handleInputChange("supplier", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name} ({supplier.supplier_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange("paymentMethod", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="wire-transfer">Wire Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
                placeholder="Transaction/Check number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes about the payment"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.invoice || !formData.amount || !formData.paymentMethod}>
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}