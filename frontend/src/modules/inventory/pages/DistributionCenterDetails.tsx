import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useFormatting } from "@/hooks/useFormatting"
import { useRBAC } from "@/contexts/RBACContext"
import { PERMISSIONS } from "@/types/rbac"
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Package,
  Loader2,
  Building,
  Star
} from "lucide-react"
import { DistributionApi, DistributionCenter } from "@/modules/inventory/services/distribution-api"
import { ProductLocationsList } from "@/modules/inventory/components/distribution/ProductLocationsList"

export default function DistributionCenterDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { formatNumber } = useFormatting()
  const { hasPermission } = useRBAC()
  
  const [loading, setLoading] = useState(true)
  const [center, setCenter] = useState<DistributionCenter | null>(null)

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
  }, [id, navigate, toast])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-white"
      case "inactive": return "bg-muted text-muted-foreground"
      case "maintenance": return "bg-warning text-white"
      default: return "bg-muted"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warehouse": return Building
      case "distribution_center": return Building
      case "retail_store": return Building
      case "cross_dock": return Package
      default: return Building
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

  const TypeIcon = getTypeIcon(center.type)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/distribution')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TypeIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  {center.name}
                  {center.is_primary && (
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  )}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {center.type.replace('_', ' ')}
                  </Badge>
                  <Badge className={getStatusColor(center.status)}>
                    {center.status}
                  </Badge>
                  {center.is_primary && (
                    <Badge variant="secondary">Primary Center</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {hasPermission(PERMISSIONS.WAREHOUSES_UPDATE) && (
          <Button onClick={() => navigate(`/distribution/centers/${center.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Center
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Center Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Center Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Center Code</label>
                <p className="font-mono text-lg">{center.code}</p>
              </div>
              
              <Separator />
              
              {center.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p>{center.address}</p>
                    {(center.city || center.state) && (
                      <p className="text-sm text-muted-foreground">
                        {[center.city, center.state, center.zip_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {center.contact_person && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                    <p>{center.contact_person}</p>
                  </div>
                </div>
              )}

              {center.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p>{center.phone}</p>
                  </div>
                </div>
              )}

              {center.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p>{center.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capacity Information */}
          {(center.capacity_volume || center.capacity_weight) && (
            <Card>
              <CardHeader>
                <CardTitle>Capacity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {center.capacity_volume && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Volume Capacity</label>
                    <p className="text-lg font-semibold">{formatNumber(center.capacity_volume)} m³</p>
                  </div>
                )}
                
                {center.capacity_weight && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Weight Capacity</label>
                    <p className="text-lg font-semibold">{formatNumber(center.capacity_weight)} kg</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Operating Hours */}
          {center.operating_hours && Object.keys(center.operating_hours).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Operating Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(center.operating_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize font-medium">{day}</span>
                      <span className="text-muted-foreground">
                        {hours.open} - {hours.close}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Facilities */}
          {center.facilities && center.facilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Facilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {center.facilities.map((facility) => (
                    <Badge key={facility} variant="outline">
                      {facility}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {center.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {center.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Product Locations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductLocationsList distributionCenterId={center.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
