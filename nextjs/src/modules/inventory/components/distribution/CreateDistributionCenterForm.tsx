import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, X } from "lucide-react"
import { CreateDistributionCenterRequest } from "@/modules/inventory/services/distribution-api"

const centerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255, "Name too long"),
  type: z.enum(["warehouse", "distribution_center", "retail_store", "cross_dock"]).default("warehouse"),
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
})

type FormData = z.infer<typeof centerSchema>

interface CreateDistributionCenterFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCenterCreated: (data: CreateDistributionCenterRequest) => Promise<void>
}

export function CreateDistributionCenterForm({
  open,
  onOpenChange,
  onCenterCreated,
}: CreateDistributionCenterFormProps) {
  const [loading, setLoading] = useState(false)
  const [facilities, setFacilities] = useState<string[]>([])
  const [newFacility, setNewFacility] = useState("")
  const [operatingHours, setOperatingHours] = useState<Record<string, { open: string; close: string }>>({
    monday: { open: "08:00", close: "17:00" },
    tuesday: { open: "08:00", close: "17:00" },
    wednesday: { open: "08:00", close: "17:00" },
    thursday: { open: "08:00", close: "17:00" },
    friday: { open: "08:00", close: "17:00" },
  })
  
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(centerSchema),
    defaultValues: {
      name: "",
      type: "warehouse",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "Bangladesh",
      contact_person: "",
      phone: "",
      email: "",
      notes: "",
    },
  })

  const centerTypes = [
    { value: "warehouse", label: "Warehouse" },
    { value: "distribution_center", label: "Distribution Center" },
    { value: "retail_store", label: "Retail Store" },
    { value: "cross_dock", label: "Cross Dock" },
  ]

  const commonFacilities = [
    "Loading Dock",
    "Refrigeration",
    "Security System",
    "Forklift Access",
    "Climate Control",
    "Fire Suppression",
    "CCTV Monitoring",
    "Backup Power",
    "24/7 Access",
    "Parking Area"
  ]

  const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ]

  const addFacility = (facility: string) => {
    if (facility && !facilities.includes(facility)) {
      setFacilities([...facilities, facility])
    }
    setNewFacility("")
  }

  const removeFacility = (facility: string) => {
    setFacilities(facilities.filter(f => f !== facility))
  }

  const updateOperatingHours = (day: string, type: 'open' | 'close', value: string) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value
      }
    }))
  }

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)

      // Prepare the request data
      const requestData: CreateDistributionCenterRequest = {
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
      }

      // Add numeric fields if provided
      if (data.latitude != null && String(data.latitude) !== "") {
        requestData.latitude = Number(data.latitude)
      }
      if (data.longitude != null && String(data.longitude) !== "") {
        requestData.longitude = Number(data.longitude)
      }
      if (data.capacity_volume != null && String(data.capacity_volume) !== "") {
        requestData.capacity_volume = Number(data.capacity_volume)
      }
      if (data.capacity_weight != null && String(data.capacity_weight) !== "") {
        requestData.capacity_weight = Number(data.capacity_weight)
      }

      // Add facilities if any
      if (facilities.length > 0) {
        requestData.facilities = facilities
      }

      // Add operating hours if any are set
      const hasOperatingHours = Object.values(operatingHours).some(hours => 
        hours.open || hours.close
      )
      if (hasOperatingHours) {
        requestData.operating_hours = operatingHours
      }

      await onCenterCreated(requestData)

      toast({
        title: "Distribution Center Created",
        description: `${data.name} has been created successfully.`,
      })

      // Reset form
      form.reset()
      setFacilities([])
      setOperatingHours({
        monday: { open: "08:00", close: "17:00" },
        tuesday: { open: "08:00", close: "17:00" },
        wednesday: { open: "08:00", close: "17:00" },
        thursday: { open: "08:00", close: "17:00" },
        friday: { open: "08:00", close: "17:00" },
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating distribution center:", error)
      toast({
        title: "Error",
        description: "Failed to create distribution center. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Distribution Center</DialogTitle>
          <DialogDescription>
            Add a new distribution center to your network
          </DialogDescription>
        </DialogHeader>

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
                        <Input placeholder="Dhaka" {...field} />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Bangladesh" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              
              <div className="space-y-3">
                {daysOfWeek.map((day) => (
                  <div key={day.key} className="flex items-center gap-4">
                    <div className="w-20 text-sm font-medium">{day.label}</div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={operatingHours[day.key]?.open || ""}
                        onChange={(e) => updateOperatingHours(day.key, 'open', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={operatingHours[day.key]?.close || ""}
                        onChange={(e) => updateOperatingHours(day.key, 'close', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                ))}
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
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Distribution Center
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
