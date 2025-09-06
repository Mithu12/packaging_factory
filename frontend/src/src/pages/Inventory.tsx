import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  Package,
  BarChart3
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function Inventory() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  
  const inventoryItems = [
    {
      id: "INV-001",
      product: "Business Laptop Model X",
      sku: "LPT-001",
      location: "Warehouse A - Shelf 12",
      currentStock: 45,
      reservedStock: 8,
      availableStock: 37,
      minStock: 10,
      maxStock: 100,
      lastMovement: "2024-01-15",
      movementType: "in",
      supplier: "ABC Electronics Ltd",
      unitCost: 850,
      totalValue: 38250
    },
    {
      id: "INV-002", 
      product: "Ergonomic Office Chair",
      sku: "CHR-205",
      location: "Warehouse B - Section 3",
      currentStock: 8,
      reservedStock: 2,
      availableStock: 6,
      minStock: 15,
      maxStock: 50,
      lastMovement: "2024-01-14",
      movementType: "out",
      supplier: "Office Furniture Pro",
      unitCost: 150,
      totalValue: 1200
    },
    {
      id: "INV-003",
      product: "Laser Printer Toner",
      sku: "TNR-301", 
      location: "Supply Room - Cabinet A",
      currentStock: 3,
      reservedStock: 0,
      availableStock: 3,
      minStock: 12,
      maxStock: 30,
      lastMovement: "2024-01-13",
      movementType: "out",
      supplier: "Premium Parts Supply",
      unitCost: 45,
      totalValue: 135
    }
  ]

  const movements = [
    {
      id: "MOV-001",
      date: "2024-01-15",
      product: "Business Laptop Model X",
      type: "receipt",
      quantity: 10,
      reason: "Purchase Order PO-2024-001",
      user: "John Doe",
      reference: "GRN-001"
    },
    {
      id: "MOV-002",
      date: "2024-01-14", 
      product: "Ergonomic Office Chair",
      type: "issue",
      quantity: -5,
      reason: "Sales Order SO-2024-015",
      user: "Sarah Smith",
      reference: "DO-001"
    },
    {
      id: "MOV-003",
      date: "2024-01-13",
      product: "Laser Printer Toner",
      type: "adjustment",
      quantity: -2,
      reason: "Damaged goods write-off",
      user: "Mike Johnson",
      reference: "ADJ-001"
    }
  ]

  const adjustments = [
    {
      id: "ADJ-001",
      date: "2024-01-13",
      product: "Laser Printer Toner",
      currentStock: 5,
      adjustedStock: 3,
      difference: -2,
      reason: "Damaged during transport",
      approvedBy: "Manager",
      status: "approved"
    },
    {
      id: "ADJ-002",
      date: "2024-01-10",
      product: "USB Cables Premium",
      currentStock: 98,
      adjustedStock: 100,
      difference: +2,
      reason: "Found extra units during audit",
      approvedBy: "Supervisor",
      status: "approved"
    }
  ]

  const filteredItems = inventoryItems.filter(item =>
    item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current <= min * 0.5) return { status: "critical", color: "text-destructive", bgColor: "bg-destructive/10" }
    if (current <= min) return { status: "low", color: "text-warning", bgColor: "bg-warning/10" }
    if (current >= max * 0.9) return { status: "overstock", color: "text-warning", bgColor: "bg-warning/10" }
    return { status: "optimal", color: "text-success", bgColor: "bg-success/10" }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "receipt": return "text-success"
      case "issue": return "text-destructive"
      case "adjustment": return "text-warning"
      default: return "text-muted-foreground"
    }
  }

  const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0)
  const lowStockItems = inventoryItems.filter(item => item.currentStock <= item.minStock).length
  const criticalStockItems = inventoryItems.filter(item => item.currentStock <= item.minStock * 0.5).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track stock levels, movements, and perform adjustments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
            <p className="text-xs text-success">+5.2% this month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalStockItems}</div>
            <p className="text-xs text-muted-foreground">Immediate attention</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="adjustments">Stock Adjustments</TabsTrigger>
        </TabsList>

        {/* Stock Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>Current Stock Levels</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search inventory..."
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
                    <TableHead>Location</TableHead>
                    <TableHead>Stock Levels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Last Movement</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const stockInfo = getStockStatus(item.currentStock, item.minStock, item.maxStock)
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{item.product}</div>
                              <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{item.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.currentStock}</span>
                              <span className="text-muted-foreground text-sm">current</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.availableStock} available</span>
                              <span>•</span>
                              <span>{item.reservedStock} reserved</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min: {item.minStock} • Max: {item.maxStock}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${stockInfo.bgColor} ${stockInfo.color}`}>
                            {stockInfo.status === "critical" && <AlertTriangle className="w-3 h-3" />}
                            {stockInfo.status}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">${item.totalValue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">${item.unitCost} per unit</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {item.lastMovement}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}/edit`)}>
                                Edit Item
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}/adjust`)}>
                                Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem>Reserve Stock</DropdownMenuItem>
                              <DropdownMenuItem>Transfer Location</DropdownMenuItem>
                              <DropdownMenuItem>Create PO</DropdownMenuItem>
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
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} className="hover:bg-accent/50">
                      <TableCell className="text-sm">{movement.date}</TableCell>
                      <TableCell className="font-medium">{movement.product}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getMovementTypeColor(movement.type)}>
                          {movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={movement.quantity > 0 ? "text-success" : "text-destructive"}>
                          {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{movement.reason}</TableCell>
                      <TableCell className="text-sm">{movement.user}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{movement.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Adjustments Tab */}
        <TabsContent value="adjustments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Stock Adjustments</CardTitle>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Adjustment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adjustment) => (
                    <TableRow key={adjustment.id} className="hover:bg-accent/50">
                      <TableCell className="text-sm">{adjustment.date}</TableCell>
                      <TableCell className="font-medium">{adjustment.product}</TableCell>
                      <TableCell>{adjustment.currentStock}</TableCell>
                      <TableCell>{adjustment.adjustedStock}</TableCell>
                      <TableCell>
                        <span className={adjustment.difference > 0 ? "text-success" : "text-destructive"}>
                          {adjustment.difference > 0 ? "+" : ""}{adjustment.difference}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{adjustment.reason}</TableCell>
                      <TableCell className="text-sm">{adjustment.approvedBy}</TableCell>
                      <TableCell>
                        <Badge className="bg-success text-white">
                          {adjustment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}