import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddSupplierForm } from "@/components/forms/AddSupplierForm"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Building2,
  Phone,
  Mail,
  MapPin
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  
  const suppliers = [
    {
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
      lastOrder: "2024-01-10"
    },
    {
      id: "SUP-002", 
      name: "Global Raw Materials Inc",
      contactPerson: "Sarah Johnson",
      phone: "+1 (555) 987-6543",
      email: "sarah.j@globalraw.com",
      address: "456 Industrial Blvd, Houston, TX 77001",
      category: "Raw Materials",
      status: "active",
      rating: 4.5,
      totalOrders: 89,
      lastOrder: "2024-01-08"
    },
    {
      id: "SUP-003",
      name: "Office Furniture Pro",
      contactPerson: "Mike Wilson",
      phone: "+1 (555) 456-7890",
      email: "mike@officefurniturepro.com",
      address: "789 Commerce Ave, Atlanta, GA 30309",
      category: "Furniture",
      status: "inactive",
      rating: 4.2,
      totalOrders: 67,
      lastOrder: "2023-12-15"
    },
    {
      id: "SUP-004",
      name: "Premium Parts Supply",
      contactPerson: "Lisa Davis",
      phone: "+1 (555) 321-0987",
      email: "lisa.davis@premiumparts.com",
      address: "321 Manufacturing Lane, Detroit, MI 48201",
      category: "Components",
      status: "active",
      rating: 4.9,
      totalOrders: 203,
      lastOrder: "2024-01-12"
    }
  ]

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier relationships and vendor information</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-success">+3 this month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="text-xs text-muted-foreground">90.5% active rate</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Different categories</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.6</div>
            <p className="text-xs text-success">Above target</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Supplier Directory</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-accent/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">{supplier.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3" />
                        {supplier.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3" />
                        {supplier.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {supplier.address.split(',')[0]}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{supplier.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(supplier.status)}>
                      {supplier.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getRatingColor(supplier.rating)}`}>
                      {supplier.rating}
                    </span>
                  </TableCell>
                  <TableCell>{supplier.totalOrders}</TableCell>
                  <TableCell className="text-muted-foreground">{supplier.lastOrder}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => window.location.href = `/suppliers/${supplier.id}`}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.location.href = `/suppliers/${supplier.id}/edit`}>
                          Edit Supplier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.location.href = `/suppliers/${supplier.id}/orders`}>
                          View Orders
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddSupplierForm 
        open={showAddForm} 
        onOpenChange={setShowAddForm}
        onSupplierAdded={() => {
          // In a real app, this would refresh the suppliers list
          console.log("Supplier added, refreshing list...")
        }}
      />
    </div>
  )
}