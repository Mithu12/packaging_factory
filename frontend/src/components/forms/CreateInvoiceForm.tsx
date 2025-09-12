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
import { SupplierApi } from "@/services/supplier-api"
import { Invoice, Supplier, CreateInvoiceRequest } from "@/services/types"

interface CreateInvoiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvoiceCreated?: (invoice: Invoice) => void
  purchaseOrderId?: number
  supplierId?: number
  totalAmount?: number
  paymentTerms?: string
}

export function CreateInvoiceForm({ 
  open, 
  onOpenChange, 
  onInvoiceCreated,
  purchaseOrderId,
  supplierId,
  totalAmount,
  paymentTerms
}: CreateInvoiceFormProps) {
  const [formData, setFormData] = useState({
    supplier_id: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: "",
    total_amount: "",
    terms: "",
    notes: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchSuppliers()
      
      // Reset form data first
      const newFormData = {
        supplier_id: "",
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: "",
        total_amount: "",
        terms: "",
        notes: ""
      }
      
      // Pre-fill form if data is provided
      if (supplierId) {
        newFormData.supplier_id = supplierId.toString()
      }
      if (totalAmount) {
        newFormData.total_amount = totalAmount.toString()
      }
      if (paymentTerms) {
        newFormData.terms = paymentTerms
        // Calculate due date based on payment terms
        newFormData.due_date = calculateDueDate(paymentTerms)
      }
      
      setFormData(newFormData)
    }
  }, [open, supplierId, totalAmount, paymentTerms])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await SupplierApi.getSuppliers({ limit: 100 })
      setSuppliers(response.suppliers)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateDueDate = (terms: string): string => {
    const today = new Date()
    let daysToAdd = 30 // Default to Net 30

    if (terms) {
      const termsLower = terms.toLowerCase()
      if (termsLower.includes('net 15')) {
        daysToAdd = 15
      } else if (termsLower.includes('net 30')) {
        daysToAdd = 30
      } else if (termsLower.includes('net 45')) {
        daysToAdd = 45
      } else if (termsLower.includes('net 60')) {
        daysToAdd = 60
      } else if (termsLower.includes('net 90')) {
        daysToAdd = 90
      }
    }

    const dueDate = new Date(today)
    dueDate.setDate(today.getDate() + daysToAdd)
    return dueDate.toISOString().split('T')[0]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.supplier_id || !formData.total_amount || !formData.due_date) {
        console.error('Form validation failed:', {
          supplier_id: formData.supplier_id,
          total_amount: formData.total_amount,
          due_date: formData.due_date
        })
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      const invoiceData: CreateInvoiceRequest = {
        purchase_order_id: purchaseOrderId || undefined,
        supplier_id: parseInt(formData.supplier_id),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        total_amount: parseFloat(formData.total_amount),
        terms: formData.terms || undefined,
        notes: formData.notes || undefined
      }

      console.log('Submitting invoice data:', invoiceData)

      const newInvoice = await PaymentApi.createInvoice(invoiceData)
      
      toast.success("Invoice created successfully!", {
        description: `Invoice ${newInvoice.invoice_number} has been created.`
      })
      
      // Reset form
      setFormData({
        supplier_id: "",
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: "",
        total_amount: "",
        terms: "",
        notes: ""
      })
      
      onInvoiceCreated?.(newInvoice)
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      toast.error("Failed to create invoice", {
        description: error.message || "Please try again later."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-calculate due date when terms change
    if (field === 'terms' && value) {
      const dueDate = calculateDueDate(value)
      setFormData(prev => ({ ...prev, due_date: dueDate }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a supplier. {purchaseOrderId && `This invoice will be linked to Purchase Order #${purchaseOrderId}.`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(value) => handleInputChange("supplier_id", value)}
                disabled={!!supplierId}
              >
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
            
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount *</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => handleInputChange("total_amount", e.target.value)}
                placeholder="0.00"
                disabled={!!totalAmount}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date *</Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => handleInputChange("invoice_date", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange("due_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="terms">Payment Terms</Label>
              <Select 
                value={formData.terms} 
                onValueChange={(value) => handleInputChange("terms", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Net 90">Net 90</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes for this invoice..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
