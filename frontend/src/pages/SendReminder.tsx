import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  Mail, 
  Send,
  FileText,
  Calendar,
  AlertCircle
} from "lucide-react"

export default function SendReminder() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    reminderType: "",
    subject: "",
    message: "",
    ccEmails: "",
    sendDate: "immediate"
  })

  // Mock invoice data
  const invoice = {
    id: "INV-2024-001",
    supplier: {
      name: "ABC Electronics Ltd",
      email: "billing@abcelectronics.com",
      contactPerson: "John Smith"
    },
    amount: 12500.00,
    outstandingAmount: 5000.00,
    dueDate: "2024-02-15",
    status: "partial",
    daysPastDue: 5
  }

  const reminderTemplates = {
    gentle: {
      subject: `Gentle Reminder: Payment Due for Invoice ${invoice.id}`,
      message: `Dear ${invoice.supplier.contactPerson},

I hope this message finds you well. This is a gentle reminder that payment for Invoice ${invoice.id} in the amount of $${invoice.outstandingAmount.toLocaleString()} was due on ${invoice.dueDate}.

We understand that oversights can happen, and we would appreciate your prompt attention to this matter. If you have any questions about this invoice or if there are any issues we should be aware of, please don't hesitate to contact us.

Thank you for your continued business relationship.

Best regards,
Finance Team`
    },
    firm: {
      subject: `Payment Overdue: Immediate Action Required - Invoice ${invoice.id}`,
      message: `Dear ${invoice.supplier.contactPerson},

This is to inform you that payment for Invoice ${invoice.id} in the amount of $${invoice.outstandingAmount.toLocaleString()} is now ${invoice.daysPastDue} days overdue.

The payment was due on ${invoice.dueDate}. We require immediate payment to avoid any disruption to our business relationship and potential late fees.

Please remit payment immediately or contact us within 48 hours to discuss payment arrangements.

Regards,
Finance Team`
    },
    final: {
      subject: `Final Notice: Payment Required - Invoice ${invoice.id}`,
      message: `Dear ${invoice.supplier.contactPerson},

This is a FINAL NOTICE regarding the overdue payment for Invoice ${invoice.id} in the amount of $${invoice.outstandingAmount.toLocaleString()}.

Despite previous reminders, this payment remains outstanding and is now ${invoice.daysPastDue} days past due. Immediate payment is required to avoid:
- Collection proceedings
- Suspension of services
- Additional collection fees and interest charges

Please remit payment within 5 business days or contact us immediately to arrange payment.

Finance Team`
    }
  }

  const handleTemplateChange = (templateType: string) => {
    if (templateType && reminderTemplates[templateType as keyof typeof reminderTemplates]) {
      const template = reminderTemplates[templateType as keyof typeof reminderTemplates]
      setFormData(prev => ({
        ...prev,
        reminderType: templateType,
        subject: template.subject,
        message: template.message
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success("Reminder sent successfully!", {
        description: `Payment reminder has been sent to ${invoice.supplier.email}`
      })
      
      navigate(-1)
    } catch (error) {
      toast.error("Failed to send reminder", {
        description: "Please try again later."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
            <h1 className="text-3xl font-bold text-foreground">Send Payment Reminder</h1>
            <p className="text-muted-foreground">Invoice {invoice.id} - {invoice.supplier.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reminder Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Compose Reminder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminderType">Reminder Type</Label>
                    <Select value={formData.reminderType} onValueChange={handleTemplateChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reminder type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gentle">Gentle Reminder</SelectItem>
                        <SelectItem value="firm">Firm Reminder</SelectItem>
                        <SelectItem value="final">Final Notice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sendDate">Send Date</Label>
                    <Select value={formData.sendDate} onValueChange={(value) => handleInputChange("sendDate", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="When to send" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Send Immediately</SelectItem>
                        <SelectItem value="tomorrow">Send Tomorrow</SelectItem>
                        <SelectItem value="week">Send in 1 Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="Enter email subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder="Enter reminder message"
                    rows={12}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ccEmails">CC Emails (Optional)</Label>
                  <Input
                    id="ccEmails"
                    value={formData.ccEmails}
                    onChange={(e) => handleInputChange("ccEmails", e.target.value)}
                    placeholder="Additional email addresses (comma separated)"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formData.subject || !formData.message}>
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Sending..." : "Send Reminder"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice ID:</span>
                  <span className="font-medium">{invoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">${invoice.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-medium text-warning">${invoice.outstandingAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{invoice.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days Overdue:</span>
                  <span className="font-medium text-destructive">{invoice.daysPastDue} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="bg-warning text-white">{invoice.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recipient Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier:</span>
                <span className="font-medium">{invoice.supplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">{invoice.supplier.contactPerson}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium text-sm">{invoice.supplier.email}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertCircle className="w-5 h-5" />
                Reminder Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Start with gentle reminders for first-time overdue payments</p>
              <p>• Use firm language for payments over 30 days late</p>
              <p>• Final notices should clearly state consequences</p>
              <p>• Always maintain professional tone</p>
              <p>• Include specific payment instructions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}