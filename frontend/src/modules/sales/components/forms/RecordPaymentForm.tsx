"use client";

﻿import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  preselectedInvoiceId?: number | null // Preselect invoice when opening from PO details
}

// Payment methods that move money through a bank and therefore require a bank name.
const BANK_METHODS = ["bank-transfer", "check", "wire-transfer"]

const round2 = (n: number) => Math.round(n * 100) / 100

export function RecordPaymentForm({ open, onOpenChange, onPaymentRecorded, paymentId, preselectedInvoiceId }: RecordPaymentFormProps) {
  const [supplier, setSupplier] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState("")
  const [bankName, setBankName] = useState("")
  const [reference, setReference] = useState("")
  const [checkDate, setCheckDate] = useState("")
  const [notes, setNotes] = useState("")
  // Manual amount only used for supplier "advance" payments (no invoice selected).
  const [advanceAmount, setAdvanceAmount] = useState("")

  // invoice_id -> settled amount string for the invoices being settled by this payment.
  const [allocations, setAllocations] = useState<Record<number, string>>({})
  // invoice_id -> supplier discount string on that line. Cash = settled - discount.
  const [discounts, setDiscounts] = useState<Record<number, string>>({})

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  const bankRequired = BANK_METHODS.includes(paymentMethod)
  const selectedIds = Object.keys(allocations).map(Number)
  const hasAllocations = selectedIds.length > 0
  const allocationTotal = round2(
    Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  )
  const discountTotal = round2(
    selectedIds.reduce((sum, id) => sum + (parseFloat(discounts[id]) || 0), 0)
  )
  const outstandingTotal = round2(
    supplierInvoices
      .filter((inv) => allocations[inv.id] !== undefined)
      .reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0)
  )
  // Cash disbursed = settled amount minus supplier discount.
  const paymentAmount = hasAllocations
    ? round2(allocationTotal - discountTotal)
    : (parseFloat(advanceAmount) || 0)

  useEffect(() => {
    if (open) {
      void initialize()
    } else {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paymentId, preselectedInvoiceId])

  function resetForm() {
    setSupplier("")
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentMethod("")
    setBankName("")
    setReference("")
    setCheckDate("")
    setNotes("")
    setAdvanceAmount("")
    setAllocations({})
    setDiscounts({})
    setSupplierInvoices([])
  }

  // Load a supplier's invoices that still owe money so they can be allocated against.
  async function loadSupplierInvoices(supplierId: number): Promise<Invoice[]> {
    try {
      const invoices = await PaymentApi.getSupplierInvoices(supplierId, { limit: 1000 })
      const outstanding = invoices.filter(
        (inv) =>
          Number(inv.outstanding_amount || 0) > 0 &&
          inv.status !== "paid" &&
          inv.status !== "cancelled"
      )
      setSupplierInvoices(outstanding)
      return outstanding
    } catch (error) {
      console.error("Error loading supplier invoices:", error)
      toast.error("Failed to load supplier invoices")
      setSupplierInvoices([])
      return []
    }
  }

  async function initialize() {
    try {
      setLoading(true)
      resetForm()

      const suppliersResponse = await SupplierApi.getSuppliers({ limit: 100 })
      setSuppliers(suppliersResponse.suppliers)

      // Edit mode: hydrate from the existing payment + its allocations.
      if (paymentId) {
        const payment = await PaymentApi.getPayment(paymentId)
        setSupplier(payment.supplier_id.toString())
        setPaymentDate(new Date(payment.payment_date).toISOString().split('T')[0])
        setPaymentMethod(payment.payment_method)
        setBankName(payment.bank_name || "")
        setReference(payment.reference || "")
        setCheckDate(payment.check_date ? new Date(payment.check_date).toISOString().split('T')[0] : "")
        setNotes(payment.notes || "")

        await loadSupplierInvoices(payment.supplier_id)

        const existing = payment.allocations && payment.allocations.length > 0
          ? payment.allocations.map((a) => ({ invoice_id: a.invoice_id, amount: a.allocated_amount, discount: a.discount_amount || 0 }))
          : payment.invoice_id
          ? [{ invoice_id: payment.invoice_id, amount: payment.amount, discount: 0 }]
          : []
        if (existing.length > 0) {
          const next: Record<number, string> = {}
          const nextDisc: Record<number, string> = {}
          existing.forEach((a) => {
            next[a.invoice_id] = a.amount.toString()
            if (a.discount) nextDisc[a.invoice_id] = a.discount.toString()
          })
          setAllocations(next)
          setDiscounts(nextDisc)
        } else {
          setAdvanceAmount(payment.amount.toString())
        }
        return
      }

      // Preselect flow (opened from a PO/invoice): select that invoice's supplier
      // and pre-check the single invoice for full payment.
      if (preselectedInvoiceId) {
        const invoices = await PaymentApi.getInvoices({ limit: 1000 })
        const matched = invoices.find((inv) => inv.id === preselectedInvoiceId)
        if (matched) {
          setSupplier(matched.supplier_id.toString())
          await loadSupplierInvoices(matched.supplier_id)
          setAllocations({ [matched.id]: matched.outstanding_amount.toString() })
        }
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

  async function handleSupplierChange(value: string) {
    setSupplier(value)
    setAllocations({})
    setDiscounts({})
    setAdvanceAmount("")
    if (value) {
      await loadSupplierInvoices(Number(value))
    } else {
      setSupplierInvoices([])
    }
  }

  function toggleInvoice(invoice: Invoice, checked: boolean) {
    setAllocations((prev) => {
      const next = { ...prev }
      if (checked) {
        next[invoice.id] = Number(invoice.outstanding_amount || 0).toString()
      } else {
        delete next[invoice.id]
      }
      return next
    })
    if (!checked) {
      setDiscounts((prev) => {
        const next = { ...prev }
        delete next[invoice.id]
        return next
      })
    }
  }

  function setAllocationAmount(invoiceId: number, value: string) {
    setAllocations((prev) => ({ ...prev, [invoiceId]: value }))
  }

  function setDiscountAmount(invoiceId: number, value: string) {
    setDiscounts((prev) => ({ ...prev, [invoiceId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!supplier) {
      toast.error("Please select a supplier")
      return
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method")
      return
    }
    if (bankRequired && !bankName.trim()) {
      toast.error("Bank name is required for this payment method")
      return
    }
    if (paymentAmount <= 0) {
      toast.error("Enter a valid payment amount")
      return
    }

    const allocationList = supplierInvoices
      .filter((inv) => allocations[inv.id] !== undefined)
      .map((inv) => ({
        invoice_id: inv.id,
        amount: round2(parseFloat(allocations[inv.id]) || 0),
        discount_amount: round2(parseFloat(discounts[inv.id]) || 0),
      }))

    // Each allocation must be positive, within the invoice's outstanding balance,
    // and its discount must not exceed the settled amount.
    for (const inv of supplierInvoices) {
      if (allocations[inv.id] === undefined) continue
      const amt = parseFloat(allocations[inv.id]) || 0
      const disc = parseFloat(discounts[inv.id]) || 0
      if (amt <= 0) {
        toast.error(`Enter a valid amount for invoice ${inv.invoice_number}`)
        return
      }
      if (amt > Number(inv.outstanding_amount || 0) + 0.005) {
        toast.error(`Amount for invoice ${inv.invoice_number} exceeds its outstanding balance`)
        return
      }
      if (disc < 0) {
        toast.error(`Discount for invoice ${inv.invoice_number} cannot be negative`)
        return
      }
      if (disc > amt + 0.005) {
        toast.error(`Discount for invoice ${inv.invoice_number} exceeds its settled amount`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const paymentData = {
        supplier_id: parseInt(supplier),
        amount: round2(paymentAmount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        bank_name: bankRequired ? bankName.trim() : undefined,
        reference: reference || undefined,
        check_date: paymentMethod === "check" ? (checkDate || undefined) : undefined,
        notes: notes || undefined,
        allocations: allocationList.length > 0 ? allocationList : undefined,
        created_by: "Current User", // TODO: Get from auth context
      }

      if (paymentId) {
        await PaymentApi.updatePayment(paymentId, paymentData)
        toast.success("Payment updated successfully!")
      } else {
        await PaymentApi.createPayment(paymentData)
        toast.success("Payment recorded successfully!", {
          description: `Payment of $${round2(paymentAmount).toLocaleString()} has been recorded.`
        })
      }

      resetForm()
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

  const submitDisabled =
    isSubmitting ||
    !supplier ||
    !paymentMethod ||
    paymentAmount <= 0 ||
    (bankRequired && !bankName.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment made to a supplier. One payment can settle several invoices (e.g. a single check).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier *</Label>
            <Select value={supplier} onValueChange={handleSupplierChange} disabled={!!paymentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name} ({s.supplier_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outstanding invoices to allocate this payment against */}
          {supplier && (
            <div className="space-y-2">
              <Label>Invoices to pay</Label>
              {supplierInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-md p-3">
                  {loading ? "Loading invoices…" : "No outstanding invoices. You can still record an advance payment below."}
                </p>
              ) : (
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {supplierInvoices.map((inv) => {
                    const selected = allocations[inv.id] !== undefined
                    return (
                      <div key={inv.id} className="flex items-center gap-3 p-2 text-sm">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => toggleInvoice(inv, checked === true)}
                          id={`inv-${inv.id}`}
                        />
                        <label htmlFor={`inv-${inv.id}`} className="flex-1 cursor-pointer">
                          <span className="font-medium">{inv.invoice_number}</span>
                          <span className="text-muted-foreground ml-2">
                            due {new Date(inv.due_date).toLocaleDateString()} · outstanding {Number(inv.outstanding_amount || 0).toLocaleString()}
                          </span>
                        </label>
                        {selected && (
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground leading-none mb-0.5">Settle</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24"
                                value={allocations[inv.id]}
                                onChange={(e) => setAllocationAmount(inv.id, e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground leading-none mb-0.5">Discount</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24"
                                placeholder="0"
                                value={discounts[inv.id] ?? ""}
                                onChange={(e) => setDiscountAmount(inv.id, e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outstanding">Outstanding Amount</Label>
              <Input
                id="outstanding"
                type="number"
                value={hasAllocations ? outstandingTotal : 0}
                placeholder="0.00"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (cash) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={hasAllocations ? paymentAmount : advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="0.00"
                disabled={hasAllocations}
                required
              />
              {hasAllocations && (
                <p className="text-xs text-muted-foreground">
                  Settles {allocationTotal.toLocaleString()}
                  {discountTotal > 0 && <> · discount {discountTotal.toLocaleString()}</>} · cash {paymentAmount.toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {bankRequired && (
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank name"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
              <Label htmlFor="reference">Check no</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Check number"
              />
            </div>

            {paymentMethod === "check" && (
              <div className="space-y-2">
                <Label htmlFor="checkDate">Check Date</Label>
                <Input
                  id="checkDate"
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the payment"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
