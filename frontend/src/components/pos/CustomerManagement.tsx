import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { Users, Search, Plus, Edit, Eye, Phone, Mail, MapPin, Star, DollarSign } from "lucide-react"

interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  loyaltyPoints: number
  outstandingBalance: number
  purchaseHistory: Purchase[]
}

interface Purchase {
  id: string
  date: string
  items: string[]
  total: number
  paymentMethod: string
}

const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "John Doe",
    phone: "+1234567890",
    email: "john@example.com",
    address: "123 Main St, City, State 12345",
    loyaltyPoints: 1250,
    outstandingBalance: 0,
    purchaseHistory: [
      { id: "TXN-001", date: "2024-01-09", items: ["Laptop", "Mouse"], total: 1029.98, paymentMethod: "Credit Card" },
      { id: "TXN-005", date: "2024-01-08", items: ["Notebook"], total: 4.99, paymentMethod: "Cash" }
    ]
  },
  {
    id: "2",
    name: "Jane Smith",
    phone: "+1987654321",
    email: "jane@example.com",
    address: "456 Oak Ave, City, State 67890",
    loyaltyPoints: 850,
    outstandingBalance: 25.50,
    purchaseHistory: [
      { id: "TXN-003", date: "2024-01-07", items: ["Office Chair"], total: 199.99, paymentMethod: "Debit Card" }
    ]
  }
]

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  })

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddCustomer = () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Missing Fields",
        description: "Name and phone are required",
        variant: "destructive"
      })
      return
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      loyaltyPoints: 0,
      outstandingBalance: 0,
      purchaseHistory: []
    }

    setCustomers(prev => [...prev, newCustomer])
    setFormData({ name: "", phone: "", email: "", address: "" })
    setIsAddDialogOpen(false)
    toast({ title: "Customer added successfully" })
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsViewDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customer Management
            </span>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St, City, State"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddCustomer} className="flex-1">Add Customer</Button>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Outstanding Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      <Star className="w-3 h-3" />
                      {customer.loyaltyPoints}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.outstandingBalance > 0 ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <DollarSign className="w-3 h-3" />
                        ${customer.outstandingBalance.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="flex items-center gap-1 w-fit">
                        <DollarSign className="w-3 h-3" />
                        $0.00
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewCustomer(customer)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-lg">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedCustomer.phone}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedCustomer.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Loyalty Points</Label>
                  <p className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {selectedCustomer.loyaltyPoints}
                  </p>
                </div>
              </div>

              {selectedCustomer.address && (
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedCustomer.address}
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <Label className="text-lg font-medium">Purchase History</Label>
                <div className="mt-3 space-y-3">
                  {selectedCustomer.purchaseHistory.length === 0 ? (
                    <p className="text-muted-foreground">No purchase history available</p>
                  ) : (
                    selectedCustomer.purchaseHistory.map((purchase) => (
                      <div key={purchase.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{purchase.id}</p>
                            <p className="text-sm text-muted-foreground">{purchase.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${purchase.total.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">{purchase.paymentMethod}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {purchase.items.map((item, index) => (
                            <Badge key={index} variant="secondary">{item}</Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}