import { useParams, useNavigate } from "react-router-dom"
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
  Calendar,
  Star,
  Package,
  CreditCard,
  Edit,
  Eye
} from "lucide-react"

export default function SupplierDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Mock supplier data - in real app, fetch based on ID
  const supplier = {
    id: "SUP-001",
    name: "ABC Electronics Ltd",
    contactPerson: "John Smith",
    phone: "+1 (555) 123-4567",
    email: "john.smith@abcelectronics.com",
    address: "123 Tech Street, Silicon Valley, CA 94025",
    category: "Electronics",
    status: "active",
    rating: 4.8,
    totalOrders: 145,
    lastOrder: "2024-01-10",
    joinedDate: "2022-03-15",
    taxId: "TAX-ABC-001",
    paymentTerms: "Net 30",
    bankDetails: {
      accountName: "ABC Electronics Ltd",
      accountNumber: "****-****-****-1234",
      bankName: "Tech Bank"
    },
    description: "Leading supplier of high-quality electronic components and devices. Specializes in consumer electronics, industrial equipment, and custom solutions."
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-white"
      case "inactive": return "bg-status-draft text-white"
      default: return "bg-muted"
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-success"
    if (rating >= 4.0) return "text-warning"
    return "text-destructive"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/suppliers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Supplier Details</h1>
            <p className="text-muted-foreground">Complete information about {supplier.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/suppliers/${id}/orders`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Orders
          </Button>
          <Button onClick={() => navigate(`/suppliers/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Supplier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-xl">{supplier.name}</div>
                  <div className="text-sm text-muted-foreground">{supplier.id}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{supplier.description}</p>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{supplier.address}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Contact Person</span>
                    <div className="font-medium">{supplier.contactPerson}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Category</span>
                    <div>
                      <Badge variant="outline">{supplier.category}</Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div>
                      <Badge className={getStatusColor(supplier.status)}>
                        {supplier.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Tax ID</span>
                  <div className="font-medium">{supplier.taxId}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Payment Terms</span>
                  <div className="font-medium">{supplier.paymentTerms}</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Bank Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Account Name</span>
                    <div className="font-medium">{supplier.bankDetails.accountName}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Account Number</span>
                    <div className="font-medium">{supplier.bankDetails.accountNumber}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Bank Name</span>
                    <div className="font-medium">{supplier.bankDetails.bankName}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats & Quick Info */}
        <div className="space-y-6">
          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rating</span>
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${getRatingColor(supplier.rating)}`} fill="currentColor" />
                  <span className={`font-medium ${getRatingColor(supplier.rating)}`}>
                    {supplier.rating}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium">{supplier.totalOrders}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Order</span>
                <span className="font-medium">{supplier.lastOrder}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Joined Date</span>
                <span className="font-medium">{supplier.joinedDate}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/suppliers/${id}/orders`)}
              >
                <Package className="w-4 h-4 mr-2" />
                View All Orders
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/purchase-orders/new")}
              >
                <Package className="w-4 h-4 mr-2" />
                Create Purchase Order
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}