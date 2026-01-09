"use client";

﻿import { useState, useEffect } from "react"
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
import { PaymentApi } from "@/modules/sales/services/payment-api"
import { SupplierApi } from "@/modules/inventory/services/supplier-api"
import { Invoice, Supplier } from "@/services/types"

interface RecordPaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentRecorded?: () => void
  paymentId?: number | null // Add paymentId for editing
}

export function RecordPaymentForm({ open, onOpenChange, onPaymentRecorded, paymentId }: RecordPaymentFormProps) {
  const [formData, setFormData] = useState({
    invoice: "",
    supplier: "",
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "",
    reference: "",
    notes: "",
    outstanding_amount: "0"
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, paymentId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [invoicesResponse, suppliersResponse] = await Promise.all([
        PaymentApi.getInvoices({ limit: 100 }),
        SupplierApi.getSuppliers({ limit: 100 })
      ])
      setInvoices(invoicesResponse)
      setSuppliers(suppliersResponse.suppliers)

      // If editing, fetch payment details
      if (paymentId) {
        const payment = await PaymentApi.getPayment(paymentId);
        setFormData({
          invoice: payment.invoice_id?.toString() || "",
          supplier: payment.supplier_id.toString(),
          amount: payment.amount.toString(),
          paymentDate: new Date(payment.payment_date).toISOString().split('T')[0],
          paymentMethod: payment.payment_method,
          reference: payment.reference || "",
          notes: payment.notes || "",
          outstanding_amount: "0" // Will be updated if invoice matches
        });
        
        if (payment.invoice_id) {
          const matchedInvoice = invoicesResponse.find(inv => inv.id === payment.invoice_id);
          if (matchedInvoice) {
            setFormData(prev => ({
              ...prev,
              outstanding_amount: matchedInvoice.outstanding_amount.toString()
            }));
          }
        }
      } else {
        resetFormData();
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  function resetFormData() {
    setFormData({
      invoice: "",
      supplier: "",
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "",
      reference: "",
      notes: "",
      outstanding_amount: "0",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.amount || !formData.paymentMethod) {
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      // If no invoice is selected, supplier is required
      if (!formData.invoice && !formData.supplier) {
        toast.error("Please select either an invoice or a supplier")
        setIsSubmitting(false)
        return
      }

      const paymentData = {
        invoice_id: formData.invoice ? parseInt(formData.invoice) : undefined,
        supplier_id: parseInt(formData.supplier),
        amount: parseFloat(formData.amount),
        outstanding_amount: parseFloat(formData.outstanding_amount),
        payment_date: formData.paymentDate,
        payment_method: formData.paymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        created_by: "Current User" // TODO: Get from auth context
      }

      if (paymentId) {
        await PaymentApi.updatePayment(paymentId, paymentData)
        toast.success("Payment updated successfully!")
      } else {
        await PaymentApi.createPayment(paymentData)
        toast.success("Payment recorded successfully!", {
          description: `Payment of $${parseFloat(formData.amount).toLocaleString()} has been recorded.`
        })
      }
      
      // Reset form
      resetFormData()
      
      onPaymentRecorded?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving payment:', error)
      toast.error(paymentId ? "Failed to update payment" : "Failed to record payment", {
        description: error.message || "Please try again later."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-populate supplier when invoice is selected
      if (field === 'invoice' && value) {
        const selectedInvoice = invoices.find(inv => inv.id.toString() === value)
        if (selectedInvoice) {
          newData.supplier = selectedInvoice.supplier_id.toString()
          newData.outstanding_amount = selectedInvoice.outstanding_amount.toString()
          newData.amount = selectedInvoice.outstanding_amount.toString() // Default to full amount
        }
      }
      
      return newData
    })
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
              <div className="flex items-center justify-between">
                <Label htmlFor="invoice">Invoice</Label>
                {formData.invoice && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { resetFormData() }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <Select value={formData.invoice} onValueChange={(value) => handleInputChange("invoice", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice (optional)" />
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
              <Label htmlFor="supplier">
                Supplier {!formData.invoice ? '*' : ''}
                {formData.invoice && <span className="text-sm text-muted-foreground ml-1">(auto-filled from invoice)</span>}
              </Label>
              <Select 
                value={formData.supplier} 
                onValueChange={(value) => handleInputChange("supplier", value)}
                disabled={!!formData.invoice}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.invoice ? "Auto-filled from invoice" : "Select supplier"} />
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
              <Label htmlFor="amount">Outstanding Amount *</Label>
              <Input
                id="amount"
                type="number"     
                value={formData.outstanding_amount}
                onChange={(e) => {}}
                placeholder="0.00"
                required
                disabled
              />
            </div>


            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
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
            <Button type="submit" disabled={isSubmitting || !formData.amount || !formData.paymentMethod || (!formData.invoice && !formData.supplier)}>
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}