import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddProductForm } from "@/components/forms/AddProductForm"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Package,
  AlertTriangle,
  CheckCircle
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

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  
  const products = [
    {
      id: "PRD-001",
      sku: "LPT-001",
      name: "Business Laptop Model X",
      category: "Electronics",
      subCategory: "Laptops",
      unit: "pcs",
      costPrice: 850,
      sellingPrice: 1200,
      currentStock: 45,
      minStock: 10,
      supplier: "ABC Electronics Ltd",
      status: "active"
    },
    {
      id: "PRD-002",
      sku: "CHR-205",
      name: "Ergonomic Office Chair",
      category: "Furniture",
      subCategory: "Seating",
      unit: "pcs",
      costPrice: 150,
      sellingPrice: 220,
      currentStock: 8,
      minStock: 15,
      supplier: "Office Furniture Pro",
      status: "active"
    },
    {
      id: "PRD-003",
      sku: "TNR-301",
      name: "Laser Printer Toner",
      category: "Office Supplies",
      subCategory: "Consumables",
      unit: "pcs",
      costPrice: 45,
      sellingPrice: 75,
      currentStock: 3,
      minStock: 12,
      supplier: "Premium Parts Supply",
      status: "active"
    },
    {
      id: "PRD-004",
      sku: "MTL-450",
      name: "Steel Raw Material Grade A",
      category: "Raw Materials",
      subCategory: "Metals",
      unit: "kg",
      costPrice: 2.5,
      sellingPrice: 4.0,
      currentStock: 2500,
      minStock: 500,
      supplier: "Global Raw Materials Inc",
      status: "active"
    },
    {
      id: "PRD-005",
      sku: "CBL-102",
      name: "USB-C Cable Premium",
      category: "Electronics",
      subCategory: "Accessories",
      unit: "pcs",
      costPrice: 8,
      sellingPrice: 15,
      currentStock: 120,
      minStock: 50,
      supplier: "ABC Electronics Ltd",
      status: "discontinued"
    }
  ]

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockStatus = (current: number, min: number) => {
    if (current <= min * 0.5) return { status: "critical", color: "text-destructive", icon: AlertTriangle }
    if (current <= min) return { status: "low", color: "text-warning", icon: AlertTriangle }
    return { status: "good", color: "text-success", icon: CheckCircle }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-white"
      case "discontinued": return "bg-status-draft text-white"
      case "out-of-stock": return "bg-destructive text-white"
      default: return "bg-muted"
    }
  }

  const categories = [
    { name: "Electronics", count: 145, color: "bg-blue-100 text-blue-800" },
    { name: "Furniture", count: 89, color: "bg-green-100 text-green-800" },
    { name: "Office Supplies", count: 234, color: "bg-yellow-100 text-yellow-800" },
    { name: "Raw Materials", count: 67, color: "bg-purple-100 text-purple-800" }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory levels</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-success">+23 this month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">15</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$342K</div>
            <p className="text-xs text-success">+8.2% this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((category) => (
              <div key={category.name} className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors">
                <div>
                  <div className="font-medium text-sm">{category.name}</div>
                  <div className="text-xs text-muted-foreground">{category.count} products</div>
                </div>
                <Badge className={category.color}>
                  {category.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Product Catalog</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search products..."
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
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockInfo = getStockStatus(product.currentStock, product.minStock)
                  const StockIcon = stockInfo.icon
                  
                  return (
                    <TableRow key={product.id} className="hover:bg-accent/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{product.category}</div>
                          <div className="text-xs text-muted-foreground">{product.subCategory}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StockIcon className={`w-4 h-4 ${stockInfo.color}`} />
                          <div>
                            <div className={`font-medium text-sm ${stockInfo.color}`}>
                              {product.currentStock} {product.unit}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min: {product.minStock} {product.unit}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">${product.sellingPrice}</div>
                          <div className="text-xs text-muted-foreground">Cost: ${product.costPrice}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.supplier}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(product.status)}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit Product</DropdownMenuItem>
                            <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
                            <DropdownMenuItem>Create PO</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Discontinue
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddProductForm 
        open={showAddForm} 
        onOpenChange={setShowAddForm}
        onProductAdded={() => {
          // In a real app, this would refresh the products list
          console.log("Product added, refreshing list...")
        }}
      />
    </div>
  )
}