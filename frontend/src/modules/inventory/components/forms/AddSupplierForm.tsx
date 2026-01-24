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
import { ApiService, CreateSupplierRequest, ApiError } from "@/services/api"

interface AddSupplierFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSupplierAdded?: () => void
}

export function AddSupplierForm({ open, onOpenChange, onSupplierAdded }: AddSupplierFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    whatsappNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Bangladesh",
    category: "",
    taxId: "",
    paymentTerms: "",
    notes: "",
    openingBalance: "0"
  })

  const [supplierCategories, setSupplierCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // Fetch supplier categories when dialog opens
  useEffect(() => {
    if (open) {
      const fetchSupplierCategories = async () => {
        try {
          setLoadingCategories(true)
          const response = await ApiService.getSupplierCategories()
          setSupplierCategories(response.categories || [])
        } catch (err) {
          console.error("Failed to fetch supplier categories:", err)
          toast.error("Failed to load supplier categories")
          // Fallback to default categories if API fails
          setSupplierCategories([
            "Electronics",
            "Furniture", 
            "Raw Materials",
            "Components",
            "Services"
          ])
        } finally {
          setLoadingCategories(false)
        }
      }

      fetchSupplierCategories()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supplierData: CreateSupplierRequest = {
        name: formData.name,
        contact_person: formData.contactPerson || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        whatsapp_number: formData.whatsappNumber || undefined,
        website: undefined, // Not in current form
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zipCode || undefined,
        country: formData.country || undefined,
        category: formData.category || undefined,
        tax_id: formData.taxId || undefined,
        payment_terms: formData.paymentTerms || undefined,
        notes: formData.notes || undefined,
        opening_balance: parseFloat(formData.openingBalance) || 0,
        status: 'active'
      }

      await ApiService.createSupplier(supplierData)

      toast.success("Supplier added successfully!", {
        description: `${formData.name} has been added to your supplier directory.`
      })

      // Reset form
      setFormData({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        whatsappNumber: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        category: "",
        taxId: "",
        paymentTerms: "",
        notes: "",
        openingBalance: "0"
      })
      setShowNewCategoryInput(false)
      setNewCategoryName("")

      onSupplierAdded?.()
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error("Failed to add supplier", {
          description: error.message
        })
      } else {
        toast.error("Failed to add supplier", {
          description: "Please try again later."
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddNewCategory = async () => {
    if (newCategoryName.trim()) {
      const categoryName = newCategoryName.trim()
      if (!supplierCategories.includes(categoryName)) {
        try {
          // Create the category in the backend
          await ApiService.createSupplierCategory({
            name: categoryName,
            description: `Supplier category: ${categoryName}`,
            color: '#3B82F6' // Default blue color
          })
          
          // Add to local state
          setSupplierCategories(prev => [...prev, categoryName])
          setFormData(prev => ({ ...prev, category: categoryName }))
          toast.success("New category added successfully!")
        } catch (error) {
          console.error("Failed to create supplier category:", error)
          toast.error("Failed to create new category. Please try again.")
        }
      } else {
        toast.error("Category already exi")
      }
      setNewCategoryName("")
      setShowNewCategoryInput(false)
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === "add-new") {
      setShowNewCategoryInput(true)
    } else {
      handleInputChange("category", value)
    }
  }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to your directory. Fill in the supplier information below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter company name"
                    required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                    placeholder="Enter contact person name"
                    required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="contact@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input
                    id="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter street address"
                  required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="State"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange("zipCode", e.target.value)}
                    placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                {showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddNewCategory()
                        } else if (e.key === 'Escape') {
                          setShowNewCategoryInput(false)
                          setNewCategoryName("")
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      onClick={handleAddNewCategory}
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategoryInput(false)
                        setNewCategoryName("")
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select 
                    value={formData.category} 
                    onValueChange={handleCategoryChange}
                    disabled={loadingCategories}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select category"} />
                    </SelectTrigger>
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
                      <SelectItem value="add-new" className="text-blue-600 font-medium">
                        + Add New Category
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select required value={formData.paymentTerms} onValueChange={(value) => handleInputChange("paymentTerms", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net-15">Net 15</SelectItem>
                    <SelectItem value="net-30">Net 30</SelectItem>
                    <SelectItem value="net-45">Net 45</SelectItem>
                    <SelectItem value="net-60">Net 60</SelectItem>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => handleInputChange("taxId", e.target.value)}
                  placeholder="Enter tax identification number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance (Pending Payment)</Label>
              <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  value={formData.openingBalance}
                  onChange={(e) => handleInputChange("openingBalance", e.target.value)}
                  placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Enter any pending payment amount that needs to be tracked.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes about the supplier"
                  rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  )
}