"use client";

import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  MessageCircle
} from "lucide-react"
import { ApiService, Supplier, ApiError } from "@/services/api"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {useFormatting} from "@/hooks/useFormatting";

export default function SupplierDetails() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0]
  const router = useRouter()
  const { toast } = useToast()
  
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const { formatCurrency, formatDate } = useFormatting()

  // Fetch supplier data
  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        const supplierData = await ApiService.getSupplier(parseInt(id))
        setSupplier(supplierData)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to load supplier data")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSupplier()
  }, [id])

  const handleToggleStatus = async () => {
    if (!supplier) return
    
    try {
      setTogglingStatus(true)
      const updatedSupplier = await ApiService.toggleSupplierStatus(supplier.id)
      setSupplier(updatedSupplier)
      
      toast({
        title: "Status Updated",
        description: `Supplier has been ${updatedSupplier.status === 'active' ? 'activated' : 'deactivated'}.`,
      })
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update supplier status",
          variant: "destructive"
        })
      }
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!supplier) return
    
    try {
      await ApiService.deleteSupplier(supplier.id)
      
      toast({
        title: "Supplier Deleted",
        description: "Supplier has been successfully deleted.",
      })
      router.push('/suppliers')
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete supplier",
          variant: "destructive"
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading supplier details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Supplier not found</p>
          <Button onClick={() => router.push('/suppliers')} className="mt-4">
            Back to Suppliers
          </Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push('/suppliers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{supplier.name}</h1>
            <p className="text-muted-foreground">Supplier Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(supplier.status)}>
            {supplier.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={togglingStatus}
          >
            {togglingStatus ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : supplier.status === 'active' ? (
              <ToggleLeft className="w-4 h-4" />
            ) : (
              <ToggleRight className="w-4 h-4" />
            )}
            {supplier.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/suppliers/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Supplier Code</label>
                  <p className="text-sm">{supplier.supplier_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-sm">{supplier.category || 'N/A'}</p>
                </div>
              </div>

              {supplier.contact_person && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                  <p className="text-sm">{supplier.contact_person}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{supplier.phone}</span>
                  </div>
                )}
                {supplier.whatsapp_number && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{supplier.whatsapp_number}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{supplier.email}</span>
                  </div>
                )}
              </div>

              {supplier.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm">{supplier.address}</p>
                    {(supplier.city || supplier.state || supplier.zip_code) && (
                      <p className="text-sm text-muted-foreground">
                        {[supplier.city, supplier.state, supplier.zip_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {supplier.country && (
                      <p className="text-sm text-muted-foreground">{supplier.country}</p>
                    )}
                  </div>
                </div>
              )}

              {supplier.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-sm">{supplier.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplier.tax_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
                    <p className="text-sm">{supplier.tax_id}</p>
                  </div>
                )}
                {supplier.payment_terms && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
                    <p className="text-sm">{supplier.payment_terms.replace('-', ' ').toUpperCase()}</p>
                  </div>
                )}
              </div>

              {(supplier.bank_name || supplier.bank_account) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Bank Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {supplier.bank_name && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                          <p className="text-sm">{supplier.bank_name}</p>
                        </div>
                      )}
                      {supplier.bank_account && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                          <p className="text-sm">{supplier.bank_account}</p>
                        </div>
                      )}
                    </div>
                    {(supplier.bank_routing || supplier.swift_code || supplier.iban) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {supplier.bank_routing && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Routing Number</label>
                            <p className="text-sm">{supplier.bank_routing}</p>
                          </div>
                        )}
                        {supplier.swift_code && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">SWIFT Code</label>
                            <p className="text-sm">{supplier.swift_code}</p>
                          </div>
                        )}
                        {supplier.iban && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">IBAN</label>
                            <p className="text-sm">{supplier.iban}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rating</label>
                <p className="text-2xl font-bold">{supplier.rating}/5.0</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Orders</label>
                <p className="text-2xl font-bold">{supplier.total_orders}</p>
              </div>
              {supplier.last_order_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Order</label>
                  <p className="text-sm">{formatDate(supplier.last_order_date)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{formatDate(supplier.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{formatDate(supplier.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}