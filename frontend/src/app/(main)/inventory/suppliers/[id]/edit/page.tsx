"use client";

import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft,
  Building2,
  Save,
  X,
  Loader2
} from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ApiService, Supplier, ApiError } from "@/services/api"

const supplierSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").optional(),
  contact_person: z.string().min(2, "Contact person name must be at least 2 characters").optional(),
  phone: z.string().min(10, "Valid phone number is required").optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  whatsapp_number: z.string().optional().or(z.literal("")),
  address: z.string().min(10, "Complete address is required").optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_routing: z.string().optional(),
  swift_code: z.string().optional(),
  iban: z.string().optional(),
  notes: z.string().optional()
})

type SupplierFormData = z.infer<typeof supplierSchema>

export default function EditSupplier() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0]
  const router = useRouter()
  const { toast } = useToast()
  
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplierCategories, setSupplierCategories] = useState<string[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      whatsapp_number: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
      category: "",
      status: "active",
      tax_id: "",
      payment_terms: "",
      bank_name: "",
      bank_account: "",
      bank_routing: "",
      swift_code: "",
      iban: "",
      notes: ""
    }
  })

  // Fetch supplier data
  useEffect(() => {
    const fetchSupplier = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        setError(null)
        const supplierData = await ApiService.getSupplier(parseInt(id))
        setSupplier(supplierData)
        
        // Update form with fetched data
        form.reset({
          name: supplierData.name || "",
          contact_person: supplierData.contact_person || "",
          phone: supplierData.phone || "",
          email: supplierData.email || "",
          whatsapp_number: supplierData.whatsapp_number || "",
          address: supplierData.address || "",
          city: supplierData.city || "",
          state: supplierData.state || "",
          zip_code: supplierData.zip_code || "",
          country: supplierData.country || "",
          category: supplierData.category || "",
          status: (supplierData.status as 'active' | 'inactive') || "active",
          tax_id: supplierData.tax_id || "",
          payment_terms: supplierData.payment_terms || "",
          bank_name: supplierData.bank_name || "",
          bank_account: supplierData.bank_account || "",
          bank_routing: supplierData.bank_routing || "",
          swift_code: supplierData.swift_code || "",
          iban: supplierData.iban || "",
          notes: supplierData.notes || ""
        })
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive"
          })
        } else {
          setError("Failed to load supplier data")
          toast({
            title: "Error",
            description: "Failed to load supplier data",
            variant: "destructive"
          })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSupplier()
  }, [id, form, toast])

  const onSubmit = async (data: SupplierFormData) => {
    if (!id) return
    
    try {
      setSaving(true)
      await ApiService.updateSupplier(parseInt(id), data)
      
      toast({
        title: "Supplier Updated",
        description: "Supplier information has been successfully updated.",
      })
      router.push(`/inventory/suppliers/${id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        toast({
          title: err.message,
          description: err.details?.[0] ||JSON.stringify(err.details),
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update supplier",
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  // Fetch supplier categories
  useEffect(() => {
    const fetchSupplierCategories = async () => {
      try {
        setLoadingCategories(true)
        const response = await ApiService.getSupplierCategories()
        setSupplierCategories(response.categories || [])
      } catch (err) {
        console.error("Failed to fetch supplier categories:", err)
        toast({
          title: "Warning",
          description: "Failed to load supplier categories. Using default categories.",
          variant: "destructive"
        })
        // Fallback to default categories if API fails
        setSupplierCategories([
          "Electronics",
          "Raw Materials", 
          "Furniture",
          "Components",
          "Textiles",
          "Food & Beverage",
          "Industrial Equipment",
          "Office Supplies"
        ])
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchSupplierCategories()
  }, [toast])

  const paymentTermsOptions = [
    "net-15",
    "net-30", 
    "net-45",
    "net-60",
    "cod",
    "prepaid"
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading supplier data...</span>
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
          <Button onClick={() => router.push('/inventory/suppliers')} className="mt-4">
            Back to Suppliers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push(`/inventory/suppliers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Supplier</h1>
            <p className="text-muted-foreground">
              Update supplier information and details for {supplier?.name}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
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
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contact_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact person name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="whatsapp_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter WhatsApp number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter ZIP code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select category"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supplierCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                              {supplierCategories.length === 0 && !loadingCategories && (
                                <SelectItem value="no-categories" disabled>
                                  No categories available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter supplier notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tax_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter tax ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="payment_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentTermsOptions.map((term) => (
                                <SelectItem key={term} value={term}>
                                  {term.replace('-', ' ').toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                    <div className="space-y-4">
                    <h4 className="font-medium">Bank Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bank_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter bank name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bank_account"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter account number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="bank_routing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Routing Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter routing number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="swift_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SWIFT Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter SWIFT code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="iban"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter IBAN" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push(`/inventory/suppliers/${id}`)}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}