import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Save, Plus, X } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DistributionApi, DistributionCenter, UpdateDistributionCenterRequest } from "@/modules/inventory/services/distribution-api"
import { useRBAC } from "@/contexts/RBACContext"
import { PERMISSIONS } from "@/types/rbac"

const centerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255, "Name too long"),
  type: z.enum(["warehouse", "distribution_center", "retail_store", "cross_dock"]),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().default("USA"),
  latitude: z.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.number().min(-180).max(180).optional().or(z.literal("")),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  capacity_volume: z.number().positive("Must be positive").optional().or(z.literal("")),
  capacity_weight: z.number().positive("Must be positive").optional().or(z.literal("")),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
})

type FormData = z.infer<typeof centerSchema>

export default function EditDistributionCenter() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasPermission } = useRBAC()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [center, setCenter] = useState<DistributionCenter | null>(null)
  const [facilities, setFacilities] = useState<string[]>([])
  const [newFacility, setNewFacility] = useState("")
  const [operatingHours, setOperatingHours] = useState<Record<string, { open: string; close: string }>>({
    monday: { open: "08:00", close: "17:00" },
    tuesday: { open: "08:00", close: "17:00" },
    wednesday: { open: "08:00", close: "17:00" },
    thursday: { open: "08:00", close: "17:00" },
    friday: { open: "08:00", close: "17:00" },
  })

  // Check permission
  if (!hasPermission(PERMISSIONS.WAREHOUSES_UPDATE)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">You don't have permission to edit distribution centers</p>
          <Button onClick={() => navigate('/distribution')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Distribution
          </Button>
        </div>
      </div>
    )
  }

  const form = useForm<FormData>({
    resolver: zodResolver(centerSchema),
    defaultValues: {
      name: "",
      type: "warehouse",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "USA",
      contact_person: "",
      phone: "",
      email: "",
      notes: "",
      status: "active",
    },
  })

  const centerTypes = [
    { value: "warehouse", label: "Warehouse" },
    { value: "distribution_center", label: "Distribution Center" },
    { value: "retail_store", label: "Retail Store" },
    { value: "cross_dock", label: "Cross Dock" },
  ]

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "maintenance", label: "Maintenance" },
  ]

  const commonFacilities = [
    "Loading Dock", "Climate Control", "Security System", "Fire Safety",
    "Forklift Access", "24/7 Access", "Parking", "Office Space",
    "Packaging Area", "Quality Control", "Returns Processing"
  ]

  const addFacility = (facility: string) => {
    if (facility && !facilities.includes(facility)) {
      setFacilities(prev => [...prev, facility])
      setNewFacility("")
    }
  }

  const removeFacility = (facility: string) => {
    setFacilities(prev => prev.filter(f => f !== facility))
  }

  useEffect(() => {
    const fetchCenter = async () => {
      if (!id) {
        navigate('/distribution')
        return
      }

      try {
        setLoading(true)
        const centerData = await DistributionApi.getDistributionCenter(parseInt(id))
        setCenter(centerData)
        
        // Populate form with existing data
        form.reset({
          name: centerData.name,
          type: centerData.type,
          address: centerData.address || "",
          city: centerData.city || "",
          state: centerData.state || "",
          zip_code: centerData.zip_code || "",
          country: centerData.country || "USA",
          latitude: centerData.latitude || ("" as any),
          longitude: centerData.longitude || ("" as any),
          contact_person: centerData.contact_person || "",
          phone: centerData.phone || "",
          email: centerData.email || "",
          capacity_volume: centerData.capacity_volume || ("" as any),
          capacity_weight: centerData.capacity_weight || ("" as any),
          notes: centerData.notes || "",
          status: centerData.status,
        })

        // Populate facilities
        if (centerData.facilities) {
          setFacilities(centerData.facilities)
        }

        // Populate operating hours
        if (centerData.operating_hours) {
          setOperatingHours(centerData.operating_hours)
        }
      } catch (error) {
        console.error("Error fetching distribution center:", error)
        toast({
          title: "Error",
          description: "Failed to load distribution center details",
          variant: "destructive",
        })
        navigate('/distribution')
      } finally {
        setLoading(false)
      }
    }

    fetchCenter()
  }, [id, form, navigate, toast])

  const onSubmit = async (data: FormData) => {
    if (!center) return

    try {
      setSaving(true)

      const updateData: UpdateDistributionCenterRequest = {
        name: data.name,
        type: data.type,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip_code: data.zip_code || undefined,
        country: data.country || "USA",
        contact_person: data.contact_person || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        notes: data.notes || undefined,
        status: data.status,
        facilities: facilities.length > 0 ? facilities : undefined,
        operating_hours: Object.keys(operatingHours).length > 0 ? operatingHours : undefined,
      }

      // Add numeric fields if provided
      if (data.capacity_volume && data.capacity_volume !== "") {
        updateData.capacity_volume = Number(data.capacity_volume)
      }
      if (data.capacity_weight && data.capacity_weight !== "") {
        updateData.capacity_weight = Number(data.capacity_weight)
      }
      if (data.latitude && data.latitude !== "") {
        updateData.latitude = Number(data.latitude)
      }
      if (data.longitude && data.longitude !== "") {
        updateData.longitude = Number(data.longitude)
      }

      await DistributionApi.updateDistributionCenter(center.id, updateData)

      toast({
        title: "Distribution Center Updated",
        description: `${data.name} has been updated successfully.`,
      })

      navigate('/distribution')
    } catch (error) {
      console.error("Error updating distribution center:", error)
      toast({
        title: "Error",
        description: "Failed to update distribution center. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading distribution center...</span>
        </div>
      </div>
    )
  }

  if (!center) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Distribution center not found</p>
          <Button onClick={() => navigate('/distribution')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Distribution
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/distribution')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Distribution Center</h1>
          <p className="text-muted-foreground">
            Modify details for {center.name}
            {center.is_primary && (
              <Badge variant="secondary" className="ml-2">Primary</Badge>
            )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribution Center Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Center Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Warehouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select center type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {centerTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Location Information</h3>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Main Street, Industrial District" 
                          className="resize-none"
                          {...field} 
                        />
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
                          <Input placeholder="New York" {...field} />
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
                          <Input placeholder="NY" {...field} />
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
                          <Input placeholder="10001" {...field} />
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
                        <Input placeholder="USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div /> {/* Empty column for spacing */}
                
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="40.7128" 
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="-74.0060" 
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@warehouse.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Capacity Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Capacity & Specifications</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="capacity_volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume Capacity (m³)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="10000" 
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight Capacity (kg)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="50000" 
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Facilities */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Facilities</h3>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {facilities.map((facility) => (
                      <Badge 
                        key={facility} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeFacility(facility)}
                      >
                        {facility}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add facility..."
                      value={newFacility}
                      onChange={(e) => setNewFacility(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFacility(newFacility))}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addFacility(newFacility)}
                      disabled={!newFacility}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {commonFacilities.filter(f => !facilities.includes(f)).map((facility) => (
                      <Badge 
                        key={facility} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => addFacility(facility)}
                      >
                        + {facility}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Operating Hours</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(operatingHours).map(([day, hours]) => (
                    <div key={day} className="space-y-2">
                      <label className="text-sm font-medium capitalize">{day}</label>
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => setOperatingHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], open: e.target.value }
                          }))}
                          className="flex-1"
                        />
                        <span className="self-center text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => setOperatingHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], close: e.target.value }
                          }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                      const defaultHours = { open: "08:00", close: "17:00" }
                      setOperatingHours(prev => {
                        const updated = { ...prev }
                        weekdays.forEach(day => {
                          updated[day] = defaultHours
                        })
                        return updated
                      })
                    }}
                  >
                    Set Weekday Hours (8AM-5PM)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const weekend = ['saturday', 'sunday']
                      setOperatingHours(prev => {
                        const updated = { ...prev }
                        weekend.forEach(day => {
                          if (prev[day]) {
                            delete updated[day]
                          } else {
                            updated[day] = { open: "09:00", close: "15:00" }
                          }
                        })
                        return updated
                      })
                    }}
                  >
                    Toggle Weekend Hours
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this distribution center..." 
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/distribution')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Update Distribution Center
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
